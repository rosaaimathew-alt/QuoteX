import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDrwNpT9JFM7Y92Hz8PcqDx2ps1Rfk_DpU'

export const genAI = new GoogleGenerativeAI(API_KEY)

export function getModel(systemInstruction) {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction })
}
