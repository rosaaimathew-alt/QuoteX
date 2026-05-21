import { useState } from 'react'
import { useStore } from '../store'
import { Plus, X, Phone, Mail, Wrench, Star, Edit2, Check } from 'lucide-react'

const TRADES = ['Electrical', 'Plumbing', 'HVAC', 'Concrete / Footings', 'Roofing', 'Framing', 'Painting', 'Landscaping', 'General Labor', 'Other']

const RATING_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500']

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-5 h-5 rounded-sm transition-colors ${n <= value ? 'text-amber-400' : 'text-gray-200'}`}>
          <Star size={14} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function SubForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    trade: initial.trade || '',
    phone: initial.phone || '',
    email: initial.email || '',
    rating: initial.rating || 0,
    notes: initial.notes || '',
  })
  const f = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name / Company</label>
          <input autoFocus value={form.name} onChange={f('name')} placeholder="e.g. John's Electric"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Trade</label>
          <select value={form.trade} onChange={f('trade')}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Select trade…</option>
            {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input value={form.phone} onChange={f('phone')} placeholder="(555) 000-0000" type="tel"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input value={form.email} onChange={f('email')} placeholder="sub@example.com" type="email"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Rating</label>
        <StarRating value={form.rating} onChange={r => setForm(s => ({ ...s, rating: r }))} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2}
          placeholder="License #, insurance expiry, strengths/weaknesses…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} disabled={!form.name.trim()}
          className="flex-1 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
          Save
        </button>
        <button onClick={onCancel}
          className="flex-1 py-2 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

function SubCard({ sub }) {
  const { updateSubcontractor, deleteSubcontractor } = useStore()
  const [editing, setEditing] = useState(false)

  if (editing) return (
    <SubForm
      initial={sub}
      onSave={form => { updateSubcontractor(sub.id, form); setEditing(false) }}
      onCancel={() => setEditing(false)}
    />
  )

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{sub.name}</p>
          {sub.trade && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{sub.trade}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => { if (window.confirm(`Remove ${sub.name}?`)) deleteSubcontractor(sub.id) }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {sub.rating > 0 && <StarRating value={sub.rating} onChange={() => {}} />}

      <div className="mt-2 space-y-1">
        {sub.phone && (
          <a href={`tel:${sub.phone}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
            <Phone size={11} className="shrink-0" /> {sub.phone}
          </a>
        )}
        {sub.email && (
          <a href={`mailto:${sub.email}`} className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
            <Mail size={11} className="shrink-0" /> {sub.email}
          </a>
        )}
        {sub.notes && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{sub.notes}</p>}
      </div>
    </div>
  )
}

export default function Subcontractors() {
  const { subcontractors, addSubcontractor } = useStore()
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [tradeFilter, setTradeFilter] = useState('All')

  const trades = ['All', ...Array.from(new Set(subcontractors.map(s => s.trade).filter(Boolean)))]

  const filtered = subcontractors.filter(s => {
    if (tradeFilter !== 'All' && s.trade !== tradeFilter) return false
    if (query) {
      const q = query.toLowerCase()
      return [s.name, s.trade, s.phone, s.email, s.notes].some(v => v?.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subcontractors</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{subcontractors.length} subs in directory</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={15} /> Add Sub
        </button>
      </div>

      {/* Filters */}
      {subcontractors.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {trades.map(t => (
              <button key={t} onClick={() => setTradeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tradeFilter === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-full sm:w-52">
            <Wrench size={13} className="text-gray-400 shrink-0" />
            <input className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
              placeholder="Search subs…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>}
          </div>
        </div>
      )}

      {adding && (
        <div className="mb-4">
          <SubForm
            onSave={form => { addSubcontractor(form); setAdding(false) }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {subcontractors.length === 0 && !adding && (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <Wrench size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No subcontractors yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your electricians, concrete crews, and other subs.</p>
          <button onClick={() => setAdding(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Add first sub
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(sub => <SubCard key={sub.id} sub={sub} />)}
      </div>
    </div>
  )
}
