// POST /api/send-mail — программа Loya отправляет письмо клиенту через рабочую почту Loya.
// Тело: { licenseKey, fromName, replyTo?, to, subject, html, attachments? }
const { sendMail } = require('./_mail');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const r = await sendMail(req.body || {});
    res.status(r.status).json(r.ok ? { ok: true } : { error: r.error });
  } catch (err) {
    res.status(err.message === 'mail_not_configured' ? 503 : 500).json({ error: err.message === 'mail_not_configured' ? 'mail_not_configured' : 'send_failed' });
  }
};
