# Подключение Apple Wallet к Loya

Всё в коде уже готово. Пока ключей Apple нет, функция просто выключена: кнопка «Добавить в Apple Wallet» не показывается, остальное работает как раньше. Mac не нужен — всё делается на Windows.

## 1. Аккаунт Apple Developer (один раз)
1. https://developer.apple.com/programs/ → Enroll. Стоимость — 99 $ в год.
2. Можно как частное лицо (Individual). Название бизнеса на карте берётся из программы, не из аккаунта.
3. Подтверждение обычно занимает от нескольких часов до пары дней.

## 2. Pass Type ID (один раз)
1. https://developer.apple.com/account → Certificates, IDs & Profiles → Identifiers → «+».
2. Выберите **Pass Type IDs** → Continue.
3. Description: `Loya loyalty cards`, Identifier: `pass.com.loyaloyalty.card` → Register.

## 3. Сертификат карты (без Mac)
Нужен OpenSSL. Он есть в **Git Bash** (ставится вместе с Git for Windows). Откройте Git Bash в пустой папке:

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout pass.key -out pass.csr -subj "/emailAddress=ваш@email/CN=Loya Pass/C=SK"
```

1. В портале откройте ваш Pass Type ID → **Create Certificate** → загрузите `pass.csr` → скачайте `pass.cer`.
2. Переведите его в нужный формат:
   ```bash
   openssl x509 -inform der -in pass.cer -out pass.pem
   ```
3. Скачайте промежуточный сертификат Apple **Worldwide Developer Relations — G4** со страницы https://www.apple.com/certificateauthority/ (файл `AppleWWDRCAG4.cer`) и тоже переведите:
   ```bash
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
4. Team ID: портал → Membership details → **Team ID** (10 символов).

⚠️ `pass.key` — секретный ключ. Никому не отправляйте и не вставляйте в чаты. Храните копию в надёжном месте.

## 4. Переменные в Vercel
Vercel → проект → Settings → Environment Variables (Production):

| Имя | Значение |
|---|---|
| `APPLE_PASS_TYPE_ID` | `pass.com.loyaloyalty.card` |
| `APPLE_TEAM_ID` | ваш Team ID |
| `APPLE_PASS_CERT` | всё содержимое `pass.pem` (вместе со строками BEGIN/END) |
| `APPLE_PASS_KEY` | всё содержимое `pass.key` |
| `APPLE_WWDR_CERT` | всё содержимое `wwdr.pem` |

Многострочный текст Vercel принимает как есть. Если удобнее одной строкой — можно вставить base64 (в Git Bash: `base64 -w0 pass.pem`). Программа понимает оба варианта.
Если ключ создавался с паролем — добавьте `APPLE_PASS_KEY_PASSWORD`.

После этого — **Redeploy**.

## 5. База данных
Supabase → SQL Editor → вставить весь `schema.sql` → Run (появятся таблицы `apple_passes` и `apple_registrations`). Повторный запуск безопасен.

## 6. Проверка
1. Программа → Настройки → Подписка → «Проверить связь с сервером» → строка **Apple Wallet: подключён**.
2. Отправьте карту клиенту на email (себе). На iPhone откройте письмо → «Добавить в Apple Wallet».
3. Отсканируйте карту в программе — через несколько секунд штампы на iPhone обновятся сами.

## Как это работает
- Ссылка ведёт на `loya-loyalty.com/api/apple-pass` — сервер собирает файл карты `.pkpass` и подписывает его вашим сертификатом.
- iPhone сам регистрируется на `loya-loyalty.com/api/apple-ws` и получает обновления через push Apple (тот же сертификат, отдельный ключ APNs не нужен).
- Если подписка бизнеса закончилась, карта перестаёт обновляться, но у клиента остаётся.

## Раз в год
Сертификат Pass Type ID действует ограниченное время (Apple пришлёт напоминание). Перед окончанием повторите шаг 3 (новый CSR → новый `pass.cer`) и обновите `APPLE_PASS_CERT` и `APPLE_PASS_KEY` в Vercel. Уже выданные карты останутся у клиентов.
