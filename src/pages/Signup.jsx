import { useState } from 'react'

// Self-service account creation. Anyone with the team code (SIGNUP_CODE env
// var, shared by the owner) can create their own login and set their own
// password; nobody else ever sees it. New accounts start as Sales; a manager
// can change the role in Settings → Team members.
export default function Signup() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [code, setCode]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login?action=signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, password, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create the account')
      localStorage.setItem('qx_token', data.token)
      window.location.href = '/'
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">QuoteX</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus autoComplete="name"
              className={field} placeholder="As it should appear on proposals" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username"
              className={field} placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
              className={field} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password"
              className={field} placeholder="Same password again" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team code</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} required autoComplete="off"
              className={`${field} font-mono`} placeholder="From your office" />
            <p className="text-[11px] text-gray-400 mt-1">Your company's sign-up code. Ask the owner or office if you don't have it.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-4">
          Already have a login? <a href="/login" className="text-blue-600 underline">Sign in</a>
        </p>
        <p className="text-center text-xs text-gray-400 mt-3">
          <a href="/legal/terms" className="hover:text-gray-600 underline">Terms</a>
          {' · '}
          <a href="/legal/privacy" className="hover:text-gray-600 underline">Privacy</a>
        </p>
      </div>
    </div>
  )
}
