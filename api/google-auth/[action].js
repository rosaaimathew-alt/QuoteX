import { getAuthUrl, handleCallback, isAuthenticated } from '../_google-drive.js'

export default async function handler(req, res) {
  const action = req.query.action

  if (action === 'start') {
    try {
      const origin   = req.query.origin   || 'http://localhost:5173'
      const returnTo = req.query.returnTo || '/contract'
      return res.status(200).json({ url: getAuthUrl(origin, returnTo) })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (action === 'callback') {
    const { code, state } = req.query
    if (!code) return res.status(400).send('Missing code')
    try {
      const redirectUrl = await handleCallback(code, state)
      return res.redirect(`${redirectUrl}?google=connected`)
    } catch (err) {
      return res.redirect(`/settings?google=error&msg=${encodeURIComponent(err.message)}`)
    }
  }

  if (action === 'status') {
    try {
      return res.status(200).json({ authenticated: await isAuthenticated() })
    } catch (err) {
      return res.status(200).json({ authenticated: false, error: err.message })
    }
  }

  res.status(404).json({ error: 'Unknown action' })
}
