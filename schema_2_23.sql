-- Loya 2.23: у каждой точки своя страница регистрации — заявки уходят «своей» точке.
-- Выполнить один раз в Supabase → SQL Editor (повторный запуск ничего не ломает).
alter table online_registrations add column if not exists loc text;
create index if not exists idx_onreg_loc on online_registrations (license_key, loc, delivered_at);
-- Настройки клиентов из админки хранятся в admin_settings (таблица из schema.sql). На всякий случай:
create table if not exists admin_settings (key text primary key, value text);
alter table admin_settings enable row level security;
