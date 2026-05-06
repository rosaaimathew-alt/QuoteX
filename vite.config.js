import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import http from 'http'

const DATA_FILE = resolve('./quotex-data.json')

function localStorePlugin() {
  return {
    name: 'quotex-local-store',
    configureServer(server) {

      // ── File-backed data store (/api/store) ───────────────────────────────
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

      // ── Ollama proxy (/api/ai → localhost:11434/v1) ───────────────────────
      // Proxied through the Vite server so road devices (Tailscale) can use
      // the AI features without Ollama needing to be installed on their end.
      server.middlewares.use('/api/ai', (req, res) => {
        const ollamaPath = '/v1' + (req.url || '/')
        const proxyReq = http.request(
          { hostname: 'localhost', port: 11434, path: ollamaPath, method: req.method, headers: { ...req.headers, host: 'localhost:11434' } },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers)
            proxyRes.pipe(res)
          }
        )
        proxyReq.on('error', () => {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Ollama is not running. In Terminal: ollama serve' }))
        })
        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localStorePlugin()],
  server: {
    host: true,
  },
})
