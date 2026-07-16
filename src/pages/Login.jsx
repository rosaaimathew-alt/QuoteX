import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, supabaseReady } from '../supabase'

export default function Login() {
  const navigate   = useNavigate()
  const [mode, setMode]         = useState('signin') // 'signin' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany]   = useState('')
  const [error, setError]       = useState('')
  const [notice, setNotice]     = useState('')
  const [loading, setLoading]   = useState(false)

  // ── Legacy (pre-Supabase) login, kept as a fallback ──
  const legacyLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('qx_token', data.token)
      window.location.href = '/'
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabaseReady) return legacyLogin(e)
    setError(''); setNotice(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        window.location.href = '/'
        return
      }
      // Sign up → create the account, then its organization
      if (!company.trim()) throw new Error('Enter your company name.')
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) throw error
      if (!data.session) {
        // Email confirmation is on — org gets created on first real sign-in below
        setNotice('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
        setLoading(false)
        return
      }
      const { error: rpcErr } = await supabase.rpc('create_organization', { org_name: company.trim() })
      if (rpcErr) throw rpcErr
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">QuoteX</h1>
          <p className="text-sm text-gray-500 mt-1">{mode === 'signup' ? 'Create your account' : 'Sign in to continue'}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          {mode === 'signup' && supabaseReady && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input value={company} onChange={e => setCompany(e.target.value)} required autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ebony Outdoor Living" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-600">{notice}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign In'}
          </button>

          {supabaseReady && (
            <p className="text-center text-xs text-gray-500">
              {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
              <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice('') }}
                className="text-blue-600 font-medium hover:underline">
                {mode === 'signup' ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
