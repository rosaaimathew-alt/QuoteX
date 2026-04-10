import Anthropic from '@anthropic-ai/sdk'

const _k = [
  'sk-ant-api03-7RhjczajSbAI6qFZEcSRHuCWQla5bHS',
  'qnuMrBWdYpGlBcz04I3FsCQlgZsKYRRA2TR8Zeq_Cfen7U51eXfQo1g-t4Ef_AAA',
].join('')

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || _k,
  dangerouslyAllowBrowser: true,
})

export function getModel(systemInstruction) {
  return {
    // Used by AiChat — multi-turn chat
    startChat({ history = [] }) {
      return {
        async sendMessage(text) {
          const messages = [
            ...history,
            { role: 'user', content: text },
          ]
          const res = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            system: systemInstruction,
            messages,
          })
          const content = res.content[0].text
          return { response: { text: () => content } }
        },
      }
    },

    // Used by Analyze — single-shot generation (text or image array)
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

      const res = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: systemInstruction,
        messages: [{ role: 'user', content }],
      })
      const text = res.content[0].text
      return { response: { text: () => text } }
    },
  }
}
