-- Loya 2.17: сеть точек, имена устройств, доп. устройства из админки.
-- Выполнить один раз: Supabase → SQL Editor → вставить весь файл → Run. Повторный запуск ничего не ломает.

-- Если ещё не выполняли файл из 2.14 (устройства по ключу) — эта таблица создастся здесь.
create table if not exists license_devices (
  license_key text not null,
  device text not null,
  platform text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (license_key, device)
);
create index if not exists idx_license_devices_seen on license_devices (license_key, last_seen desc);
alter table license_devices enable row level security;

-- Имя устройства и его точка (видно в админке и в «Сети точек»).
alter table license_devices add column if not exists name text;
alter table license_devices add column if not exists point text;

-- Доп. устройства сверх тарифа, которые вы даёте клиенту в админке (бесплатно или за доплату) и условие.
alter table licenses add column if not exists extra_devices integer not null default 0;
alter table licenses add column if not exists extra_note text;

-- Сводки статистики точек (только числа, без имён и телефонов клиентов).
create table if not exists org_points (
  license_key text not null,
  device text not null,
  point text not null,
  device_name text,
  shared boolean not null default false,
  stats jsonb,
  updated_at timestamptz not null default now(),
  primary key (license_key, device)
);
create index if not exists idx_org_points_key on org_points (license_key, updated_at desc);
alter table org_points enable row level security;

-- Общие настройки организации (Telegram-бот для нескольких точек). Хранятся зашифрованными.
create table if not exists org_shared (
  license_key text not null,
  name text not null,
  data text,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (license_key, name)
);
alter table org_shared enable row level security;
