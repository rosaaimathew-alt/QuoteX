/**
 * Local development server
 * Run: node api/server.js
 * Requires: GEMINI_API_KEY and RESEND_API_KEY in .env file
 * Note: KV_REST_API_URL not required locally — messages use in-memory store
 */

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

import express from 'express'
import handler from './analyze.js'
import emailHandler from './send-email.js'
import messagesHandler from './messages.js'
import inboundHandler from './inbound-email.js'
import aiChatHandler from './ai-chat.js'
import { getAuthUrl, handleCallback, isAuthenticated, uploadToDrive } from './google-drive.js'

const app = express()
app.use(express.json({ limit: '25mb' }))

app.post('/api/analyze', (req, res) => handler(req, res))
app.post('/api/send-email', (req, res) => emailHandler(req, res))
app.get('/api/messages', (req, res) => messagesHandler(req, res))
app.post('/api/messages', (req, res) => messagesHandler(req, res))
app.delete('/api/messages', (req, res) => messagesHandler(req, res))
app.post('/api/inbound-email', (req, res) => inboundHandler(req, res))
app.post('/api/ai-chat', (req, res) => aiChatHandler(req, res))

// ── Google Drive integration ──────────────────────────────────────────────
app.get('/api/google-auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() })
})

app.get('/api/google-auth/start', (req, res) => {
  res.json({ url: getAuthUrl() })
})

app.get('/api/google-auth/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).send('Missing code')
  try {
    await handleCallback(code)
    res.redirect('http://localhost:5173/contract?google=connected')
  } catch (err) {
    res.redirect(`http://localhost:5173/contract?google=error&msg=${encodeURIComponent(err.message)}`)
  }
})

app.post('/api/drive/upload', async (req, res) => {
  const { pdfBase64, fileName } = req.body
  if (!pdfBase64 || !fileName) return res.status(400).json({ error: 'Missing pdfBase64 or fileName' })
  try {
    const result = await uploadToDrive({ pdfBase64, fileName })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  const hasKey = !!process.env.GEMINI_API_KEY
  const hasResend = !!process.env.RESEND_API_KEY
  const hasKV = !!process.env.KV_REST_API_URL
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`GEMINI_API_KEY:  ${hasKey   ? 'loaded ✓' : 'MISSING ✗'}`)
  console.log(`RESEND_API_KEY:  ${hasResend ? 'loaded ✓' : 'MISSING ✗'}`)
  console.log(`KV_REST_API_URL: ${hasKV    ? 'loaded ✓' : 'not set  (using in-memory store for local dev)'}`)
})
