import { Navigate } from 'react-router-dom'
import { DEMO } from '../demo'

function getToken() {
  return localStorage.getItem('qx_token')
}

function isTokenValid(token) {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[0]))
    return payload.exp > Date.now()
  } catch {
    return false
  }
}

export function useAuth() {
  return isTokenValid(getToken())
}

export function logout() {
  try { localStorage.removeItem('qx_token') } catch {}
  window.location.href = '/login'
}

export default function AuthGuard({ children }) {
  // Demo builds are a public sandbox with no real data — skip the login gate.
  if (DEMO) return children
  if (!isTokenValid(getToken())) return <Navigate to="/login" replace />
  return children
}
