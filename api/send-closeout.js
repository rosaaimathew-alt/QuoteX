import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { sendMail, isMailerConfigured } from './mailer.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!isMailerConfigured()) {
    return res.status(500).json({ error: 'Gmail SMTP not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to Vercel environment variables.' })
  }

  const { toEmail, client, contractNum, address, projectType, completionDate } = req.body
  if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })

  const company = 'Ebony Outdoor Living'
  const completionFormatted = completionDate
    ? new Date(completionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'recently'

  const subject = `Your Project is Complete — Thank You! · ${contractNum || company}`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#064e3b;padding:28px 40px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#6ee7b7;">Project Complete ✓</p>
      </td></tr>
      <tr><td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          We're thrilled to let you know that your project has been completed on <strong>${completionFormatted}</strong>.
          It was a genuine pleasure working with you, and we hope you love the final result!
        </p>
        ${address ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Project address: <strong>${address}</strong></p>` : ''}
        ${projectType ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Project type: <strong>${projectType}</strong></p>` : ''}
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
          If you have any warranty concerns or questions down the road, please don't hesitate to reach out — we stand behind our work.
          And if you know anyone looking for outdoor living improvements, a referral is the greatest compliment we can receive!
        </p>
      </td></tr>
      <tr><td style="background:#f0fdf4;padding:20px 40px;border-top:1px solid #d1fae5;">
        <p style="margin:0;font-size:12px;color:#6b7280;">
          <strong style="color:#374151;">${company}</strong> · Thank you for choosing us!
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  const result = await sendMail({ to: toEmail, subject, html })
  if (result.error) return res.status(500).json({ error: result.error })
  return res.status(200).json({ success: true })
}
