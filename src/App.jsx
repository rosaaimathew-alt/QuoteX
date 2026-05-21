import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, BookOpen, ClipboardList, FileCheck, BarChart2, Inbox, MessageSquareMore, Search, X, Settings as SettingsIcon, Sun, Moon, Users, FileSignature, LogOut, TrendingUp, Menu, HardHat, Wrench, CalendarDays, Kanban } from 'lucide-react'
import { Component, useEffect, useState, useRef } from 'react'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import ItemCatalog from './pages/ItemCatalog'
import BuildQuote from './pages/BuildQuote'
import ProposalView from './pages/ProposalView'
import ProposalTracker from './pages/ProposalTracker'
import InboxPage from './pages/Inbox'
import AiChat from './pages/AiChat'
import SettingsPage from './pages/Settings'
import ClientList from './pages/ClientList'
import ContractView from './pages/ContractView'
import ContractsList from './pages/ContractsList'
import Login from './pages/Login'
import SignPage from './pages/SignPage'
import ContractViewFull from './pages/ContractViewFull'
import ProfitabilityTracker from './pages/ProfitabilityTracker'
import Pipeline from './pages/Pipeline'
import Jobs from './pages/Jobs'
import Subcontractors from './pages/Subcontractors'
import Scheduler from './pages/Scheduler'
import AuthGuard, { logout } from './components/AuthGuard'
import { useStore } from './store'
import { applyBrandStyles, applyTheme, DEFAULT_BRAND_COLOR } from './brand'

const NAV = [
  { to: '/',        label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/clients', label: 'Clients',          icon: Users },
  { to: '/analyze', label: 'Analyze',          icon: FileText },
  { to: '/ai',      label: 'AI Assistant',     icon: MessageSquareMore },
  { to: '/catalog', label: 'Item Catalog',     icon: BookOpen },
  { to: '/quote',   label: 'Build Quote',      icon: ClipboardList },
  { to: '/proposal',label: 'Proposal',         icon: FileCheck },
  { to: '/tracker',   label: 'Proposal Tracker', icon: BarChart2 },
  { to: '/pipeline',  label: 'Pipeline',         icon: Kanban },
  { to: '/contracts',    label: 'Contracts',       icon: FileSignature },
  { to: '/jobs',         label: 'Job Management', icon: HardHat },
  { to: '/subs',         label: 'Subcontractors', icon: Wrench },
  { to: '/scheduler',   label: 'Scheduler',      icon: CalendarDays },
  { to: '/profitability',label: 'Profitability',  icon: TrendingUp },
  { to: '/inbox',        label: 'Inbox',          icon: Inbox },
]

const STATUS_BADGE = {
  Won:           'bg-green-100 text-green-700',
  Lost:          'bg-red-100 text-red-700',
  Draft:         'bg-gray-100 text-gray-600',
  Sent:          'bg-blue-100 text-blue-700',
  'Followed Up': 'bg-purple-100 text-purple-700',
  Negotiating:   'bg-amber-100 text-amber-700',
  MIA:           'bg-slate-100 text-slate-500',
}

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const UNREAD_POLL = 60_000

// ── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const navigate  = useNavigate()
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
        open ? 'border-[var(--brand-400)] ring-1 ring-[var(--brand-300)]' : 'border-gray-200'
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
                <button key={p.id} onClick={() => openProposal(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-50)] border-t border-gray-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">{p.client || <span className="italic text-gray-400">Unnamed</span>}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
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
                <button key={c.id} onClick={goToCatalog}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--brand-50)] border-t border-gray-50 transition-colors">
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

// ── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const proposals      = useStore(s => s.proposals)
  const readMessageIds = useStore(s => s.readMessageIds)
  const branding       = useStore(s => s.branding)
  const theme          = useStore(s => s.theme)
  const setTheme       = useStore(s => s.setTheme)
  const [inboxUnread, setInboxUnread] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isDark = theme === 'dark'
  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    applyBrandStyles(branding?.primaryColor || DEFAULT_BRAND_COLOR)
  }, [branding?.primaryColor])

  useEffect(() => {
    applyTheme(isDark)
  }, [isDark])

  // Close sidebar on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
    const timer = setInterval(async () => { try { await check() } catch {} }, UNREAD_POLL)
    return () => clearInterval(timer)
  }, [readMessageIds])

  const companyName = branding?.companyName || 'QUOTEX'
  const logo        = branding?.logo        || null

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--brand-50)' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar — fixed drawer on mobile, inline on desktop */}
      <aside
        className={`w-64 flex flex-col no-print shrink-0 shadow-lg
          fixed lg:relative inset-y-0 left-0 z-50 h-full
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ backgroundColor: 'var(--brand-700)' }}
      >
        {/* Logo + close button on mobile */}
        <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--brand-600)' }}>
          <div className="flex-1 flex justify-center">
            {logo
              ? <img src={logo} alt="logo" className="h-12 object-contain" />
              : <h1 className="text-xl font-black text-white tracking-widest leading-tight">{companyName}</h1>}
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-white/60 hover:text-white ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'brand-nav-active' : 'brand-nav-inactive'
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
                <span className="brand-badge bg-white text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center leading-none">
                  {inboxUnread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 pb-2">
          <NavLink
            to="/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'brand-nav-active' : 'brand-nav-inactive'
              }`
            }
          >
            <SettingsIcon size={16} />
            <span>Settings</span>
          </NavLink>
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--brand-600)' }}>
          <p className="text-xs brand-footer">© 2025 {companyName}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors brand-nav-inactive hover:bg-white/10"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={logout} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors brand-nav-inactive hover:bg-white/10">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top header */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 no-print shrink-0">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto hidden sm:block">
            <GlobalSearch />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto print:overflow-visible print:h-auto">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/analyze"  element={<Analyze />} />
            <Route path="/ai"       element={<AiChat />} />
            <Route path="/catalog"  element={<ItemCatalog />} />
            <Route path="/quote"    element={<BuildQuote />} />
            <Route path="/proposal" element={<ProposalView />} />
            <Route path="/clients"  element={<ClientList />} />
            <Route path="/tracker"  element={<ProposalTracker />} />
            <Route path="/inbox"    element={<InboxPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/contracts"     element={<ContractsList />} />
            <Route path="/contract"      element={<ContractView />} />
            <Route path="/jobs"          element={<Jobs />} />
            <Route path="/subs"          element={<Subcontractors />} />
            <Route path="/scheduler"     element={<Scheduler />} />
            <Route path="/profitability" element={<ProfitabilityTracker />} />
            <Route path="/pipeline"      element={<Pipeline />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

class SignBoundary extends Component {
  state = { err: null }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return (
      <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#dc2626' }}>
        <strong>Sign page error:</strong> {this.state.err.message}
        <pre style={{ fontSize: 12, marginTop: 8, whiteSpace: 'pre-wrap' }}>{this.state.err.stack}</pre>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"       element={<Login />} />
        <Route path="/sign/:token" element={<SignBoundary><SignPage /></SignBoundary>} />
        <Route path="/view/:recordId" element={<SignBoundary><ContractViewFull /></SignBoundary>} />
        <Route path="*"            element={<AuthGuard><AppShell /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  )
}
