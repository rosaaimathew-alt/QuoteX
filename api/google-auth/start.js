import { getAuthUrl } from '../google-drive.js'

export default async function handler(req, res) {
  const origin = req.query.origin || 'http://localhost:5173'
  res.json({ url: getAuthUrl(origin) })
}
