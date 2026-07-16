import { Navigate } from 'react-router-dom'
import { supabase, supabaseReady } from '../supabase'
import { useSession } from '../useSession'
import { _resetOrgCache } from '../store'

function getToken() {
  return localStorage.getItem('qx_token')
}

// Legacy token check (used only when Supabase isn't configured)
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
  if (supabaseReady) return true // resolved by AuthGuard via session
  return isTokenValid(getToken())
}

export async function logout() {
  try { _resetOrgCache() } catch {}
  if (supabaseReady && supabase) {
    try { await supabase.auth.signOut() } catch {}
  }
  try { localStorage.removeItem('qx_token') } catch {}
  window.location.href = '/login'
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )
}

export default function AuthGuard({ children }) {
  // Supabase mode: gate on the auth session.
  if (supabaseReady) {
    return <SupabaseGuard>{children}</SupabaseGuard>
  }
  // Legacy mode: gate on the local token.
  if (!isTokenValid(getToken())) return <Navigate to="/login" replace />
  return children
}

function SupabaseGuard({ children }) {
  const { loading, session } = useSession()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  return children
}
