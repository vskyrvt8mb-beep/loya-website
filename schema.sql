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

-- «Доступ из дома»: копия показателей для владельца и очередь правок.
-- Данные клиентов попадают сюда только если владелец сам включил функцию в программе;
-- при выключении строка удаляется.
create table if not exists owner_access (
  license_key text primary key,
  token text unique not null,
  pass_salt text not null,
  pass_hash text not null,
  snapshot jsonb,
  snapshot_at timestamptz,
  fail_count int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists owner_commands (
  id bigint generated always as identity primary key,
  license_key text not null,
  cmd jsonb not null,
  status text not null default 'pending',   -- pending | done | failed
  result text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists idx_owner_cmd_pending on owner_commands (license_key, status);
alter table owner_access enable row level security;
alter table owner_commands enable row level security;

-- Админка подписок: бесплатный доступ, блокировка, заметка, «когда программа выходила на связь».
-- Безопасно выполнять повторно.
alter table licenses add column if not exists plan text not null default 'stripe';   -- stripe | free
alter table licenses add column if not exists banned boolean not null default false;
alter table licenses add column if not exists note text;
alter table licenses add column if not exists free_until date;                      -- для бесплатного доступа «до даты»
alter table licenses add column if not exists last_seen_at timestamptz;
alter table licenses add column if not exists app_version text;

-- Apple Wallet: последнее состояние карты (его скачивает iPhone) и устройства, на которых карта сохранена.
create table if not exists apple_passes (
  serial text primary key,
  license_key text not null,
  card jsonb not null default '{}'::jsonb,
  brand jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists apple_registrations (
  device_id text not null,
  serial text not null,
  push_token text not null,
  created_at timestamptz not null default now(),
  primary key (device_id, serial)
);
create index if not exists idx_apple_reg_serial on apple_registrations (serial);
alter table apple_passes enable row level security;
alter table apple_registrations enable row level security;

-- Касса бизнеса → Loya через интернет: личный адрес для веб-хука и очередь чеков.
create table if not exists pos_keys (
  license_key text primary key,
  key text unique not null,
  created_at timestamptz not null default now()
);
create table if not exists pos_events (
  id bigint generated always as identity primary key,
  license_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists idx_pos_events_pending on pos_events (license_key, delivered_at);
alter table pos_keys enable row level security;
alter table pos_events enable row level security;

-- Боевой запуск: пометка «тестовая/настоящая оплата» у ключей и защита от дубликатов ключа по одной подписке.
alter table licenses add column if not exists livemode boolean;      -- true — настоящая оплата, false — тестовая, null — создан раньше
do $$ begin
  create unique index if not exists idx_licenses_subscription on licenses (stripe_subscription_id) where stripe_subscription_id is not null;
exception when others then
  raise notice 'Уникальный индекс по подписке не создан (в таблице уже есть повторы) — это не страшно, вебхук всё равно проверяет повторы.';
end $$;

-- Тарифы и пробный период (14 дней без карты): тариф ключа, срок пробного периода, хеш компьютера.
alter table licenses add column if not exists tier text not null default 'starter';   -- starter | pro
alter table licenses add column if not exists trial_until timestamptz;                  -- для plan = 'trial'
alter table licenses add column if not exists machine_hash text;                        -- хеш компьютера: один пробный период на компьютер
create index if not exists idx_licenses_machine on licenses (machine_hash);
create index if not exists idx_licenses_email_lower on licenses (lower(email));

-- ===================== Pro: общая база между компьютерами (синхронизация) =====================
-- Устройства организации (организация = ключ Pro). Токен устройства хранится только хешем.
create table if not exists sync_devices (
  id text primary key,
  license_key text not null,
  name text,
  token_hash text not null,
  created_at timestamptz default now(),
  last_seen_at timestamptz,
  revoked boolean default false
);
create index if not exists idx_sync_devices_license on sync_devices (license_key);
-- Последнее состояние каждой записи (клиент, карта, визит) с версией. seq — общий порядковый номер изменения:
-- по нему устройства забирают «всё новое с момента N».
create sequence if not exists sync_seq;
create table if not exists sync_entities (
  license_key text not null,
  entity text not null,
  uid text not null,
  ver integer not null,
  data jsonb not null,
  last_op text,
  device_id text,
  seq bigint not null,
  updated_at timestamptz default now(),
  primary key (license_key, entity, uid)
);
create index if not exists idx_sync_entities_seq on sync_entities (license_key, seq);
-- Номера применённых операций: повтор отправки после обрыва связи узнаётся даже если запись уже изменил другой компьютер.
create table if not exists sync_applied (
  license_key text not null,
  op text not null,
  ver integer not null,
  created_at timestamptz default now(),
  primary key (license_key, op)
);
alter table sync_devices enable row level security;
alter table sync_entities enable row level security;
alter table sync_applied enable row level security;
-- Атомарная запись с проверкой версии: устройство присылает версию, от которой оно отталкивалось (p_base).
-- Совпала — запись принимается (версия +1). Не совпала — конфликт, сервер возвращает актуальное состояние.
-- Повтор той же отправки (тот же p_op после обрыва связи) не применяется второй раз.
create or replace function sync_apply(p_license text, p_entity text, p_uid text, p_base integer, p_data jsonb, p_op text, p_device text)
returns jsonb language plpgsql as $$
declare cur record; nseq bigint; prev integer;
begin
  select ver into prev from sync_applied where license_key = p_license and op = p_op;
  if found then return jsonb_build_object('status', 'ok', 'ver', prev, 'dup', true); end if;
  select ver, data, last_op into cur from sync_entities where license_key = p_license and entity = p_entity and uid = p_uid for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('status', 'conflict', 'ver', 0, 'data', null); end if;
    nseq := nextval('sync_seq');
    begin
      insert into sync_entities (license_key, entity, uid, ver, data, last_op, device_id, seq, updated_at) values (p_license, p_entity, p_uid, 1, p_data, p_op, p_device, nseq, now());
      insert into sync_applied (license_key, op, ver) values (p_license, p_op, 1) on conflict do nothing;
    exception when unique_violation then
      select ver, data, last_op into cur from sync_entities where license_key = p_license and entity = p_entity and uid = p_uid;
      if cur.last_op = p_op then return jsonb_build_object('status', 'ok', 'ver', cur.ver, 'dup', true); end if;
      return jsonb_build_object('status', 'conflict', 'ver', cur.ver, 'data', cur.data);
    end;
    return jsonb_build_object('status', 'ok', 'ver', 1, 'seq', nseq);
  end if;
  if cur.last_op = p_op then return jsonb_build_object('status', 'ok', 'ver', cur.ver, 'dup', true); end if;
  if cur.ver <> p_base then return jsonb_build_object('status', 'conflict', 'ver', cur.ver, 'data', cur.data); end if;
  nseq := nextval('sync_seq');
  update sync_entities set ver = cur.ver + 1, data = p_data, last_op = p_op, device_id = p_device, seq = nseq, updated_at = now()
    where license_key = p_license and entity = p_entity and uid = p_uid;
  insert into sync_applied (license_key, op, ver) values (p_license, p_op, cur.ver + 1) on conflict do nothing;
  return jsonb_build_object('status', 'ok', 'ver', cur.ver + 1, 'seq', nseq);
end $$;

-- Доступ из дома: выход со всех устройств (поколение сеансов), срок ссылки, вход по email + коду + паролю, журнал входов.
alter table owner_access add column if not exists session_gen integer default 0;
alter table owner_access add column if not exists token_expires_at timestamptz;
alter table owner_access add column if not exists login_code_hash text;
alter table owner_access add column if not exists login_code_exp timestamptz;
alter table owner_access add column if not exists login_code_tries integer default 0;
create table if not exists owner_logins (
  id bigserial primary key,
  license_key text not null,
  at timestamptz default now(),
  method text,          -- link | code
  ok boolean,
  ip text,              -- сокращённый адрес (первые две части)
  ua text
);
create index if not exists idx_owner_logins_key on owner_logins (license_key, at desc);
alter table owner_logins enable row level security;

-- Онлайн-саморегистрация (без купона): заявка помечается kind = 'join' (купон по ссылке-акции — 'promo').
alter table online_registrations add column if not exists kind text default 'promo';

-- Общий лимит запросов (api/_ratelimit.js): один счётчик на все экземпляры серверных функций.
-- Ключи — хеши (IP и email в открытом виде не хранятся). Фиксированное окно: p_max запросов за p_window_seconds.
create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table rate_limits enable row level security;

create or replace function rate_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql as $$
declare h integer;
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into h;
  if random() < 0.01 then delete from rate_limits where window_start < now() - interval '2 days'; end if;
  return h <= p_max;  -- true — запрос разрешён
end $$;
revoke all on function rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function rate_hit(text, integer, integer) to service_role;

-- Админка: журнал действий и настройки (момент «выйти на всех устройствах»).
create table if not exists admin_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  op text not null,
  ip text,
  detail jsonb
);
create index if not exists idx_admin_log_at on admin_log (at desc);
alter table admin_log enable row level security;

create table if not exists admin_settings (
  key text primary key,
  value text
);
alter table admin_settings enable row level security;
