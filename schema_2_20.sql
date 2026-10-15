-- Loya 2.20: онлайн-запись, отзывы после визита, «Приведи друга», подключение кассы Dotykačka.
-- Выполнить один раз: Supabase → SQL Editor → вставить весь файл → Run. Повторный запуск ничего не ломает.

-- «Приведи друга»: код пригласившего в заявке с сайта
alter table online_registrations add column if not exists ref text;

-- Онлайн-запись
create table if not exists bookings (
  id bigserial primary key,
  license_key text not null,
  token text not null unique,          -- ссылка гостя для просмотра/отмены
  service_id text, service_name text, price numeric,
  staff_id text not null default '', staff_name text,
  date text not null,                  -- 'YYYY-MM-DD', местная дата бизнеса
  start_min integer not null,          -- минуты от полуночи
  dur integer not null,
  name text, phone text, phone_key text, email text, lang text, consent boolean default false, note text,
  status text not null default 'booked',   -- booked / cancelled / done / noshow
  source text default 'online',
  synced boolean not null default false,   -- программа забрала последнюю версию
  reminded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_bookings_day on bookings (license_key, date, status);
create index if not exists idx_bookings_sync on bookings (license_key, synced);
create index if not exists idx_bookings_phone on bookings (license_key, phone_key, status);
-- одно и то же время у одного мастера нельзя занять дважды
create unique index if not exists uq_bookings_slot on bookings (license_key, staff_id, date, start_min) where status = 'booked';
alter table bookings enable row level security;

-- Занятое время из записей, сделанных в самой программе
create table if not exists booking_busy (
  id bigserial primary key,
  license_key text not null,
  staff_id text not null default '',
  date text not null,
  start_min integer not null,
  end_min integer not null
);
create index if not exists idx_booking_busy on booking_busy (license_key, date);
alter table booking_busy enable row level security;

-- Отзывы после визита
create table if not exists feedback (
  token text primary key,
  license_key text not null,
  name text, lang text,
  rating integer, comment text,
  delivered boolean not null default true,
  created_at timestamptz not null default now(),
  rated_at timestamptz
);
create index if not exists idx_feedback_key on feedback (license_key, delivered);
alter table feedback enable row level security;

-- Подключённые облачные кассы (Dotykačka)
create table if not exists pos_connectors (
  license_key text primary key,
  kind text not null default 'dotykacka',
  state text, state_at timestamptz,
  refresh_token text, cloud_id text,
  access_token text, access_exp timestamptz,
  last_order_id bigint, last_poll timestamptz, last_error text,
  connected_at timestamptz
);
create index if not exists idx_pos_connectors_state on pos_connectors (state);
alter table pos_connectors enable row level security;
-- RLS включён без политик: доступ только у сервера (ключ service_role), из браузера таблицы не видны.
