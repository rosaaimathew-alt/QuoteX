import Groq from 'groq-sdk'

const client = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
})

/**
 * Returns an object that mimics the Gemini SDK interface used by AiChat + Analyze,
 * but routes all requests through Groq.
 */
export function getModel(systemInstruction) {
  return {
    // Used by AiChat — multi-turn chat
    startChat({ history = [] }) {
      return {
        async sendMessage(text) {
          const messages = [
            { role: 'system', content: systemInstruction },
            ...history,
            { role: 'user', content: text },
          ]
          const res = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            max_tokens: 4096,
          })
          const content = res.choices[0].message.content
          return { response: { text: () => content } }
        },
      }
    },

    // Used by Analyze — single-shot content generation (text or image array)
    async generateContent(prompt) {
      let model = 'llama-3.3-70b-versatile'
      let userContent

      if (Array.isArray(prompt)) {
        // Vision request: [{ inlineData: { data, mimeType } }, 'prompt text']
        const imgPart = prompt.find(p => p?.inlineData)
        const txtPart = prompt.find(p => typeof p === 'string')
        if (imgPart) {
          model = 'llama-3.2-11b-vision-preview'
          userContent = [
            {
              type: 'image_url',
              image_url: { url: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` },
            },
            { type: 'text', text: txtPart || 'Extract all line items from this estimate.' },
          ]
        } else {
          userContent = txtPart || ''
        }
      } else {
        userContent = prompt
      }

      const res = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userContent },
        ],
        max_tokens: 4096,
      })
      const content = res.choices[0].message.content
      return { response: { text: () => content } }
    },
  }
}
