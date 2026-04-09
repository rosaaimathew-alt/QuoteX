import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

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

User: "What's my most expensive item?"
Response: Your most expensive item is Double Drive Gate at $680/EA.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' })
  }

  const { messages, catalog } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'messages required' })

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  // Build compact catalog summary
  const catalogSummary = (catalog || []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    unit: item.unit,
    unitPrice: item.unitPrice,
    category: item.category,
  }))

  // Gemini uses role 'model' instead of 'assistant', and parts array
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMsg = messages[messages.length - 1]
  const lastText = `CURRENT CATALOG (${catalogSummary.length} items):\n${JSON.stringify(catalogSummary, null, 2)}\n\nUSER REQUEST: ${lastMsg.content}`

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastText)
    const text = result.response.text()

    // Extract <changes> block if present
    const changesMatch = text.match(/<changes>([\s\S]*?)<\/changes>/)
    let changes = null
    let displayText = text

    if (changesMatch) {
      try {
        changes = JSON.parse(changesMatch[1].trim())
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
