import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function buildEmailHtml({ client, email, phone, address, expiration, lines, companyName }) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const expirationFormatted = expiration
    ? new Date(expiration + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)

  // Group lines by section
  const sectionOrder = []
  const sections = {}
  lines.forEach((l) => {
    const key = (l.section || l.category || 'General').trim()
    if (!sections[key]) { sections[key] = []; sectionOrder.push(key) }
    sections[key].push(l)
  })

  const scopeRows = sectionOrder.map((key) => {
    const items = sections[key]
    const itemHtml = items.map((l) => `
      <div style="margin-bottom:10px;padding-left:12px;border-left:3px solid #DBEAFE;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${l.name}</p>
        ${l.description ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${l.description}</p>` : ''}
      </div>`).join('')
    return `
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1d4ed8;">${key}</span>
          <div style="flex:1;height:1px;background:#DBEAFE;margin-left:10px;"></div>
        </div>
        ${itemHtml}
      </div>`
  }).join('')

  const priceRows = lines.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding:10px 12px;font-size:13px;color:#1e293b;font-weight:500;">${l.name || '—'}</td>
      <td style="padding:10px 12px;font-size:13px;color:#475569;text-align:center;">${l.qty}</td>
      <td style="padding:10px 12px;font-size:12px;color:#94a3b8;text-align:center;">${l.unit}</td>
      <td style="padding:10px 12px;font-size:13px;color:#475569;text-align:right;">$${fmt(l.unitPrice)}</td>
      <td style="padding:10px 12px;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">$${fmt(l.qty * l.unitPrice)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1d4ed8;padding:36px 40px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.02em;">PROPOSAL</h1>
          <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">${today}</p>
          ${expirationFormatted ? `<p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;font-weight:500;">Valid Until: ${expirationFormatted}</p>` : ''}
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:#ffffff;font-size:16px;font-weight:600;">${companyName || 'EstimateIQ'}</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Contractor Services</p>
        </div>
      </div>
    </div>

    <!-- Customer -->
    ${client || email || phone || address ? `
    <div style="padding:24px 40px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Prepared For</p>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          ${client ? `<p style="margin:0;font-size:18px;font-weight:600;color:#0f172a;">${client}</p>` : ''}
          ${address ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${address}</p>` : ''}
        </div>
        <div style="text-align:right;">
          ${phone ? `<p style="margin:0;font-size:13px;color:#64748b;">${phone}</p>` : ''}
          ${email ? `<p style="margin:4px 0 0;font-size:13px;color:#64748b;">${email}</p>` : ''}
        </div>
      </div>
    </div>` : ''}

    <!-- Scope of Work -->
    <div style="padding:28px 40px;border-bottom:1px solid #f1f5f9;">
      <p style="margin:0 0 20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Scope of Work</p>
      ${scopeRows}
    </div>

    <!-- Pricing Table -->
    <div style="padding:28px 40px;">
      <p style="margin:0 0 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Pricing</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #e2e8f0;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:50px;">Qty</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:50px;">Unit</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:100px;">Unit Price</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;width:100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${priceRows}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #cbd5e1;">
            <td colspan="3"></td>
            <td style="padding:16px 12px;text-align:right;font-size:13px;font-weight:600;color:#475569;">TOTAL</td>
            <td style="padding:16px 12px;text-align:right;font-size:20px;font-weight:700;color:#1d4ed8;">$${fmt(subtotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Terms -->
    <div style="padding:0 40px 40px;">
      <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:12px;color:#64748b;line-height:1.6;">
        <p style="margin:0 0 4px;font-weight:600;color:#475569;">Terms &amp; Conditions</p>
        <p style="margin:0;">${expirationFormatted ? `This proposal is valid until ${expirationFormatted}.` : 'This proposal is valid for 30 days from the date above.'} A 50% deposit is required to schedule work. Final payment is due upon completion. Pricing is based on normal site conditions; any unforeseen conditions may result in additional costs with prior approval.</p>
      </div>
    </div>

  </div>
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

  const { proposal, fromName, fromEmail } = req.body
  if (!proposal?.email) {
    return res.status(400).json({ error: 'Recipient email is required.' })
  }

  const html = buildEmailHtml(proposal)
  const subject = `Proposal for ${proposal.client || 'Your Project'}${proposal.expiration ? ` — Valid Until ${new Date(proposal.expiration + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromName && fromEmail
          ? `${fromName} <${fromEmail}>`
          : 'EstimateIQ <onboarding@resend.dev>',
        to: [proposal.email],
        subject,
        html,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: result.message || 'Failed to send email.' })
    }

    return res.status(200).json({ success: true, id: result.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
