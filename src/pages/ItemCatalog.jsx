import { useState, useRef } from 'react'
import {
  Search, Edit2, Trash2, Plus, Check, X, GripVertical,
  ChevronDown, ChevronRight, LayoutList, Rows3,
  Sparkles, Loader, MoveRight,
} from 'lucide-react'
import { useStore } from '../store'
import { getModel } from '../gemini'

const AI_CHAT_SYSTEM = `You are a pricing catalog assistant for a contractor estimating tool called QUOTEX.
Your job is to help contractors bulk-edit their pricing catalog using plain English commands.
The contractor's full catalog will be provided in each request as JSON.
RESPONSE FORMAT — always follow this exactly:
1. One or two sentences explaining what you changed (or why you can't).
2. If making changes, output a JSON array wrapped in <changes></changes> tags.
Change object format — only include fields being changed:
{ "id": <number>, "name"?: "...", "description"?: "...", "unit"?: "EA|LF|SF|LS", "unitPrice"?: <number>, "category"?: "..." }
Valid categories: Fencing, Gates, Demo, Materials, Labor, Framing, Concrete, Electrical, Plumbing, Roofing, Flooring, Drywall, Painting, HVAC, Windows, Doors, Tile, Insulation, Siding, General
RULES:
- Only modify fields explicitly asked about.
- Never create new items. Never delete items. Only modify existing ones.`

const CATEGORIES = [
  'Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical',
  'Plumbing','Roofing','Flooring','Drywall','Painting','HVAC','Windows','Doors',
  'Tile','Insulation','Siding','General',
]
const UNITS = ['LF', 'SF', 'EA', 'LS']

function fmt(n) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function ConfidenceBadge({ value }) {
  const color = value >= 90 ? 'bg-green-100 text-green-700' : value >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{value}%</span>
}

// ── Move-to dropdown ───────────────────────────────────────────────────────
function MoveTo({ item, onMove }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1 rounded text-gray-300 hover:text-purple-600 hover:bg-purple-50"
        title="Move to category"
      >
        <MoveRight size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-40 max-h-60 overflow-y-auto">
            <p className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Move to</p>
            {CATEGORIES.filter(c => c !== item.category).map(cat => (
              <button
                key={cat}
                onClick={() => { onMove(item.id, cat); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Inline edit row ────────────────────────────────────────────────────────
function EditRow({ item, onSave, onCancel }) {
  const [form, setForm] = useState({ ...item })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <>
      <tr className="bg-blue-50">
        <td className="px-4 py-2 w-6"></td>
        <td className="px-4 py-2"><input className="w-full text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" value={form.name} onChange={e => set('name', e.target.value)} /></td>
        <td className="px-4 py-2">
          <select className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <select className="text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <div className="flex items-center gap-0.5"><span className="text-gray-400">$</span>
            <input type="number" min="0" className="w-20 text-sm border border-blue-300 rounded px-2 py-1 focus:outline-none" value={form.unitPrice} onChange={e => set('unitPrice', parseFloat(e.target.value) || 0)} />
          </div>
        </td>
        <td className="px-4 py-2 text-sm text-gray-500">${form.minPrice} – ${form.maxPrice}</td>
        <td className="px-4 py-2 text-sm text-center text-gray-500">{form.count}</td>
        <td className="px-4 py-2"><ConfidenceBadge value={form.confidence} /></td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button onClick={() => onSave(form)} className="p-1 rounded text-green-600 hover:bg-green-100"><Check size={14} /></button>
            <button onClick={onCancel} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X size={14} /></button>
          </div>
        </td>
      </tr>
      <tr className="bg-blue-50 border-b border-blue-100">
        <td colSpan={9} className="px-4 pb-2">
          <textarea rows={2} className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none resize-none text-gray-600 italic" placeholder="Scope description..." value={form.description || ''} onChange={e => set('description', e.target.value)} />
        </td>
      </tr>
    </>
  )
}

// ── Table view ─────────────────────────────────────────────────────────────
function TableView({ filtered, editId, setEditId, onSave, onDelete, onMove, addingNew, newForm, setNewForm, saveNew, setAddingNew }) {
  const dragItem = useRef(null)

  const Th = ({ k, label, sortKey, sortAsc, toggleSort }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}>
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 w-6"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Range</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Samples</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Confidence</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {addingNew && (
              <>
                <tr className="bg-green-50">
                  <td className="px-4 py-2 w-6"></td>
                  <td className="px-4 py-2"><input className="w-full text-sm border border-green-300 rounded px-2 py-1 focus:outline-none" placeholder="Item name" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} /></td>
                  <td className="px-4 py-2"><select className="text-sm border border-green-300 rounded px-2 py-1" value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></td>
                  <td className="px-4 py-2"><select className="text-sm border border-green-300 rounded px-2 py-1" value={newForm.unit} onChange={e => setNewForm(f => ({ ...f, unit: e.target.value }))}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></td>
                  <td className="px-4 py-2"><input type="number" min="0" className="w-20 text-sm border border-green-300 rounded px-2 py-1" value={newForm.unitPrice} onChange={e => setNewForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} /></td>
                  <td className="px-4 py-2 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-2 text-gray-400 text-xs text-center">1</td>
                  <td className="px-4 py-2"><ConfidenceBadge value={70} /></td>
                  <td className="px-4 py-2"><div className="flex gap-1"><button onClick={saveNew} className="p-1 rounded text-green-600 hover:bg-green-100"><Check size={14} /></button><button onClick={() => setAddingNew(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X size={14} /></button></div></td>
                </tr>
                <tr className="bg-green-50 border-b border-green-100">
                  <td colSpan={9} className="px-4 pb-2">
                    <textarea rows={2} className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:outline-none resize-none text-gray-600 italic" placeholder="Scope description..." value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
                  </td>
                </tr>
              </>
            )}
            {filtered.map(item =>
              editId === item.id ? (
                <EditRow key={item.id} item={item} onSave={(changes) => { onSave(item.id, changes); setEditId(null) }} onCancel={() => setEditId(null)} />
              ) : (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => { dragItem.current = item.id }}
                  className="hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <td className="px-4 py-2.5 text-gray-300"><GripVertical size={14} /></td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 italic mt-0.5 leading-snug line-clamp-1">{item.description}</p>}
                  </td>
                  <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span></td>
                  <td className="px-4 py-2.5 text-gray-500">{item.unit}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-900">${fmt(item.unitPrice)}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">${item.minPrice} – ${item.maxPrice}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{item.count}</td>
                  <td className="px-4 py-2.5"><ConfidenceBadge value={item.confidence} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <MoveTo item={item} onMove={onMove} />
                      <button onClick={() => setEditId(item.id)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                      <button onClick={() => onDelete(item.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">No items match your search.</div>}
    </div>
  )
}

// ── Sections view ──────────────────────────────────────────────────────────
function SectionsView({ catalog, onMove, onDelete, onSave }) {
  const [collapsed, setCollapsed] = useState({})
  const [editId, setEditId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const dragItem = useRef(null)

  // Group by category, only show categories that have items
  const groups = CATEGORIES
    .map(cat => ({ cat, items: catalog.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0)

  const toggleCollapse = (cat) => setCollapsed(v => ({ ...v, [cat]: !v[cat] }))

  const handleDragStart = (itemId) => { dragItem.current = itemId }

  const handleDrop = (targetCat) => {
    if (dragItem.current != null) {
      const item = catalog.find(i => i.id === dragItem.current)
      if (item && item.category !== targetCat) {
        onMove(dragItem.current, targetCat)
      }
    }
    dragItem.current = null
    setDragOver(null)
  }

  return (
    <div className="space-y-3">
      {groups.map(({ cat, items }) => (
        <div
          key={cat}
          onDragOver={e => { e.preventDefault(); setDragOver(cat) }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop(cat)}
          className={`bg-white rounded-xl border-2 transition-colors overflow-hidden ${
            dragOver === cat ? 'border-purple-400 bg-purple-50' : 'border-gray-200'
          }`}
        >
          {/* Section header — also a drop target */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            onClick={() => toggleCollapse(cat)}
          >
            <div className="flex items-center gap-3">
              {collapsed[cat] ? <ChevronRight size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
              <span className="font-semibold text-gray-800">{cat}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
              {dragOver === cat && (
                <span className="text-xs text-purple-600 font-medium animate-pulse">Drop here →</span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Avg ${Math.round(items.reduce((s, i) => s + i.unitPrice, 0) / items.length).toLocaleString()}
            </span>
          </button>

          {/* Items */}
          {!collapsed[cat] && (
            <div className="border-t border-gray-100">
              {editId && items.find(i => i.id === editId) ? (
                <table className="w-full text-sm">
                  <tbody>
                    <EditRow
                      item={items.find(i => i.id === editId)}
                      onSave={(changes) => { onSave(editId, changes); setEditId(null) }}
                      onCancel={() => setEditId(null)}
                    />
                  </tbody>
                </table>
              ) : null}

              <div className="divide-y divide-gray-50">
                {items.filter(i => i.id !== editId).map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={() => { dragItem.current = null; setDragOver(null) }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-grab active:cursor-grabbing group transition-colors"
                  >
                    <GripVertical size={14} className="text-gray-300 shrink-0 group-hover:text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 italic truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                      <span>{item.unit}</span>
                      <span className="font-semibold text-gray-800">${fmt(item.unitPrice)}</span>
                      <ConfidenceBadge value={item.confidence} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <MoveTo item={item} onMove={onMove} />
                      <button onClick={() => setEditId(item.id)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={13} /></button>
                      <button onClick={() => onDelete(item.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── AI suggest diff overlay ────────────────────────────────────────────────
function AiSuggestBanner({ suggestions, catalog, onApply, onDismiss }) {
  if (!suggestions?.length) return null
  const rows = suggestions.map(s => {
    const item = catalog.find(c => c.id === s.id)
    return item ? { item, newCategory: s.category } : null
  }).filter(Boolean)
  if (!rows.length) return null

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-[var(--brand-500)]" />
          <span className="text-sm font-semibold text-purple-800">AI Category Suggestions</span>
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onDismiss} className="text-xs px-2 py-1 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-100">Dismiss</button>
          <button onClick={() => onApply(suggestions)} className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">Apply All</button>
        </div>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {rows.map(({ item, newCategory }) => (
          <div key={item.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-100 text-sm">
            <span className="flex-1 text-gray-800 font-medium truncate">{item.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
            <MoveRight size={12} className="text-[var(--brand-400)] shrink-0" />
            <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-medium">{newCategory}</span>
            <button
              onClick={() => onApply([{ id: item.id, category: newCategory }])}
              className="text-xs text-purple-600 hover:underline shrink-0"
            >
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function ItemCatalog() {
  const catalog = useStore(s => s.catalog)
  const updateCatalogItem = useStore(s => s.updateCatalogItem)
  const deleteCatalogItem = useStore(s => s.deleteCatalogItem)
  const addCatalogItems   = useStore(s => s.addCatalogItems)

  const [view, setView]       = useState('table')   // 'table' | 'sections'
  const [search, setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [editId, setEditId]   = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '', category: 'General', unit: 'EA', unitPrice: 0, minPrice: 0, maxPrice: 0, count: 1, confidence: 70 })

  // AI suggest state
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [suggestError, setSuggestError] = useState('')

  const cats = ['All', ...CATEGORIES.filter(c => catalog.some(i => i.category === c))]

  const filtered = catalog
    .filter(c => catFilter === 'All' || c.category === catFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      return sortAsc
        ? typeof av === 'string' ? av.localeCompare(bv) : av - bv
        : typeof bv === 'string' ? bv.localeCompare(av) : bv - av
    })

  const toggleSort = (key) => { if (sortKey === key) setSortAsc(a => !a); else { setSortKey(key); setSortAsc(true) } }

  const handleMove = (id, newCategory) => updateCatalogItem(id, { category: newCategory })

  const handleSave = (id, changes) => updateCatalogItem(id, changes)

  const saveNew = () => {
    if (!newForm.name.trim()) return
    addCatalogItems([{ ...newForm, profitable: true }])
    setAddingNew(false)
    setNewForm({ name: '', description: '', category: 'General', unit: 'EA', unitPrice: 0, minPrice: 0, maxPrice: 0, count: 1, confidence: 70 })
  }

  // AI suggest categories
  const handleAiSuggest = async () => {
    setSuggesting(true)
    setSuggestError('')
    setSuggestions(null)
    try {
      const catalogSummary = catalog.map(({ id, name, description, unit, unitPrice, category }) =>
        ({ id, name, description: description || '', unit, unitPrice, category })
      )
      const prompt = `CURRENT CATALOG (${catalogSummary.length} items):\n${JSON.stringify(catalogSummary, null, 2)}\n\nUSER REQUEST: Review every item in the catalog and identify any that appear to be miscategorized — where the item clearly belongs in a different category based on its name and description. Only flag items where the category is clearly wrong. Return only items that should move; don't change items that are already correct.`
      const model = getModel(AI_CHAT_SYSTEM)
      const chat = model.startChat({ history: [] })
      const result = await chat.sendMessage(prompt)
      const text = result.response.text()
      const changesMatch = text.match(/<changes>([\s\S]*?)<\/changes>/)
      const changes = changesMatch ? JSON.parse(changesMatch[1].trim()) : null
      if (changes?.length) {
        const catChanges = changes.filter(c => c.category)
        setSuggestions(catChanges.length ? catChanges : null)
        if (!catChanges.length) setSuggestError('AI found no miscategorized items — your catalog looks well organized!')
      } else {
        setSuggestError('AI found no miscategorized items — your catalog looks well organized!')
      }
    } catch (err) {
      setSuggestError(err.message)
    } finally {
      setSuggesting(false)
    }
  }

  const handleApplySuggestions = (changes) => {
    changes.forEach(({ id, category }) => updateCatalogItem(id, { category }))
    setSuggestions(prev => prev ? prev.filter(s => !changes.find(c => c.id === s.id)) : null)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-0.5">Item Catalog</h2>
          <p className="text-sm text-gray-500">{catalog.length} items · AI-learned pricing from your estimates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Rows3 size={14} /> Table
            </button>
            <button
              onClick={() => setView('sections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'sections' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutList size={14} /> Sections
            </button>
          </div>

          {/* AI suggest */}
          <button
            onClick={handleAiSuggest}
            disabled={suggesting}
            className="flex items-center gap-1.5 px-3 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {suggesting ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {suggesting ? 'Analyzing…' : 'AI Suggest'}
          </button>

          <button
            onClick={() => setAddingNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* AI suggestions banner */}
      {suggestError && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 text-sm text-gray-500">
          <Sparkles size={14} className="text-[var(--brand-400)] shrink-0" />
          {suggestError}
          <button onClick={() => setSuggestError('')} className="ml-auto text-gray-300 hover:text-gray-500"><X size={14} /></button>
        </div>
      )}
      {suggestions && (
        <AiSuggestBanner
          suggestions={suggestions}
          catalog={catalog}
          onApply={handleApplySuggestions}
          onDismiss={() => setSuggestions(null)}
        />
      )}

      {/* Filters (table view) */}
      {view === 'table' && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search for sections view */}
      {view === 'sections' && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {view === 'table' ? (
        <TableView
          filtered={filtered}
          editId={editId}
          setEditId={setEditId}
          onSave={handleSave}
          onDelete={deleteCatalogItem}
          onMove={handleMove}
          addingNew={addingNew}
          newForm={newForm}
          setNewForm={setNewForm}
          saveNew={saveNew}
          setAddingNew={setAddingNew}
          sortKey={sortKey}
          sortAsc={sortAsc}
          toggleSort={toggleSort}
        />
      ) : (
        <SectionsView
          catalog={search ? filtered : catalog}
          onMove={handleMove}
          onDelete={deleteCatalogItem}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
