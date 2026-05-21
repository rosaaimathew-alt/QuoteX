import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { sendMail, isMailerConfigured } from './mailer.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// day 7 vs day 14+ have slightly different tone
function buildFollowupHtml({ client, total, address, projectType, sentDaysAgo, expiration, contractNum }) {
  const company = 'Ebony Outdoor Living'
  const isUrgent = sentDaysAgo >= 14
  const expiryLine = expiration
    ? new Date(expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const ctaText = isUrgent
    ? `We wanted to follow up one more time on your proposal. If you're still interested, we'd love to get your project scheduled — our calendar is filling up and we want to make sure we can accommodate you.`
    : `We wanted to follow up on the proposal we sent you. Have you had a chance to review it? We're happy to answer any questions or adjust the scope to fit your needs.`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

      <tr>
        <td style="background:#0f172a;padding:28px 40px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Proposal Follow-Up</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">${ctaText}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
            ${contractNum ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Quote #</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${contractNum}</td></tr>` : ''}
            ${address ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project Address</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${address}</td></tr>` : ''}
            ${projectType ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${projectType}</td></tr>` : ''}
            ${expiryLine ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Proposal Valid Until</td><td style="padding:4px 0;font-size:13px;color:#dc2626;font-weight:700;text-align:right;">${expiryLine}</td></tr>` : ''}
            ${total ? `<tr><td style="padding:12px 0 0;font-size:13px;font-weight:700;color:#1e293b;border-top:1px solid #e2e8f0;" colspan="2">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:700;">Proposal Total</span>
              <span style="float:right;font-size:22px;font-weight:800;color:#0f172a;">$${fmt(total)}</span>
            </td></tr>` : ''}
          </table>

          <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
            Simply reply to this email or give us a call — we're happy to chat through any details.
          </p>
        </td>
      </tr>

      ${isUrgent ? `<tr><td style="padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:8px;border-left:4px solid #eab308;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#854d0e;line-height:1.6;">
            Our schedule fills up quickly. A deposit can lock in your start date now.
          </td></tr>
        </table>
      </td></tr>` : ''}

      <tr>
        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            <strong style="color:#475569;">${company}</strong> · Reply to this email or call us to get started
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isMailerConfigured()) {
    return res.status(500).json({ error: 'Gmail SMTP not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to Vercel environment variables.' })
  }

  const { toEmail, client, total, address, projectType, sentAt, expiration, contractNum } = req.body

  if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })

  const sentDaysAgo = sentAt
    ? Math.round((Date.now() - new Date(sentAt)) / 86400000)
    : 7

  const subject = `Following Up — Your Ebony Outdoor Living Proposal`
  const html = buildFollowupHtml({ client, total, address, projectType, sentDaysAgo, expiration, contractNum })

  const result = await sendMail({ to: toEmail, subject, html })
  if (result.error) return res.status(500).json({ error: result.error })

  return res.status(200).json({ success: true })
}
