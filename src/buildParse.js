// Natural-language → structured build spec. Powers the "Quick Build" box: a
// contractor types OR dictates (Wispr Flow) a job and we either fill a single
// parametric tool (deck / porch conversion) OR assemble a whole proposal from
// the catalog (the "playground"). Uses the app's server-proxied AI.
import { getModel } from './gemini'

const SYSTEM = `You convert a contractor's spoken job description into a structured build spec for an estimating tool.
Return ONLY a JSON object — no prose, no markdown, no code fences.

There are two modes:

MODE "tool" — a SINGLE parametric item:
- an open deck, OR
- an Eze-Breeze porch CONVERSION / RETROFIT (adding windows to an EXISTING porch, no new structure/floor/electrical mentioned)
Shape:
{ "mode":"tool", "tool":"deck"|"porch", "width":ft, "depth":ft, "height":ft,
  "collection":"decking product, matched to AVAILABLE COLLECTIONS", "railing":bool,
  "stairs":bool, "fascia":bool, "border":"None"|"Single"|"Double", "doors":n, "wallHeight":inches }

MODE "catalog" — a NEW BUILD assembled from multiple catalog pieces (structure + floor + electrical + rails, etc.).
Shape:
{ "mode":"catalog", "width":ft, "depth":ft, "roofType":"gable"|"cathedral"|"shed"|null,
  "newBuild":true, "wallHeight":inches_or_null, "doors":n_or_null,
  "items":[ { "kind":"structure"|"lvp"|"cable_rail"|"eze_breeze_windows"|"electrical_package"|"other", "text":"the exact phrase" } ] }

Rules:
- "16 by 16", "16x16" → width 16, depth 16. First number = width.
- A "gable/cathedral/shed roof Eze-Breeze porch" is a NEW BUILD → mode "catalog". Include BOTH a "structure" item (the roofed porch shell) AND an "eze_breeze_windows" item.
- "LVP", "LVP floor" → kind "lvp". "standard electrical", "electrical package" → "electrical_package". "cable rail", "cable railing" → "cable_rail".
- Anything else the contractor names that isn't one of the known kinds → kind "other" with its text.
- "open deck" alone → mode "tool", tool "deck". "convert my porch", "retrofit", "add eze-breeze to my existing porch" → mode "tool", tool "porch".
- Omit fields not stated. Never invent prices or dimensions.`

export async function parseBuildSpec(text, { collections = [] } = {}) {
  const clean = (text || '').trim()
  if (!clean) throw new Error('Say or type a job, e.g. "16 by 16 gable roof Eze-Breeze porch with LVP floors and cable rails".')
  const model = getModel(SYSTEM)
  const prompt = `AVAILABLE COLLECTIONS: ${collections.length ? collections.join(', ') : '(none configured)'}\n\nJOB: ${clean}`
  const out = await model.generateContent(prompt)
  const raw = out.response.text()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not read that. Try rephrasing the job.')
  let spec
  try { spec = JSON.parse(match[0]) } catch { throw new Error('Could not read that. Try rephrasing the job.') }
  if (!spec.mode) spec.mode = Array.isArray(spec.items) && spec.items.length ? 'catalog' : 'tool'
  if (spec.mode === 'tool' && !spec.tool) spec.tool = /porch|breeze|window/i.test(clean) ? 'porch' : 'deck'
  return spec
}
