import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE  = path.resolve(__dirname, '../google-tokens.json')
const REDIRECT_URI = 'http://localhost:5173/api/google-auth/callback'
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

function makeClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  )
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
  } catch {}
  return null
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
}

export function getAuthUrl() {
  return makeClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function handleCallback(code) {
  const client = makeClient()
  const { tokens } = await client.getToken(code)
  saveTokens(tokens)
  return tokens
}

export function isAuthenticated() {
  const t = loadTokens()
  return !!(t && (t.refresh_token || t.access_token))
}

export async function uploadToDrive({ pdfBase64, fileName }) {
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not authenticated with Google Drive')

  const client = makeClient()
  client.setCredentials(tokens)
  client.on('tokens', updated => saveTokens({ ...tokens, ...updated }))

  const drive = google.drive({ version: 'v3', auth: client })
  const buffer = Buffer.from(pdfBase64, 'base64')

  const file = await drive.files.create({
    requestBody: { name: fileName, mimeType: 'application/pdf' },
    media:       { mimeType: 'application/pdf', body: Readable.from(buffer) },
    fields:      'id,name,webViewLink',
  })

  return {
    fileId:    file.data.id,
    fileName:  file.data.name,
    driveLink: file.data.webViewLink,
  }
}
