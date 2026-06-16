import { useMemo } from 'react'
import { useStore } from '../store'
import { TrendingUp, DollarSign, Award, XCircle, BarChart2, Target } from 'lucide-react'

const PROJECT_TYPES = ['Deck', 'Screened Porch', 'Sunroom', 'Pergola', 'Gazebo', 'Open Porch']
const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${fmt(n)}`

const TYPE_COLORS = {
  'Deck':           'bg-blue-500',
  'Screened Porch': 'bg-emerald-500',
  'Sunroom':        'bg-amber-500',
  'Pergola':        'bg-purple-500',
  'Gazebo':         'bg-rose-500',
  'Open Porch':     'bg-cyan-500',
  'Other':          'bg-gray-400',
}
const TYPE_LIGHT = {
  'Deck':           'bg-blue-50 text-blue-700',
  'Screened Porch': 'bg-emerald-50 text-emerald-700',
  'Sunroom':        'bg-amber-50 text-amber-700',
  'Pergola':        'bg-purple-50 text-purple-700',
  'Gazebo':         'bg-rose-50 text-rose-700',
  'Open Porch':     'bg-cyan-50 text-cyan-700',
  'Other':          'bg-gray-100 text-gray-600',
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Bar({ pct, color, label, count, revenue }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-gray-600 font-medium text-right shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
        />
        {pct > 8 && (
          <span className="absolute left-2 top-0 h-full flex items-center text-white text-xs font-semibold">
            {pct.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="w-16 text-xs text-gray-500 shrink-0">{count} job{count !== 1 ? 's' : ''}</div>
      <div className="w-14 text-xs text-gray-500 text-right shrink-0">{fmtK(revenue)}</div>
    </div>
  )
}

export default function Analytics() {
  const proposals = useStore(s => s.proposals)

  const stats = useMemo(() => {
    const won  = proposals.filter(p => p.status === 'Won')
    const lost = proposals.filter(p => p.status === 'Lost')
    const all  = proposals.filter(p => p.status !== 'Draft')
    const closed = won.length + lost.length

    const totalRevenue = won.reduce((s, p) => s + Number(p.total || 0), 0)
    const avgDeal = won.length ? totalRevenue / won.length : 0
    const winRate = closed ? (won.length / closed) * 100 : 0

    // Project type breakdown from won proposals
    const typeMap = {}
    won.forEach(p => {
      const types = p.contractDraft?.projectTypes?.length
        ? p.contractDraft.projectTypes
        : p.projectTypes?.length
          ? p.projectTypes
          : ['Other']
      types.forEach(t => {
        if (!typeMap[t]) typeMap[t] = { count: 0, revenue: 0 }
        typeMap[t].count += 1
        typeMap[t].revenue += Number(p.total || 0) / types.length
      })
    })

    // Sort by count descending
    const typeRows = Object.entries(typeMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, { count, revenue }]) => ({
        type,
        count,
        revenue,
        pct: won.length ? (count / won.length) * 100 : 0,
      }))

    // Win/loss reasons
    const winReasons = {}
    won.forEach(p => {
      const r = p.winLossReason?.category
      if (r) winReasons[r] = (winReasons[r] || 0) + 1
    })
    const lossReasons = {}
    lost.forEach(p => {
      const r = p.winLossReason?.category
      if (r) lossReasons[r] = (lossReasons[r] || 0) + 1
    })

    // Pipeline value (not won/lost yet)
    const pipelineValue = proposals
      .filter(p => !['Won', 'Lost', 'Draft'].includes(p.status))
      .reduce((s, p) => s + Number(p.total || 0), 0)

    // Monthly closed jobs (last 6 months)
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        won: 0,
        revenue: 0,
      }
    })
    won.forEach(p => {
      const d = new Date(p.createdAt || p.sentAt || Date.now())
      const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (m) { m.won += 1; m.revenue += Number(p.total || 0) }
    })

    return { won, lost, closed, totalRevenue, avgDeal, winRate, typeRows, winReasons, lossReasons, pipelineValue, months }
  }, [proposals])

  const maxMonthRevenue = Math.max(...stats.months.map(m => m.revenue), 1)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Business performance across all proposals</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${fmt(stats.totalRevenue)}`} sub={`${stats.won.length} jobs won`} color="green" />
        <StatCard icon={Target}     label="Win Rate"      value={`${stats.winRate.toFixed(0)}%`} sub={`${stats.won.length}W / ${stats.lost.length}L`} color="blue" />
        <StatCard icon={Award}      label="Avg Deal Size" value={`$${fmt(stats.avgDeal)}`}       sub="per won job"  color="amber" />
        <StatCard icon={TrendingUp} label="Pipeline"      value={`$${fmt(stats.pipelineValue)}`} sub="active proposals" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Job type breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Won Jobs by Project Type</h2>
          <p className="text-xs text-gray-400 mb-4">Which services drive your closed business</p>
          {stats.typeRows.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No won proposals yet</p>
          ) : (
            <div className="space-y-2.5">
              {stats.typeRows.map(r => (
                <Bar
                  key={r.type}
                  label={r.type}
                  pct={r.pct}
                  count={r.count}
                  revenue={r.revenue}
                  color={TYPE_COLORS[r.type] || TYPE_COLORS['Other']}
                />
              ))}
            </div>
          )}
          {stats.typeRows.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              {stats.typeRows.map(r => (
                <span key={r.type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_LIGHT[r.type] || TYPE_LIGHT['Other']}`}>
                  {r.type} {r.pct.toFixed(0)}%
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Monthly revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Monthly Revenue (Won)</h2>
          <p className="text-xs text-gray-400 mb-4">Last 6 months</p>
          <div className="flex items-end gap-2 h-32">
            {stats.months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-500"
                    style={{ height: `${(m.revenue / maxMonthRevenue) * 96}px`, minHeight: m.revenue > 0 ? 4 : 0 }}
                    title={`$${fmt(m.revenue)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{m.label}</span>
                {m.won > 0 && <span className="text-[9px] text-blue-500 font-semibold">{m.won}✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Win / loss reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Why You Win</h2>
          </div>
          {Object.keys(stats.winReasons).length === 0 ? (
            <p className="text-xs text-gray-400">No win reasons logged yet — mark reasons when updating proposal status to "Won".</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.winReasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                <div key={r} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{r}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{n}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={14} className="text-red-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Why You Lose</h2>
          </div>
          {Object.keys(stats.lossReasons).length === 0 ? (
            <p className="text-xs text-gray-400">No loss reasons logged yet — mark reasons when updating proposal status to "Lost".</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.lossReasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                <div key={r} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{r}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{n}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
