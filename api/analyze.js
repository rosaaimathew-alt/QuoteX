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

const SYSTEM_PROMPT = `You are a senior construction estimator with 20+ years of experience. Your job is to read an estimate document and extract every line item with full depth — leaving no material, task, or cost behind.

Return ONLY a valid JSON array (no markdown, no explanation) like:
[
  {
    "name": "Roofing System",
    "section": "Roofing",
    "description": "Remove existing shingles, felt, and damaged decking. Install #30 synthetic underlayment, aluminum drip edge on all eaves and rakes. Install 30-year architectural shingles per manufacturer specs, 6-nail pattern. Install plybead ceiling on porch. Ridge cap and all flashing included.",
    "qty": 1,
    "unit": "LS",
    "unitPrice": 8500,
    "category": "Roofing",
    "confidence": 92
  }
]

CRITICAL RULES:

1. SECTION NAME — "section" must be the EXACT section heading as it appears in the original estimate document (e.g. "Roofing", "Foundation Work", "Exterior Framing & Sheathing", "Electrical Rough-In"). Do NOT invent sections. Do NOT use our categories. Copy the heading word-for-word from the document. If no sections exist, use the trade type.

2. ONE ITEM PER SECTION — unless a section has multiple clearly separate priced line items, collapse everything in that section into ONE item. Every material, spec, and task mentioned anywhere in that section goes into the description of that one item.

3. LEAVE NOTHING OUT OF DESCRIPTIONS — every material mentioned in the document must appear in the description of the item it belongs to. Examples of what cannot be skipped:
   - Plybead ceiling → goes in the Roofing or Framing item description
   - Simpson hangers, LUS hangers → Framing item description
   - AdvanTech subfloor, OSB sheathing → Framing item description
   - Synthetic underlayment, drip edge, ice & water → Roofing item description
   - Tyvek housewrap → Framing/Siding item description
   - Backer board, Schluter strip → Tile item description
   - Pressure-treated sill plates → Framing item description
   - Insulation type and R-value → Insulation item description
   - All fasteners, adhesives, tape specific to a trade → that trade's description
   - Permits, allowances, dumpsters → their own items

4. DESCRIPTION FORMAT — write as one flowing professional paragraph that a client reads. Do NOT use bullet points, dashes, or line breaks inside the description. Include: specific materials (brand/grade/size if stated), installation method, any specs mentioned. Max 500 chars.

5. PRICING — if a section total is given with no unit breakdown, use qty=1, unit=LS, unitPrice=total. If unit pricing is given, use it. Never leave unitPrice as 0 — estimate from trade knowledge if missing and set confidence to 45.

6. CATEGORY — assign from: Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, Roofing, Flooring, Drywall, Painting, HVAC, Windows, Doors, Tile, Insulation, Siding, General`

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
