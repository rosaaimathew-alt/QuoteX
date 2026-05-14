import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { saveMessage } from './_store.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function buildEmailHtml({ client, email, phone, address, expiration, lines, companyName, fromName }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const expirationFormatted = expiration
    ? new Date(expiration + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
  const subtotal = (lines || []).reduce((s, l) => s + (l.qty || 1) * (l.unitPrice || 0), 0)
  const company  = companyName || 'Ebony Outdoor Living'
  const sender   = fromName   || company

  const lineRows = (lines || []).map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 16px;font-size:13px;color:#1e293b;font-weight:500;border-bottom:1px solid #f1f5f9;">${l.name || '—'}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">$${fmt((l.qty || 1) * (l.unitPrice || 0))}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#0f172a;padding:32px 40px;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${company}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Proposal · ${today}</p>
        </td>
      </tr>

      <!-- Greeting -->
      <tr>
        <td style="padding:32px 40px 24px;">
          <p style="margin:0 0 12px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
            Thank you for the opportunity to work with you. Please find your project proposal below.
            ${expirationFormatted ? `This proposal is valid until <strong>${expirationFormatted}</strong>.` : ''}
            Feel free to reach out with any questions.
          </p>
        </td>
      </tr>

      <!-- Project info -->
      ${address ? `<tr><td style="padding:0 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;">
          <tr>
            <td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding-bottom:8px;">Project Address</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#1e293b;">${address}</td>
          </tr>
        </table>
      </td></tr>` : ''}

      <!-- Divider -->
      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

      <!-- Line items -->
      <tr>
        <td style="padding:24px 40px 0;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Proposal Summary</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Item</th>
                <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:100px;">Amount</th>
              </tr>
            </thead>
            <tbody>${lineRows}</tbody>
            <tfoot>
              <tr style="background:#0f172a;">
                <td colspan="2" style="padding:14px 16px;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">TOTAL INVESTMENT</td>
                <td style="padding:14px 16px;text-align:right;font-size:18px;font-weight:700;color:#ffffff;">$${fmt(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </td>
      </tr>

      <!-- CTA note -->
      <tr>
        <td style="padding:28px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px;border-left:4px solid #3b82f6;">
            <tr>
              <td style="padding:16px 20px;font-size:13px;color:#1e40af;line-height:1.6;">
                To accept this proposal, simply reply to this email or give us a call.
                A ${Math.round(0.20 * 100)}% deposit is required to schedule your project.
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Sent by <strong style="color:#475569;">${sender}</strong> via ${company}
            ${email ? ` · <a href="mailto:${email}" style="color:#3b82f6;text-decoration:none;">${email}</a>` : ''}
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured. Add it to your environment variables.' })
  }

  const { proposal, fromName, fromEmail, replyText, inReplyTo, subject: customSubject, pdfBase64, pdfFilename } = req.body

  // Support three modes:
  // 1. Proposal send with PDF attachment: { proposal, fromName, fromEmail, pdfBase64, pdfFilename }
  // 2. Proposal send HTML only:           { proposal, fromName, fromEmail }
  // 3. Reply send:                        { proposal: { email, client }, fromName, fromEmail, replyText, inReplyTo, subject }
  const recipientEmail = proposal?.email
  if (!recipientEmail) {
    return res.status(400).json({ error: 'Recipient email is required.' })
  }

  const isReply = !!replyText
  const company = proposal?.companyName || 'Ebony Outdoor Living'
  const sender  = fromName || company

  let html, subject
  if (isReply) {
    html    = `<div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;">${replyText.replace(/\n/g, '<br>')}</div>`
    subject = customSubject || `Re: Your Proposal`
  } else if (pdfBase64) {
    // PDF attachment mode — keep email body minimal
    const client = proposal?.client || 'there'
    const expLine = proposal?.expiration
      ? `This proposal is valid until <strong>${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.`
      : ''
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0f172a;padding:28px 40px;">
    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Proposal</p>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 14px;font-size:15px;color:#1e293b;">Hi ${client},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#475569;line-height:1.7;">
      Thank you for the opportunity to work with you. Please find your project proposal attached as a PDF.
      ${expLine}
    </p>
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
      To accept this proposal, simply reply to this email or give us a call. A 20% deposit is required to schedule your project.
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Sent by <strong style="color:#475569;">${sender}</strong>
      ${fromEmail ? ` · <a href="mailto:${fromEmail}" style="color:#3b82f6;text-decoration:none;">${fromEmail}</a>` : ''}
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
    subject = customSubject || `Proposal for ${proposal.client || 'Your Project'}${proposal.expiration ? ` — Valid Until ${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
  } else {
    html    = buildEmailHtml({ ...proposal, fromName })
    subject = customSubject || `Proposal for ${proposal.client || 'Your Project'}${proposal.expiration ? ` — Valid Until ${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
  }

  const fromAddress = fromName && fromEmail
    ? `${fromName} <${fromEmail}>`
    : 'QUOTEX <onboarding@resend.dev>'

  try {
    const payload = {
      from: fromAddress,
      to: [recipientEmail],
      subject,
      html,
    }
    if (pdfBase64) {
      payload.attachments = [{ filename: pdfFilename || 'Proposal.pdf', content: pdfBase64 }]
    }
    if (inReplyTo) {
      payload.headers = { 'In-Reply-To': inReplyTo, 'References': inReplyTo }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: result.message || 'Failed to send email.' })
    }

    // Persist outbound message to KV so it appears in the inbox
    const msgId = `out_${result.id || Date.now()}`
    await saveMessage({
      id: msgId,
      direction: 'outbound',
      from: { name: fromName || 'You', email: fromEmail || 'noreply@estimateiq' },
      to: [recipientEmail],
      subject,
      textBody: isReply ? replyText : '',
      htmlBody: html,
      messageId: result.id || msgId,
      inReplyTo: inReplyTo || null,
      receivedAt: new Date().toISOString(),
      read: true,
    })

    return res.status(200).json({ success: true, id: result.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
