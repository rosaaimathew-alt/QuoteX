import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { FileText, BookOpen, ClipboardList, FileCheck, BarChart2, Inbox, Sheet, MessageSquareMore } from 'lucide-react'
import { useEffect, useState, lazy, Suspense } from 'react'
import AnalyzeEstimate from './pages/AnalyzeEstimate'
import ItemCatalog from './pages/ItemCatalog'
import BuildQuote from './pages/BuildQuote'
import ProposalView from './pages/ProposalView'
import ProposalTracker from './pages/ProposalTracker'
import InboxPage from './pages/Inbox'
import AiChat from './pages/AiChat'
import { useStore } from './store'

// Lazy-load xlsx-heavy page so SheetJS only downloads when needed
const ImportPricing = lazy(() => import('./pages/ImportPricing'))

const NAV = [
  { to: '/', label: 'Analyze Estimate', icon: FileText },
  { to: '/import', label: 'Import Pricing', icon: Sheet },
  { to: '/ai', label: 'AI Assistant', icon: MessageSquareMore },
  { to: '/catalog', label: 'Item Catalog', icon: BookOpen },
  { to: '/quote', label: 'Build Quote', icon: ClipboardList },
  { to: '/proposal', label: 'Proposal', icon: FileCheck },
  { to: '/tracker', label: 'Proposal Tracker', icon: BarChart2 },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
]

const UNREAD_POLL = 60_000

export default function App() {
  const proposals = useStore(s => s.proposals)
  const readMessageIds = useStore(s => s.readMessageIds)
  const [inboxUnread, setInboxUnread] = useState(0)

  const dueCount = proposals.reduce((count, p) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = (p.reminders || []).filter(r => !r.dismissed && new Date(r.date + 'T00:00:00') <= today)
    return count + due.length
  }, 0)

  // Poll for unread count (lightweight — just message IDs against read set)
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
    <BrowserRouter>
      <div className="min-h-screen bg-sky-50 flex">
        {/* Sidebar */}
        <aside className="w-56 bg-sky-700 flex flex-col no-print shrink-0 shadow-lg">
          {/* Logo */}
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

        {/* Main */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<AnalyzeEstimate />} />
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
    </BrowserRouter>
  )
}
