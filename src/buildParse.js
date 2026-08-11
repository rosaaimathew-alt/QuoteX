// Natural-language → structured build spec. Powers the "Quick Build" box: a
// contractor types OR dictates (Wispr Flow) a sentence like
//   "16 by 16 TimberTech Prime Plus open deck with railing and stairs"
// and we turn it into parameters the Deck / Porch tools already understand.
// Uses the app's server-proxied AI (key stays server-side).
import { getModel } from './gemini'

const SYSTEM = `You convert a contractor's spoken job description into a structured build spec for an estimating tool.
Return ONLY a JSON object — no prose, no markdown, no code fences.

Two tools exist:
- "deck"  = an open deck
- "porch" = an Eze-Breeze porch conversion (windows)

JSON schema — include ONLY the fields the contractor actually stated:
{
  "tool": "deck" | "porch",
  "width": number,          // feet
  "depth": number,          // feet
  "height": number,         // feet, deck height above grade (deck only)
  "collection": string,     // decking product; match EXACTLY to one of AVAILABLE COLLECTIONS when possible
  "railing": boolean,
  "stairs": boolean,
  "fascia": boolean,        // matching 1x12 fascia
  "border": "None" | "Single" | "Double",
  "doors": number,          // porch exit doors
  "wallHeight": number      // porch wall height in INCHES
}

Rules:
- "16 by 16", "16x16", "sixteen by sixteen" → width 16, depth 16. First number = width, second = depth.
- Map any decking product name to the closest AVAILABLE COLLECTION string, copied exactly.
- "open deck" → tool "deck". "porch", "eze-breeze", "ez breeze", "windows" → tool "porch".
- Words like "with railing", "and stairs", "matching fascia", "picture frame border" set those flags.
- Omit any field that is not clearly stated. Do not guess dimensions. Never invent prices.`

export async function parseBuildSpec(text, { collections = [] } = {}) {
  const clean = (text || '').trim()
  if (!clean) throw new Error('Say or type a job, e.g. "16 by 16 TimberTech Prime Plus open deck".')
  const model = getModel(SYSTEM)
  const prompt = `AVAILABLE COLLECTIONS: ${collections.length ? collections.join(', ') : '(none configured)'}\n\nJOB: ${clean}`
  const out = await model.generateContent(prompt)
  const raw = out.response.text()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not read that. Try: "16 by 16 TimberTech Prime Plus open deck".')
  let spec
  try { spec = JSON.parse(match[0]) } catch { throw new Error('Could not read that. Try rephrasing the job.') }
  if (!spec.tool) spec.tool = /porch|breeze|window/i.test(clean) ? 'porch' : 'deck'
  return spec
}
