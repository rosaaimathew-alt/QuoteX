import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, BookTemplate, X, Save, Copy, BookPlus, Check } from 'lucide-react'
import { useStore } from '../store'

const MARGIN_DEFAULT = 30

export default function BuildQuote() {
  const catalog = useStore(s => s.catalog)
  const templates = useStore(s => s.templates)
  const { saveTemplate, deleteTemplate, addCatalogItems } = useStore()
  const [savedToLog, setSavedToLog] = useState(new Set())
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
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [projectTypes, setProjectTypes] = useState([])
  const [projectSummary, setProjectSummary] = useState('')

  const PROJECT_TYPE_OPTIONS = ['Open Deck','Screen Porches','Eze-Breeze Porches','Open Porches','Porch Conversions','Sunrooms','Hardscapes']
  const toggleProjectType = (t) => setProjectTypes(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  )

  // Template modals
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [revisingParentId, setRevisingParentId] = useState(null)

  const DRAFT_KEY = 'quotex:draft-proposal'

  // Pre-fill when opening a revision from the Proposal Tracker; otherwise restore draft
  useEffect(() => {
    const raw = sessionStorage.getItem('revise-proposal')
    if (raw) {
      sessionStorage.removeItem('revise-proposal')
      const d = JSON.parse(raw)
      setClient(d.client || '')
      setEmail(d.email || '')
      setPhone(d.phone || '')
      setAddress(d.address || '')
      setExpiration(d.expiration || '')
      setLines((d.lines || []).map(l => ({ ...l, id: Date.now() + Math.random() })))
      if (d.showBreakdown !== undefined) setShowBreakdown(d.showBreakdown)
      setRevisingParentId(d.parentId || null)
      return
    }
    const draft = localStorage.getItem(DRAFT_KEY)
    if (!draft) return
    try {
      const d = JSON.parse(draft)
      setClient(d.client || '')
      setEmail(d.email || '')
      setPhone(d.phone || '')
      setAddress(d.address || '')
      setExpiration(d.expiration || '')
      setMargin(d.margin ?? MARGIN_DEFAULT)
      setLines((d.lines || []).map(l => ({ ...l, id: Date.now() + Math.random() })))
      setIsAlaCarte(d.isAlaCarte || false)
      setShowBreakdown(d.showBreakdown ?? true)
      setProjectTypes(d.projectTypes || [])
      setProjectSummary(d.projectSummary || '')
      setRevisingParentId(d.revisingParentId || null)
    } catch {}
  }, [])

  // Auto-save draft to localStorage whenever form state changes
  useEffect(() => {
    const isEmpty = !client && !email && !phone && !address && lines.length === 0 && !projectSummary
    if (isEmpty) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      client, email, phone, address, expiration, margin, lines,
      isAlaCarte, showBreakdown, projectTypes, projectSummary, revisingParentId,
    }))
  }, [client, email, phone, address, expiration, margin, lines, isAlaCarte, showBreakdown, projectTypes, projectSummary, revisingParentId])

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
        costMaterials: item.costMaterials || 0,
        costSub: item.costSub || 0,
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
      client, email, phone, address, expiration, lines, margin, isAlaCarte, showBreakdown, projectTypes, projectSummary,
      ...(revisingParentId ? { parentId: revisingParentId } : {}),
    }))
    localStorage.removeItem(DRAFT_KEY)
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

  const seg = (active) => `px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`
  const ghostBtn = 'flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50'
  const fieldLabel = 'text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1'
  const fieldInput = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]'

  return (
    <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5 h-full min-h-screen">
      {/* Left: Catalog picker */}
      <div className="lg:w-64 shrink-0 flex flex-col gap-3">
        <h3 className="font-semibold text-gray-800 text-sm">Catalog</h3>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-2 py-0.5 rounded text-xs font-medium ${catFilter === c ? 'bg-[var(--brand-600)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 max-h-[calc(100vh-220px)]">
          {filtered.map(item => (
            <button key={item.id} onClick={() => addItem(item)}
              className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-[var(--brand-400)] hover:bg-[var(--brand-50)] transition-colors group">
              <p className="text-xs font-medium text-gray-800 group-hover:text-[var(--brand-700)] leading-tight">{item.name}</p>
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

        {/* Header — single primary action */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Build Quote</h2>
            <p className="text-sm text-gray-500 mt-0.5">Assemble line items and customer details, then preview the client-ready proposal.</p>
          </div>
          <button
            onClick={goToProposal}
            disabled={!lines.length}
            className="px-4 py-2 bg-[var(--brand-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-700)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Preview Proposal →
          </button>
        </div>

        {/* Controls toolbar — demoted mode toggles + ghost template actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Scope segmented control */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setShowBreakdown(true)} className={seg(showBreakdown)}>Scope shown</button>
            <button onClick={() => setShowBreakdown(false)} className={seg(!showBreakdown)}>Scope hidden</button>
          </div>
          {/* Pricing segmented control */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button onClick={() => setIsAlaCarte(false)} className={seg(!isAlaCarte)}>Summed total</button>
            <button onClick={() => setIsAlaCarte(true)} className={seg(isAlaCarte)}>À la carte</button>
          </div>
          <div className="flex-1" />
          {templates.length > 0 && (
            <button onClick={() => setShowLoadTemplate(true)} className={ghostBtn}>
              <BookTemplate size={14} /> Load Template
            </button>
          )}
          {lines.length > 0 && (
            <button onClick={() => { setTemplateName(''); setTemplateDesc(''); setShowSaveTemplate(true) }} className={ghostBtn}>
              <Save size={14} /> Save as Template
            </button>
          )}
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Customer Info</h3>
          </div>
          <div className="p-5 space-y-5">
            {/* Contact sub-section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={fieldLabel}>Customer Name</label>
                  <input className={fieldInput} placeholder="John Smith" value={client} onChange={e => setClient(e.target.value)} />
                </div>
                <div>
                  <label className={fieldLabel}>Email Address</label>
                  <input type="email" className={fieldInput} placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className={fieldLabel}>Phone Number</label>
                  <input type="tel" className={fieldInput} placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Hairline divider */}
            <div className="border-t border-gray-100" />

            {/* Project sub-section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Project</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className={fieldLabel}>Project Address</label>
                  <input className={fieldInput} placeholder="123 Main St" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={fieldLabel}>Quote Expiration Date</label>
                  <input type="date" className={fieldInput} value={expiration} onChange={e => setExpiration(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={fieldLabel}>Project Type <span className="normal-case text-gray-400 font-normal">(multi-select — used on contract)</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {PROJECT_TYPE_OPTIONS.map(t => (
                      <button key={t} type="button" onClick={() => toggleProjectType(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          projectTypes.includes(t)
                            ? 'bg-[var(--brand-600)] text-white border-[var(--brand-600)]'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[var(--brand-400)]'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={fieldLabel}>Project Summary <span className="normal-case text-gray-400 font-normal">(optional — appears on scope of work)</span></label>
                  <textarea rows={2} className={`${fieldInput} resize-none`} placeholder="e.g. 16'x16' Gable Roof Eze-Breeze Porch with vaulted ceilings…" value={projectSummary} onChange={e => setProjectSummary(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
            <span className="text-xs text-gray-400">{lines.length} line{lines.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="divide-y divide-gray-100">
            {lines.map((line, idx) => (
              <div key={line.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex items-end gap-3 flex-wrap">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 pb-1.5">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp size={14} /></button>
                    <button onClick={() => moveDown(idx)} disabled={idx === lines.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown size={14} /></button>
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-[160px]">
                    <label className={fieldLabel}>Item / Scope</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
                      value={line.name}
                      onChange={e => updateLine(line.id, 'name', e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  {/* Qty */}
                  <div className="w-16">
                    <label className={fieldLabel}>Qty</label>
                    <input type="number" min="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
                      value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} />
                  </div>
                  {/* Unit */}
                  <div className="w-20">
                    <label className={fieldLabel}>Unit</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
                      value={line.unit} onChange={e => updateLine(line.id, 'unit', e.target.value)}>
                      {['LF','SF','EA','LS'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  {/* Unit price */}
                  <div className="w-28">
                    <label className={fieldLabel}>Unit Price</label>
                    <div className="flex items-center border border-gray-200 rounded-lg px-2 py-2 focus-within:ring-2 focus-within:ring-[var(--brand-300)]">
                      <span className="text-gray-400 text-sm">$</span>
                      <input type="number" min="0"
                        className="w-full text-sm focus:outline-none bg-transparent"
                        value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', e.target.value)} />
                    </div>
                  </div>
                  {/* Line total */}
                  <div className="w-24 text-right">
                    <label className={fieldLabel}>Line Total</label>
                    <p className="text-sm font-semibold text-gray-800 py-2 whitespace-nowrap">
                      ${(line.qty * line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 pb-1.5">
                    {line.catalogId === null && !savedToLog.has(line.id) && line.name?.trim() && (
                      <button
                        title="Save to catalog"
                        onClick={() => {
                          addCatalogItems([{
                            name: line.name.trim(),
                            description: line.description || '',
                            unit: line.unit || 'EA',
                            unitPrice: Number(line.unitPrice) || 0,
                            category: line.category || 'General',
                            section: line.section || '',
                          }])
                          setSavedToLog(prev => new Set([...prev, line.id]))
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-[var(--brand-600)] hover:bg-[var(--brand-50)]"
                      >
                        <BookPlus size={15} />
                      </button>
                    )}
                    {savedToLog.has(line.id) && (
                      <span className="p-1.5 text-green-500" title="Saved to catalog"><Check size={15} /></span>
                    )}
                    <button onClick={() => removeLine(line.id)} title="Remove line" className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Description — always visible & editable */}
                <div className="mt-3 pl-8">
                  <label className={fieldLabel}>Description — shown on the proposal</label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)] resize-y"
                    value={line.description || ''}
                    onChange={e => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Scope detail that prints on the client proposal…"
                  />
                </div>
              </div>
            ))}
          </div>

          {lines.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Click items from the catalog on the left to add them.</p>
              {templates.length > 0 && (
                <button onClick={() => setShowLoadTemplate(true)} className="mt-2 text-sm text-[var(--brand-600)] hover:underline">
                  Or load a saved template →
                </button>
              )}
            </div>
          )}

          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between mt-auto">
            <button onClick={addBlankLine} className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-600)] hover:underline">
              <Plus size={14} /> Add line item
            </button>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Subtotal</p>
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
                  placeholder="e.g. Standard 6ft Cedar Fence"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Description (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-300)]"
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
                className="px-4 py-2 bg-[var(--brand-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-700)] disabled:opacity-50"
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
                <div key={t.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-[var(--brand-400)] hover:bg-[var(--brand-50)] group transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-[var(--brand-700)]">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">{t.lines.length} items · saved {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleLoadTemplate(t)}
                      className="px-2.5 py-1 bg-[var(--brand-600)] text-white rounded-lg text-xs font-medium hover:bg-[var(--brand-700)]"
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
