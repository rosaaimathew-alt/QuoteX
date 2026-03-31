import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Copy, ArrowLeft, CheckCircle } from 'lucide-react'

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

  const { client, address, lines } = data
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const handleCopy = () => {
    const text = [
      'PROPOSAL',
      '',
      `Date: ${today}`,
      client ? `Client: ${client}` : '',
      address ? `Project: ${address}` : '',
      '',
      'LINE ITEMS',
      '─'.repeat(60),
      ...lines.map((l, i) =>
        `${i + 1}. ${l.name}\n   ${l.qty} ${l.unit} × $${l.unitPrice.toLocaleString()} = $${(l.qty * l.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ),
      '─'.repeat(60),
      `TOTAL: $${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      '',
      'This proposal is valid for 30 days.',
    ].filter(l => l !== null).join('\n')

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
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">EstimateIQ</p>
              <p className="text-blue-200 text-sm">Contractor Services</p>
            </div>
          </div>
        </div>

        {/* Client info */}
        {(client || address) && (
          <div className="px-10 py-5 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Prepared For</p>
            {client && <p className="font-semibold text-gray-900 text-lg">{client}</p>}
            {address && <p className="text-gray-500 text-sm">{address}</p>}
          </div>
        )}

        {/* Line items */}
        <div className="px-10 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Scope of Work & Itemized Pricing</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">Description</th>
                <th className="text-center pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-16">Qty</th>
                <th className="text-center pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-16">Unit</th>
                <th className="text-right pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-28">Unit Price</th>
                <th className="text-right pb-2 font-semibold text-gray-600 text-xs uppercase tracking-wider w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={line.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="py-3 text-gray-800 font-medium">{line.name || '—'}</td>
                  <td className="py-3 text-center text-gray-600">{line.qty}</td>
                  <td className="py-3 text-center text-gray-500 text-xs">{line.unit}</td>
                  <td className="py-3 text-right text-gray-600">
                    ${line.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-900">
                    ${(line.qty * line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={3} />
                <td className="pt-4 text-right text-sm font-semibold text-gray-600 pr-4">TOTAL</td>
                <td className="pt-4 text-right text-xl font-bold text-blue-700">
                  ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms */}
        <div className="px-10 pb-8">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-600 mb-1">Terms & Conditions</p>
            <p>This proposal is valid for 30 days from the date above. A 50% deposit is required to schedule work. Final payment is due upon completion. Pricing is based on normal site conditions; any unforeseen conditions may result in additional costs with prior approval. All work to be completed in a professional manner according to standard practices.</p>
          </div>

          {/* Signature */}
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
