import { Navigate } from 'react-router-dom'

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
  const token = getToken()
  return isTokenValid(token)
}

export function logout() {
  localStorage.removeItem('qx_token')
  window.location.href = '/login'
}

export default function AuthGuard({ children }) {
  const token = getToken()
  if (!isTokenValid(token)) return <Navigate to="/login" replace />
  return children
}
