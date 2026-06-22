import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Trash2, CheckCircle, RefreshCw, Palette, Building2, Eye, Download, FolderOpen, AlertTriangle, CloudUpload, HardDrive, Wifi, WifiOff } from 'lucide-react'
import { useStore } from '../store'
import { extractDominantColor, generatePalette, applyBrandStyles, DEFAULT_BRAND_COLOR } from '../brand'

const PRESET_COLORS = [
  { label: 'Sky Blue',    hex: '#0369a1' },
  { label: 'Ocean',       hex: '#0e7490' },
  { label: 'Forest',      hex: '#15803d' },
  { label: 'Slate',       hex: '#334155' },
  { label: 'Indigo',      hex: '#4338ca' },
  { label: 'Violet',      hex: '#7c3aed' },
  { label: 'Rose',        hex: '#be123c' },
  { label: 'Amber',       hex: '#b45309' },
  { label: 'Crimson',     hex: '#9f1239' },
  { label: 'Teal',        hex: '#0f766e' },
  { label: 'Charcoal',    hex: '#1f2937' },
  { label: 'Navy',        hex: '#1e3a5f' },
]

function SidebarPreview({ companyName, tagline, logo, color }) {
  const palette = generatePalette(color || DEFAULT_BRAND_COLOR)
  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg w-48 shrink-0"
      style={{ backgroundColor: palette[700] }}
    >
      {/* Logo area */}
      <div className="px-4 py-4 border-b flex flex-col items-center" style={{ borderColor: palette[600] }}>
        {logo
          ? <img src={logo} alt="logo" className="h-12 object-contain" />
          : <p className="text-lg font-black text-white tracking-widest leading-tight">{companyName || 'QUOTEX'}</p>}
      </div>
      {/* Nav items preview */}
      <div className="py-3 px-2 space-y-0.5">
        {['Dashboard', 'Build Quote', 'Proposal Tracker', 'Inbox'].map((item, i) => (
          <div
            key={item}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={i === 0 ? { backgroundColor: '#fff', color: palette[700] } : { color: palette[100] }}
          >
            {item}
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t" style={{ borderColor: palette[600] }}>
        <p className="text-xs" style={{ color: palette[400] }}>© 2025 {companyName || 'QUOTEX'}</p>
      </div>
    </div>
  )
}

// ── Data management ───────────────────────────────────────────────────────────
function DriveBackupCard() {
  const store = useStore()
  const [status, setStatus]   = useState(null)  // null | { authenticated, meta }
  const [backing, setBacking] = useState(false)
  const [result, setResult]   = useState(null)  // null | 'ok' | 'error'
  const [msg, setMsg]         = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/drive/backup')
      const data = await res.json()
      setStatus(data)
      return data
    } catch { setStatus({ authenticated: false, meta: null }) }
  }, [])

  useEffect(() => {
    loadStatus().then(data => {
      if (!data?.authenticated) return
      const lastBackup = data.meta?.backedUpAt || 0
      const sixHours   = 6 * 60 * 60 * 1000
      if (Date.now() - lastBackup > sixHours) triggerBackup(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const triggerBackup = useCallback(async (silent = false) => {
    if (backing) return
    if (!silent) setBacking(true)
    try {
      const s = store
      const storeData = {
        catalog:        s.catalog,
        proposals:      s.proposals,
        templates:      s.templates,
        branding:       s.branding,
        theme:          s.theme,
        readMessageIds: s.readMessageIds,
        nextCatalogId:  s.nextCatalogId,
        nextProposalId: s.nextProposalId,
        nextTemplateId: s.nextTemplateId,
        exportedAt:     new Date().toISOString(),
      }
      const res  = await fetch('/api/drive/backup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ storeData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backup failed')
      setStatus(prev => ({ ...prev, meta: { fileId: data.fileId, backedUpAt: data.backedUpAt } }))
      if (!silent) { setResult('ok'); setMsg('Backup saved to Google Drive.') }
    } catch (err) {
      if (!silent) { setResult('error'); setMsg(err.message) }
    } finally {
      if (!silent) {
        setBacking(false)
        setTimeout(() => setResult(null), 5000)
      }
    }
  }, [store, backing])

  const connectDrive = async () => {
    const origin   = window.location.origin
    const returnTo = '/settings'
    const res = await fetch(`/api/google-auth/start?origin=${encodeURIComponent(origin)}&returnTo=${encodeURIComponent(returnTo)}`)
    const { url } = await res.json()
    window.location.href = url
  }

  const fmtTime = ts => {
    if (!ts) return 'Never'
    const d = new Date(ts)
    const now = new Date()
    const diffMin = Math.round((now - d) / 60000)
    if (diffMin < 2)  return 'Just now'
    if (diffMin < 60) return `${diffMin} min ago`
    const diffH = Math.round(diffMin / 60)
    if (diffH < 24)   return `${diffH}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <HardDrive size={15} className="text-indigo-500" />
        <h4 className="font-semibold text-gray-800 text-sm">Google Drive Backup</h4>
        {status === null && <RefreshCw size={12} className="animate-spin text-gray-400" />}
        {status !== null && (
          status.authenticated
            ? <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Wifi size={11} /> Connected</span>
            : <span className="flex items-center gap-1 text-xs text-gray-400"><WifiOff size={11} /> Not connected</span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Saves a full backup of all your proposals, catalog, and settings to your Google Drive automatically every 6 hours while the app is open.
      </p>

      {status !== null && !status.authenticated && (
        <button onClick={connectDrive}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <CloudUpload size={14} /> Connect Google Drive
        </button>
      )}

      {status?.authenticated && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => triggerBackup(false)} disabled={backing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {backing ? <RefreshCw size={13} className="animate-spin" /> : <CloudUpload size={13} />}
            {backing ? 'Backing up…' : 'Back Up Now'}
          </button>
          <p className="text-xs text-gray-400">
            Last backup: <strong className="text-gray-600">{fmtTime(status.meta?.backedUpAt)}</strong>
          </p>
        </div>
      )}

      {result && (
        <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${result === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result === 'ok' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          {msg}
        </div>
      )}
    </div>
  )
}

function DataManagement() {
  const store = useStore()
  const importRef = useRef()
  const [importStatus, setImportStatus] = useState(null) // null | 'ok' | 'error'
  const [importMsg, setImportMsg]       = useState('')

  const handleExport = () => {
    const data = {
      exportedAt:     new Date().toISOString(),
      catalog:        store.catalog,
      proposals:      store.proposals,
      templates:      store.templates,
      branding:       store.branding,
      theme:          store.theme,
      readMessageIds: store.readMessageIds,
      nextCatalogId:  store.nextCatalogId,
      nextProposalId: store.nextProposalId,
      nextTemplateId: store.nextTemplateId,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `quotex-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)

        // Support both QuoteX backup format and raw quotex-data.json (zustand) format
        const data = parsed.state ? parsed.state : parsed

        if (!data.catalog && !data.proposals) throw new Error('Unrecognized backup file.')

        if (Array.isArray(data.catalog))   store.importCatalog(data.catalog)
        if (Array.isArray(data.proposals)) store.importProposals(data.proposals)
        if (Array.isArray(data.templates)) store.importTemplates(data.templates)
        if (data.branding)                 store.updateBranding(data.branding)

        setImportStatus('ok')
        setImportMsg(`Imported ${data.catalog?.length || 0} catalog items and ${data.proposals?.length || 0} proposals.`)
      } catch (err) {
        setImportStatus('error')
        setImportMsg(err.message || 'Failed to read backup file.')
      }
      if (importRef.current) importRef.current.value = ''
      setTimeout(() => setImportStatus(null), 5000)
    }
    reader.readAsText(file)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Download size={16} className="text-gray-400" />
        <h3 className="font-semibold text-gray-800 text-sm">Data Backup &amp; Restore</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Your data is saved in this browser. Export a backup to move it to another device or URL.
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-700)] transition-colors"
        >
          <Download size={14} /> Export Backup
        </button>

        <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          <FolderOpen size={14} /> Import Backup
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={e => handleImport(e.target.files[0])}
          />
        </label>
      </div>

      {importStatus && (
        <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
          importStatus === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {importStatus === 'error' && <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          {importStatus === 'ok'    && <CheckCircle  size={15} className="shrink-0 mt-0.5" />}
          {importMsg}
        </div>
      )}

      <DriveBackupCard />
    </div>
  )
}

export default function Settings() {
  const { branding, updateBranding } = useStore()

  // Banner when returning from Google OAuth
  const [oauthBanner, setOauthBanner] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get('google') === 'connected' ? 'connected' : p.get('google') === 'error' ? 'error' : null
  })
  useEffect(() => {
    if (oauthBanner) {
      window.history.replaceState({}, '', window.location.pathname)
      const t = setTimeout(() => setOauthBanner(null), 6000)
      return () => clearTimeout(t)
    }
  }, [oauthBanner])

  const [companyName, setCompanyName]   = useState(branding.companyName || '')
  const [tagline, setTagline]           = useState(branding.tagline || '')
  const [logo, setLogo]                 = useState(branding.logo || null)
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || DEFAULT_BRAND_COLOR)
  const [extracting, setExtracting]     = useState(false)
  const [saved, setSaved]               = useState(false)
  const fileRef = useRef()

  // Keep preview in sync
  useEffect(() => { applyBrandStyles(primaryColor) }, [primaryColor])

  const handleLogoUpload = async (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      setLogo(dataUrl)
      setSaved(false)

      // Auto-extract dominant color from the logo
      setExtracting(true)
      const extracted = await extractDominantColor(dataUrl)
      setExtracting(false)
      if (extracted) setPrimaryColor(extracted)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateBranding({ companyName, tagline, logo, primaryColor })
    applyBrandStyles(primaryColor)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    const defaults = { companyName: 'QUOTEX', tagline: 'Smart Contractor Pricing', logo: null, primaryColor: null }
    updateBranding(defaults)
    setCompanyName(defaults.companyName)
    setTagline(defaults.tagline)
    setLogo(null)
    setPrimaryColor(DEFAULT_BRAND_COLOR)
    applyBrandStyles(DEFAULT_BRAND_COLOR)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-6 max-w-5xl">
      {oauthBanner === 'connected' && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={15} /> Google Drive connected — your first backup will run automatically.
        </div>
      )}
      {oauthBanner === 'error' && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={15} /> Google Drive connection failed. Try again or check your credentials.
        </div>
      )}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Customize your branding — changes apply across the whole platform.</p>
      </div>

      <div className="flex gap-6 flex-wrap">

        {/* Left: form */}
        <div className="flex-1 min-w-80 space-y-5">

          {/* Company identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 text-sm">Company Identity</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Company Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)]"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setSaved(false) }}
                  placeholder="QUOTEX"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tagline</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-400)]"
                  value={tagline}
                  onChange={e => { setTagline(e.target.value); setSaved(false) }}
                  placeholder="Smart Contractor Pricing"
                />
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 text-sm">Company Logo</h3>
            </div>

            <label
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-[var(--brand-400)] hover:bg-[var(--brand-50)] transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleLogoUpload(e.dataTransfer.files[0]) }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={e => handleLogoUpload(e.target.files[0])}
              />
              {logo ? (
                <div className="text-center">
                  <img src={logo} alt="logo preview" className="h-16 object-contain mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Click to replace</p>
                  {extracting && (
                    <p className="text-xs text-[var(--brand-600)] mt-1 flex items-center justify-center gap-1">
                      <RefreshCw size={11} className="animate-spin" /> Extracting color…
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Drop logo or click to upload</p>
                  <p className="text-xs text-gray-400 mt-1">PNG · JPG · SVG · WebP</p>
                  <p className="text-xs text-gray-400 mt-0.5">Brand color will be auto-extracted</p>
                </>
              )}
            </label>

            {logo && (
              <button
                onClick={() => { setLogo(null); setSaved(false); if (fileRef.current) fileRef.current.value = '' }}
                className="mt-2 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 size={11} /> Remove logo
              </button>
            )}
          </div>

          {/* Color picker */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={16} className="text-gray-400" />
              <h3 className="font-semibold text-gray-800 text-sm">Brand Color</h3>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {PRESET_COLORS.map(({ label, hex }) => (
                <button
                  key={hex}
                  onClick={() => { setPrimaryColor(hex); setSaved(false) }}
                  title={label}
                  className={`w-9 h-9 rounded-lg transition-all ${primaryColor === hex ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            {/* Custom hex picker */}
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => { setPrimaryColor(e.target.value); setSaved(false) }}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <div>
                <p className="text-xs font-medium text-gray-700">Custom color</p>
                <p className="text-xs text-gray-400 font-mono">{primaryColor}</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--brand-600)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-700)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--brand-600)'}
            >
              {saved ? <><CheckCircle size={15} /> Saved!</> : 'Save Changes'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>

          {/* Data backup / restore */}
          <DataManagement />
        </div>

        {/* Right: live preview */}
        <div className="w-56 shrink-0">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</p>
            </div>
            <SidebarPreview
              companyName={companyName}
              tagline={tagline}
              logo={logo}
              color={primaryColor}
            />
            <p className="text-xs text-gray-400 mt-3 text-center">Reflects across the whole platform</p>
          </div>
        </div>

      </div>
    </div>
  )
}
