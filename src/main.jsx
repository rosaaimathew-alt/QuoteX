import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Attach the session token to every same-origin /api/ request. Doing it once
// here means no fetch call site can forget it, and public signing pages (which
// have no token) simply send nothing and hit the public endpoints as before.
const _fetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => {
  try {
    const url = typeof input === 'string' ? input : input?.url || ''
    const isApi = url.startsWith('/api/') || url.includes(`${window.location.origin}/api/`)
    const token = isApi ? localStorage.getItem('qx_token') : null
    if (token) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {})
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
      init = { ...init, headers }
    }
  } catch {
    // If anything goes wrong building headers, fall through to a normal fetch.
  }
  return _fetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
