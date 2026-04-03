import { useState } from 'react'
import { Search, Edit2, Trash2, Plus, Check, X } from 'lucide-react'
import { useStore } from '../store'

const CATEGORIES = ['Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical','Plumbing','Roofing','Flooring','Drywall','Painting','HVAC','Windows','Doors','Tile','Insulation','Siding','General']
const UNITS = ['LF', 'SF', 'EA', 'LS']

function ConfidenceBadge({ value }) {
  const color = value >= 90 ? 'bg-green-100 text-green-700' : value >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{value}%</span>
}

function EditRow({ item, onSave, onCancel }) {
  const [form, setForm] = useState({ ...item })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <>
      <tr className="bg-blue-50">
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
        <td colSpan={8} className="px-4 pb-2">
          <textarea
            rows={2}
            className="w-full text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none resize-none text-gray-600 italic"
            placeholder="Scope description (prints on proposal)..."
            value={form.description || ''}
            onChange={e => set('description', e.target.value)}
          />
        </td>
      </tr>
    </>
  )
}

export default function ItemCatalog() {
  const catalog = useStore(s => s.catalog)
  const updateCatalogItem = useStore(s => s.updateCatalogItem)
  const deleteCatalogItem = useStore(s => s.deleteCatalogItem)
  const addCatalogItems = useStore(s => s.addCatalogItems)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [editId, setEditId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', description: '', category: 'General', unit: 'EA', unitPrice: 0, minPrice: 0, maxPrice: 0, count: 1, confidence: 70 })

  const cats = ['All', ...new Set(catalog.map(c => c.category))]

  const filtered = catalog
    .filter(c => catFilter === 'All' || c.category === catFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      return sortAsc
        ? typeof av === 'string' ? av.localeCompare(bv) : av - bv
        : typeof bv === 'string' ? bv.localeCompare(av) : bv - av
    })

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const Th = ({ k, label }) => (
    <th
      className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  )

  const saveNew = () => {
    if (!newForm.name.trim()) return
    addCatalogItems([{ ...newForm, profitable: true }])
    setAddingNew(false)
    setNewForm({ name: '', description: '', category: 'General', unit: 'EA', unitPrice: 0, minPrice: 0, maxPrice: 0, count: 1, confidence: 70 })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-0.5">Item Catalog</h2>
          <p className="text-sm text-gray-500">{catalog.length} items · AI-learned pricing from your estimates</p>
        </div>
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Filters */}
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
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th k="name" label="Item Name" />
                <Th k="category" label="Category" />
                <Th k="unit" label="Unit" />
                <Th k="unitPrice" label="Unit Price" />
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Range</th>
                <Th k="count" label="Samples" />
                <Th k="confidence" label="Confidence" />
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {addingNew && (
                <>
                  <tr className="bg-green-50">
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
                    <td colSpan={8} className="px-4 pb-2">
                      <textarea rows={2} className="w-full text-xs border border-green-300 rounded px-2 py-1 focus:outline-none resize-none text-gray-600 italic" placeholder="Scope description (prints on proposal)..." value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
                    </td>
                  </tr>
                </>
              )}
              {filtered.map(item =>
                editId === item.id ? (
                  <EditRow
                    key={item.id}
                    item={item}
                    onSave={(changes) => { updateCatalogItem(item.id, changes); setEditId(null) }}
                    onCancel={() => setEditId(null)}
                  />
                ) : (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 italic mt-0.5 leading-snug">{item.description}</p>}
                    </td>
                    <td className="px-4 py-2.5"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span></td>
                    <td className="px-4 py-2.5 text-gray-500">{item.unit}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">${item.unitPrice.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">${item.minPrice} – ${item.maxPrice}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{item.count}</td>
                    <td className="px-4 py-2.5"><ConfidenceBadge value={item.confidence} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => setEditId(item.id)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 size={14} /></button>
                        <button onClick={() => deleteCatalogItem(item.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No items match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
