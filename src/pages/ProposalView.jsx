import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Copy, ArrowLeft, CheckCircle, Send, X, Loader } from 'lucide-react'
import { useStore } from '../store'
import { generatePalette, DEFAULT_BRAND_COLOR } from '../brand'

const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ProposalView() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)

  // Send modal state
  const [showSend, setShowSend] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')

  const proposalIdRef = useRef(null)
  const { saveProposal, markProposalSent } = useStore()
  const branding = useStore(s => s.branding)
  const palette  = generatePalette(branding?.primaryColor || DEFAULT_BRAND_COLOR)
  const companyName = branding?.companyName || 'QUOTEX'

  useEffect(() => {
    const raw = sessionStorage.getItem('proposal')
    if (raw) {
      const parsed = JSON.parse(raw)
      setData(parsed)
      // Auto-save as Draft to the proposals log (idempotent — uses existing id if set)
      if (!parsed.proposalId) {
        const id = saveProposal({
          client: parsed.client,
          email: parsed.email,
          phone: parsed.phone,
          address: parsed.address,
          expiration: parsed.expiration,
          total: parsed.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
          lines: parsed.lines,
          status: 'Draft',
          parentId: parsed.parentId || null,
        })
        proposalIdRef.current = id
        // Persist id back into sessionStorage so repeated views don't duplicate
        sessionStorage.setItem('proposal', JSON.stringify({ ...parsed, proposalId: id }))
      } else {
        proposalIdRef.current = parsed.proposalId
      }
    }
  }, [])

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="mb-4">No proposal data. Build a quote first.</p>
        <button onClick={() => navigate('/quote')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Go to Build Quote</button>
      </div>
    )
  }

  const { client, email, phone, address, expiration, lines } = data
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const expirationFormatted = expiration
    ? new Date(expiration + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  // Group lines by section
  const sectionOrder = []
  const sections = {}
  lines.forEach(line => {
    const key = (line.section || line.category || 'General').trim()
    if (!sections[key]) { sections[key] = []; sectionOrder.push(key) }
    sections[key].push(line)
  })

  const handleCopy = () => {
    const scopeText = sectionOrder.map(key => {
      const items = sections[key]
      const prose = items.map(l => l.description || l.name).filter(Boolean).join(' ')
      return `${key.toUpperCase()}\n${prose}`
    }).join('\n\n')

    const pricingText = lines.map((l, i) =>
      `${i + 1}. ${l.name}  |  ${l.qty} ${l.unit} × $${l.unitPrice}  =  $${fmt(l.qty * l.unitPrice)}`
    ).join('\n')

    const text = [
      'PROPOSAL',
      '',
      `Date: ${today}`,
      expirationFormatted ? `Valid Until: ${expirationFormatted}` : '',
      client ? `Customer: ${client}` : '',
      phone ? `Phone: ${phone}` : '',
      email ? `Email: ${email}` : '',
      address ? `Project Address: ${address}` : '',
      '',
      '─'.repeat(60),
      'SCOPE OF WORK',
      '─'.repeat(60),
      '',
      scopeText,
      '',
      '─'.repeat(60),
      'PRICING',
      '─'.repeat(60),
      '',
      pricingText,
      '',
      `TOTAL: $${fmt(subtotal)}`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSend = async () => {
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: { ...data },
          fromName,
          fromEmail,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send.')
      // Log as Sent in the CRM
      if (proposalIdRef.current) markProposalSent(proposalIdRef.current)
      setSendSuccess(true)
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/quote')} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back to Quote
        </button>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          {copied ? <CheckCircle size={14} className="text-[var(--brand-500)]" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button
          onClick={() => { setShowSend(true); setSendSuccess(false); setSendError('') }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          <Send size={14} /> Send to Client
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Send Email Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Send Proposal to Client</h3>
              <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {sendSuccess ? (
              <div className="text-center py-6">
                <CheckCircle size={40} className="text-[var(--brand-500)] mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Proposal Sent!</p>
                <p className="text-sm text-gray-500 mb-1">Email delivered to <strong>{email}</strong></p>
                <p className="text-xs text-gray-400 mb-4">This proposal has been logged as <span className="font-medium text-blue-600">Sent</span> in your tracker.</p>
                <button
                  onClick={() => { setShowSend(false); navigate('/tracker') }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  View in Tracker →
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Sending to</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                      {email || <span className="text-red-500 italic">No email on this proposal — go back and add one.</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Your Name (optional — shows as sender)</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="e.g. Mike's Construction"
                      value={fromName}
                      onChange={e => setFromName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Reply-to Email (optional)</label>
                    <input
                      type="email"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="you@yourcompany.com"
                      value={fromEmail}
                      onChange={e => setFromEmail(e.target.value)}
                    />
                  </div>
                </div>

                {sendError && (
                  <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {sendError}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowSend(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !email}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? <><Loader size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Proposal</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Proposal document */}
      <div className="max-w-3xl mx-auto my-8 bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none print:my-0">

        {/* Header */}
        <div className="text-white px-10 py-8" style={{ backgroundColor: palette[700] }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PROPOSAL</h1>
              <p className="text-sm mt-1" style={{ color: palette[200] }}>{today}</p>
              {expirationFormatted && (
                <p className="text-sm mt-0.5 font-medium" style={{ color: palette[100] }}>Valid Until: {expirationFormatted}</p>
              )}
            </div>
            <div className="text-right">
              {branding?.logo
                ? <img src={branding.logo} alt="logo" className="h-14 object-contain ml-auto" />
                : <p className="font-semibold text-lg">{companyName}</p>}
            </div>
          </div>
        </div>

        {/* Customer info */}
        {(client || email || phone || address) && (
          <div className="px-10 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Prepared For</p>
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                {client && <p className="font-semibold text-gray-900 text-lg">{client}</p>}
                {address && <p className="text-gray-500 text-sm mt-0.5">{address}</p>}
              </div>
              {(email || phone) && (
                <div className="text-right text-sm text-gray-500">
                  {phone && <p>{phone}</p>}
                  {email && <p>{email}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scope of Work */}
        <div className="px-10 py-7 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Scope of Work</p>
          <div className="space-y-7">
            {sectionOrder.map(key => {
              const items = sections[key]
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: palette[700] }}>{key}</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: palette[100] }} />
                  </div>
                  <div className="space-y-2 pl-0">
                    {items.map(line => (
                      <div key={line.id} className="border-l-2 border-gray-100 pl-3">
                        <p className="text-sm font-semibold text-gray-800">{line.name}</p>
                        {line.description && (
                          <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{line.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pricing Table */}
        <div className="px-10 py-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Pricing</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Item</th>
                <th className="text-left pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Description</th>
                <th className="text-right pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-28">Price</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="py-2.5 text-gray-800 font-medium">{line.name || '—'}</td>
                  <td className="py-2.5 text-gray-500 text-xs">{line.description || '—'}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">${fmt(line.qty * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={2} />
                <td className="pt-4 text-right text-xl font-bold" style={{ color: palette[700] }}>${fmt(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms & Signature */}
        <div className="px-10 pb-10">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-600 mb-1">Terms & Conditions</p>
            <p>
              {expirationFormatted
                ? `This proposal is valid until ${expirationFormatted}.`
                : 'This proposal is valid for 30 days from the date above.'
              } A 50% deposit is required to schedule work. Final payment is due upon completion. Pricing is based on normal site conditions; any unforeseen conditions may result in additional costs with prior approval. All work to be completed in a professional manner according to standard practices.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-10">
            <div>
              <div className="border-b border-gray-300 mb-1.5 pb-6" />
              <p className="text-xs text-gray-500">Client Signature & Date</p>
            </div>
            <div>
              <div className="border-b border-gray-300 mb-1.5 pb-6" />
              <p className="text-xs text-gray-500">Contractor Signature & Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
