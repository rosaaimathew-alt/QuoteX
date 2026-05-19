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
import { uploadToDrive } from './google-drive.js'

const app = express()
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})
app.use(express.json({ limit: '25mb' }))

app.post('/api/analyze',      (req, res) => handler(req, res))
app.post('/api/send-email',   (req, res) => emailHandler(req, res))
app.get('/api/messages',      (req, res) => messagesHandler(req, res))
app.post('/api/messages',     (req, res) => messagesHandler(req, res))
app.delete('/api/messages',   (req, res) => messagesHandler(req, res))
app.post('/api/inbound-email',(req, res) => inboundHandler(req, res))
app.post('/api/ai-chat',      (req, res) => aiChatHandler(req, res))

// ── Google Drive upload (service account) ────────────────────────────────
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
  const hasResend    = !!process.env.RESEND_API_KEY
  const hasUserEmail = !!process.env.GOOGLE_USER_EMAIL
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`RESEND_API_KEY:    ${hasResend    ? 'loaded ✓' : 'MISSING ✗'}`)
  console.log(`GOOGLE_USER_EMAIL: ${hasUserEmail ? 'loaded ✓' : 'not set  (files won\'t be shared with your account)'}`)
})
