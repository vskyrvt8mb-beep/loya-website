-- Loya 2.26: подтверждение почты пробного ключа (письма клиентам через почту Loya — после подтверждения).
-- Выполнить один раз в Supabase → SQL Editor. Пока не выполнено — всё работает как раньше.
alter table licenses add column if not exists email_verified_at timestamptz;
