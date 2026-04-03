/**
 * /api/analyze — EstimateIQ line-item extraction
 *
 * Accepts:
 *   { text: string }                          — plain text estimate
 *   { fileData: base64, fileName, mimeType }  — PDF, JPEG, PNG, GIF, WEBP
 *
 * PDFs: text is extracted server-side via pdf-parse, then sent to Claude as text.
 * Images: sent to Claude via the vision API (base64).
 *
 * Requires env var: ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

// Load .env for local dev (no-op on Vercel where env vars are set in the dashboard)
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const SYSTEM_PROMPT = `You are a senior construction estimator with 20+ years of experience across residential and commercial projects. Your job is to read an estimate and extract EVERY line item with maximum depth and accuracy — leaving nothing behind.

Return ONLY a valid JSON array (no markdown, no explanation) like:
[
  {
    "name": "Install 6ft Cedar Privacy Fence",
    "description": "Supply and install 6ft cedar privacy fence using #1 grade cedar pickets, 4x4 pressure-treated posts set 2ft deep in concrete, 2x4 top and bottom rails, galvanized screws and hardware throughout.",
    "qty": 140,
    "unit": "LF",
    "unitPrice": 38,
    "category": "Fencing",
    "confidence": 92
  }
]

EXTRACTION RULES — read every word, miss nothing:

1. CAPTURE EVERY ITEM — even if it has no explicit price. Never skip a material, task, or allowance mentioned anywhere in the document. If a price is missing, use your trade knowledge to estimate a realistic unit price and set confidence to 45.

2. INFER MATERIAL PLACEMENT — use your construction knowledge to attach materials to the correct parent item. Examples:
   - "plybead ceiling" → belongs under a Roofing or Framing line item description
   - "Simpson LUS hangers" → belongs in a Framing item description
   - "3/4in AdvanTech subfloor" → belongs in a Framing item description
   - "#15 felt paper" or "synthetic underlayment" → belongs in a Roofing item
   - "Tyvek housewrap" → belongs in a Framing/Exterior item
   - "concrete board backer" → belongs in a Tile item
   - "pressure-treated lumber" → belongs in whichever structural item uses it
   - "galvanized hardware", "stainless screws", "joist tape" → attach to the relevant trade item

3. DESCRIPTION DEPTH — for each item write a description that:
   - Lists every specific material mentioned (brand, grade, size, spec) for that scope
   - Describes the installation method if stated or implied
   - Includes any standards, spacing, or tolerances mentioned
   - Reads like a professional scope-of-work paragraph a client would understand
   - Max 300 chars

4. CATEGORY ASSIGNMENT — assign the most specific matching category:
   Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, Roofing, Flooring, Drywall, Painting, HVAC, Windows, Doors, Tile, Insulation, Siding, General

5. GROUPING — if multiple materials clearly belong to the same work item (e.g. roofing felt + drip edge + shingles are all part of one roofing line), group them into one item with all materials listed in the description. Only split into separate items if they have separate prices or are clearly distinct scopes.

6. PRICING — if a total is given and qty > 1, divide to get unit price. If only a unit price is given, use it directly. Never leave unitPrice as 0.

7. NEVER SKIP — lump sum items, allowances, mobilization charges, permit fees, dumpster rentals, temporary facilities — all get extracted.`

const CATEGORIES = ['Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical','Plumbing','Roofing','Flooring','Drywall','Painting','HVAC','Windows','Doors','Tile','Insulation','Siding','General']
const UNITS = ['LF','SF','EA','LS']
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
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to your .env file.' })
  }

  const client = new Anthropic({ apiKey })

  try {
    let messageContent = []

    if (fileData) {
      const ext = (fileName?.split('.').pop() || '').toLowerCase()
      const detectedMime = mimeType || guessMime(ext)

      if (detectedMime === 'application/pdf') {
        // Extract text from PDF using pdf-parse, then send as text prompt
        const buffer = Buffer.from(fileData, 'base64')
        let pdfText = ''
        try {
          const result = await pdfParse(buffer)
          pdfText = result.text?.trim()
        } catch (pdfErr) {
          console.error('pdf-parse error:', pdfErr.message)
          return res.status(400).json({ error: 'Could not read PDF. Make sure it is not password-protected and contains text (not just scanned images).' })
        }

        if (!pdfText) {
          return res.status(400).json({ error: 'PDF appears to be a scanned image with no text layer. Please upload a JPEG or PNG of the estimate instead.' })
        }

        messageContent = [
          { type: 'text', text: `Extract all line items from this estimate:\n\n${pdfText}` },
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
          { type: 'text', text: 'Extract all line items from this estimate image.' },
        ]
      } else {
        return res.status(400).json({ error: `Unsupported file type: ${ext || detectedMime}. Use PDF, JPEG, or PNG.` })
      }
    } else {
      messageContent = [{ type: 'text', text: `Extract line items from this estimate:\n\n${text}` }]
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = response.content[0]?.text || '[]'
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // If response was cut off, trim to last complete object so JSON.parse succeeds
    let jsonStr = clean
    if (!jsonStr.endsWith(']')) {
      const lastClose = jsonStr.lastIndexOf('}')
      jsonStr = lastClose > 0 ? jsonStr.slice(0, lastClose + 1) + ']' : '[]'
    }

    let items = JSON.parse(jsonStr)

    items = items
      .filter(i => i.name && i.unitPrice > 0)
      .map(i => ({
        name: String(i.name).slice(0, 80),
        description: String(i.description || '').slice(0, 200),
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
    const msg = err?.error?.error?.message || err?.message || 'Analysis failed'
    return res.status(500).json({ error: msg })
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
