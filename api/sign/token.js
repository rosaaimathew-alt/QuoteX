import { uploadToDrive } from '../google-drive.js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  const token = req.query.token
  if (!token) return res.status(400).json({ error: 'Missing token' })
  try {
    const { kv } = await import('@vercel/kv')
    const record  = await kv.get(`sign:${token}`)
    if (!record) return res.status(404).json({ error: 'Signing link not found or expired' })

    if (req.method === 'GET') {
      res.json({
        contractData: record.contractData,
        contractNum:  record.contractNum,
        status:       record.status,
        signatures:   record.signatures || {},
        createdAt:    record.createdAt,
      })
      return
    }

    if (req.method === 'POST') {
      const { role, signatureDataUrl, printedName, pdfBase64, fileName } = req.body || {}
      if (!role || !signatureDataUrl) return res.status(400).json({ error: 'Missing role or signature' })

      const signatures = record.signatures || {}
      signatures[role] = {
        signatureDataUrl,
        printedName:   printedName || '',
        signedAt:      Date.now(),
        ip:            req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
        userAgent:     req.headers['user-agent'] || 'unknown',
      }

      const roles         = ['client', 'builder', 'gc']
      const allSigned     = roles.every(r => r === 'gc' || signatures[r])
      const updatedRecord = { ...record, signatures, status: allSigned ? 'signed' : 'partial' }
      await kv.set(`sign:${token}`, updatedRecord, { ex: 60 * 60 * 24 * 60 })

      let driveResult = null
      if (pdfBase64 && fileName) {
        try { driveResult = await uploadToDrive({ pdfBase64, fileName }) } catch {}
      }

      res.json({ ok: true, allSigned, driveResult })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
