-- Выполнить один раз в Supabase: Project → SQL Editor → New query → вставить и Run.

create table if not exists licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  email text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active', -- active | past_due | canceled
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists licenses_license_key_idx on licenses (license_key);
create index if not exists licenses_stripe_customer_idx on licenses (stripe_customer_id);
create index if not exists licenses_stripe_subscription_idx on licenses (stripe_subscription_id);

-- Row Level Security — включаем и не даём НИКАКОГО доступа напрямую из браузера.
-- Все обращения идут только через серверные функции (api/*.js), которые используют
-- service_role ключ, обходящий RLS. Это специально: обычный (anon) ключ Supabase
-- виден в браузере, а service_role — только на сервере, в переменных окружения Vercel.
alter table licenses enable row level security;

-- Журнал писем, отправленных через рабочую почту Loya (для лимитов в сутки на подписку).
create table if not exists mail_log (
  id bigint generated always as identity primary key,
  license_key text not null,
  sent_at timestamptz not null default now()
);
create index if not exists idx_mail_log_license_time on mail_log (license_key, sent_at);
create index if not exists idx_mail_log_time on mail_log (sent_at);
alter table mail_log enable row level security;

-- Регистрация клиентов по ссылке из интернета (Instagram и т.п.).
-- Публичный профиль бизнеса: по нему строится страница loya-loyalty.com/r/<slug>.
create table if not exists business_profiles (
  license_key text primary key,
  slug text unique not null,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- Заявки: сервер принимает регистрацию и выдаёт бонусный купон; программа на кассе
-- периодически забирает новые заявки и заводит клиентов и карты у себя.
create table if not exists online_registrations (
  id bigint generated always as identity primary key,
  license_key text not null,
  name text not null,
  phone text,
  phone_key text,
  email text,
  birthday text,
  lang text,
  consent boolean not null default false,
  bonus_code text unique not null,
  bonus_title text,
  bonus_percent int,
  bonus_expires date,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists idx_onreg_pending on online_registrations (license_key, delivered_at);
create index if not exists idx_onreg_phone on online_registrations (license_key, phone_key);
create index if not exists idx_onreg_time on online_registrations (license_key, created_at);
alter table business_profiles enable row level security;
alter table online_registrations enable row level security;
