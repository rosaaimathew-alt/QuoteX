import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DATA_FILE = resolve('./quotex-data.json')

// Vite plugin: serves /api/store as a simple file-backed REST endpoint.
// This lets any device on the same network (Tailscale) share one data file.
function localStorePlugin() {
  return {
    name: 'quotex-local-store',
    configureServer(server) {
      server.middlewares.use('/api/store', (req, res) => {
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'GET') {
          res.end(existsSync(DATA_FILE) ? readFileSync(DATA_FILE, 'utf-8') : 'null')
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { value } = JSON.parse(body)
              writeFileSync(DATA_FILE, value, 'utf-8')
              res.end('{"ok":true}')
            } catch {
              res.statusCode = 400
              res.end('{"error":"bad request"}')
            }
          })
          return
        }

        res.statusCode = 405
        res.end('{"error":"method not allowed"}')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localStorePlugin()],
  server: {
    host: true, // expose to Tailscale / LAN without needing --host flag
  },
})
