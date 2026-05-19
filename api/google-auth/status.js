import { isAuthenticated } from '../google-drive.js'

export default async function handler(req, res) {
  res.json({ authenticated: await isAuthenticated() })
}
