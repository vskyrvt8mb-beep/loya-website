-- Loya 2.19: облачная копия базы.
-- Выполнить один раз: Supabase → SQL Editor → вставить весь файл → Run. Повторный запуск ничего не ломает.
-- Сервер хранит только зашифрованные копии: прочитать их без ключа подписки клиента нельзя.

create table if not exists cloud_backups (
  id text primary key,                 -- 24 hex-символа, создаёт программа
  license_key text not null,
  device text not null,                -- отпечаток устройства (как в license_devices)
  device_name text,
  point text,
  parts integer not null,
  size bigint,
  sha text,
  meta jsonb,
  complete boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_cloud_backups_key on cloud_backups (license_key, created_at desc);
create index if not exists idx_cloud_backups_dev on cloud_backups (license_key, device, created_at desc);
alter table cloud_backups enable row level security;

create table if not exists cloud_backup_parts (
  backup_id text not null references cloud_backups (id) on delete cascade,
  part integer not null,
  data text not null,                  -- часть зашифрованной копии (base64)
  primary key (backup_id, part)
);
alter table cloud_backup_parts enable row level security;
-- RLS включён без политик: доступ только у сервера (ключ service_role), из браузера таблицы не видны.
