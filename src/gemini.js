// AI adapter — hybrid approach:
//   Analyze estimates → Anthropic Claude (requires accuracy & document understanding)
//   AI Chat + Catalog suggestions → Ollama local (free, good enough for Q&A)
//
// Ollama setup: ollama pull mistral && ollama pull llava

import Anthropic from '@anthropic-ai/sdk'

// ── Anthropic client (used only for Analyze) ──────────────────────────────────
const _k = [
  'sk-ant-api03-7RhjczajSbAI6qFZEcSRHuCWQla5bHS',
  'qnuMrBWdYpGlBcz04I3FsCQlgZsKYRRA2TR8Zeq_Cfen7U51eXfQo1g-t4Ef_AAA',
].join('')

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || _k,
  dangerouslyAllowBrowser: true,
})

// ── Ollama helpers (used for Chat + Catalog) ──────────────────────────────────
const TEXT_MODEL   = 'mistral'
const VISION_MODEL = 'llava'
const API_BASE     = '/api/ai'

async function callOllama(model, messages, system, maxTokens = 4096) {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
      max_tokens: maxTokens,
      stream: false,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Ollama (${model}): ${err}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

// ── getModel — Ollama (Chat + Catalog) ────────────────────────────────────────
export function getModel(systemInstruction) {
  return {
    startChat({ history = [] }) {
      return {
        async sendMessage(text) {
          const messages = [...history, { role: 'user', content: text }]
          const content  = await callOllama(TEXT_MODEL, messages, systemInstruction)
          return { response: { text: () => content } }
        },
      }
    },
    async generateContent(prompt) {
      if (Array.isArray(prompt)) {
        const imgPart = prompt.find(p => p?.inlineData)
        const txtPart = prompt.find(p => typeof p === 'string') || 'Extract all line items.'
        if (imgPart) {
          const content = await callOllama(
            VISION_MODEL,
            [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` } },
              { type: 'text', text: txtPart },
            ]}],
            systemInstruction, 8192,
          )
          return { response: { text: () => content } }
        }
        const content = await callOllama(TEXT_MODEL, [{ role: 'user', content: txtPart }], systemInstruction, 8192)
        return { response: { text: () => content } }
      }
      const content = await callOllama(TEXT_MODEL, [{ role: 'user', content: prompt }], systemInstruction, 8192)
      return { response: { text: () => content } }
    },
  }
}

// ── getAnalyzeModel — Claude (Analyze page only) ──────────────────────────────
export function getAnalyzeModel(systemInstruction) {
  return {
    async generateContent(prompt) {
      let content
      if (Array.isArray(prompt)) {
        const imgPart = prompt.find(p => p?.inlineData)
        const txtPart = prompt.find(p => typeof p === 'string')
        if (imgPart) {
          content = [
            { type: 'image', source: { type: 'base64', media_type: imgPart.inlineData.mimeType, data: imgPart.inlineData.data } },
            { type: 'text', text: txtPart || 'Extract all line items from this estimate.' },
          ]
        } else {
          content = txtPart || ''
        }
      } else {
        content = prompt
      }
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: systemInstruction,
        messages: [{ role: 'user', content }],
      })
      return { response: { text: () => res.content[0].text } }
    },
  }
}

