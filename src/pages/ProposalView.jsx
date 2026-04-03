import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Copy, ArrowLeft, CheckCircle } from 'lucide-react'

const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ProposalView() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('proposal')
    if (raw) setData(JSON.parse(raw))
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

  // Group lines by section (exact heading from estimate), preserving order of first appearance
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
          {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Proposal document */}
      <div className="max-w-3xl mx-auto my-8 bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none print:my-0">

        {/* Header */}
        <div className="bg-blue-700 text-white px-10 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PROPOSAL</h1>
              <p className="text-blue-200 text-sm mt-1">{today}</p>
              {expirationFormatted && (
                <p className="text-blue-100 text-sm mt-0.5 font-medium">Valid Until: {expirationFormatted}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">EstimateIQ</p>
              <p className="text-blue-200 text-sm">Contractor Services</p>
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

        {/* ── SCOPE OF WORK — one flowing paragraph per section ── */}
        <div className="px-10 py-7 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Scope of Work</p>

          <div className="space-y-7">
            {sectionOrder.map(key => {
              const items = sections[key]
              // Build one flowing prose string from all descriptions in this section
              const prose = items
                .map(l => l.description || l.name)
                .filter(Boolean)
                .join(' ')
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-700">{key}</span>
                    <div className="flex-1 h-px bg-blue-100" />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{prose}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── PRICING TABLE — at the bottom ── */}
        <div className="px-10 py-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Pricing</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Item</th>
                <th className="text-center pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-16">Qty</th>
                <th className="text-center pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-16">Unit</th>
                <th className="text-right pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-28">Unit Price</th>
                <th className="text-right pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="py-2.5 text-gray-800 font-medium">{line.name || '—'}</td>
                  <td className="py-2.5 text-center text-gray-600">{line.qty}</td>
                  <td className="py-2.5 text-center text-gray-500 text-xs">{line.unit}</td>
                  <td className="py-2.5 text-right text-gray-600">${fmt(line.unitPrice)}</td>
                  <td className="py-2.5 text-right font-semibold text-gray-900">${fmt(line.qty * line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} />
                <td className="pt-4 text-right text-sm font-semibold text-gray-600 pr-4">TOTAL</td>
                <td className="pt-4 text-right text-xl font-bold text-blue-700">${fmt(subtotal)}</td>
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
