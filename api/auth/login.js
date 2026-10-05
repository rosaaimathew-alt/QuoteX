import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'crypto'
import { verifyToken } from '../_auth.js'

// ── Accounts ─────────────────────────────────────────────────────────────────
// Two kinds of login:
//   1. Env-configured (legacy): ADMIN_EMAIL/OFFICE_EMAIL + QUOTEX_USERS. Managed
//      in Vercel; cannot change their own password here.
//   2. Self-registered: created on /signup with the team code (SIGNUP_CODE env
//      var), stored in KV as user:<email> with a scrypt password hash and a
//      role. They set and change their own passwords; managers can set roles,
//      remove accounts, or issue a temporary password.
// All actions live in this one function (Vercel Hobby 12-function limit) and
// are selected with ?action=… : login (default) · signup · change-password ·
// me · list-users · set-role · remove-user · reset-password.

// ── In-memory per-IP rate limiter ──────────────────────────────────────────
const RATE_LIMIT_MAX     = 5                    // failed attempts allowed…
const RATE_LIMIT_WINDOW  = 15 * 60 * 1000       // …within this window (ms)
const failedAttempts     = new Map()            // ip -> { count, first }

function clientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
}
function isRateLimited(ip) {
  const rec = failedAttempts.get(ip)
  if (!rec) return false
  if (Date.now() - rec.first > RATE_LIMIT_WINDOW) { failedAttempts.delete(ip); return false }
  return rec.count >= RATE_LIMIT_MAX
}
function recordFailure(ip) {
  const rec = failedAttempts.get(ip)
  if (!rec || Date.now() - rec.first > RATE_LIMIT_WINDOW) failedAttempts.set(ip, { count: 1, first: Date.now() })
  else rec.count += 1
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLES = ['manager', 'sales', 'pm']
const normEmail  = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const userKey    = (email) => `user:${normEmail(email)}`

function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString('hex')}`
}
// Stored value is either "scrypt$<salt>$<hash>" or (legacy env) plaintext.
function passwordMatches(stored, submitted) {
  if (typeof stored !== 'string' || typeof submitted !== 'string') return false
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$')
    if (parts.length !== 3) return false
    try {
      const expected = Buffer.from(parts[2], 'hex')
      const derived  = scryptSync(submitted, parts[1], 64)
      return expected.length === derived.length && timingSafeEqual(expected, derived)
    } catch { return false }
  }
  return safeEqual(stored, submitted)
}
function safeEqual(a, b) {
  try {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b))
    return x.length === y.length && timingSafeEqual(x, y)
  } catch { return false }
}

function envUsers() {
  const users = []
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
    users.push({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'manager', name: 'Owner', source: 'env' })
  if (process.env.OFFICE_EMAIL && process.env.OFFICE_PASSWORD)
    users.push({ email: process.env.OFFICE_EMAIL, password: process.env.OFFICE_PASSWORD, role: 'manager', name: 'Office', source: 'env' })
  try {
    const extra = JSON.parse(process.env.QUOTEX_USERS || '[]')
    if (Array.isArray(extra)) for (const u of extra) {
      if (u && u.email && u.password) users.push({ email: u.email, password: u.password, role: ROLES.includes(u.role) ? u.role : 'sales', name: u.name || '', source: 'env' })
    }
  } catch { /* malformed QUOTEX_USERS — ignore, never break login */ }
  return users
}

async function getKV() { const { kv } = await import('@vercel/kv'); return kv }

function mintToken(user, secret) {
  const payload = JSON.stringify({
    email: user.email, name: user.name || '', role: ROLES.includes(user.role) ? user.role : 'manager',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + sig
}
function bearer(req) {
  const h = req.headers.authorization || ''
  return h.startsWith('Bearer ') ? h.slice(7) : (req.headers['x-qx-token'] || null)
}
const publicUser = (u) => ({ email: u.email, name: u.name || '', role: u.role || 'manager', source: u.source || 'kv', createdAt: u.createdAt || null })

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  const secret = process.env.SESSION_SECRET || (isProd ? null : 'dev-secret-change-me')
  if (!secret) return res.status(500).json({ error: 'Auth not configured' })

  const action = String((req.query && req.query.action) || (req.body && req.body.action) || 'login')
  const ip = clientIp(req)
  const body = req.body || {}

  try {
    // ── Sign in ────────────────────────────────────────────────────────────
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).end()
      if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many attempts, try again later' })
      const email = normEmail(body.email), password = body.password
      const env = envUsers().find(u => normEmail(u.email) === email && passwordMatches(u.password, password))
      if (env) { failedAttempts.delete(ip); return res.status(200).json({ token: mintToken(env, secret), role: env.role, name: env.name }) }
      const kv = await getKV()
      const user = await kv.get(userKey(email))
      if (user && passwordMatches(user.passHash, password)) {
        failedAttempts.delete(ip)
        return res.status(200).json({ token: mintToken(user, secret), role: user.role, name: user.name })
      }
      recordFailure(ip)
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // ── Create your own account (needs the team code) ──────────────────────
    if (action === 'signup') {
      if (req.method !== 'POST') return res.status(405).end()
      const teamCode = process.env.SIGNUP_CODE
      if (!teamCode) return res.status(403).json({ error: 'Sign-up is not enabled. Ask your administrator to set a team code.' })
      if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many attempts, try again later' })
      const name = String(body.name || '').trim(), email = normEmail(body.email), password = String(body.password || '')
      if (!safeEqual(String(body.code || '').trim(), teamCode)) { recordFailure(ip); return res.status(403).json({ error: 'That team code is not right.' }) }
      if (!name) return res.status(400).json({ error: 'Please enter your name.' })
      if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })
      if (envUsers().some(u => normEmail(u.email) === email)) return res.status(409).json({ error: 'That email is already set up. Sign in instead.' })
      const kv = await getKV()
      if (await kv.get(userKey(email))) return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' })
      const user = { email, name, role: 'sales', passHash: hashPassword(password), createdAt: new Date().toISOString() }
      await kv.set(userKey(email), user)
      await kv.sadd('users:index', email)
      failedAttempts.delete(ip)
      return res.status(200).json({ token: mintToken(user, secret), role: user.role, name: user.name })
    }

    // ── Everything below needs a signed-in user ────────────────────────────
    const me = verifyToken(bearer(req))
    if (!me) return res.status(401).json({ error: 'Unauthorized — please sign in again.' })
    const kv = await getKV()

    if (action === 'me') return res.status(200).json({ email: me.email, name: me.name || '', role: me.role || 'manager' })

    if (action === 'change-password') {
      if (req.method !== 'POST') return res.status(405).end()
      const user = await kv.get(userKey(me.email))
      if (!user) return res.status(400).json({ error: 'This login is managed by your administrator in Vercel; ask them to change it.' })
      if (!passwordMatches(user.passHash, String(body.currentPassword || ''))) return res.status(401).json({ error: 'Current password is not right.' })
      const next = String(body.newPassword || '')
      if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' })
      await kv.set(userKey(me.email), { ...user, passHash: hashPassword(next), passwordChangedAt: new Date().toISOString() })
      return res.status(200).json({ ok: true })
    }

    // Manager-only from here. (Tokens issued before roles existed have no role
    // and are treated as managers so existing owner/office logins keep working.)
    if (me.role && me.role !== 'manager') return res.status(403).json({ error: 'Managers only.' })

    if (action === 'list-users') {
      const emails = (await kv.smembers('users:index')) || []
      const rows = await Promise.all(emails.map(e => kv.get(userKey(e))))
      const users = [...envUsers().map(publicUser), ...rows.filter(Boolean).map(publicUser)]
      return res.status(200).json({ users, signupEnabled: !!process.env.SIGNUP_CODE })
    }
    if (action === 'set-role') {
      if (req.method !== 'POST') return res.status(405).end()
      const email = normEmail(body.email), role = String(body.role || '')
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Unknown role.' })
      const user = await kv.get(userKey(email))
      if (!user) return res.status(400).json({ error: 'That login is managed in Vercel (QUOTEX_USERS); set its role there.' })
      await kv.set(userKey(email), { ...user, role })
      return res.status(200).json({ ok: true })
    }
    if (action === 'remove-user') {
      if (req.method !== 'POST') return res.status(405).end()
      const email = normEmail(body.email)
      if (email === normEmail(me.email)) return res.status(400).json({ error: 'You cannot remove your own login.' })
      if (!(await kv.get(userKey(email)))) return res.status(400).json({ error: 'That login is managed in Vercel; remove it there.' })
      await kv.del(userKey(email))
      await kv.srem('users:index', email)
      return res.status(200).json({ ok: true })
    }
    if (action === 'reset-password') {
      if (req.method !== 'POST') return res.status(405).end()
      const email = normEmail(body.email), next = String(body.newPassword || '')
      if (next.length < 8) return res.status(400).json({ error: 'Temporary password must be at least 8 characters.' })
      const user = await kv.get(userKey(email))
      if (!user) return res.status(400).json({ error: 'That login is managed in Vercel; change it there.' })
      await kv.set(userKey(email), { ...user, passHash: hashPassword(next), passwordChangedAt: new Date().toISOString() })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
