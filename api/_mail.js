// Общий код отправки писем через сервер Loya.
// Пароль почты хранится ТОЛЬКО здесь, в переменных окружения Vercel — в программу у
// клиентов он не попадает (иначе его мог бы достать кто угодно из установленного .exe).
//
// Переменные окружения Vercel:
//   MAIL_USER  — адрес, с которого уходят письма (например loya.loyalty.send@gmail.com)
//   MAIL_PASS  — пароль приложения этого ящика
//   MAIL_HOST  — необязательно, по умолчанию smtp.gmail.com
//   MAIL_PORT  — необязательно, по умолчанию 465
//   MAIL_DAILY_PER_LICENSE — необязательно, писем в сутки на одну подписку (по умолчанию 300)
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

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;
function cleanName(s) { return String(s || '').replace(/[\r\n"<>\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Loya'; }

const { licenseActive } = require('./_license');

async function countSince(filter) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let q = supabase.from('mail_log').select('id', { count: 'exact', head: true }).gte('sent_at', since);
  if (filter) q = q.eq('license_key', filter);
  const { count } = await q;
  return count || 0;
}

// payload: { licenseKey, fromName, replyTo, to, subject, html, attachments:[{filename,contentBase64,cid,contentType}] }
async function sendMail(p) {
  if (!(await licenseActive(p.licenseKey))) return { status: 403, error: 'license_inactive' };
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

  const perLicense = Number(process.env.MAIL_DAILY_PER_LICENSE) || 300;
  const global = Number(process.env.MAIL_DAILY_GLOBAL) || 450;
  if ((await countSince(p.licenseKey.trim())) >= perLicense) return { status: 429, error: 'daily_limit' };
  if ((await countSince(null)) >= global) return { status: 429, error: 'service_busy' };

  const replyTo = EMAIL_RE.test(String(p.replyTo || '').trim()) ? String(p.replyTo).trim() : undefined;
  await getTransport().sendMail({
    from: `"${cleanName(p.fromName)}" <${process.env.MAIL_USER}>`,
    to, replyTo, subject, html, attachments
  });
  await supabase.from('mail_log').insert({ license_key: p.licenseKey.trim() });
  return { status: 200, ok: true };
}

module.exports = { sendMail, licenseActive, supabase, EMAIL_RE };
