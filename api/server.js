/**
 * Local development server for /api/analyze
 * Run: node api/server.js
 * Requires: npm install express @anthropic-ai/sdk
 *
 * Set ANTHROPIC_API_KEY in your environment or a .env file.
 */

import express from 'express'
import { readFileSync } from 'fs'

// Load .env if present
try {
  const env = readFileSync('.env', 'utf8')
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  })
} catch {}

import handler from './analyze.js'

const app = express()
app.use(express.json({ limit: '20mb' }))

app.post('/api/analyze', (req, res) => handler(req, res))

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`))
