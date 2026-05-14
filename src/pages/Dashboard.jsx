import { useNavigate } from 'react-router-dom'
import {
  FileText, BookOpen, ClipboardList, FileCheck, BarChart2, Inbox,
  MessageSquareMore, DollarSign, TrendingUp, Award, Package,
  Plus, ArrowRight, Bell, AlertCircle, Clock, ChevronRight, CalendarDays,
} from 'lucide-react'
import { useStore } from '../store'

const fmt   = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtSh = (n) => Number(n) >= 1000 ? `$${(Number(n) / 1000).toFixed(1)}k` : `$${Number(n).toFixed(0)}`

const STATUS_BADGE = {
  Won:           'bg-green-100 text-green-700',
  Lost:          'bg-red-100 text-red-700',
  Draft:         'bg-gray-100 text-gray-600',
  Sent:          'bg-blue-100 text-blue-700',
  'Followed Up': 'bg-purple-100 text-purple-700',
  Negotiating:   'bg-amber-100 text-amber-700',
}

const STATUS_BAR = {
  Won:           'bg-green-400',
  Lost:          'bg-red-400',
  Draft:         'bg-gray-300',
  Sent:          'bg-blue-400',
  'Followed Up': 'bg-purple-400',
  Negotiating:   'bg-amber-400',
}

const PROPOSAL_STATUSES = ['Draft', 'Sent', 'Followed Up', 'Negotiating', 'Won', 'Lost']

function nextReminderDate(r) {
  if (r.dismissed) return null
  const base = new Date(r.date + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (base >= today || r.frequency === 'once') return r.date
  const step = { '3d': 3, weekly: 7, biweekly: 14, monthly: 30 }[r.frequency] || 0
  if (!step) return r.date
  let next = new Date(base)
  while (next < today) next.setDate(next.getDate() + step)
  return next.toISOString().split('T')[0]
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-sky-300 hover:shadow-md transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={17} className="text-white" />
        </div>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-[var(--brand-500)] mt-1 transition-colors" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </button>
  )
}

// ── Quick Action Card ─────────────────────────────────────────────────────────
function ActionCard({ icon: Icon, label, description, color, action, actionLabel, secondaryAction, secondaryLabel }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:border-sky-200 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-400 leading-snug truncate">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={action}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-xs font-medium rounded-lg hover:bg-sky-700 transition-colors"
        >
          {actionLabel} <ArrowRight size={11} />
        </button>
        {secondaryAction && (
          <button
            onClick={secondaryAction}
            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate   = useNavigate()
  const proposals  = useStore(s => s.proposals)
  const catalog    = useStore(s => s.catalog)
  const templates  = useStore(s => s.templates)

  // KPI calculations
  const won         = proposals.filter(p => p.status === 'Won')
  const lost        = proposals.filter(p => p.status === 'Lost')
  const active      = proposals.filter(p => ['Sent', 'Followed Up', 'Negotiating'].includes(p.status))
  const closed      = [...won, ...lost]
  const wonRevenue  = won.reduce((s, p) => s + (p.total || 0), 0)
  const pipeline    = active.reduce((s, p) => s + (p.total || 0), 0)
  const winRate     = closed.length > 0 ? Math.round(won.length / closed.length * 100) : null

  // YTD bid tally
  const currentYear = new Date().getFullYear()
  const ytdProposals = proposals.filter(p => p.createdAt && new Date(p.createdAt).getFullYear() === currentYear)
  const ytdTotal     = ytdProposals.reduce((s, p) => s + (p.total || 0), 0)
  const ytdMonths    = Array.from({ length: 12 }, (_, i) => {
    const mps = ytdProposals.filter(p => new Date(p.createdAt).getMonth() === i)
    return {
      month: new Date(currentYear, i).toLocaleDateString('en-US', { month: 'short' }),
      total: mps.reduce((s, p) => s + (p.total || 0), 0),
      won:   mps.filter(p => p.status === 'Won').reduce((s, p) => s + (p.total || 0), 0),
      count: mps.length,
    }
  })
  const ytdMonthMax = Math.max(...ytdMonths.map(m => m.total), 1)

  // Recent proposals (latest 6)
  const recent = [...proposals]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)

  // Pipeline breakdown
  const statusCounts = PROPOSAL_STATUSES.map(s => ({
    status: s,
    count: proposals.filter(p => p.status === s).length,
    value: proposals.filter(p => p.status === s).reduce((sum, p) => sum + (p.total || 0), 0),
  })).filter(s => s.count > 0)
  const maxCount = Math.max(...statusCounts.map(s => s.count), 1)

  // Upcoming reminders (next 5, sorted)
  const reminders = proposals
    .flatMap(p => (p.reminders || [])
      .map(r => ({ ...r, client: p.client, proposalId: p.id, nextDate: nextReminderDate(r) }))
    )
    .filter(r => r.nextDate)
    .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate))
    .slice(0, 5)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isOverdue = (d) => d && new Date(d + 'T00:00:00') <= today

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const openProposal = (p) => {
    sessionStorage.setItem('proposal', JSON.stringify({
      client: p.client, email: p.email, phone: p.phone,
      address: p.address, expiration: p.expiration,
      lines: p.lines || [], margin: 0, proposalId: p.id,
    }))
    navigate('/proposal')
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}!</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateStr}</p>
        </div>
        <button
          onClick={() => navigate('/quote')}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 transition-colors shadow-sm"
        >
          <Plus size={15} /> New Quote
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={DollarSign} label="Won Revenue" color="bg-green-500"
          value={`$${fmt(wonRevenue)}`}
          sub={`${won.length} job${won.length !== 1 ? 's' : ''} won`}
          onClick={() => navigate('/tracker')}
        />
        <KpiCard
          icon={TrendingUp} label="Open Pipeline" color="bg-green-600"
          value={fmtSh(pipeline)}
          sub={`${active.length} active proposal${active.length !== 1 ? 's' : ''}`}
          onClick={() => navigate('/tracker')}
        />
        <KpiCard
          icon={Award} label="Win Rate" color="bg-[var(--brand-500)]"
          value={winRate !== null ? `${winRate}%` : '—'}
          sub={`${won.length}W · ${lost.length}L of ${closed.length} closed`}
          onClick={() => navigate('/tracker')}
        />
        <KpiCard
          icon={Package} label="Catalog Items" color="bg-[var(--brand-400)]"
          value={catalog.length}
          sub={`${new Set(catalog.map(c => c.category)).size} categories`}
          onClick={() => navigate('/catalog')}
        />
        <KpiCard
          icon={CalendarDays} label={`${currentYear} Total Bids`} color="bg-indigo-500"
          value={fmtSh(ytdTotal)}
          sub={`${ytdProposals.length} proposal${ytdProposals.length !== 1 ? 's' : ''} this year`}
          onClick={() => navigate('/tracker')}
        />
      </div>

      {/* Year at a Glance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{currentYear} — Year at a Glance</p>
            <p className="text-xs text-gray-400 mt-0.5">Total bid: <span className="font-semibold text-indigo-600">${fmt(ytdTotal)}</span> across {ytdProposals.length} proposals</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-200 inline-block" /> Bid</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> Won</span>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {ytdMonths.map((m, i) => {
            const isCurrentMonth = i === new Date().getMonth()
            const bidH  = ytdMonthMax > 0 ? (m.total / ytdMonthMax) * 100 : 0
            const wonH  = ytdMonthMax > 0 ? (m.won   / ytdMonthMax) * 100 : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                {m.count > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    <p className="font-semibold">{m.month}</p>
                    <p>Bid: ${fmt(m.total)}</p>
                    <p>Won: ${fmt(m.won)}</p>
                    <p>{m.count} proposal{m.count !== 1 ? 's' : ''}</p>
                  </div>
                )}
                {/* Bar */}
                <div className="w-full flex flex-col justify-end relative" style={{ height: '88px' }}>
                  {m.total > 0 ? (
                    <>
                      <div
                        className={`w-full rounded-t-sm transition-all ${isCurrentMonth ? 'bg-indigo-400' : 'bg-indigo-200'}`}
                        style={{ height: `${bidH}%` }}
                      />
                      {m.won > 0 && (
                        <div
                          className="w-full bg-green-400 absolute bottom-0 rounded-t-sm"
                          style={{ height: `${wonH}%` }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full bg-gray-50 rounded-sm" style={{ height: '100%' }} />
                  )}
                </div>
                <p className={`text-xs ${isCurrentMonth ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>{m.month}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Proposals — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Recent Proposals</p>
            <button onClick={() => navigate('/tracker')} className="text-xs text-sky-600 hover:underline font-medium">
              View all →
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FileCheck size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No proposals yet.</p>
              <button onClick={() => navigate('/quote')} className="mt-3 text-xs text-sky-600 hover:underline">
                Build your first quote →
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Status</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Total</th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => openProposal(p)}
                    className="hover:bg-sky-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{p.client || <span className="italic text-gray-400">Unnamed</span>}</p>
                      {p.email && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{p.email}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900 text-xs">
                      ${fmt(p.total || 0)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column: Pipeline + Reminders */}
        <div className="flex flex-col gap-5">

          {/* Pipeline by status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Pipeline</p>
              <button onClick={() => navigate('/tracker')} className="text-xs text-sky-600 hover:underline font-medium">
                Kanban →
              </button>
            </div>
            {statusCounts.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-3">No proposals yet.</p>
            ) : (
              <div className="space-y-2.5">
                {statusCounts.map(({ status, count, value }) => (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}>{status}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{count}</span>
                        <span className="text-xs text-gray-400">{fmtSh(value)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_BAR[status]}`}
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming reminders */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
            <p className="text-sm font-semibold text-gray-800 mb-3">Upcoming Follow-ups</p>
            {reminders.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 italic">No reminders set.</p>
                <button onClick={() => navigate('/tracker')} className="mt-2 text-xs text-sky-600 hover:underline">
                  Add one in the tracker →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map(r => {
                  const overdue = isOverdue(r.nextDate)
                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate('/tracker')}
                      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        overdue ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-sky-50'
                      }`}
                    >
                      {overdue
                        ? <AlertCircle size={13} className="text-[var(--brand-500)] mt-0.5 shrink-0" />
                        : <Clock size={13} className="text-gray-400 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{r.client || 'Unnamed client'}</p>
                        {r.note && <p className="text-xs text-gray-400 truncate">{r.note}</p>}
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                        {new Date(r.nextDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionCard
            icon={FileText}
            label="Analyze"
            description="AI analysis or import a pricing spreadsheet"
            color="bg-[var(--brand-400)]"
            actionLabel="Analyze"
            action={() => navigate('/analyze')}
            secondaryAction={() => navigate('/analyze')}
            secondaryLabel="Import"
          />
          <ActionCard
            icon={ClipboardList}
            label="Build Quote"
            description="Build a new proposal from your catalog"
            color="bg-[var(--brand-600)]"
            actionLabel="New Quote"
            action={() => navigate('/quote')}
            secondaryAction={templates.length > 0 ? () => navigate('/quote') : null}
            secondaryLabel="Templates"
          />
          <ActionCard
            icon={BookOpen}
            label="Item Catalog"
            description={`${catalog.length} items across ${new Set(catalog.map(c => c.category)).size} categories`}
            color="bg-[var(--brand-700)]"
            actionLabel="Browse"
            action={() => navigate('/catalog')}
          />
          <ActionCard
            icon={MessageSquareMore}
            label="AI Assistant"
            description="Bulk-edit pricing with plain English"
            color="bg-[var(--brand-500)]"
            actionLabel="Open Chat"
            action={() => navigate('/ai')}
          />
          <ActionCard
            icon={BarChart2}
            label="Proposal Tracker"
            description="Manage your pipeline from quote to close"
            color="bg-[var(--brand-600)]"
            actionLabel="View Pipeline"
            action={() => navigate('/tracker')}
          />
          <ActionCard
            icon={Inbox}
            label="Inbox"
            description="Read and reply to client emails"
            color="bg-[var(--brand-500)]"
            actionLabel="Open Inbox"
            action={() => navigate('/inbox')}
          />
          <ActionCard
            icon={FileCheck}
            label="Last Proposal"
            description="View the most recently created proposal"
            color="bg-[var(--brand-800)]"
            actionLabel="Open"
            action={() => {
              const latest = [...proposals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
              if (latest) openProposal(latest)
              else navigate('/quote')
            }}
          />
        </div>
      </div>
    </div>
  )
}
