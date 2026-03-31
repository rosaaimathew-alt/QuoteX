/**
 * Local development server for /api/analyze
 * Run: node api/server.js
 * Requires: ANTHROPIC_API_KEY in .env file
 */

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

// Load .env from project root regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

import express from 'express'
import handler from './analyze.js'

const app = express()
app.use(express.json({ limit: '25mb' }))

app.post('/api/analyze', (req, res) => handler(req, res))

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  console.log(`API server running on http://localhost:${PORT}`)
  console.log(`ANTHROPIC_API_KEY: ${hasKey ? 'loaded ✓' : 'MISSING ✗ — check your .env file'}`)
})
