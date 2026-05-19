import { createHmac } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  const adminEmail    = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const secret        = process.env.SESSION_SECRET || 'dev-secret-change-me'

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({ error: 'Auth not configured on server' })
  }

  if (
    email?.toLowerCase() === adminEmail.toLowerCase() &&
    password === adminPassword
  ) {
    const payload = JSON.stringify({ email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
    const sig     = createHmac('sha256', secret).update(payload).digest('hex')
    const token   = Buffer.from(payload).toString('base64') + '.' + sig
    return res.status(200).json({ token })
  }

  return res.status(401).json({ error: 'Invalid email or password' })
}
