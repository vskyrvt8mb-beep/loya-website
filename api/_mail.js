// Общий код отправки писем через сервер Loya.
// Пароль почты хранится ТОЛЬКО здесь, в переменных окружения Vercel — в программу у
// клиентов он не попадает (иначе его мог бы достать кто угодно из установленного .exe).
//
// Переменные окружения Vercel:
//   MAIL_USER  — адрес, с которого уходят письма (например loya.loyalty.send@gmail.com)
//   MAIL_PASS  — пароль приложения этого ящика
//   MAIL_FROM  — необязательно: адрес в поле «От кого». Нужен для почтовых сервисов (Brevo, Resend, SES), где
//                логин SMTP — не адрес почты; адрес должен быть на вашем домене (loya-loyalty.com) с настроенными SPF/DKIM
//   SUPPORT_EMAIL — необязательно: куда падают ответы клиентов на системные письма (ключ, восстановление)
//   MAIL_HOST  — необязательно, по умолчанию smtp.gmail.com
//   MAIL_PORT  — необязательно, по умолчанию 465
//   MAIL_DAILY_PER_LICENSE — необязательно, писем в сутки на одну подписку (по умолчанию 300)
//   MAIL_DAILY_PER_TRIAL   — необязательно, писем в сутки на пробный ключ (по умолчанию 60; не больше половины общего лимита)
//   MAIL_DAILY_GLOBAL      — необязательно, всего писем в сутки (по умолчанию 450 — лимит Gmail ~500)
// Позже можно переключиться на любой почтовый сервис (Brevo, Resend, Amazon SES, Mailgun…):
// достаточно поменять эти переменные — программу обновлять не нужно.
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let transport = null;
function getTransport() {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) throw new Error('mail_not_configured');
  if (!transport) {
    const port = Number(process.env.MAIL_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com', port, secure: port === 465,
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
  }
  return transport;
}

const fromAddress = () => process.env.MAIL_FROM || process.env.MAIL_USER;
const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;
function cleanName(s) { return String(s || '').replace(/[\r\n"<>\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Loya'; }

const { licenseActive, getLicense, isActive } = require('./_license');

async function countSince(filter) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let q = supabase.from('mail_log').select('id', { count: 'exact', head: true }).gte('sent_at', since);
  if (filter) q = q.eq('license_key', filter);
  const { count } = await q;
  return count || 0;
}

// payload: { licenseKey, fromName, replyTo, to, subject, html, attachments:[{filename,contentBase64,cid,contentType}] }
const TRIAL_VERIFY_SINCE = '2026-10-24';
async function sendMail(p) {
  const lic = await getLicense(p.licenseKey);
  if (!isActive(lic)) return { status: 403, error: 'license_inactive' };
  // Пробный ключ выдаётся без подтверждения почты — у него своя, меньшая квота, и он не может занять
  // больше половины общего суточного лимита: иначе спамер с пробным ключом оставил бы без писем всех подписчиков.
  const isTrial = lic.plan === 'trial';
  // 2.26: новым пробным ключам письма клиентам — после подтверждения почты владельца (ссылка в письме с ключом).
  // Ключи, выданные до этого правила, и база без колонки email_verified_at (schema_2_26.sql) — как раньше.
  if (isTrial && 'email_verified_at' in lic && !lic.email_verified_at && String(lic.created_at || '') >= TRIAL_VERIFY_SINCE) return { status: 403, error: 'email_unverified' };
  const to = String(p.to || '').trim();
  if (!EMAIL_RE.test(to) || to.length > 160) return { status: 400, error: 'bad_recipient' };
  const subject = String(p.subject || '').replace(/[\r\n]+/g, ' ').slice(0, 200);
  const html = String(p.html || '');
  if (!subject || !html || html.length > 800000) return { status: 400, error: 'bad_message' };
  const atts = Array.isArray(p.attachments) ? p.attachments.slice(0, 4) : [];
  let total = 0;
  const attachments = atts.map(a => {
    const content = Buffer.from(String(a.contentBase64 || ''), 'base64');
    total += content.length;
    return { filename: String(a.filename || 'file').slice(0, 80), content, cid: a.cid ? String(a.cid).slice(0, 60) : undefined, contentType: a.contentType ? String(a.contentType).slice(0, 60) : undefined };
  });
  if (total > 3 * 1024 * 1024) return { status: 413, error: 'too_large' };

  const perLicense = isTrial ? (Number(process.env.MAIL_DAILY_PER_TRIAL) || 60) : (Number(process.env.MAIL_DAILY_PER_LICENSE) || 300);
  const global = Number(process.env.MAIL_DAILY_GLOBAL) || 450;
  if ((await countSince(p.licenseKey.trim())) >= perLicense) return { status: 429, error: 'daily_limit' };
  if ((await countSince(null)) >= (isTrial ? Math.floor(global / 2) : global)) return { status: 429, error: 'service_busy' };

  const replyTo = EMAIL_RE.test(String(p.replyTo || '').trim()) ? String(p.replyTo).trim() : undefined;
  await getTransport().sendMail({
    from: `"${cleanName(p.fromName)}" <${fromAddress()}>`,
    to, replyTo, subject, html, attachments
  });
  await supabase.from('mail_log').insert({ license_key: p.licenseKey.trim() });
  return { status: 200, ok: true };
}

// Системные письма самого Loya (ключ после оплаты, восстановление ключа) — не от имени бизнеса и без
// проверки подписки: у человека её ещё может не быть в базе в этот момент.
async function sendSystemMail({ to, subject, html }) {
  const addr = String(to || '').trim();
  if (!EMAIL_RE.test(addr) || addr.length > 160) throw new Error('bad_recipient');
  await getTransport().sendMail({
    from: `"Loya" <${fromAddress()}>`, to: addr, subject: String(subject || '').replace(/[\r\n]+/g, ' ').slice(0, 200), html: String(html || ''),
    replyTo: EMAIL_RE.test(String(process.env.SUPPORT_EMAIL || '')) ? process.env.SUPPORT_EMAIL : undefined
  });
  try { await supabase.from('mail_log').insert({ license_key: 'system' }); } catch (e) { /* журнал не критичен */ }
}

module.exports = { sendMail, sendSystemMail, licenseActive, supabase, EMAIL_RE };
