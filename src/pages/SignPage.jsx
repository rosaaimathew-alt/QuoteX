import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SignaturePad from '../components/SignaturePad'

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ROLE_LABEL = {
  client:  'Client Signature',
  builder: 'Builder Signature — Ebony Outdoor Living',
  gc:      'General Contractor Signature — All-In-One Solutions',
}

export default function SignPage() {
  const { token }             = useParams()
  const sigRef                = useRef(null)
  const [record, setRecord]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [printedName, setPrintedName] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(async r => {
        const text = await r.text()
        let parsed
        try { parsed = JSON.parse(text) } catch { throw new Error(`Bad response (${r.status}): ${text.slice(0, 200)}`) }
        if (!r.ok || parsed.error) throw new Error(parsed.error || `HTTP ${r.status}`)
        return parsed
      })
      .then(d => { setRecord(d); setLoading(false) })
      .catch(err => { setError(err.message || 'Failed to load contract'); setLoading(false) })
  }, [token])

  const handleSubmit = async () => {
    if (!printedName.trim()) { alert('Please enter your full name'); return }
    if (sigRef.current?.isEmpty()) { alert('Please provide your signature'); return }
    setSubmitting(true)
    try {
      const signatureDataUrl = sigRef.current.toDataURL()
      const res    = await fetch(`/api/sign/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signatureDataUrl, printedName }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setDone(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Loading contract…</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-6">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-600 font-semibold">{error}</p>
        <p className="text-gray-400 text-sm mt-1">This link may have expired or is invalid.</p>
      </div>
    </div>
  )

  if (done || record?.alreadySigned) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center px-6 max-w-sm">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">{done ? 'Signed Successfully' : 'Already Signed'}</h1>
        <p className="text-gray-500">
          {done
            ? `Thank you ${printedName || ''}. Your signature has been recorded with audit trail.`
            : 'This party has already signed this contract.'}
        </p>
      </div>
    </div>
  )

  const { contractData: d, contractNum, role } = record || {}
  const total    = (d?.lines || []).reduce((s, l) => s + Number(l.qty || 0) * Number(l.price || 0), 0)
  const payments = d?.payments || []

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            {d?.branding?.logo
              ? <img src={d.branding.logo} alt="logo" className="h-8 object-contain" />
              : <span className="font-black tracking-widest text-sm">EBONY OUTDOOR LIVING</span>}
          </div>
          <div className="text-xs text-gray-400">Contract #{contractNum}</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-3">Contract Summary</h2>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><p className="text-gray-400 text-xs">Client</p><p className="font-semibold">{d?.client}</p></div>
            <div><p className="text-gray-400 text-xs">Date</p><p className="font-semibold">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
            <div className="col-span-2"><p className="text-gray-400 text-xs">Address</p><p className="font-semibold">{d?.address}</p></div>
            <div className="col-span-2">
              <p className="text-gray-400 text-xs">Total Contract Sum</p>
              <p className="font-bold text-xl text-green-700">${fmt(total)}</p>
            </div>
          </div>

          {payments.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Schedule</p>
              <div className="space-y-1 text-sm mb-4">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600">{p.label}</span>
                    <span className="font-semibold">${fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(d?.scopeBullets || []).length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Scope of Work</p>
              <ul className="text-sm space-y-1">
                {d.scopeBullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-gray-700"><span className="text-gray-400 mt-0.5">●</span><span>{b}</span></li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-1 text-xs font-semibold text-blue-600 uppercase tracking-wider">{role && `Signing as ${role}`}</div>
          <h2 className="font-bold text-base mb-1">{ROLE_LABEL[role] || 'Signature'}</h2>
          <p className="text-sm text-gray-500 mb-4">
            By signing below, you confirm you have read and agree to all terms of this contract.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Print Full Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Full legal name"
              value={printedName}
              onChange={e => setPrintedName(e.target.value)}
            />
          </div>

          <div className="mb-1">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Signature</label>
            <SignaturePad ref={sigRef} />
          </div>
          <button className="text-xs text-gray-400 underline mt-1 mb-4 block" onClick={() => sigRef.current?.clear()}>Clear</button>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting…' : 'Sign & Submit'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Your IP address, timestamp, and device info are recorded as your legal audit trail.
          </p>
        </div>
      </div>
    </div>
  )
}
