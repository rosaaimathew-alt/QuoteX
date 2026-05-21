/**
 * Merged email handler — routes by req.body.action:
 *   (none / 'proposal')   → send proposal email or reply
 *   'payment-reminder'    → payment milestone reminder
 *   'followup'            → quote follow-up
 *   'closeout'            → project completion email
 *
 * Consolidates 4 endpoints into 1 to stay within Vercel Hobby's 12-function limit.
 */
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { saveMessage } from './_store.js'
import { sendMail, isMailerConfigured } from './_mailer.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Proposal email HTML ───────────────────────────────────────────────────────
function buildProposalHtml({ client, email, address, expiration, lines, companyName, fromName }) {
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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0f172a;padding:32px 40px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${company}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Proposal · ${today}</p>
      </td></tr>
      <tr><td style="padding:32px 40px 24px;">
        <p style="margin:0 0 12px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
          Thank you for the opportunity to work with you. Please find your project proposal below.
          ${expirationFormatted ? `This proposal is valid until <strong>${expirationFormatted}</strong>.` : ''}
          Feel free to reach out with any questions.
        </p>
      </td></tr>
      ${address ? `<tr><td style="padding:0 40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;">
          <tr><td style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding-bottom:8px;">Project Address</td></tr>
          <tr><td style="font-size:14px;color:#1e293b;">${address}</td></tr>
        </table>
      </td></tr>` : ''}
      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
      <tr><td style="padding:24px 40px 0;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Proposal Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Item</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:100px;">Amount</th>
          </tr></thead>
          <tbody>${lineRows}</tbody>
          <tfoot><tr style="background:#0f172a;">
            <td colspan="2" style="padding:14px 16px;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.02em;">TOTAL INVESTMENT</td>
            <td style="padding:14px 16px;text-align:right;font-size:18px;font-weight:700;color:#ffffff;">$${fmt(subtotal)}</td>
          </tr></tfoot>
        </table>
      </td></tr>
      <tr><td style="padding:28px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px;border-left:4px solid #3b82f6;">
          <tr><td style="padding:16px 20px;font-size:13px;color:#1e40af;line-height:1.6;">
            To accept this proposal, simply reply to this email or give us a call.
            A 20% deposit is required to schedule your project.
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          Sent by <strong style="color:#475569;">${sender}</strong> via ${company}
          ${email ? ` · <a href="mailto:${email}" style="color:#3b82f6;text-decoration:none;">${email}</a>` : ''}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`
}

// ── Payment reminder HTML ─────────────────────────────────────────────────────
function buildReminderHtml({ client, amount, milestone, dueDate, contractNum, address, projectType }) {
  const company = 'Ebony Outdoor Living'
  const dueLine = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0f172a;padding:28px 40px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Payment Reminder</p>
      </td></tr>
      <tr><td style="padding:32px 40px 24px;">
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
          ${amount ? `<tr><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;" colspan="2">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:700;">Amount Due</span>
            <span style="float:right;font-size:22px;font-weight:800;color:#0f172a;">$${fmt(amount)}</span>
          </td></tr>` : ''}
        </table>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
          Please reply to this email or call us to arrange payment. Thank you for your continued business!
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;"><strong style="color:#475569;">${company}</strong> · Reply to this email with any questions</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`
}

// ── Follow-up HTML ────────────────────────────────────────────────────────────
function buildFollowupHtml({ client, total, address, projectType, sentDaysAgo, expiration, contractNum }) {
  const company  = 'Ebony Outdoor Living'
  const isUrgent = sentDaysAgo >= 14
  const expiryLine = expiration
    ? new Date(expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const ctaText = isUrgent
    ? `We wanted to follow up one more time on your proposal. If you're still interested, we'd love to get your project scheduled — our calendar is filling up and we want to make sure we can accommodate you.`
    : `We wanted to follow up on the proposal we sent you. Have you had a chance to review it? We're happy to answer any questions or adjust the scope to fit your needs.`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#0f172a;padding:28px 40px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Proposal Follow-Up</p>
      </td></tr>
      <tr><td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">${ctaText}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
          ${contractNum ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Quote #</td><td style="padding:4px 0;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">${contractNum}</td></tr>` : ''}
          ${address ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project Address</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${address}</td></tr>` : ''}
          ${projectType ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Project</td><td style="padding:4px 0;font-size:13px;color:#1e293b;text-align:right;">${projectType}</td></tr>` : ''}
          ${expiryLine ? `<tr><td style="padding:4px 0;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Proposal Valid Until</td><td style="padding:4px 0;font-size:13px;color:#dc2626;font-weight:700;text-align:right;">${expiryLine}</td></tr>` : ''}
          ${total ? `<tr><td style="padding:12px 0 0;border-top:1px solid #e2e8f0;" colspan="2">
            <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:700;">Proposal Total</span>
            <span style="float:right;font-size:22px;font-weight:800;color:#0f172a;">$${fmt(total)}</span>
          </td></tr>` : ''}
        </table>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">Simply reply to this email or give us a call — we're happy to chat through any details.</p>
      </td></tr>
      ${isUrgent ? `<tr><td style="padding:0 40px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-radius:8px;border-left:4px solid #eab308;">
          <tr><td style="padding:14px 18px;font-size:13px;color:#854d0e;line-height:1.6;">Our schedule fills up quickly. A deposit can lock in your start date now.</td></tr>
        </table>
      </td></tr>` : ''}
      <tr><td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;"><strong style="color:#475569;">${company}</strong> · Reply to this email or call us to get started</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`
}

// ── Close-out HTML ────────────────────────────────────────────────────────────
function buildCloseoutHtml({ client, contractNum, address, projectType, completionDate }) {
  const company = 'Ebony Outdoor Living'
  const completionFormatted = completionDate
    ? new Date(completionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'recently'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
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
          If you have any warranty concerns down the road, don't hesitate to reach out — we stand behind our work.
          And if you know anyone looking for outdoor living improvements, a referral is the greatest compliment we can receive!
        </p>
      </td></tr>
      <tr><td style="background:#f0fdf4;padding:20px 40px;border-top:1px solid #d1fae5;">
        <p style="margin:0;font-size:12px;color:#6b7280;"><strong style="color:#374151;">${company}</strong> · Thank you for choosing us!</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isMailerConfigured()) {
    return res.status(500).json({ error: 'Gmail SMTP not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to Vercel environment variables.' })
  }

  const { action, ...body } = req.body || {}

  // ── Payment reminder ──────────────────────────────────────────────────────
  if (action === 'payment-reminder') {
    const { toEmail, client, amount, milestone, dueDate, contractNum, address, projectType } = body
    if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })
    const subject = `Payment Reminder — ${contractNum || 'Your Project'} · Ebony Outdoor Living`
    const result  = await sendMail({ to: toEmail, subject, html: buildReminderHtml({ client, amount, milestone, dueDate, contractNum, address, projectType }) })
    if (result.error) return res.status(500).json({ error: result.error })
    return res.status(200).json({ success: true })
  }

  // ── Follow-up ─────────────────────────────────────────────────────────────
  if (action === 'followup') {
    const { toEmail, client, total, address, projectType, sentAt, expiration, contractNum } = body
    if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })
    const sentDaysAgo = sentAt ? Math.round((Date.now() - new Date(sentAt)) / 86400000) : 7
    const result = await sendMail({
      to: toEmail,
      subject: `Following Up — Your Ebony Outdoor Living Proposal`,
      html: buildFollowupHtml({ client, total, address, projectType, sentDaysAgo, expiration, contractNum }),
    })
    if (result.error) return res.status(500).json({ error: result.error })
    return res.status(200).json({ success: true })
  }

  // ── Close-out ─────────────────────────────────────────────────────────────
  if (action === 'closeout') {
    const { toEmail, client, contractNum, address, projectType, completionDate } = body
    if (!toEmail) return res.status(400).json({ error: 'Recipient email is required.' })
    const result = await sendMail({
      to: toEmail,
      subject: `Your Project is Complete — Thank You! · ${contractNum || 'Ebony Outdoor Living'}`,
      html: buildCloseoutHtml({ client, contractNum, address, projectType, completionDate }),
    })
    if (result.error) return res.status(500).json({ error: result.error })
    return res.status(200).json({ success: true })
  }

  // ── Proposal email (default) ──────────────────────────────────────────────
  const { proposal, fromName, fromEmail, replyText, inReplyTo, subject: customSubject, pdfBase64, pdfFilename } = body
  const recipientEmail = proposal?.email
  if (!recipientEmail) return res.status(400).json({ error: 'Recipient email is required.' })

  const isReply = !!replyText
  const company = proposal?.companyName || 'Ebony Outdoor Living'
  const sender  = fromName || company

  let html, subject
  if (isReply) {
    html    = `<div style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;">${replyText.replace(/\n/g, '<br>')}</div>`
    subject = customSubject || `Re: Your Proposal`
  } else if (pdfBase64) {
    const client  = proposal?.client || 'there'
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
      Thank you for the opportunity to work with you. Please find your project proposal attached as a PDF. ${expLine}
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
</table></td></tr></table></body></html>`
    subject = customSubject || `Proposal for ${proposal.client || 'Your Project'}${proposal.expiration ? ` — Valid Until ${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
  } else {
    html    = buildProposalHtml({ ...proposal, fromName })
    subject = customSubject || `Proposal for ${proposal.client || 'Your Project'}${proposal.expiration ? ` — Valid Until ${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`
  }

  const attachments = pdfBase64
    ? [{ filename: pdfFilename || 'Proposal.pdf', content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
    : undefined

  const result = await sendMail({ to: recipientEmail, subject, html, attachments })
  if (result.error) return res.status(500).json({ error: result.error })

  const msgId = `out_${result.messageId || Date.now()}`
  await saveMessage({
    id: msgId, direction: 'outbound',
    from: { name: fromName || 'You', email: process.env.GMAIL_USER || 'noreply' },
    to: [recipientEmail], subject,
    textBody: isReply ? replyText : '',
    htmlBody: html,
    messageId: result.messageId || msgId,
    inReplyTo: inReplyTo || null,
    receivedAt: new Date().toISOString(),
    read: true,
  })
  return res.status(200).json({ success: true, id: result.messageId })
}
