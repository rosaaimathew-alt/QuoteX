import crypto from 'crypto'
import { uploadToDrive } from '../_google-drive.js'
import { verifyToken } from '../_auth.js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const ROLES = ['client', 'builder', 'gc']

// Signature images (one PNG per initial field, per signer) can push a contract
// record close to 1 MB, which some Redis plans refuse to store. So each signer's
// signatures live in their own key (sigv:<recordId>:<role>) and are reassembled
// on read. Records written before this change may still carry signatures
// inline; loadRecord honours both.
async function loadRecord(kv, recordId) {
  const rec = await kv.get(`sign:${recordId}`)
  if (!rec) return null
  const signatures = { ...(rec.signatures || {}) }
  const parts = await Promise.all(ROLES.map(r => kv.get(`sigv:${recordId}:${r}`)))
  ROLES.forEach((r, i) => { if (parts[i]) signatures[r] = parts[i] })
  return { ...rec, signatures }
}
async function saveRecord(kv, recordId, rec) {
  const { signatures = {}, ...rest } = rec || {}
  await kv.set(`sign:${recordId}`, { ...rest, signatures: {} })
  await Promise.all(ROLES.filter(r => signatures[r]).map(r => kv.set(`sigv:${recordId}:${r}`, signatures[r])))
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const token = req.query.token
  if (!token) return res.status(400).json({ error: 'Missing token' })

  // Admin actions (create links / recover links / look up by contract number)
  // require a signed-in operator. Client signing via role tokens stays public.
  const isAdminAction = token === 'create' || token === 'pcreate' || token === 'kvdump' || token === 'kvload' || token.startsWith('recover-') || token.startsWith('lookup-') || token.startsWith('record-') || token.startsWith('pdata-')
  if (isAdminAction) {
    const header = req.headers.authorization || ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-qx-token'] || null)
    if (!verifyToken(bearer)) return res.status(401).json({ error: 'Unauthorized' })
  }

  // Health check
  if (token === 'ping') {
    return res.json({
      ok: true,
      ts: new Date().toISOString(),
      version: 'recovery-v1',
    })
  }

  try {
    const { kv } = await import('@vercel/kv')

    // ── CREATE new signing request with 3 role-specific links ────────
    if (token === 'create') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { contractData, contractNum } = req.body || {}
      if (!contractData) return res.status(400).json({ error: 'Missing contractData' })

      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      const linksFor = (tokens) => ({
        client:  `${proto}://${host}/sign/${tokens.client}`,
        builder: `${proto}://${host}/sign/${tokens.builder}`,
        gc:      `${proto}://${host}/sign/${tokens.gc}`,
      })

      // Re-sending for the same contract must NOT mint a new record while the
      // existing one is still unsigned — otherwise the customer signs the link
      // they were sent while the app watches a newer, empty record and shows
      // "not signed". Update the unsigned record in place and hand back the
      // same links. Once anything is signed, a new record (revision) is made.
      if (contractNum) {
        const existingId = await kv.get(`sign-by-contract:${contractNum}`)
        const existing   = existingId ? await loadRecord(kv, existingId) : null
        if (existing && existing.roleTokens && !Object.keys(existing.signatures || {}).length) {
          await kv.set(`sign:${existingId}`, { ...existing, signatures: {}, contractData, updatedAt: Date.now() })
          return res.json({ recordId: existingId, reused: true, links: linksFor(existing.roleTokens) })
        }
      }

      const recordId    = crypto.randomUUID()
      const roleTokens  = {
        client:  crypto.randomUUID(),
        builder: crypto.randomUUID(),
        gc:      crypto.randomUUID(),
      }
      // Signing records are legal documents: they never expire.

      await kv.set(`sign:${recordId}`, {
        contractData,
        contractNum: contractNum || '',
        status:      'pending',
        createdAt:   Date.now(),
        signatures:  {},
        roleTokens,
      })

      await Promise.all(ROLES.map(role =>
        kv.set(`link:${roleTokens[role]}`, { recordId, role })
      ))

      if (contractNum) {
        await kv.set(`sign-by-contract:${contractNum}`, recordId)
        await kv.sadd(`sign-records:${contractNum}`, recordId)   // every record ever made for this contract
      }

      return res.json({ recordId, links: linksFor(roleTokens) })
    }

    // ── CREATE a tracked proposal-view link (auth) ───────────────────
    // Stores a display-only snapshot of the proposal under a permanent token
    // (no TTL) so the customer's link never expires, and logs every open.
    if (token === 'pcreate') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { proposalId, snapshot } = req.body || {}
      if (!snapshot) return res.status(400).json({ error: 'Missing snapshot' })
      // Reuse the same link for a given proposal across re-sends so the open
      // history stays on one link instead of fragmenting.
      let viewToken = proposalId != null ? await kv.get(`pview-by-proposal:${proposalId}`) : null
      if (viewToken) {
        const existing = await kv.get(`pview:${viewToken}`)
        if (existing) await kv.set(`pview:${viewToken}`, { ...existing, snapshot, updatedAt: Date.now() })
        else viewToken = null
      }
      if (!viewToken) {
        viewToken = crypto.randomUUID()
        await kv.set(`pview:${viewToken}`, { proposalId: proposalId ?? null, snapshot, opens: [], createdAt: Date.now() })
        if (proposalId != null) await kv.set(`pview-by-proposal:${proposalId}`, viewToken)
      }
      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      // No customer PII in the URL (leaks via logs/history/referrer). Contact info
      // is read separately through the authenticated pdata- lookup by token.
      return res.json({ token: viewToken, url: `${proto}://${host}/p/${viewToken}` })
    }

    // ── ADMIN: dump / load the signing-related KV records ─────────────
    // Signing records, role links, tracked proposal views and change-order
    // records live OUTSIDE the quotex:store blob. The Full Backup pulls them
    // page by page with kvdump and the Import writes them back with kvload,
    // so a backup / hand-off carries the signatures too.
    const KV_PATTERNS = ['sign:*', 'sigv:*', 'link:*', 'sign-by-contract:*', 'pview:*', 'pview-by-proposal:*', 'co:*', 'co-link:*']
    if (token === 'kvdump') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { match = 'sign:*', cursor = 0, count = 100 } = req.body || {}
      if (!KV_PATTERNS.includes(match)) return res.status(400).json({ error: 'Bad pattern' })
      const [next, keys] = await kv.scan(Number(cursor) || 0, { match, count: Math.min(Number(count) || 100, 200) })
      const items = []
      for (const key of keys || []) {
        const [value, ttl] = await Promise.all([kv.get(key), kv.ttl(key)])
        if (value !== null && value !== undefined) items.push({ key, value, ttl: ttl > 0 ? ttl : null })
      }
      return res.json({ items, cursor: Number(next) || 0 })
    }
    if (token === 'kvload') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { items } = req.body || {}
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Missing items' })
      const okPrefix = /^(sign|sigv|link|sign-by-contract|pview|pview-by-proposal|co|co-link):/
      let loaded = 0
      const errors = []
      for (const it of items) {
        if (!it || typeof it.key !== 'string' || !okPrefix.test(it.key)) continue
        try {
          // A contract record with inline signatures (older export) is split on
          // the way in so nothing oversized is ever written. Stored permanently.
          if (it.key.startsWith('sign:') && it.value && Object.keys(it.value.signatures || {}).length) {
            await saveRecord(kv, it.key.slice('sign:'.length), it.value)
          } else {
            await kv.set(it.key, it.value)
          }
          loaded++
        } catch (e) {
          errors.push({ key: it.key, error: String(e && e.message || e).slice(0, 200) })
        }
      }
      return res.json({ ok: true, loaded, errors })
    }

    // ── PUBLIC: open a tracked proposal — records the view ────────────
    if (token.startsWith('popen-')) {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
      const viewToken = token.slice('popen-'.length)
      const rec = await kv.get(`pview:${viewToken}`)
      if (!rec) return res.status(404).json({ error: 'Proposal not found' })
      // Don't let email-security scanners / link-preview crawlers inflate the
      // count — still render the page for them, just don't log it as an open.
      const ua = req.headers['user-agent'] || ''
      const isBot = /bot|crawler|spider|preview|scanner|facebookexternalhit|slackbot|whatsapp|telegram|proofpoint|mimecast|barracuda|googleimageproxy|bingpreview|linkpreview|curl|wget|python-requests|headless/i.test(ua)
      let opens = rec.opens || []
      if (!isBot) {
        opens = [...opens, {
          at: Date.now(),
          ua: ua.slice(0, 200),
          ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
        }].slice(-1000)
        await kv.set(`pview:${viewToken}`, { ...rec, opens })
      }
      // Strip contact PII from the PUBLIC response — the quote page doesn't need
      // the customer's email/phone, so don't expose it to anyone holding the link.
      const { email, phone, ...publicSnapshot } = rec.snapshot || {}
      return res.json({ snapshot: publicSnapshot, openCount: opens.length })
    }

    // ── ADMIN: open history + customer contact for the activity log / sender agent.
    // Auth-gated (isAdminAction), so contact PII is only ever returned to a
    // signed-in operator/agent — never in the URL or the public page.
    if (token.startsWith('pdata-')) {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
      const viewToken = token.slice('pdata-'.length)
      const rec = await kv.get(`pview:${viewToken}`)
      const opens = rec?.opens || []
      const s = rec?.snapshot || {}
      return res.json({
        opens,
        openCount: opens.length,
        contact: { name: s.client || '', email: s.email || '', phone: s.phone || '' },
      })
    }

    // ── Admin record lookup: /api/sign/record-<recordId> ─────────────
    if (token.startsWith('record-') && req.method === 'GET') {
      const recordId = token.slice('record-'.length)
      const rec = await loadRecord(kv, recordId)
      if (!rec) return res.status(404).json({ error: 'Record not found or expired' })
      kv.persist(`sign:${recordId}`).catch(() => {})
      return res.json({
        recordId,
        contractData: rec.contractData,
        contractNum:  rec.contractNum,
        status:       rec.status,
        createdAt:    rec.createdAt,
        signatures:   rec.signatures || {},
      })
    }

    // ── Recover signing links from a record: /api/sign/recover-<recordId> ──
    if (token.startsWith('recover-') && req.method === 'GET') {
      const recordId = token.slice('recover-'.length)
      const rec = await loadRecord(kv, recordId)
      if (!rec) return res.status(404).json({ error: 'Record not found or expired' })
      if (!rec.roleTokens) return res.status(404).json({ error: 'No role tokens stored — this record predates link recovery support' })

      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      return res.json({
        recordId,
        status:     rec.status,
        signatures: rec.signatures || {},
        links: {
          client:  `${proto}://${host}/sign/${rec.roleTokens.client}`,
          builder: `${proto}://${host}/sign/${rec.roleTokens.builder}`,
          gc:      `${proto}://${host}/sign/${rec.roleTokens.gc}`,
        },
      })
    }

    // ── Lookup by contract number: /api/sign/lookup-<contractNum> ────────────
    if (token.startsWith('lookup-') && req.method === 'GET') {
      const contractNum = decodeURIComponent(token.slice('lookup-'.length))
      // A contract can have several records (links re-sent over time). Return
      // the one that matters: fully signed > client-signed > newest.
      const ids = new Set()
      const latest = await kv.get(`sign-by-contract:${contractNum}`)
      if (latest) ids.add(latest)
      for (const id of (await kv.smembers(`sign-records:${contractNum}`)) || []) ids.add(id)
      let candidates = (await Promise.all([...ids].map(id => loadRecord(kv, id).then(r => r && { id, r })))).filter(Boolean)
      // Records made before the index existed: find them by contract number.
      if (!candidates.some(c => c.r.signatures && c.r.signatures.client)) {
        let cursor = 0
        do {
          const [next, keys] = await kv.scan(cursor, { match: 'sign:*', count: 200 })
          for (const key of keys || []) {
            const id = key.slice('sign:'.length)
            if (ids.has(id)) continue
            const r = await loadRecord(kv, id)
            if (r && String(r.contractNum || '') === String(contractNum)) { ids.add(id); candidates.push({ id, r }) }
          }
          cursor = Number(next) || 0
        } while (cursor)
      }
      if (!candidates.length) return res.status(404).json({ error: 'No signing record found for this contract number' })
      const score = (r) => (r.status === 'signed' ? 3 : 0) + (r.signatures && r.signatures.client ? 2 : 0)
      candidates.sort((a, b) => (score(b.r) - score(a.r)) || ((b.r.createdAt || 0) - (a.r.createdAt || 0)))
      const recordId = candidates[0].id
      const rec = candidates[0].r
      if (!rec.roleTokens) return res.status(404).json({ error: 'No role tokens stored in this record' })

      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      return res.json({
        recordId,
        status:      rec.status,
        contractNum: rec.contractNum,
        signatures:  rec.signatures || {},
        links: {
          client:  `${proto}://${host}/sign/${rec.roleTokens.client}`,
          builder: `${proto}://${host}/sign/${rec.roleTokens.builder}`,
          gc:      `${proto}://${host}/sign/${rec.roleTokens.gc}`,
        },
      })
    }

    // ── Existing role-specific token ──────────────────────────────────
    const link = await kv.get(`link:${token}`)
    if (!link) return res.status(404).json({ error: 'Signing link not found or expired' })

    const record = await loadRecord(kv, link.recordId)
    if (!record) return res.status(404).json({ error: 'Contract record not found' })
    // Records created before expiry was removed still carry a countdown: clear it on touch.
    Promise.all([kv.persist(`sign:${link.recordId}`), kv.persist(`link:${token}`)]).catch(() => {})

    if (req.method === 'GET') {
      return res.json({
        role:         link.role,
        recordId:     link.recordId,
        contractData: record.contractData,
        contractNum:  record.contractNum,
        status:       record.status,
        signatures:   record.signatures || {},
        alreadySigned: !!(record.signatures && record.signatures[link.role]),
      })
    }

    if (req.method === 'POST') {
      const { signatureDataUrl, fieldSignatures, printedName, pdfBase64, fileName, esignConsent, agreementAgreedAt } = req.body || {}
      if (!signatureDataUrl && !fieldSignatures) return res.status(400).json({ error: 'Missing signature' })

      const signatures = record.signatures || {}
      if (signatures[link.role]) return res.status(409).json({ error: `Already signed as ${link.role}` })

      signatures[link.role] = {
        signatureDataUrl: signatureDataUrl || null,
        fields:           fieldSignatures  || {},
        printedName:      printedName || '',
        signedAt:         Date.now(),
        ip:               req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
        userAgent:        req.headers['user-agent'] || 'unknown',
        esignConsent:     !!esignConsent,          // ESIGN/UETA consent captured at signing
        esignConsentAt:   esignConsent ? Date.now() : null,
        agreementAgreedAt: agreementAgreedAt || null,  // binding-agreement accepted on open
      }

      const required  = ['client', 'builder']
      const allSigned = required.every(r => signatures[r])
      await saveRecord(kv, link.recordId, { ...record, signatures, status: allSigned ? 'signed' : 'partial' })

      let driveResult = null
      if (pdfBase64 && fileName) {
        try { driveResult = await uploadToDrive({ pdfBase64, fileName }) } catch {}
      }
      return res.json({ ok: true, allSigned, driveResult })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
