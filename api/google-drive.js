import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KEY_FILE = path.resolve(__dirname, 'service-account-key.json')
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

function getAuth() {
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(
      'api/service-account-key.json not found. ' +
      'Download your service account key from Google Cloud Console and save it there.'
    )
  }
  return new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes: SCOPES })
}

export async function uploadToDrive({ pdfBase64, fileName }) {
  const auth  = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const buffer = Buffer.from(pdfBase64, 'base64')

  const file = await drive.files.create({
    requestBody: { name: fileName, mimeType: 'application/pdf' },
    media:       { mimeType: 'application/pdf', body: Readable.from(buffer) },
    fields:      'id,name,webViewLink',
  })

  const fileId    = file.data.id
  const userEmail = process.env.GOOGLE_USER_EMAIL

  if (userEmail) {
    await drive.permissions.create({
      fileId,
      requestBody: { type: 'user', role: 'writer', emailAddress: userEmail },
      sendNotificationEmail: false,
    })
  }

  return {
    fileId,
    fileName:  file.data.name,
    driveLink: file.data.webViewLink,
  }
}
