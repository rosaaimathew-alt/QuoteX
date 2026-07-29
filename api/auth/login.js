import { createHmac } from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-me'

  // Build list of valid users from env vars.
  const users = [
    { email: process.env.ADMIN_EMAIL,  password: process.env.ADMIN_PASSWORD },
    { email: process.env.OFFICE_EMAIL, password: process.env.OFFICE_PASSWORD },
  ]

  // Additional teammates come from a single JSON env var so you can add/remove
  // people by editing ONE Vercel setting — no code change. Format:
  //   QUOTEX_USERS = [{"email":"jane@company.com","password":"theirPassword"}, ...]
  // Malformed or unset → ignored, so the core logins above always keep working.
  try {
    const extra = JSON.parse(process.env.QUOTEX_USERS || '[]')
    if (Array.isArray(extra)) {
      for (const u of extra) {
        if (u && u.email && u.password) users.push({ email: u.email, password: u.password })
      }
    }
  } catch { /* ignore malformed QUOTEX_USERS — never break login */ }

  const validUsers = users.filter(u => u.email && u.password)

  if (validUsers.length === 0) {
    return res.status(500).json({ error: 'Auth not configured on server' })
  }

  const matched = validUsers.find(
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
