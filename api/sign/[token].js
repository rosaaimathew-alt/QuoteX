import crypto from 'crypto'
import { uploadToDrive } from '../google-drive.js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

const ROLES = ['client', 'builder', 'gc']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const token = req.query.token
  if (!token) return res.status(400).json({ error: 'Missing token' })

  // Health check — tells the client which version is deployed and if KV is wired up
  if (token === 'ping') {
    return res.json({
      ok: true,
      ts: new Date().toISOString(),
      version: 'docusign-style-v2',
      hasKvUrl: !!(process.env.KV_URL || process.env.KV_REST_API_URL),
      env: process.env.VERCEL_ENV || 'local',
    })
  }

  try {
    const { kv } = await import('@vercel/kv')

    // ── CREATE new signing request with 3 role-specific links ────────
    if (token === 'create') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { contractData, contractNum } = req.body || {}
      if (!contractData) return res.status(400).json({ error: 'Missing contractData' })

      const recordId    = crypto.randomUUID()
      const roleTokens  = {
        client:  crypto.randomUUID(),
        builder: crypto.randomUUID(),
        gc:      crypto.randomUUID(),
      }
      const ttl = 60 * 60 * 24 * 60

      await kv.set(`sign:${recordId}`, {
        contractData,
        contractNum: contractNum || '',
        status:      'pending',
        createdAt:   Date.now(),
        signatures:  {},
      }, { ex: ttl })

      await Promise.all(ROLES.map(role =>
        kv.set(`link:${roleTokens[role]}`, { recordId, role }, { ex: ttl })
      ))

      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      return res.json({
        recordId,
        links: {
          client:  `${proto}://${host}/sign/${roleTokens.client}`,
          builder: `${proto}://${host}/sign/${roleTokens.builder}`,
          gc:      `${proto}://${host}/sign/${roleTokens.gc}`,
        },
      })
    }

    // ── Admin record lookup: /api/sign/record-<recordId> ─────────────
    // Returns the full signed record (with all signatures) so the contractor
    // can view what was signed by each party. Used by the in-app contracts
    // viewer. Tokens prefixed "record-" are admin lookups by recordId rather
    // than role-specific signing tokens.
    if (token.startsWith('record-') && req.method === 'GET') {
      const recordId = token.slice('record-'.length)
      const rec = await kv.get(`sign:${recordId}`)
      if (!rec) return res.status(404).json({ error: 'Record not found or expired' })
      return res.json({
        recordId,
        contractData: rec.contractData,
        contractNum:  rec.contractNum,
        status:       rec.status,
        createdAt:    rec.createdAt,
        signatures:   rec.signatures || {},
      })
    }

    // ── Existing role-specific token ──────────────────────────────────
    const link = await kv.get(`link:${token}`)
    if (!link) return res.status(404).json({ error: 'Signing link not found or expired' })

    const record = await kv.get(`sign:${link.recordId}`)
    if (!record) return res.status(404).json({ error: 'Contract record not found' })

    if (req.method === 'GET') {
      return res.json({
        role:         link.role,
        contractData: record.contractData,
        contractNum:  record.contractNum,
        status:       record.status,
        signatures:   record.signatures || {},
        alreadySigned: !!(record.signatures && record.signatures[link.role]),
      })
    }

    if (req.method === 'POST') {
      const { signatureDataUrl, fieldSignatures, printedName, pdfBase64, fileName } = req.body || {}
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
      }

      const required  = ['client', 'builder']
      const allSigned = required.every(r => signatures[r])
      const ttl       = 60 * 60 * 24 * 60
      await kv.set(`sign:${link.recordId}`, {
        ...record,
        signatures,
        status: allSigned ? 'signed' : 'partial',
      }, { ex: ttl })

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
