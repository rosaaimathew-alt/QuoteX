import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

// Public, read-only proposal a customer opens from the email link. Fetching it
// records the open server-side (that's the tracking) and returns a display-only
// snapshot — no pricing internals, costs, or app data.
const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function PublicProposal() {
  const { token } = useParams()
  const [state, setState] = useState({ loading: true, error: '', snapshot: null })

  useEffect(() => {
    let alive = true
    fetch(`/api/sign/popen-${token}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'This proposal link is no longer available.')
        return d
      })
      .then(d => { if (alive) setState({ loading: false, error: '', snapshot: d.snapshot || null }) })
      .catch(err => { if (alive) setState({ loading: false, error: err.message, snapshot: null }) })
    return () => { alive = false }
  }, [token])

  const { loading, error, snapshot } = state

  if (loading) {
    return <div style={wrap}><p style={{ color: '#64748b', fontSize: 14 }}>Loading your proposal…</p></div>
  }
  if (error || !snapshot) {
    return (
      <div style={wrap}>
        <div style={card}>
          <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Proposal unavailable</p>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{error || 'This link is no longer available. Please contact us for an updated copy.'}</p>
        </div>
      </div>
    )
  }

  const s = snapshot
  const accent = s.primaryColor || '#0f172a'
  const subtotal = (s.lines || []).reduce((a, l) => a + (Number(l.qty) || 1) * (Number(l.unitPrice) || 0), 0)
  const total = s.total || subtotal
  const expiry = s.expiration
    ? new Date(s.expiration + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div style={wrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ background: accent, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>{s.companyName || 'Your Proposal'}</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Proposal{s.contractNum ? ` · ${s.contractNum}` : ''}</p>
          </div>
          {s.logo ? <img src={s.logo} alt="logo" style={{ height: 44, objectFit: 'contain' }} /> : null}
        </div>

        <div style={{ padding: '28px 32px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 15, color: '#0f172a', fontWeight: 600 }}>
            {s.client ? `Prepared for ${s.client}` : 'Your Proposal'}
          </p>
          {s.address ? <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>{s.address}</p> : <div style={{ height: 12 }} />}

          {s.projectSummary ? (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.projectSummary}</p>
            </div>
          ) : null}

          {(s.lines || []).length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={th}>Item</th>
                  <th style={{ ...th, textAlign: 'right', width: 120 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.lines.map((l, i) => (
                  <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={td}>{l.name}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>${fmt((Number(l.qty) || 1) * (Number(l.unitPrice) || 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: accent }}>
                  <td style={{ ...td, color: '#fff', fontWeight: 700, letterSpacing: '0.02em' }}>TOTAL INVESTMENT</td>
                  <td style={{ ...td, color: '#fff', fontWeight: 700, textAlign: 'right', fontSize: 18 }}>${fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {expiry && <p style={{ margin: '18px 0 0', fontSize: 13, color: '#64748b' }}>This proposal is valid until <strong style={{ color: '#0f172a' }}>{expiry}</strong>.</p>}

          <div style={{ background: '#eff6ff', borderRadius: 8, borderLeft: '4px solid #3b82f6', padding: '14px 18px', marginTop: 22 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
              To accept this proposal or ask any questions, simply reply to the email we sent you or give us a call. A 20% deposit is required to schedule your project.
            </p>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px 32px', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{s.companyName || 'Ebony Outdoor Living'}</p>
        </div>
      </div>
    </div>
  )
}

const wrap = { minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif" }
const card = { width: 640, maxWidth: '100%', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
const th = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }
const td = { padding: '10px 16px', fontSize: 13, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }
