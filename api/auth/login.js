import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'crypto'

// ── In-memory per-IP rate limiter ──────────────────────────────────────────
// Module-scope Map survives across invocations in a warm serverless container
// and in the local dev server. Best-effort only (a cold start resets it), but
// enough to blunt brute-force attempts. No external dependencies.
const RATE_LIMIT_MAX     = 5                    // failed attempts allowed…
const RATE_LIMIT_WINDOW  = 15 * 60 * 1000       // …within this window (ms)
const failedAttempts     = new Map()            // ip -> { count, first }

function clientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
}

// Returns true if this IP is currently over the limit.
function isRateLimited(ip) {
  const rec = failedAttempts.get(ip)
  if (!rec) return false
  if (Date.now() - rec.first > RATE_LIMIT_WINDOW) {
    failedAttempts.delete(ip)   // window expired — reset
    return false
  }
  return rec.count >= RATE_LIMIT_MAX
}

function recordFailure(ip) {
  const rec = failedAttempts.get(ip)
  if (!rec || Date.now() - rec.first > RATE_LIMIT_WINDOW) {
    failedAttempts.set(ip, { count: 1, first: Date.now() })
  } else {
    rec.count += 1
  }
}

// Compare a submitted password against a stored value. Supports an optional
// hashed form so an admin can migrate later without breaking anything now:
//   stored = "scrypt$<saltHex>$<hashHex>"  → verify via scrypt
//   otherwise                              → plaintext equality (legacy)
function passwordMatches(stored, submitted) {
  if (typeof stored !== 'string' || typeof submitted !== 'string') return false
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$')
    if (parts.length !== 3) return false
    const [, saltHex, hashHex] = parts
    try {
      const expected = Buffer.from(hashHex, 'hex')
      const derived  = scryptSync(submitted, saltHex, 64)
      if (expected.length !== derived.length) return false
      return timingSafeEqual(expected, derived)
    } catch {
      return false
    }
  }
  return stored === submitted
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body || {}

  // Production requires a real SESSION_SECRET; never sign tokens with a known
  // default. Local dev may fall back so it keeps working.
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const secret = process.env.SESSION_SECRET || (isProd ? null : 'dev-secret-change-me')
  if (!secret) return res.status(500).json({ error: 'Auth not configured' })

  const ip = clientIp(req)
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts, try again later' })
  }

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
    u => u.email.toLowerCase() === email?.toLowerCase() && passwordMatches(u.password, password)
  )

  if (matched) {
    failedAttempts.delete(ip)   // successful login clears this IP's counter
    const payload = JSON.stringify({ email: matched.email, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
    const sig     = createHmac('sha256', secret).update(payload).digest('hex')
    const token   = Buffer.from(payload).toString('base64') + '.' + sig
    return res.status(200).json({ token })
  }

  recordFailure(ip)
  return res.status(401).json({ error: 'Invalid email or password' })
}
