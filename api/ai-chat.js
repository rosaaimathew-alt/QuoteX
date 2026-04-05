import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a pricing catalog assistant for a contractor estimating tool called QUOTEX.
Your job is to help contractors bulk-edit their pricing catalog using plain English commands.

The contractor's full catalog will be provided in each request as JSON.

RESPONSE FORMAT — always follow this exactly:
1. One or two sentences explaining what you changed (or why you can't).
2. If making changes, output a JSON array wrapped in <changes></changes> tags.

Change object format — only include fields being changed:
{ "id": <number>, "name"?: "...", "description"?: "...", "unit"?: "EA|LF|SF|LS", "unitPrice"?: <number>, "category"?: "..." }

Valid categories: Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, Roofing, Flooring, Drywall, Painting, HVAC, Windows, Doors, Tile, Insulation, Siding, General

RULES:
- Only modify fields explicitly asked about. Leave everything else untouched.
- When asked to raise/lower prices by a %, compute the exact rounded value (round to 2 decimal places).
- When no items match the request, say so clearly — do NOT make up changes.
- Never create new items. Never delete items. Only modify existing ones.
- Descriptions must be professional, under 500 chars, no bullet points.
- If the user asks a general question (not a change request), answer it helpfully without a <changes> block.

EXAMPLES:
User: "Raise all fencing prices by 10%"
Response: I'll increase the unit price on all 9 Fencing category items by 10%.
<changes>[{"id":1,"unitPrice":24.20},{"id":2,"unitPrice":41.80}]</changes>

User: "Add 'supply and install' to the start of every item description that doesn't already have it"
Response: I'll prepend 'Supply and install' to 6 items whose descriptions don't already start with it.
<changes>[{"id":3,"description":"Supply and install chain link fence..."}]</changes>

User: "What's my most expensive item?"
Response: Your most expensive item is Double Drive Gate at $680/EA.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' })
  }

  const { messages, catalog } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  // Build a compact catalog summary to keep tokens low
  const catalogSummary = (catalog || []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    unit: item.unit,
    unitPrice: item.unitPrice,
    category: item.category,
  }))

  const userMessages = messages.map(m => ({
    role: m.role,
    content: m.role === 'user' && m === messages[messages.length - 1]
      ? `CURRENT CATALOG (${catalogSummary.length} items):\n${JSON.stringify(catalogSummary, null, 2)}\n\nUSER REQUEST: ${m.content}`
      : m.content,
  }))

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: userMessages,
    })

    const text = response.content[0]?.text || ''

    // Extract <changes> block if present
    const changesMatch = text.match(/<changes>([\s\S]*?)<\/changes>/)
    let changes = null
    let displayText = text

    if (changesMatch) {
      try {
        changes = JSON.parse(changesMatch[1].trim())
        // Remove the raw <changes> block from the display text
        displayText = text.replace(/<changes>[\s\S]*?<\/changes>/, '').trim()
      } catch {
        // Malformed JSON — show raw text, no changes
      }
    }

    return res.status(200).json({ text: displayText, changes })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
