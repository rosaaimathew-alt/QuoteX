import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { sendMail, isMailerConfigured } from './mailer.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function buildReminderHtml({ client, amount, milestone, dueDate, contractNum, address, projectType }) {
  const company = 'Ebony Outdoor Living'
  const dueLine = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

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
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Payment Reminder</p>
        </td>
      </tr>

      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            This is a friendly reminder that a payment is due for your ongoing project with ${company}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
            ${contractNum ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Contract</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${contractNum}</td></tr>` : ''}
            ${address ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project Address</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${address}</td></tr>` : ''}
            ${projectType ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project Type</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${projectType}</td></tr>` : ''}
            ${milestone ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Payment Milestone</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${milestone}</td></tr>` : ''}
            ${dueLine ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Due Date</td><td style="padding:4px 0;font-size:13px;color:#dc2626;font-weight:700;text-align:right;">${dueLine}</td></tr>` : ''}
            ${amount ? `<tr><td style="padding:12px 0 0;font-size:13px;font-weight:700;color:#1e293b;border-top:1px solid #e2e8f0;margin-top:8px;" colspan="2">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:700;">Amount Due</span>
              <span style="float:right;font-size:22px;font-weight:800;color:#0f172a;">$${fmt(amount)}</span>
            </td></tr>` : ''}
          </table>

          <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
            Please reply to this email or call us to arrange payment. Thank you for your continued business!
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            <strong style="color:#475569;">${company}</strong> · Reply to this email with any questions
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

  const { toEmail, client, amount, milestone, dueDate, contractNum, address, projectType } = req.body

  if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })

  const subject = `Payment Reminder — ${contractNum || 'Your Project'} · Ebony Outdoor Living`
  const html = buildReminderHtml({ client, amount, milestone, dueDate, contractNum, address, projectType })

  const result = await sendMail({ to: toEmail, subject, html })
  if (result.error) return res.status(500).json({ error: result.error })

  return res.status(200).json({ success: true })
}
