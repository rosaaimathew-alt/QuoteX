import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, BookOpen, ClipboardList, FileCheck, BarChart2, Inbox, Sheet, MessageSquareMore, Search, X } from 'lucide-react'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import Dashboard from './pages/Dashboard'
import AnalyzeEstimate from './pages/AnalyzeEstimate'
import ItemCatalog from './pages/ItemCatalog'
import BuildQuote from './pages/BuildQuote'
import ProposalView from './pages/ProposalView'
import ProposalTracker from './pages/ProposalTracker'
import InboxPage from './pages/Inbox'
import AiChat from './pages/AiChat'
import { useStore } from './store'

const ImportPricing = lazy(() => import('./pages/ImportPricing'))

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze Estimate', icon: FileText },
  { to: '/import', label: 'Import Pricing', icon: Sheet },
  { to: '/ai', label: 'AI Assistant', icon: MessageSquareMore },
  { to: '/catalog', label: 'Item Catalog', icon: BookOpen },
  { to: '/quote', label: 'Build Quote', icon: ClipboardList },
  { to: '/proposal', label: 'Proposal', icon: FileCheck },
  { to: '/tracker', label: 'Proposal Tracker', icon: BarChart2 },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
]

const STATUS_BADGE = {
  Won:           'bg-green-100 text-green-700',
  Lost:          'bg-red-100 text-red-700',
  Draft:         'bg-gray-100 text-gray-600',
  Sent:          'bg-blue-100 text-blue-700',
  'Followed Up': 'bg-purple-100 text-purple-700',
  Negotiating:   'bg-amber-100 text-amber-700',
}

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const UNREAD_POLL = 60_000

// ── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const navigate = useNavigate()
  const proposals = useStore(s => s.proposals)
  const catalog   = useStore(s => s.catalog)
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const q = query.toLowerCase().trim()

  const matchedProposals = q.length < 2 ? [] : proposals
    .filter(p => [p.client, p.email, p.phone, p.address, p.status]
      .some(v => v?.toLowerCase().includes(q)))
    .slice(0, 6)

  const matchedCatalog = q.length < 2 ? [] : catalog
    .filter(c => [c.name, c.description, c.category]
      .some(v => v?.toLowerCase().includes(q)))
    .slice(0, 4)

  const hasResults = matchedProposals.length > 0 || matchedCatalog.length > 0
  const showEmpty  = q.length >= 2 && !hasResults

  const openProposal = (p) => {
    sessionStorage.setItem('proposal', JSON.stringify({
      client: p.client, email: p.email, phone: p.phone,
      address: p.address, expiration: p.expiration,
      lines: p.lines || [], margin: 0, proposalId: p.id,
    }))
    setQuery(''); setOpen(false)
    navigate('/proposal')
  }

  const goToCatalog = () => { setQuery(''); setOpen(false); navigate('/catalog') }

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-white w-64 transition-all ${
        open ? 'border-sky-400 ring-1 ring-sky-300' : 'border-gray-200'
      }`}>
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
          placeholder="Search clients or items…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }} className="text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
      </div>

      {open && (hasResults || showEmpty) && (
        <div className="absolute top-full right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {matchedProposals.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50">Clients / Proposals</p>
              {matchedProposals.map(p => (
                <button
                  key={p.id}
                  onClick={() => openProposal(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-sky-50 border-t border-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{p.client || <span className="italic text-gray-400">Unnamed</span>}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                    <span className="text-xs text-gray-400">${fmt(p.total || 0)}</span>
                    {p.email && <span className="text-xs text-gray-400 truncate max-w-[120px]">{p.email}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {matchedCatalog.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border-t border-gray-100">Catalog Items</p>
              {matchedCatalog.map(c => (
                <button
                  key={c.id}
                  onClick={goToCatalog}
                  className="w-full text-left px-4 py-2.5 hover:bg-sky-50 border-t border-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.category} · ${c.unitPrice}/{c.unit}</p>
                </button>
              ))}
            </div>
          )}
          {showEmpty && (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-400">No results for "<span className="font-medium text-gray-600">{query}</span>"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── App Shell (inside Router so useNavigate works) ───────────────────────────
function AppShell() {
  const proposals      = useStore(s => s.proposals)
  const readMessageIds = useStore(s => s.readMessageIds)
  const [inboxUnread, setInboxUnread] = useState(0)

  const dueCount = proposals.reduce((count, p) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = (p.reminders || []).filter(r => !r.dismissed && new Date(r.date + 'T00:00:00') <= today)
    return count + due.length
  }, 0)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/messages')
        if (!res.ok) return
        const { messages } = await res.json()
        const readSet = new Set(readMessageIds || [])
        setInboxUnread(messages.filter(m => m.direction === 'inbound' && !readSet.has(m.id)).length)
      } catch {}
    }
    check()
    const timer = setInterval(check, UNREAD_POLL)
    return () => clearInterval(timer)
  }, [readMessageIds])

  return (
    <div className="min-h-screen bg-sky-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-sky-700 flex flex-col no-print shrink-0 shadow-lg">
        <div className="px-5 py-5 border-b border-sky-600">
          <h1 className="text-xl font-black text-white tracking-widest leading-tight">QUOTEX</h1>
          <p className="text-xs text-sky-300 mt-0.5 font-medium">Smart Contractor Pricing</p>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-sky-100 hover:bg-sky-600 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {to === '/tracker' && dueCount > 0 && (
                <span className="bg-amber-400 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {dueCount}
                </span>
              )}
              {to === '/inbox' && inboxUnread > 0 && (
                <span className="bg-white text-sky-700 text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none">
                  {inboxUnread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-sky-600">
          <p className="text-xs text-sky-400">© 2025 QUOTEX</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header with search */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-end px-4 no-print shrink-0">
          <GlobalSearch />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<AnalyzeEstimate />} />
            <Route path="/import" element={<Suspense fallback={<div className="p-10 text-center text-gray-400 text-sm">Loading…</div>}><ImportPricing /></Suspense>} />
            <Route path="/ai" element={<AiChat />} />
            <Route path="/catalog" element={<ItemCatalog />} />
            <Route path="/quote" element={<BuildQuote />} />
            <Route path="/proposal" element={<ProposalView />} />
            <Route path="/tracker" element={<ProposalTracker />} />
            <Route path="/inbox" element={<InboxPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
