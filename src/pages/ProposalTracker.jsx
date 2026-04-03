import { useState } from 'react'
import { useStore, PROPOSAL_STATUSES } from '../store'
import { Bell, Trash2, X, CheckCircle, AlertCircle, Clock, TrendingUp, DollarSign, FileText, Plus } from 'lucide-react'

const fmt = (n) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const STATUS_STYLES = {
  Draft:        'bg-gray-100 text-gray-600',
  Sent:         'bg-blue-100 text-blue-700',
  'Followed Up':'bg-purple-100 text-purple-700',
  Won:          'bg-green-100 text-green-700',
  Lost:         'bg-red-100 text-red-700',
}

const FREQUENCIES = [
  { label: 'One-time', value: 'once' },
  { label: 'Every 3 days', value: '3d' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
]

function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr + 'T00:00:00') <= new Date()
}

function isDueToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const t = new Date()
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
}

function nextReminderDate(reminder) {
  // For recurring, compute the next date from today if overdue
  if (reminder.dismissed) return null
  const base = new Date(reminder.date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (base >= today || reminder.frequency === 'once') return reminder.date

  let next = new Date(base)
  const step = { '3d': 3, weekly: 7, biweekly: 14, monthly: 30 }[reminder.frequency] || 0
  if (!step) return reminder.date
  while (next < today) next.setDate(next.getDate() + step)
  return next.toISOString().split('T')[0]
}

export default function ProposalTracker() {
  const { proposals, updateProposalStatus, addReminder, dismissReminder, deleteProposal } = useStore()

  const [reminderProposalId, setReminderProposalId] = useState(null)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderFreq, setReminderFreq] = useState('once')
  const [reminderNote, setReminderNote] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const today = new Date().toISOString().split('T')[0]

  const filtered = proposals.filter(
    p => filterStatus === 'All' || p.status === filterStatus
  )

  // Summary stats
  const totalSent = proposals.filter(p => p.status !== 'Draft').length
  const totalWon = proposals.filter(p => p.status === 'Won').length
  const totalRevenue = proposals.filter(p => p.status === 'Won').reduce((s, p) => s + (p.total || 0), 0)
  const openValue = proposals.filter(p => ['Sent', 'Followed Up'].includes(p.status)).reduce((s, p) => s + (p.total || 0), 0)

  const openReminderModal = (proposalId) => {
    setReminderProposalId(proposalId)
    setReminderDate(today)
    setReminderFreq('once')
    setReminderNote('')
  }

  const saveReminder = () => {
    if (!reminderDate) return
    addReminder(reminderProposalId, {
      date: reminderDate,
      frequency: reminderFreq,
      note: reminderNote,
    })
    setReminderProposalId(null)
  }

  const dueCount = proposals.reduce((count, p) => {
    const active = (p.reminders || []).filter(r => !r.dismissed)
    const due = active.filter(r => {
      const nd = nextReminderDate(r)
      return nd && isOverdue(nd)
    })
    return count + due.length
  }, 0)

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proposal Tracker</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track sent proposals, follow-ups, and won jobs.</p>
        </div>
        {dueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm font-medium text-amber-800">
            <Bell size={15} className="text-amber-500" />
            {dueCount} follow-up{dueCount !== 1 ? 's' : ''} due
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={15} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Sent</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={15} className="text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Won</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalWon}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Won Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-purple-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Open Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${fmt(openValue)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {['All', ...PROPOSAL_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No proposals yet. Build a quote and send it to a client — it'll appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-ups</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const activeReminders = (p.reminders || []).filter(r => !r.dismissed)
                const dueReminders = activeReminders.filter(r => {
                  const nd = nextReminderDate(r)
                  return nd && isOverdue(nd)
                })

                return (
                  <tr key={p.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.client || <span className="text-gray-400 italic">No name</span>}</p>
                      {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
                      {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      ${fmt(p.total || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={e => updateProposalStatus(p.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {PROPOSAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {p.sentAt
                        ? new Date(p.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span className="italic text-gray-300">Not sent</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {activeReminders.map(r => {
                          const nd = nextReminderDate(r)
                          const overdue = nd && isOverdue(nd)
                          const dueToday = nd && isDueToday(nd)
                          return (
                            <div key={r.id} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${
                              overdue ? 'bg-red-50 text-red-700' : dueToday ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                            }`}>
                              {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
                              <span>{nd ? new Date(nd + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                              {r.frequency !== 'once' && <span className="opacity-60">· {FREQUENCIES.find(f => f.value === r.frequency)?.label}</span>}
                              {r.note && <span className="opacity-70 truncate max-w-24">· {r.note}</span>}
                              <button
                                onClick={() => dismissReminder(p.id, r.id)}
                                className="ml-auto opacity-50 hover:opacity-100"
                                title="Dismiss"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )
                        })}
                        <button
                          onClick={() => openReminderModal(p.id)}
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
                        >
                          <Plus size={11} /> Add reminder
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteProposal(p.id)}
                        className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderProposalId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-blue-500" /> Set Follow-up Reminder
              </h3>
              <button onClick={() => setReminderProposalId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Reminder Date</label>
                <input
                  type="date"
                  min={today}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={reminderDate}
                  onChange={e => setReminderDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Repeat</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={reminderFreq}
                  onChange={e => setReminderFreq(e.target.value)}
                >
                  {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Note (optional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Call about permit timeline"
                  value={reminderNote}
                  onChange={e => setReminderNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setReminderProposalId(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveReminder}
                disabled={!reminderDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
