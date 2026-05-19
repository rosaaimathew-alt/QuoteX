import { uploadToDrive } from '../google-drive.js'

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { pdfBase64, fileName } = req.body || {}
    if (!pdfBase64 || !fileName) return res.status(400).json({ error: 'Missing pdfBase64 or fileName' })
    const result = await uploadToDrive({ pdfBase64, fileName })
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
