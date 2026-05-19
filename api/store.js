const KV_KEY = 'quotex:store'

async function getKV() {
  const { kv } = await import('@vercel/kv')
  return kv
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET') {
    try {
      const kv   = await getKV()
      const data = await kv.get(KV_KEY)
      return res.status(200).send(data ? JSON.stringify(data) : 'null')
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { value } = req.body
      const kv = await getKV()
      await kv.set(KV_KEY, JSON.parse(value))
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
