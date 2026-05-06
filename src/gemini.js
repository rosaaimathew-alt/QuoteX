// AI adapter — calls Ollama running locally on the Mac Mini.
// All requests go through /api/ai (proxied by the Vite server) so road
// devices on Tailscale use the Mac's Ollama without any extra setup.
//
// Models used:
//   llama3.2  — text tasks (chat, catalog, estimate text)
//   llava     — vision tasks (image-based estimates)
//
// Install: ollama pull llama3.2 && ollama pull llava

const TEXT_MODEL   = 'llama3.2'
const VISION_MODEL = 'llava'
const API_BASE     = '/api/ai'  // proxied through Vite → localhost:11434/v1

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

export function getModel(systemInstruction) {
  return {
    // Multi-turn chat (AI Assistant page)
    startChat({ history = [] }) {
      return {
        async sendMessage(text) {
          const messages = [...history, { role: 'user', content: text }]
          const content  = await callOllama(TEXT_MODEL, messages, systemInstruction)
          return { response: { text: () => content } }
        },
      }
    },

    // Single-shot generation (Analyze page, Catalog AI Suggest)
    async generateContent(prompt) {
      // Image prompt — use vision model
      if (Array.isArray(prompt)) {
        const imgPart = prompt.find(p => p?.inlineData)
        const txtPart = prompt.find(p => typeof p === 'string') || 'Extract all line items from this estimate.'

        if (imgPart) {
          const content = await callOllama(
            VISION_MODEL,
            [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` } },
                { type: 'text', text: txtPart },
              ],
            }],
            systemInstruction,
            8192,
          )
          return { response: { text: () => content } }
        }

        // Array but no image — treat as text
        const content = await callOllama(TEXT_MODEL, [{ role: 'user', content: txtPart }], systemInstruction, 8192)
        return { response: { text: () => content } }
      }

      // Plain text prompt
      const content = await callOllama(TEXT_MODEL, [{ role: 'user', content: prompt }], systemInstruction, 8192)
      return { response: { text: () => content } }
    },
  }
}
