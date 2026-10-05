import { Navigate } from 'react-router-dom'
import { DEMO } from '../demo'
import { useStore } from '../store'

function getToken() {
  return localStorage.getItem('qx_token')
}

// Decoded session payload ({ email, name, role, exp }) or null when signed out.
export function tokenPayload() {
  try {
    const t = getToken()
    if (!t) return null
    const payload = JSON.parse(atob(t.split('.')[0]))
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
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

// Role carried by the login itself ('manager' | 'sales' | 'pm'), or null for
// logins issued before roles existed.
export function currentRole() {
  return tokenPayload()?.role || null
}

// The role the app should render for: the login's own role when it has one,
// otherwise the legacy shared role switch in the store.
export function useRole() {
  const storeRole = useStore(s => s.role || 'manager')
  return currentRole() || storeRole
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
