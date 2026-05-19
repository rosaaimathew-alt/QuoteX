import crypto from 'crypto'
import { uploadToDrive } from '../google-drive.js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  const token = req.query.token
  if (!token) return res.status(400).json({ error: 'Missing token' })

  try {
    const { kv } = await import('@vercel/kv')

    // ── CREATE new signing link ──────────────────────────────────────
    if (token === 'create') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const { contractData, contractNum } = req.body || {}
      if (!contractData) return res.status(400).json({ error: 'Missing contractData' })

      const newToken = crypto.randomUUID()
      await kv.set(`sign:${newToken}`, {
        contractData,
        contractNum: contractNum || '',
        status:      'pending',
        createdAt:   Date.now(),
        signatures:  {},
      }, { ex: 60 * 60 * 24 * 60 })

      const host  = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
      const proto = host.includes('localhost') ? 'http' : 'https'
      return res.json({ token: newToken, url: `${proto}://${host}/sign/${newToken}` })
    }

    // ── EXISTING token: GET status, POST signature ───────────────────
    const record = await kv.get(`sign:${token}`)
    if (!record) return res.status(404).json({ error: 'Signing link not found or expired' })

    if (req.method === 'GET') {
      return res.json({
        contractData: record.contractData,
        contractNum:  record.contractNum,
        status:       record.status,
        signatures:   record.signatures || {},
        createdAt:    record.createdAt,
      })
    }

    if (req.method === 'POST') {
      const { role, signatureDataUrl, printedName, pdfBase64, fileName } = req.body || {}
      if (!role || !signatureDataUrl) return res.status(400).json({ error: 'Missing role or signature' })

      const signatures = record.signatures || {}
      signatures[role] = {
        signatureDataUrl,
        printedName: printedName || '',
        signedAt:    Date.now(),
        ip:          req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
        userAgent:   req.headers['user-agent'] || 'unknown',
      }

      const required  = ['client', 'builder']
      const allSigned = required.every(r => signatures[r])
      const updated   = { ...record, signatures, status: allSigned ? 'signed' : 'partial' }
      await kv.set(`sign:${token}`, updated, { ex: 60 * 60 * 24 * 60 })

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
