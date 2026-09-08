import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

// Public, read-only proposal a customer opens from the email link. Fetching it
// records the open server-side (that's the tracking) and returns a display-only
// snapshot — no pricing internals, costs, or app data. Mirrors the app's own
// proposal layout: Scope of Work with descriptions, and à-la-carte vs. summed
// pricing (à la carte shows each option priced individually with NO grand total).
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
  const lines = s.lines || []
  const subtotal = typeof s.subtotal === 'number'
    ? s.subtotal
    : lines.reduce((a, l) => a + (Number(l.qty) || 1) * (Number(l.unitPrice) || 0), 0)
  const showItemized = s.showBreakdown || s.isAlaCarte
  const fmtDate = (v, dateOnly) => {
    if (!v) return null
    const d = dateOnly ? new Date(v + 'T00:00:00') : new Date(v)
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  const estimateDate = fmtDate(s.estimateDate, false)
  const expiry = fmtDate(s.expiration, true)

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
          {s.address ? <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>{s.address}</p> : <div style={{ height: 8 }} />}

          {/* Dates */}
          {(estimateDate || expiry) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, margin: '0 0 20px' }}>
              {estimateDate && (
                <div>
                  <p style={dateLabel}>Estimate Date</p>
                  <p style={dateValue}>{estimateDate}</p>
                </div>
              )}
              {expiry && (
                <div>
                  <p style={dateLabel}>Valid Until</p>
                  <p style={{ ...dateValue, color: '#b91c1c' }}>{expiry}</p>
                </div>
              )}
            </div>
          )}

          {s.projectSummary ? (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.projectSummary}</p>
            </div>
          ) : null}

          {/* Scope of Work — names + descriptions (no prices in the list) */}
          {lines.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...sectionLabel, color: accent }}>Scope of Work</p>
              {lines.map((l, i) => (
                <div key={i} style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 12, marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{l.name || '—'}</p>
                  {l.description ? <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{l.description}</p> : null}
                </div>
              ))}
            </div>
          )}

          {/* Pricing table */}
          <p style={{ ...sectionLabel, color: accent }}>{s.isAlaCarte ? 'Options & Pricing' : 'Pricing'}</p>
          {s.isAlaCarte && (
            <p style={{ margin: '0 0 12px', fontSize: 12, fontStyle: 'italic', color: '#64748b' }}>
              These options are priced individually — check the ones you’d like and reply to let us know.
            </p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ ...th, textAlign: 'left' }}>{s.isAlaCarte ? 'Option' : 'Item'}</th>
                <th style={{ ...th, textAlign: 'right', width: 120 }}>Price</th>
                {s.isAlaCarte && <th style={{ ...th, textAlign: 'center', width: 60 }}>Select</th>}
              </tr>
            </thead>
            <tbody>
              {showItemized ? lines.map((l, i) => (
                <tr key={i} style={{ background: i % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{l.name || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>${fmt((Number(l.qty) || 1) * (Number(l.unitPrice) || 0))}</td>
                  {s.isAlaCarte && (
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: 16, height: 16, border: '1.5px solid #94a3b8', borderRadius: 3 }} />
                    </td>
                  )}
                </tr>
              )) : (
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>Project Total</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>${fmt(subtotal)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Grand total — summed mode only; à la carte has none by design */}
          {!s.isAlaCarte && (
            <div style={{ borderTop: '2px solid #d1d5db', marginTop: 8, paddingTop: 14, textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginRight: 16 }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: accent }}>${fmt(subtotal)}</span>
            </div>
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
const sectionLabel = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }
const dateLabel = { margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }
const dateValue = { margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#1f2937' }
const th = { padding: '8px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }
const td = { padding: '10px 4px', fontSize: 13, color: '#1e293b' }
