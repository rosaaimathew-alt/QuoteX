import { isAuthenticated } from '../_google-drive.js'

export default async function handler(req, res) {
  try {
    res.status(200).json({ authenticated: await isAuthenticated() })
  } catch (err) {
    res.status(200).json({ authenticated: false, error: err.message })
  }
}
