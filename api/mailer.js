/**
 * Gmail SMTP mailer utility.
 * Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel environment variables.
 * Generate an App Password at: https://myaccount.google.com/apppasswords
 */
import nodemailer from 'nodemailer'

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return _transporter
}

/**
 * Send an email via Gmail SMTP.
 * @param {{ to: string, subject: string, html: string, text?: string, attachments?: Array }} opts
 * @returns {{ success: true, messageId: string } | { error: string }}
 */
export async function sendMail({ to, subject, html, text, attachments }) {
  const transporter = getTransporter()
  if (!transporter) {
    return { error: 'Gmail SMTP not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to environment variables.' }
  }
  const from = `"Ebony Outdoor Living" <${process.env.GMAIL_USER}>`
  try {
    const info = await transporter.sendMail({ from, to, subject, html, text, attachments })
    return { success: true, messageId: info.messageId }
  } catch (err) {
    return { error: err.message }
  }
}

export function isMailerConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}
