import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE = path.resolve(__dirname, '../google-tokens.json')
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

function makeClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
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

// origin = the device's base URL, e.g. http://192.168.1.5:5173 or http://localhost:5173
export function getAuthUrl(origin) {
  const redirectUri = `${origin}/api/google-auth/callback`
  return makeClient(redirectUri).generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: Buffer.from(JSON.stringify({ origin, redirectUri })).toString('base64'),
  })
}

export async function handleCallback(code, stateB64) {
  const { origin, redirectUri } = JSON.parse(Buffer.from(stateB64, 'base64').toString())
  const client = makeClient(redirectUri)
  const { tokens } = await client.getToken(code)
  saveTokens(tokens)
  return origin
}

export function isAuthenticated() {
  const t = loadTokens()
  return !!(t && (t.refresh_token || t.access_token))
}

export async function uploadToDrive({ pdfBase64, fileName }) {
  const tokens = loadTokens()
  if (!tokens) throw new Error('Not authenticated with Google Drive')

  // Use a stable redirect URI for the upload client — just needs valid credentials
  const client = makeClient('http://localhost:5173/api/google-auth/callback')
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
