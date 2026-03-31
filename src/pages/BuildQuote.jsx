import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../store'

const MARGIN_DEFAULT = 30

export default function BuildQuote() {
  const catalog = useStore(s => s.catalog)
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [lines, setLines] = useState([])
  const [client, setClient] = useState('')
  const [address, setAddress] = useState('')
  const [margin, setMargin] = useState(MARGIN_DEFAULT)
  const [showMargin, setShowMargin] = useState(false)

  const cats = ['All', ...new Set(catalog.map(c => c.category))]
  const filtered = catalog
    .filter(c => catFilter === 'All' || c.category === catFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  const addItem = (item) => {
    setLines(prev => {
      const existing = prev.find(l => l.catalogId === item.id)
      if (existing) {
        return prev.map(l => l.catalogId === item.id ? { ...l, qty: l.qty + 1 } : l)
      }
      return [...prev, {
        id: Date.now() + Math.random(),
        catalogId: item.id,
        name: item.name,
        unit: item.unit,
        qty: 1,
        unitPrice: item.unitPrice,
        category: item.category,
      }]
    })
  }

  const updateLine = (id, field, val) => {
    setLines(prev => prev.map(l => l.id === id
      ? { ...l, [field]: field === 'qty' || field === 'unitPrice' ? parseFloat(val) || 0 : val }
      : l
    ))
  }

  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id))

  const addBlankLine = () => setLines(prev => [...prev, {
    id: Date.now(),
    catalogId: null,
    name: '',
    unit: 'EA',
    qty: 1,
    unitPrice: 0,
    category: 'General',
  }])

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...lines]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setLines(next)
  }
  const moveDown = (idx) => {
    if (idx === lines.length - 1) return
    const next = [...lines]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setLines(next)
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const cost = showMargin ? subtotal / (1 + margin / 100) : null

  const goToProposal = () => {
    sessionStorage.setItem('proposal', JSON.stringify({ client, address, lines, margin }))
    navigate('/proposal')
  }

  return (
    <div className="p-6 flex gap-5 h-full min-h-screen">
      {/* Left: Catalog picker */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <h3 className="font-semibold text-gray-800 text-sm">Catalog</h3>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2 py-0.5 rounded text-xs font-medium ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-[calc(100vh-220px)]">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <p className="text-xs font-medium text-gray-800 group-hover:text-blue-700 leading-tight">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">${item.unitPrice}/{item.unit}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Quote builder */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Build Quote</h2>
          <button
            onClick={goToProposal}
            disabled={!lines.length}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview Proposal →
          </button>
        </div>

        {/* Client info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Client Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="John Smith" value={client} onChange={e => setClient(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Project Address</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="123 Main St" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-xl border border-gray-200 flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Unit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-28">Unit Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-28">Line Total</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp size={12} /></button>
                        <button onClick={() => moveDown(idx)} disabled={idx === lines.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown size={12} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm text-gray-800"
                        value={line.name}
                        onChange={e => updateLine(line.id, 'name', e.target.value)}
                        placeholder="Item description"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="0"
                        className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm text-center"
                        value={line.qty}
                        onChange={e => updateLine(line.id, 'qty', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="text-sm border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none"
                        value={line.unit}
                        onChange={e => updateLine(line.id, 'unit', e.target.value)}
                      >
                        {['LF','SF','EA','HR','LS','LOAD','TON','DAY'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-0.5">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number" min="0"
                          className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm"
                          value={line.unitPrice}
                          onChange={e => updateLine(line.id, 'unitPrice', e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-800">
                      ${(line.qty * line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeLine(line.id)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lines.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Click items from the catalog on the left to add them.</p>
            </div>
          )}

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button onClick={addBlankLine} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
              <Plus size={14} /> Add blank line
            </button>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">{lines.length} line{lines.length !== 1 ? 's' : ''}</p>
              <p className="text-lg font-bold text-gray-900">
                ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Margin overlay — contractor only */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-800">Margin Overlay (Contractor Only)</span>
            <button onClick={() => setShowMargin(m => !m)} className="text-amber-600 hover:text-amber-800">
              {showMargin ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {showMargin && (
            <div className="flex items-center gap-4 text-sm">
              <label className="text-amber-700">Margin %</label>
              <input
                type="number" min="0" max="100"
                className="w-20 border border-amber-300 rounded px-2 py-1 text-center focus:outline-none"
                value={margin}
                onChange={e => setMargin(parseFloat(e.target.value) || 0)}
              />
              <div className="flex gap-6 ml-auto">
                <div className="text-center">
                  <p className="text-xs text-amber-600">Est. Cost</p>
                  <p className="font-semibold text-amber-900">${cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-amber-600">Est. Profit</p>
                  <p className="font-semibold text-green-700">${(subtotal - cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
