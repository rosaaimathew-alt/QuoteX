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

const SYSTEM_PROMPT = `You are a construction estimating assistant. Your ONLY job is to read this estimate and extract each line item EXACTLY as the contractor wrote it — preserving their structure, their groupings, and their pricing method completely.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "name": "LVL Ridge Beam",
    "section": "Gable Roof",
    "description": "Supply and install LVL ridge beam per engineered plans, including all hardware and connections.",
    "qty": 1,
    "unit": "LS",
    "unitPrice": 1200,
    "category": "Framing",
    "confidence": 90
  }
]

RULES — do not deviate:

1. PRESERVE THE CONTRACTOR'S STRUCTURE — if they have 10 separate line items under "Gable Roof", extract 10 separate items. Do NOT collapse, merge, or combine items. Do NOT regroup them differently. The contractor's breakdown is correct and must be replicated.

2. SECTION = the exact heading from the estimate document, copied word-for-word. If there is no section heading, use the trade type the item belongs to.

3. ONE LINE ITEM = ONE JSON OBJECT — every separately priced or listed item in the estimate gets its own object. Never put two separate items into one object.

4. DESCRIPTION — for each item, write a scope sentence using what the estimate says plus your trade knowledge to fill in any specs, materials, or methods that are implied but not stated. Do not invent scope that contradicts the estimate. Max 400 chars. No bullet points or line breaks inside the description.

5. USE TRADE KNOWLEDGE TO FILL GAPS ONLY — if an item is listed but has no price, estimate a realistic market price using your knowledge and set confidence to 45. If a material is mentioned in the document but has no separate line (e.g. "felt paper" listed under a roofing section that already has a shingles line), add it to the description of the closest matching item — do not create a duplicate separate item for it.

6. PRICING — if a line shows a total with qty > 1, compute unitPrice = total / qty. If only a unit price is shown, use it. Never set unitPrice to 0.

7. CATEGORY — assign the best matching trade: Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, Roofing, Flooring, Drywall, Painting, HVAC, Windows, Doors, Tile, Insulation, Siding, General

8. NEVER SKIP any line item, allowance, permit fee, mobilization charge, or dumpster cost — they all get extracted as their own items.`

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
        section: String(i.section || i.category || 'General').slice(0, 80),
        description: String(i.description || '').slice(0, 600),
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
