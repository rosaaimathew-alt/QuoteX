import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE  = path.resolve(__dirname, '../google-tokens.json')
const KV_TOKEN_KEY = 'google:oauth:tokens'
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

function makeClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
}

async function loadTokens() {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv')
    return await kv.get(KV_TOKEN_KEY)
  }
  try {
    if (fs.existsSync(TOKEN_FILE)) return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'))
  } catch {}
  return null
}

async function saveTokens(tokens) {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv')
    await kv.set(KV_TOKEN_KEY, tokens)
  } else {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
  }
}

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
  await saveTokens(tokens)
  return origin
}

export async function isAuthenticated() {
  const t = await loadTokens()
  return !!(t && (t.refresh_token || t.access_token))
}

export async function uploadToDrive({ pdfBase64, fileName }) {
  const tokens = await loadTokens()
  if (!tokens) throw new Error('Not authenticated with Google Drive')

  const client = makeClient('postmessage')
  client.setCredentials(tokens)
  client.on('tokens', async updated => await saveTokens({ ...tokens, ...updated }))

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
