import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDOzBpHafealhV5G2BJF06upzbm37HU-a8'

export const genAI = new GoogleGenerativeAI(API_KEY)

export function getModel(systemInstruction) {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction })
}
