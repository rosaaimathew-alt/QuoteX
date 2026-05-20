import { createHmac } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me'

  // Build list of valid users from env vars
  const users = [
    { email: process.env.ADMIN_EMAIL,  password: process.env.ADMIN_PASSWORD },
    { email: process.env.OFFICE_EMAIL, password: process.env.OFFICE_PASSWORD },
  ].filter(u => u.email && u.password)

  if (users.length === 0) {
    return res.status(500).json({ error: 'Auth not configured on server' })
  }

  const matched = users.find(
    u => u.email.toLowerCase() === email?.toLowerCase() && u.password === password
  )

  if (matched) {
    const payload = JSON.stringify({ email: matched.email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
    const sig     = createHmac('sha256', secret).update(payload).digest('hex')
    const token   = Buffer.from(payload).toString('base64') + '.' + sig
    return res.status(200).json({ token })
  }

  return res.status(401).json({ error: 'Invalid email or password' })
}
