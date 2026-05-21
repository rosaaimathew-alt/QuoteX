import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, BookTemplate, X, Save, Copy } from 'lucide-react'
import { useStore } from '../store'

const MARGIN_DEFAULT = 30

export default function BuildQuote() {
  const catalog = useStore(s => s.catalog)
  const templates = useStore(s => s.templates)
  const { saveTemplate, deleteTemplate } = useStore()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [lines, setLines] = useState([])
  const [client, setClient] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [expiration, setExpiration] = useState('')
  const [margin, setMargin] = useState(MARGIN_DEFAULT)
  const [showMargin, setShowMargin] = useState(false)

  const [isAlaCarte, setIsAlaCarte] = useState(false)
  const [projectTypes, setProjectTypes] = useState([])
  const [projectSummary, setProjectSummary] = useState('')

  const PROJECT_TYPE_OPTIONS = ['Deck', 'Screened Porch', 'Sunroom', 'Pergola', 'Gazebo', 'Open Porch']
  const toggleProjectType = (t) => setProjectTypes(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  )

  // Template modals
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [revisingParentId, setRevisingParentId] = useState(null)

  // Pre-fill when opening a revision from the Proposal Tracker
  useEffect(() => {
    const raw = sessionStorage.getItem('revise-proposal')
    if (!raw) return
    sessionStorage.removeItem('revise-proposal')
    const d = JSON.parse(raw)
    setClient(d.client || '')
    setEmail(d.email || '')
    setPhone(d.phone || '')
    setAddress(d.address || '')
    setExpiration(d.expiration || '')
    setLines((d.lines || []).map(l => ({ ...l, id: Date.now() + Math.random() })))
    setRevisingParentId(d.parentId || null)
  }, [])

  const cats = ['All', ...new Set(catalog.map(c => c.category))]
  const filtered = catalog
    .filter(c => catFilter === 'All' || c.category === catFilter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  const addItem = (item) => {
    setLines(prev => {
      const existing = prev.find(l => l.catalogId === item.id)
      if (existing) return prev.map(l => l.catalogId === item.id ? { ...l, qty: l.qty + 1 } : l)
      return [...prev, {
        id: Date.now() + Math.random(),
        catalogId: item.id,
        name: item.name,
        section: item.section || item.category || '',
        description: item.description || '',
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
    section: '',
    description: '',
    unit: 'EA',
    qty: 1,
    unitPrice: 0,
    category: 'General',
  }])

  const moveUp = (idx) => {
    if (idx === 0) return
    const next = [...lines]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; setLines(next)
  }
  const moveDown = (idx) => {
    if (idx === lines.length - 1) return
    const next = [...lines]; [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; setLines(next)
  }

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const cost = showMargin ? subtotal / (1 + margin / 100) : null

  const goToProposal = () => {
    sessionStorage.setItem('proposal', JSON.stringify({
      client, email, phone, address, expiration, lines, margin, isAlaCarte, projectTypes, projectSummary,
      ...(revisingParentId ? { parentId: revisingParentId } : {}),
    }))
    navigate('/proposal')
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !lines.length) return
    saveTemplate({
      name: templateName.trim(),
      description: templateDesc.trim(),
      lines: lines.map(l => ({
        name: l.name, section: l.section, description: l.description,
        unit: l.unit, qty: l.qty, unitPrice: l.unitPrice, category: l.category,
      })),
    })
    setShowSaveTemplate(false)
    setTemplateName('')
    setTemplateDesc('')
  }

  const handleLoadTemplate = (template) => {
    setLines(template.lines.map(l => ({ ...l, id: Date.now() + Math.random(), catalogId: null })))
    setShowLoadTemplate(false)
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5 h-full min-h-screen">
      {/* Left: Catalog picker */}
      <div className="lg:w-64 shrink-0 flex flex-col gap-3">
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
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2 py-0.5 rounded text-xs font-medium ${catFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-[calc(100vh-220px)]">
          {filtered.map(item => (
            <button key={item.id} onClick={() => addItem(item)}
              className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <p className="text-xs font-medium text-gray-800 group-hover:text-blue-700 leading-tight">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">${item.unitPrice}/{item.unit}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Quote builder */}
      <div className="flex-1 flex flex-col gap-4">
        {revisingParentId && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <Copy size={13} className="shrink-0" />
            <span>Creating a <strong>new revision</strong> — client info and lines are pre-filled. Edit as needed, then preview.</span>
            <button onClick={() => setRevisingParentId(null)} className="ml-auto text-amber-400 hover:text-amber-700"><X size={13} /></button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">Build Quote</h2>
          <div className="flex items-center gap-3">
            {/* Summed / A La Carte toggle */}
            <button
              onClick={() => setIsAlaCarte(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                isAlaCarte
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${isAlaCarte ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isAlaCarte ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </span>
              {isAlaCarte ? 'A La Carte' : 'Summed Total'}
            </button>
            {/* Template buttons */}
            {templates.length > 0 && (
              <button
                onClick={() => setShowLoadTemplate(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <BookTemplate size={14} /> Load Template
              </button>
            )}
            {lines.length > 0 && (
              <button
                onClick={() => { setTemplateName(''); setTemplateDesc(''); setShowSaveTemplate(true) }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                <Save size={14} /> Save as Template
              </button>
            )}
            <button
              onClick={goToProposal}
              disabled={!lines.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview Proposal →
            </button>
          </div>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Customer Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Customer Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="John Smith" value={client} onChange={e => setClient(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Project Address</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="123 Main St" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Email Address</label>
              <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Phone Number</label>
              <input type="tel" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-gray-500 block mb-1">Quote Expiration Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" value={expiration} onChange={e => setExpiration(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Project Type <span className="text-gray-400">(multi-select — used on contract)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_TYPE_OPTIONS.map(t => (
                  <button key={t} type="button" onClick={() => toggleProjectType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      projectTypes.includes(t)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">Project Summary <span className="text-gray-400">(optional — appears on scope of work)</span></label>
              <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" placeholder="e.g. 16'x16' Gable Roof Eze-Breeze Porch with vaulted ceilings…" value={projectSummary} onChange={e => setProjectSummary(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-xl border border-gray-200 flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item / Scope</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-20">Unit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-28">Unit Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase w-28">Line Total</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 pt-3">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp size={12} /></button>
                        <button onClick={() => moveDown(idx)} disabled={idx === lines.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown size={12} /></button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm font-medium text-gray-800"
                        value={line.name}
                        onChange={e => updateLine(line.id, 'name', e.target.value)}
                        placeholder="Item name"
                      />
                      <textarea
                        rows={2}
                        className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-xs text-gray-400 italic mt-0.5 resize-none"
                        value={line.description || ''}
                        onChange={e => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Scope detail (prints on proposal)..."
                      />
                    </td>
                    <td className="px-4 pt-3">
                      <input type="number" min="0"
                        className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm text-center"
                        value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} />
                    </td>
                    <td className="px-4 pt-3">
                      <select
                        className="text-sm border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none"
                        value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)}>
                        {['LF','SF','EA','LS'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-4 pt-3">
                      <div className="flex items-center gap-0.5">
                        <span className="text-gray-400 text-sm">$</span>
                        <input type="number" min="0"
                          className="w-full border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none text-sm"
                          value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', e.target.value)} />
                      </div>
                    </td>
                    <td className="px-4 pt-3 text-right font-medium text-gray-800 whitespace-nowrap">
                      ${(line.qty * line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 pt-3">
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
              {templates.length > 0 && (
                <button onClick={() => setShowLoadTemplate(true)} className="mt-2 text-sm text-blue-500 hover:underline">
                  Or load a saved template →
                </button>
              )}
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

        {/* Margin overlay */}
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
              <input type="number" min="0" max="100"
                className="w-20 border border-amber-300 rounded px-2 py-1 text-center focus:outline-none"
                value={margin} onChange={e => setMargin(parseFloat(e.target.value) || 0)} />
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

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Save size={16} className="text-[var(--brand-500)]" /> Save as Template
              </h3>
              <button onClick={() => setShowSaveTemplate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Template Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Standard 6ft Cedar Fence"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Typical residential privacy fence job"
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">{lines.length} line item{lines.length !== 1 ? 's' : ''} will be saved. Customer info is not included.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showLoadTemplate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookTemplate size={16} className="text-[var(--brand-500)]" /> Load Template
              </h3>
              <button onClick={() => setShowLoadTemplate(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Loading a template will replace your current line items.</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 group transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">{t.lines.length} items · saved {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowLoadTemplate(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
