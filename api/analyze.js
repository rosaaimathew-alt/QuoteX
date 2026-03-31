/**
 * /api/analyze — EstimateIQ line-item extraction
 *
 * Accepts:
 *   { text: string }                          — plain text estimate
 *   { fileData: base64, fileName, mimeType }  — PDF, JPEG, PNG, GIF, WEBP
 *
 * Returns: array of line items
 * {
 *   name, qty, unit, unitPrice, category, confidence, source
 * }
 *
 * Requires env var: ANTHROPIC_API_KEY
 *
 * Deploy as a Vercel/Netlify serverless function, or run the
 * companion express-server.js for local development.
 */

import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are an expert construction cost estimator AI.
Analyze the provided estimate (text or image) and extract every line item.

Return ONLY a valid JSON array (no markdown, no explanation) like:
[
  {
    "name": "Install 6ft Cedar Privacy Fence",
    "qty": 140,
    "unit": "LF",
    "unitPrice": 38,
    "category": "Fencing",
    "confidence": 92
  }
]

Rules:
- name: concise description (max 60 chars), title case
- qty: numeric quantity (default 1 if unknown)
- unit: one of LF, SF, EA, HR, LS, LOAD, TON, DAY
- unitPrice: price per unit in USD (integer or 1 decimal)
- category: one of Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, General
- confidence: 0-100, how confident you are in the extracted price
- If a total price is given and qty > 1, compute unitPrice = total / qty
- Skip header rows, totals, tax lines, and non-priced notes
- If an item has no price at all, set confidence to 40 and estimate based on context`

const CATEGORIES = ['Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical','Plumbing','General']
const UNITS = ['LF','SF','EA','HR','LS','LOAD','TON','DAY']

// PDF mime types — Claude supports PDF natively
const PDF_TYPES = ['application/pdf']
const IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/gif','image/webp']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { text, fileData, fileName, mimeType } = req.body || {}

  if (!text && !fileData) {
    return res.status(400).json({ error: 'Provide text or fileData' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  const client = new Anthropic({ apiKey })

  try {
    let messageContent = []

    if (fileData) {
      const ext = fileName?.split('.').pop().toLowerCase() || ''
      const detectedMime = mimeType || guessMime(ext)

      if (PDF_TYPES.includes(detectedMime)) {
        // Native PDF support in Claude
        messageContent = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: fileData,
            },
          },
          {
            type: 'text',
            text: 'Extract all line items from this estimate document.',
          },
        ]
      } else if (IMAGE_TYPES.includes(detectedMime)) {
        // Vision — JPEG/PNG/GIF/WEBP
        messageContent = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: detectedMime,
              data: fileData,
            },
          },
          {
            type: 'text',
            text: 'Extract all line items from this estimate image.',
          },
        ]
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${detectedMime}. Use PDF, JPEG, or PNG.` })
      }
    } else {
      messageContent = [{ type: 'text', text: `Extract line items from this estimate:\n\n${text}` }]
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0]?.text || '[]'
    // Strip any accidental markdown fences
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let items = JSON.parse(clean)

    // Sanitize
    items = items
      .filter(i => i.name && i.unitPrice > 0)
      .map(i => ({
        name: String(i.name).slice(0, 80),
        qty: Math.max(0, parseFloat(i.qty) || 1),
        unit: UNITS.includes(i.unit) ? i.unit : 'EA',
        unitPrice: Math.round(parseFloat(i.unitPrice) * 100) / 100,
        category: CATEGORIES.includes(i.category) ? i.category : 'General',
        confidence: Math.min(100, Math.max(0, parseInt(i.confidence) || 70)),
        source: 'ai',
      }))

    return res.status(200).json(items)
  } catch (err) {
    console.error('analyze error:', err)
    return res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}

function guessMime(ext) {
  const map = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return map[ext] || 'application/octet-stream'
}
