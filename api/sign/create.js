import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { contractData, contractNum } = req.body || {}
  if (!contractData) return res.status(400).json({ error: 'Missing contractData' })
  try {
    const { kv } = await import('@vercel/kv')
    const token = crypto.randomUUID()
    await kv.set(`sign:${token}`, {
      contractData,
      contractNum: contractNum || '',
      status:      'pending',
      createdAt:   Date.now(),
      signatures:  {},
    }, { ex: 60 * 60 * 24 * 60 }) // 60-day expiry
    const host    = req.headers['x-forwarded-host'] || req.headers.host || 'quotexsolutions.com'
    const proto   = host.includes('localhost') ? 'http' : 'https'
    res.json({ token, url: `${proto}://${host}/sign/${token}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
