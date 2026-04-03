import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { FileText, BookOpen, ClipboardList, FileCheck, BarChart2 } from 'lucide-react'
import AnalyzeEstimate from './pages/AnalyzeEstimate'
import ItemCatalog from './pages/ItemCatalog'
import BuildQuote from './pages/BuildQuote'
import ProposalView from './pages/ProposalView'
import ProposalTracker from './pages/ProposalTracker'
import { useStore } from './store'

const NAV = [
  { to: '/', label: 'Analyze Estimate', icon: FileText },
  { to: '/catalog', label: 'Item Catalog', icon: BookOpen },
  { to: '/quote', label: 'Build Quote', icon: ClipboardList },
  { to: '/proposal', label: 'Proposal', icon: FileCheck },
  { to: '/tracker', label: 'Proposal Tracker', icon: BarChart2 },
]

export default function App() {
  const proposals = useStore(s => s.proposals)
  const dueCount = proposals.reduce((count, p) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const due = (p.reminders || []).filter(r => !r.dismissed && new Date(r.date + 'T00:00:00') <= today)
    return count + due.length
  }, 0)

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col no-print shrink-0">
          <div className="px-5 py-5 border-b border-gray-200">
            <h1 className="text-lg font-bold text-blue-700 leading-tight">EstimateIQ</h1>
            <p className="text-xs text-gray-500 mt-0.5">Smart Contractor Pricing</p>
          </div>
          <nav className="flex-1 py-4 space-y-1 px-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {to === '/tracker' && dueCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {dueCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-400">© 2025 EstimateIQ</p>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<AnalyzeEstimate />} />
            <Route path="/catalog" element={<ItemCatalog />} />
            <Route path="/quote" element={<BuildQuote />} />
            <Route path="/proposal" element={<ProposalView />} />
            <Route path="/tracker" element={<ProposalTracker />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
