import { handleCallback } from '../google-drive.js'

export default async function handler(req, res) {
  const { code, state } = req.query
  if (!code) return res.status(400).send('Missing code')
  try {
    const origin = await handleCallback(code, state)
    res.redirect(`${origin}/contract?google=connected`)
  } catch (err) {
    res.redirect(`/contract?google=error&msg=${encodeURIComponent(err.message)}`)
  }
}
