import { getAuthUrl } from '../_google-drive.js'

export default async function handler(req, res) {
  try {
    const origin = req.query.origin || 'http://localhost:5173'
    res.status(200).json({ url: getAuthUrl(origin) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
