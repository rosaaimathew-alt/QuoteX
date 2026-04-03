import { getMessages, saveMessage, deleteMessage } from './_store.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const messages = await getMessages(200)
      return res.status(200).json({ messages })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    // Save an outbound message (called after a reply is sent)
    try {
      const message = req.body
      if (!message?.id) return res.status(400).json({ error: 'Message id required' })
      await saveMessage(message)
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id required' })
    try {
      await deleteMessage(id)
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
