import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname    = path.dirname(fileURLToPath(import.meta.url))
const TOKEN_FILE   = path.resolve(__dirname, '../google-tokens.json')
const KV_TOKEN_KEY = 'google:oauth:tokens'
const SCOPES       = 'https://www.googleapis.com/auth/drive.file'

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
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID not set in environment')
  const redirectUri = `${origin}/api/google-auth/callback`
  const state       = Buffer.from(JSON.stringify({ origin, redirectUri })).toString('base64')
  const params      = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function handleCallback(code, stateB64) {
  const { origin, redirectUri } = JSON.parse(Buffer.from(stateB64, 'base64').toString())
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
  const tokens = await res.json()
  tokens.expiry_date = Date.now() + (tokens.expires_in * 1000)
  await saveTokens(tokens)
  return origin
}

export async function isAuthenticated() {
  const t = await loadTokens()
  return !!(t && (t.refresh_token || t.access_token))
}

async function getValidAccessToken() {
  const tokens = await loadTokens()
  if (!tokens) throw new Error('Not authenticated with Google Drive')

  if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60_000) {
    return tokens.access_token
  }
  if (!tokens.refresh_token) return tokens.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  const refreshed = await res.json()
  const merged    = { ...tokens, ...refreshed, expiry_date: Date.now() + (refreshed.expires_in * 1000) }
  await saveTokens(merged)
  return merged.access_token
}

export async function uploadToDrive({ pdfBase64, fileName }) {
  const accessToken = await getValidAccessToken()
  const buffer      = Buffer.from(pdfBase64, 'base64')
  const boundary    = 'QuoteXBoundary' + Date.now()
  const metadata    = JSON.stringify({ name: fileName, mimeType: 'application/pdf' })

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)
  const data = await res.json()

  return { fileId: data.id, fileName: data.name, driveLink: data.webViewLink }
}
