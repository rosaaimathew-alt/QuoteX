import { createHmac, timingSafeEqual } from 'crypto'

// Verifies the HMAC-signed session token minted by api/auth/login.js.
// Token format: base64(payloadJson) + '.' + hmacSha256(secret, payloadJson)
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  // In production a real SESSION_SECRET is mandatory. If it is missing we must
  // NEVER fall back to a known/default secret — that would let anyone forge
  // tokens. Treat the missing-secret case as unauthorized instead.
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const secret = process.env.SESSION_SECRET || (isProd ? null : 'dev-secret-change-me')
  if (!secret) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const b64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  let payloadJson
  try {
    payloadJson = Buffer.from(b64, 'base64').toString('utf8')
  } catch {
    return null
  }

  const expected = createHmac('sha256', secret).update(payloadJson).digest('hex')
  if (sig.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(payloadJson)
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// Pulls the bearer token from the request. Returns the decoded payload, or
// sends a 401 and returns null. Guard every protected handler with:
//   if (!requireAuth(req, res)) return
export function requireAuth(req, res) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (req.headers?.['x-qx-token'] || null)
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized — please sign in again.' })
    return null
  }
  return payload
}
