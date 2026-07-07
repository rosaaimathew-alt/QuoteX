/**
 * /api/ai-chat — server-side Claude proxy.
 *
 * All browser AI (catalog assistant, scope generation, estimate analysis)
 * routes through here so the Anthropic API key stays on the server and is
 * never shipped in the frontend bundle.
 *
 * Requires env var: ANTHROPIC_API_KEY
 *
 * Body: { system?: string, messages: [{role, content}], maxTokens?: number }
 *   content may be a plain string or an Anthropic content array (for vision).
 */
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth.js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireAuth(req, res)) return

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server.' })
  }

  const { system, messages, maxTokens } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' })
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens || 4096,
      system: system || undefined,
      messages,
    })
    const text = resp.content?.[0]?.text || ''
    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
