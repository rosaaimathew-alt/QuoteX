/**
 * Local development server for /api/analyze
 * Run: node api/server.js
 * Requires: npm install express @anthropic-ai/sdk pdf-parse
 *
 * Set ANTHROPIC_API_KEY in your environment or a .env file.
 */

// Load .env before anything else (must use sync readFileSync before imports settle)
import { readFileSync } from 'fs'
try {
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  env.split('\n').forEach(line => {
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  })
} catch {}

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
