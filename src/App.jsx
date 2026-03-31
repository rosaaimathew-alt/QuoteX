import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { FileText, BookOpen, ClipboardList, FileCheck } from 'lucide-react'
import AnalyzeEstimate from './pages/AnalyzeEstimate'
import ItemCatalog from './pages/ItemCatalog'
import BuildQuote from './pages/BuildQuote'
import ProposalView from './pages/ProposalView'

const NAV = [
  { to: '/', label: 'Analyze Estimate', icon: FileText },
  { to: '/catalog', label: 'Item Catalog', icon: BookOpen },
  { to: '/quote', label: 'Build Quote', icon: ClipboardList },
  { to: '/proposal', label: 'Proposal', icon: FileCheck },
]

export default function App() {
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
                {label}
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
