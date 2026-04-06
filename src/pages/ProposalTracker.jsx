import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useStore, PROPOSAL_STATUSES, WIN_REASONS, LOSS_REASONS, ACTIVITY_TYPES,
} from '../store'
import {
  Bell, Trash2, X, CheckCircle, AlertCircle, Clock, TrendingUp,
  DollarSign, FileText, Plus, ChevronDown, ChevronUp, MessageSquare,
  Phone, Mail, Users, BarChart2, Columns, List, Award, ThumbsDown,
  Eye, Copy, GitBranch,
} from 'lucide-react'

// Group proposals into root → revisions trees
function buildGroups(proposals) {
  const ids = new Set(proposals.map(p => p.id))
  const roots = proposals.filter(p => !p.parentId || !ids.has(p.parentId))
  return roots.map(root => ({
    root,
    revisions: proposals
      .filter(p => p.parentId === root.id)
      .sort((a, b) => (a.version || 2) - (b.version || 2)),
  }))
}

// Collapse proposal groups to client-level outcomes for analytics
function clientOutcomes(proposals) {
  const groups = buildGroups(proposals)
  return groups.map(({ root, revisions }) => {
    const all = [root, ...revisions]
    const isWon = all.some(p => p.status === 'Won')
    const isLost = !isWon && all.every(p => p.status === 'Lost')
    return { all, isWon, isLost }
  })
}

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtShort = (n) =>
  Number(n) >= 1000
    ? `$${(Number(n) / 1000).toFixed(1)}k`
    : `$${Number(n).toFixed(0)}`

const STATUS_STYLES = {
  Draft:         'bg-gray-100 text-gray-600',
  Sent:          'bg-blue-100 text-blue-700',
  'Followed Up': 'bg-purple-100 text-purple-700',
  Negotiating:   'bg-amber-100 text-amber-700',
  Won:           'bg-green-100 text-green-700',
  Lost:          'bg-red-100 text-red-700',
}

const STATUS_COLORS = {
  Draft:         'border-gray-200 bg-gray-50',
  Sent:          'border-blue-200 bg-blue-50',
  'Followed Up': 'border-purple-200 bg-purple-50',
  Negotiating:   'border-amber-200 bg-amber-50',
  Won:           'border-green-200 bg-green-50',
  Lost:          'border-red-200 bg-red-50',
}

const ACTIVITY_ICONS = { Call: Phone, Email: Mail, Meeting: Users, 'Follow-up': Bell, Note: MessageSquare }

const FREQUENCIES = [
  { label: 'One-time', value: 'once' },
  { label: 'Every 3 days', value: '3d' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]

function nextReminderDate(reminder) {
  if (reminder.dismissed) return null
  const base = new Date(reminder.date + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (base >= today || reminder.frequency === 'once') return reminder.date
  const step = { '3d': 3, weekly: 7, biweekly: 14, monthly: 30 }[reminder.frequency] || 0
  if (!step) return reminder.date
  let next = new Date(base)
  while (next < today) next.setDate(next.getDate() + step)
  return next.toISOString().split('T')[0]
}

function isOverdue(dateStr) {
  return dateStr ? new Date(dateStr + 'T00:00:00') <= new Date() : false
}

function daysBetween(a, b) {
  if (!a || !b) return null
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

// ── Win/Loss Reason Modal ──────────────────────────────────────────────────
function WinLossModal({ proposal, onSave, onClose }) {
  const isWon = proposal.status === 'Won'
  const reasons = isWon ? WIN_REASONS : LOSS_REASONS
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-2 mb-4">
          {isWon
            ? <Award size={20} className="text-green-500" />
            : <ThumbsDown size={20} className="text-[var(--brand-400)]" />}
          <h3 className="font-semibold text-gray-900">
            {isWon ? 'Why did you win this job?' : 'Why was this job lost?'}
          </h3>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                selected === r
                  ? isWon ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-3"
          placeholder="Additional notes (optional)..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Skip
          </button>
          <button
            onClick={() => onSave({ category: selected, note })}
            disabled={!selected}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${isWon ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Log ───────────────────────────────────────────────────────────
function ActivityLog({ proposal }) {
  const { addActivity, deleteActivity } = useStore()
  const [type, setType] = useState('Call')
  const [text, setText] = useState('')

  const submit = () => {
    if (!text.trim()) return
    addActivity(proposal.id, { type, text: text.trim() })
    setText('')
  }

  return (
    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
      {/* Log entry form */}
      <div className="flex gap-2 mb-3">
        <select
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Log an activity or note..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40"
        >
          Log
        </button>
      </div>
      {/* Activity list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {(proposal.activities || []).length === 0 && (
          <p className="text-xs text-gray-400 italic">No activity yet.</p>
        )}
        {(proposal.activities || []).map(a => {
          const Icon = ACTIVITY_ICONS[a.type] || MessageSquare
          return (
            <div key={a.id} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 group">
              <Icon size={13} className="text-[var(--brand-400)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-500 mr-1.5">{a.type}</span>
                <span className="text-xs text-gray-700">{a.text}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-300">
                  {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button
                  onClick={() => deleteActivity(proposal.id, a.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Reminder Badge ─────────────────────────────────────────────────────────
function ReminderBadges({ proposal, onAdd }) {
  const { dismissReminder } = useStore()
  const active = (proposal.reminders || []).filter(r => !r.dismissed)
  return (
    <div className="space-y-1">
      {active.map(r => {
        const nd = nextReminderDate(r)
        const overdue = nd && isOverdue(nd)
        return (
          <div key={r.id} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${overdue ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
            {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
            <span>{nd ? new Date(nd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
            {r.frequency !== 'once' && <span className="opacity-60">· {FREQUENCIES.find(f => f.value === r.frequency)?.label}</span>}
            {r.note && <span className="opacity-70 truncate max-w-[80px]">· {r.note}</span>}
            <button onClick={() => dismissReminder(proposal.id, r.id)} className="ml-auto opacity-50 hover:opacity-100"><X size={10} /></button>
          </div>
        )
      })}
      <button onClick={onAdd} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
        <Plus size={11} /> Add reminder
      </button>
    </div>
  )
}

// ── List View ──────────────────────────────────────────────────────────────
// Rank to pick the "best" proposal to surface as the primary row
const STATUS_RANK = { Won: 6, Negotiating: 5, 'Followed Up': 4, Sent: 3, Draft: 2, Lost: 1 }
function bestInGroup(all) {
  return all.reduce((b, p) => (STATUS_RANK[p.status] || 0) > (STATUS_RANK[b.status] || 0) ? p : b)
}

function ListView({ proposals, filterStatus, onStatusChange, onReminderOpen, onOpen, onRevise }) {
  const { deleteProposal } = useStore()
  const [expandedLog, setExpandedLog] = useState(null)   // proposal id with activity log open
  const [expandedAlts, setExpandedAlts] = useState(null) // root id with alts expanded

  const allGroups = buildGroups(proposals)
  const groups = filterStatus === 'All'
    ? allGroups
    : allGroups.filter(({ root, revisions }) =>
        [root, ...revisions].some(p => p.status === filterStatus)
      )

  const ProposalRow = ({ p, altCount, showAltToggle }) => {
    const isAltExpanded = expandedAlts === p.id
    return (
      <>
        <tr className="border-t border-gray-50 hover:bg-gray-50 align-top">
          <td className="px-4 py-3">
            <p className="font-medium text-gray-900">{p.client || <span className="text-gray-400 italic">No name</span>}</p>
            {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
            {p.winLossReason?.category && (
              <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium ${p.status === 'Won' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {p.winLossReason.category}
              </span>
            )}
          </td>
          <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
            ${fmt(p.total || 0)}
            {altCount > 0 && (
              <div className="mt-0.5">
                <button
                  onClick={() => setExpandedAlts(isAltExpanded ? null : p.id)}
                  className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200"
                >
                  {altCount} alt{altCount !== 1 ? 's' : ''} {isAltExpanded ? '▲' : '▼'}
                </button>
              </div>
            )}
          </td>
          <td className="px-4 py-3">
            <select
              value={p.status}
              onChange={e => onStatusChange(p, e.target.value)}
              className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}
            >
              {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
            {p.sentAt
              ? new Date(p.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : <span className="italic text-gray-300">Not sent</span>}
            {p.closedAt && (
              <p className="text-gray-300 mt-0.5">
                Closed {new Date(p.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {p.sentAt && daysBetween(p.sentAt, p.closedAt) != null && (
                  <span> · {daysBetween(p.sentAt, p.closedAt)}d</span>
                )}
              </p>
            )}
          </td>
          <td className="px-4 py-3">
            <ReminderBadges proposal={p} onAdd={() => onReminderOpen(p.id)} />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => onOpen(p)} className="p-1.5 rounded text-gray-300 hover:text-sky-600 hover:bg-sky-50" title="Open proposal">
                <Eye size={13} />
              </button>
              <button onClick={() => onRevise(p)} className="p-1.5 rounded text-gray-300 hover:text-purple-600 hover:bg-purple-50" title="Create revision">
                <Copy size={13} />
              </button>
              <button onClick={() => setExpandedLog(expandedLog === p.id ? null : p.id)} className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50" title="Activity log">
                {expandedLog === p.id ? <ChevronUp size={13} /> : <MessageSquare size={13} />}
              </button>
              <button onClick={() => deleteProposal(p.id)} className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          </td>
        </tr>
        {expandedLog === p.id && (
          <tr className="border-t border-gray-100">
            <td colSpan={6} className="p-0">
              <ActivityLog proposal={p} />
            </td>
          </tr>
        )}
      </>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {groups.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No proposals match this filter.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-ups</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ root, revisions }) => {
              const all = [root, ...revisions]
              const primary = bestInGroup(all)
              const alts = all.filter(p => p.id !== primary.id)
              const isAltExpanded = expandedAlts === primary.id
              return (
                <React.Fragment key={root.id}>
                  <ProposalRow p={primary} altCount={alts.length} />
                  {isAltExpanded && alts.map(alt => (
                    <tr key={alt.id} className="border-t border-purple-50 bg-purple-50/40 align-top">
                      <td className="px-4 py-2.5 pl-8">
                        <div className="flex items-center gap-2">
                          <GitBranch size={11} className="text-[var(--brand-300)] shrink-0" />
                          <span className="text-xs font-semibold text-purple-700 mr-1">Alt {alt.version || '—'}</span>
                          <span className="text-xs text-gray-500">{alt.client || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">${fmt(alt.total || 0)}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={alt.status}
                          onChange={e => onStatusChange(alt, e.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 ${STATUS_STYLES[alt.status] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {alt.createdAt ? new Date(alt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onOpen(alt)} className="p-1 rounded text-gray-300 hover:text-sky-600 hover:bg-sky-50" title="Open"><Eye size={12} /></button>
                          <button onClick={() => onRevise(alt)} className="p-1 rounded text-gray-300 hover:text-purple-600 hover:bg-purple-50" title="Revise"><Copy size={12} /></button>
                          <button onClick={() => deleteProposal(alt.id)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Pipeline / Kanban View ─────────────────────────────────────────────────
function PipelineView({ proposals, onStatusChange }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {PROPOSAL_STATUSES.map(status => {
        const cards = proposals.filter(p => p.status === status)
        const colTotal = cards.reduce((s, p) => s + (p.total || 0), 0)
        return (
          <div key={status} className="shrink-0 w-56">
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border border-b-0 ${STATUS_COLORS[status]}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[status].split(' ')[1]}`}>{status}</span>
              <span className="text-xs text-gray-400 font-medium">{cards.length}</span>
            </div>
            {/* Cards */}
            <div className={`border border-t-0 rounded-b-lg min-h-32 space-y-2 p-2 ${STATUS_COLORS[status]}`}>
              {cards.length === 0 && (
                <p className="text-xs text-gray-300 text-center py-4 italic">Empty</p>
              )}
              {cards.map(p => (
                <div key={p.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.client || 'Unnamed'}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">${fmt(p.total || 0)}</p>
                  {p.email && <p className="text-xs text-gray-400 truncate mt-0.5">{p.email}</p>}
                  {/* Active reminder indicator */}
                  {(p.reminders || []).some(r => !r.dismissed && isOverdue(nextReminderDate(r))) && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-red-600">
                      <AlertCircle size={10} /> Follow-up overdue
                    </div>
                  )}
                  {p.winLossReason?.category && (
                    <p className={`text-xs mt-1 font-medium ${p.status === 'Won' ? 'text-green-600' : 'text-red-500'}`}>
                      {p.winLossReason.category}
                    </p>
                  )}
                  {/* Move buttons */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {PROPOSAL_STATUSES.filter(s => s !== status).map(s => (
                      <button
                        key={s}
                        onClick={() => onStatusChange(p, s)}
                        className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {cards.length > 0 && (
                <p className="text-xs text-gray-400 text-right font-medium px-1 pt-1">{fmtShort(colTotal)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Analytics View ─────────────────────────────────────────────────────────
function AnalyticsView({ proposals }) {
  const won = proposals.filter(p => p.status === 'Won')
  const lost = proposals.filter(p => p.status === 'Lost')
  const active = proposals.filter(p => ['Sent', 'Followed Up', 'Negotiating'].includes(p.status))

  // Client-level win rate: a client group is "won" if any proposal is Won;
  // "lost" only if all proposals in the group are Lost (no active or won ones)
  const outcomes = clientOutcomes(proposals)
  const wonClients = outcomes.filter(o => o.isWon)
  const lostClients = outcomes.filter(o => o.isLost)
  const closedClients = [...wonClients, ...lostClients]
  const winRate = closedClients.length > 0
    ? Math.round((wonClients.length / closedClients.length) * 100)
    : null
  const uniqueClients = outcomes.length

  const avgWon = won.length > 0
    ? won.reduce((s, p) => s + (p.total || 0), 0) / won.length
    : null
  const avgLost = lost.length > 0
    ? lost.reduce((s, p) => s + (p.total || 0), 0) / lost.length
    : null

  const closeTimes = won
    .map(p => daysBetween(p.sentAt, p.closedAt))
    .filter(d => d !== null && d >= 0)
  const avgDaysToClose = closeTimes.length > 0
    ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
    : null

  const pipelineValue = active.reduce((s, p) => s + (p.total || 0), 0)
  const wonRevenue = won.reduce((s, p) => s + (p.total || 0), 0)

  // Win/Loss reason breakdown
  const reasonCount = {}
  proposals.forEach(p => {
    if (p.winLossReason?.category) {
      const key = `${p.status === 'Won' ? '✓' : '✗'} ${p.winLossReason.category}`
      reasonCount[key] = (reasonCount[key] || 0) + 1
    }
  })
  const maxReasonCount = Math.max(...Object.values(reasonCount), 1)

  // Status breakdown
  const statusCounts = PROPOSAL_STATUSES.map(s => ({
    status: s,
    count: proposals.filter(p => p.status === s).length,
    value: proposals.filter(p => p.status === s).reduce((sum, p) => sum + (p.total || 0), 0),
  }))
  const maxCount = Math.max(...statusCounts.map(s => s.count), 1)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Win Rate</p>
          <p className="text-3xl font-bold text-gray-900">{winRate !== null ? `${winRate}%` : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{wonClients.length}W / {lostClients.length}L · {uniqueClients} clients</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Avg Deal (Won)</p>
          <p className="text-3xl font-bold text-gray-900">{avgWon !== null ? fmtShort(avgWon) : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">vs {avgLost !== null ? fmtShort(avgLost) : '—'} avg lost</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Avg Days to Close</p>
          <p className="text-3xl font-bold text-gray-900">{avgDaysToClose !== null ? avgDaysToClose : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">from sent → won</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Won Revenue</p>
          <p className="text-3xl font-bold text-green-600">${fmt(wonRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">${fmt(pipelineValue)} open pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Pipeline by status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Pipeline by Status</p>
          <div className="space-y-3">
            {statusCounts.map(({ status, count, value }) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>{status}</span>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-700">{count}</span>
                    <span className="text-xs text-gray-400 ml-2">{fmtShort(value)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      status === 'Won' ? 'bg-green-400' :
                      status === 'Lost' ? 'bg-red-400' :
                      status === 'Negotiating' ? 'bg-amber-400' :
                      status === 'Sent' ? 'bg-blue-400' :
                      status === 'Followed Up' ? 'bg-purple-400' : 'bg-gray-300'
                    }`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Win / Loss reasons */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Win / Loss Reasons</p>
          {Object.keys(reasonCount).length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No reasons logged yet. Update a proposal to Won or Lost to record why.
            </p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(reasonCount)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{key}</span>
                      <span className="text-xs font-semibold text-gray-700">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${key.startsWith('✓') ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{ width: `${(count / maxReasonCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ProposalTracker() {
  const {
    proposals, updateProposalStatus, setWinLossReason,
    addReminder, dismissReminder,
  } = useStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState('list')
  const [filterStatus, setFilterStatus] = useState('All')
  const [winLossTarget, setWinLossTarget] = useState(null)
  const [reminderProposalId, setReminderProposalId] = useState(null)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderFreq, setReminderFreq] = useState('once')
  const [reminderNote, setReminderNote] = useState('')

  const today = new Date().toISOString().split('T')[0]

  // Open a proposal in read-only view
  const handleOpen = (proposal) => {
    sessionStorage.setItem('proposal', JSON.stringify({
      client: proposal.client,
      email: proposal.email,
      phone: proposal.phone,
      address: proposal.address,
      expiration: proposal.expiration,
      lines: proposal.lines || [],
      margin: 0,
      proposalId: proposal.id,
    }))
    navigate('/proposal')
  }

  // Open BuildQuote pre-filled to create a new revision
  const handleRevise = (proposal) => {
    const rootId = proposal.parentId || proposal.id
    sessionStorage.setItem('revise-proposal', JSON.stringify({
      client: proposal.client,
      email: proposal.email,
      phone: proposal.phone,
      address: proposal.address,
      expiration: proposal.expiration,
      lines: proposal.lines || [],
      parentId: rootId,
    }))
    navigate('/quote')
  }

  const filtered = proposals.filter(p => filterStatus === 'All' || p.status === filterStatus)

  const dueCount = proposals.reduce((count, p) => {
    const due = (p.reminders || []).filter(r => {
      const nd = nextReminderDate(r)
      return nd && isOverdue(nd)
    })
    return count + due.length
  }, 0)

  const handleStatusChange = (proposal, newStatus) => {
    updateProposalStatus(proposal.id, newStatus)
    if (newStatus === 'Won' || newStatus === 'Lost') {
      setWinLossTarget({ ...proposal, status: newStatus })
    }
  }

  const saveWinLossReason = (reason) => {
    setWinLossReason(winLossTarget.id, reason)
    setWinLossTarget(null)
  }

  const openReminder = (id) => {
    setReminderProposalId(id)
    setReminderDate(today)
    setReminderFreq('once')
    setReminderNote('')
  }

  const saveReminder = () => {
    if (!reminderDate) return
    addReminder(reminderProposalId, { date: reminderDate, frequency: reminderFreq, note: reminderNote })
    setReminderProposalId(null)
  }

  const TABS = [
    { id: 'list', label: 'List', icon: List },
    { id: 'pipeline', label: 'Pipeline', icon: Columns },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ]

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proposal Tracker</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your pipeline from quote to close.</p>
        </div>
        {dueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-medium text-amber-800">
            <Bell size={15} className="text-[var(--brand-500)]" />
            {dueCount} follow-up{dueCount !== 1 ? 's' : ''} due
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Proposals', value: proposals.length, icon: FileText, color: 'text-[var(--brand-500)]' },
          { label: 'Won', value: proposals.filter(p => p.status === 'Won').length, icon: CheckCircle, color: 'text-[var(--brand-400)]' },
          { label: 'Won Revenue', value: `$${fmt(proposals.filter(p => p.status === 'Won').reduce((s, p) => s + (p.total || 0), 0))}`, icon: DollarSign, color: 'text-green-500' },
          { label: 'Open Pipeline', value: `$${fmt(proposals.filter(p => ['Sent','Followed Up','Negotiating'].includes(p.status)).reduce((s, p) => s + (p.total || 0), 0))}`, icon: TrendingUp, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={14} className={color} />
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filter */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {tab !== 'analytics' && (
          <div className="flex gap-1 flex-wrap">
            {['All', ...PROPOSAL_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      {tab === 'list' && (
        <ListView
          proposals={proposals}
          filterStatus={filterStatus}
          onStatusChange={handleStatusChange}
          onReminderOpen={openReminder}
          onOpen={handleOpen}
          onRevise={handleRevise}
        />
      )}
      {tab === 'pipeline' && (
        <PipelineView
          proposals={filtered}
          onStatusChange={handleStatusChange}
        />
      )}
      {tab === 'analytics' && (
        <AnalyticsView proposals={proposals} />
      )}

      {/* Win/Loss Reason Modal */}
      {winLossTarget && (
        <WinLossModal
          proposal={winLossTarget}
          onSave={saveWinLossReason}
          onClose={() => setWinLossTarget(null)}
        />
      )}

      {/* Reminder Modal */}
      {reminderProposalId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-[var(--brand-500)]" /> Set Follow-up Reminder
              </h3>
              <button onClick={() => setReminderProposalId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Reminder Date</label>
                <input type="date" min={today}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Repeat</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={reminderFreq} onChange={e => setReminderFreq(e.target.value)}>
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Note (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Check on permit status"
                  value={reminderNote} onChange={e => setReminderNote(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setReminderProposalId(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={saveReminder} disabled={!reminderDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
