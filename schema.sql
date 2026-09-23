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
