import { useMemo, useState, useRef } from 'react'
import { useStore } from '../store'
import { TrendingUp, DollarSign, Award, XCircle, Target, Plus, ChevronDown, ChevronUp, Trash2, Clock } from 'lucide-react'

const PROJECT_TYPES = ['Deck', 'Screened Porch', 'Sunroom', 'Pergola', 'Gazebo', 'Open Porch', 'Other']

const EMPTY_FORM = { client: '', address: '', saleDate: '', total: '', projectType: 'Deck' }

function PastJobPanel() {
  const { proposals, importHistoricalJob, deleteProposal } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const historical = proposals
    .filter(p => p.isHistorical)
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.client.trim()) { setError('Client name is required.'); return }
    if (!form.saleDate)       { setError('Sale date is required.'); return }
    if (!form.total || isNaN(Number(form.total))) { setError('Enter a valid dollar amount.'); return }
    setError('')
    importHistoricalJob({
      client: form.client.trim(),
      address: form.address.trim(),
      projectTypes: [form.projectType],
      total: Number(form.total),
      saleDate: form.saleDate,
    })
    setForm(f => ({ ...EMPTY_FORM, projectType: f.projectType, saleDate: f.saleDate })) // keep type+date for fast repeat entry
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800">Log Past Jobs</span>
          {historical.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              {historical.length} logged
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400 mb-4">
            Enter jobs sold before you started using QuoteX. They'll count toward all revenue totals and the trendline, bucketed by sale date.
          </p>

          {/* Entry form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
            <input
              placeholder="Client name *"
              value={form.client}
              onChange={e => set('client', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 lg:col-span-1"
            />
            <input
              placeholder="Address (optional)"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 lg:col-span-1"
            />
            <select
              value={form.projectType}
              onChange={e => set('projectType', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input
              type="date"
              value={form.saleDate}
              onChange={e => set('saleDate', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Total $"
                value={form.total}
                onChange={e => set('total', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={submit}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          {/* Logged jobs list */}
          {historical.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {historical.length} historical job{historical.length !== 1 ? 's' : ''} logged
              </p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {historical.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 rounded-lg group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-gray-800 truncate">{p.client}</span>
                      {p.projectTypes?.[0] && (
                        <span className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 shrink-0">
                          {p.projectTypes[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">
                        {new Date(p.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        ${Number(p.total).toLocaleString()}
                      </span>
                      <button
                        onClick={() => deleteProposal(p.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Total: <strong className="text-gray-700">
                  ${historical.reduce((s, p) => s + Number(p.total || 0), 0).toLocaleString()}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const fmt  = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtK = n => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${fmt(n)}`

const TYPE_STROKE = {
  'Total':          '#6366f1',
  'Deck':           '#3b82f6',
  'Screened Porch': '#10b981',
  'Sunroom':        '#f59e0b',
  'Pergola':        '#a855f7',
  'Gazebo':         '#f43f5e',
  'Open Porch':     '#06b6d4',
  'Other':          '#9ca3af',
}
const TYPE_BG = {
  'Total':          'bg-indigo-100 text-indigo-700 border-indigo-300',
  'Deck':           'bg-blue-100 text-blue-700 border-blue-300',
  'Screened Porch': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Sunroom':        'bg-amber-100 text-amber-700 border-amber-300',
  'Pergola':        'bg-purple-100 text-purple-700 border-purple-300',
  'Gazebo':         'bg-rose-100 text-rose-700 border-rose-300',
  'Open Porch':     'bg-cyan-100 text-cyan-700 border-cyan-300',
  'Other':          'bg-gray-100 text-gray-600 border-gray-300',
}
const TYPE_COLORS_BAR = {
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
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${colors[color]}`}><Icon size={18} /></div>
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
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
        {pct > 8 && <span className="absolute left-2 top-0 h-full flex items-center text-white text-xs font-semibold">{pct.toFixed(0)}%</span>}
      </div>
      <div className="w-16 text-xs text-gray-500 shrink-0">{count} job{count !== 1 ? 's' : ''}</div>
      <div className="w-14 text-xs text-gray-500 text-right shrink-0">{fmtK(revenue)}</div>
    </div>
  )
}

// SVG line chart with hover tooltip
function TrendChart({ months, activeTypes, allTypes }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const W = 700, H = 220
  const PAD = { top: 16, right: 20, bottom: 40, left: 56 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = useMemo(() => {
    let max = 0
    months.forEach(m => {
      if (activeTypes.has('Total')) max = Math.max(max, m.total)
      allTypes.forEach(t => { if (activeTypes.has(t)) max = Math.max(max, m.byType[t] || 0) })
    })
    return max || 1
  }, [months, activeTypes, allTypes])

  const xScale = i => PAD.left + (months.length <= 1 ? chartW / 2 : (i / (months.length - 1)) * chartW)
  const yScale = v => PAD.top + chartH - (v / maxVal) * chartH

  const linePoints = type =>
    months.map((m, i) => `${xScale(i)},${yScale(type === 'Total' ? m.total : (m.byType[type] || 0))}`).join(' ')

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ val: maxVal * f, y: yScale(maxVal * f) }))

  const handleMouseMove = e => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (W / rect.width) - PAD.left
    const idx = Math.max(0, Math.min(months.length - 1, Math.round((mx / chartW) * (months.length - 1))))
    setTooltip({ idx, x: xScale(idx), y: rect.top })
  }

  if (months.length === 0) return <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>

  const tip = tooltip ? months[tooltip.idx] : null

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y grid + labels */}
        {yTicks.map(({ val, y }) => (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{fmtK(val)}</text>
          </g>
        ))}

        {/* X labels */}
        {months.map((m, i) => (
          <text key={i} x={xScale(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {m.label}
          </text>
        ))}

        {/* Year change markers */}
        {months.map((m, i) => i > 0 && months[i - 1].year !== m.year ? (
          <g key={`yr-${i}`}>
            <line x1={xScale(i)} y1={PAD.top} x2={xScale(i)} y2={H - PAD.bottom} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3" />
            <text x={xScale(i) + 3} y={PAD.top + 8} fontSize="8" fill="#d1d5db">{m.year}</text>
          </g>
        ) : null)}

        {/* Lines */}
        {['Total', ...allTypes].map(type => {
          if (!activeTypes.has(type)) return null
          const color = TYPE_STROKE[type] || '#9ca3af'
          const isTotal = type === 'Total'
          return (
            <g key={type}>
              <polyline
                points={linePoints(type)}
                fill="none"
                stroke={color}
                strokeWidth={isTotal ? 2.5 : 1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={isTotal ? 1 : 0.85}
              />
              {months.map((m, i) => {
                const val = type === 'Total' ? m.total : (m.byType[type] || 0)
                if (val === 0) return null
                return (
                  <circle key={i} cx={xScale(i)} cy={yScale(val)} r={isTotal ? 3.5 : 2.5}
                    fill="white" stroke={color} strokeWidth={isTotal ? 2 : 1.5} />
                )
              })}
            </g>
          )
        })}

        {/* Hover vertical line */}
        {tooltip && (
          <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={H - PAD.bottom}
            stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && tip && (
        <div className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none z-10 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[140px]"
          style={{ transform: `translateX(calc(${tooltip.x / W * 100}% - 50%))`, top: 0 }}>
          <p className="font-semibold text-gray-800 mb-1.5">{tip.labelFull}</p>
          {activeTypes.has('Total') && <p className="text-indigo-600 font-medium">Total: {fmtK(tip.total)}</p>}
          {allTypes.filter(t => activeTypes.has(t) && tip.byType[t] > 0).map(t => (
            <p key={t} style={{ color: TYPE_STROKE[t] }}>{t}: {fmtK(tip.byType[t])}</p>
          ))}
          {tip.jobCount > 0 && <p className="text-gray-400 mt-1">{tip.jobCount} job{tip.jobCount !== 1 ? 's' : ''}</p>}
        </div>
      )}
    </div>
  )
}

export default function Analytics() {
  const proposals = useStore(s => s.proposals)
  const [rangeMonths, setRangeMonths] = useState(12)
  const [activeTypes, setActiveTypes] = useState(new Set(['Total']))

  const { stats, trendMonths, allTypes } = useMemo(() => {
    const won  = proposals.filter(p => p.status === 'Won')
    const lost = proposals.filter(p => p.status === 'Lost')
    const closed = won.length + lost.length

    const totalRevenue = won.reduce((s, p) => s + Number(p.total || 0), 0)
    const avgDeal = won.length ? totalRevenue / won.length : 0
    const winRate = closed ? (won.length / closed) * 100 : 0

    // Project type breakdown (all time)
    const typeMap = {}
    won.forEach(p => {
      const types = p.contractDraft?.projectTypes?.length
        ? p.contractDraft.projectTypes
        : p.projectTypes?.length ? p.projectTypes : ['Other']
      types.forEach(t => {
        if (!typeMap[t]) typeMap[t] = { count: 0, revenue: 0 }
        typeMap[t].count += 1
        typeMap[t].revenue += Number(p.total || 0) / types.length
      })
    })
    const typeRows = Object.entries(typeMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, { count, revenue }]) => ({ type, count, revenue, pct: won.length ? (count / won.length) * 100 : 0 }))

    const allTypes = typeRows.map(r => r.type)

    // Win/loss reasons
    const winReasons = {}, lossReasons = {}
    won.forEach(p => { const r = p.winLossReason?.category; if (r) winReasons[r] = (winReasons[r] || 0) + 1 })
    lost.forEach(p => { const r = p.winLossReason?.category; if (r) lossReasons[r] = (lossReasons[r] || 0) + 1 })

    const pipelineValue = proposals
      .filter(p => !['Won', 'Lost', 'Draft'].includes(p.status))
      .reduce((s, p) => s + Number(p.total || 0), 0)

    return {
      stats: { won, lost, closed, totalRevenue, avgDeal, winRate, typeRows, winReasons, lossReasons, pipelineValue },
      trendMonths: [],
      allTypes,
    }
  }, [proposals])

  // Build trend months separately (depends on rangeMonths)
  const trendData = useMemo(() => {
    const won = proposals.filter(p => p.status === 'Won')
    const now = new Date()
    const months = Array.from({ length: rangeMonths }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1 - i), 1)
      return {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        labelFull: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0,
        byType: {},
        jobCount: 0,
      }
    })
    won.forEach(p => {
      const d = new Date(p.closedAt || p.createdAt || p.sentAt || Date.now())
      const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
      if (!m) return
      const rev = Number(p.total || 0)
      m.total += rev
      m.jobCount += 1
      const types = p.contractDraft?.projectTypes?.length
        ? p.contractDraft.projectTypes
        : p.projectTypes?.length ? p.projectTypes : ['Other']
      types.forEach(t => { m.byType[t] = (m.byType[t] || 0) + rev / types.length })
    })
    return months
  }, [proposals, rangeMonths])

  const toggleType = type => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) { if (next.size > 1) next.delete(type) }
      else next.add(type)
      return next
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Business performance &amp; seasonality across all proposals</p>
      </div>

      <PastJobPanel />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue"  value={`$${fmt(stats.totalRevenue)}`} sub={`${stats.won.length} jobs won`} color="green" />
        <StatCard icon={Target}     label="Win Rate"       value={`${stats.winRate.toFixed(0)}%`} sub={`${stats.won.length}W / ${stats.lost.length}L`} color="blue" />
        <StatCard icon={Award}      label="Avg Deal Size"  value={`$${fmt(stats.avgDeal)}`}       sub="per won job" color="amber" />
        <StatCard icon={TrendingUp} label="Pipeline"       value={`$${fmt(stats.pipelineValue)}`} sub="active proposals" color="blue" />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Revenue Trend &amp; Seasonality</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click a job type to isolate its revenue line and spot seasonal patterns</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {[12, 18, 24].map(n => (
              <button key={n} onClick={() => setRangeMonths(n)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${rangeMonths === n ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {n}mo
              </button>
            ))}
          </div>
        </div>

        {/* Type toggles */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['Total', ...allTypes].map(type => {
            const on = activeTypes.has(type)
            const base = TYPE_BG[type] || 'bg-gray-100 text-gray-600 border-gray-300'
            return (
              <button key={type} onClick={() => toggleType(type)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${on ? base : 'bg-white text-gray-400 border-gray-200'}`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                  style={{ background: on ? TYPE_STROKE[type] || '#9ca3af' : '#d1d5db' }} />
                {type}
              </button>
            )
          })}
        </div>

        <TrendChart months={trendData} activeTypes={activeTypes} allTypes={allTypes} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Job type breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Won Jobs by Project Type</h2>
          <p className="text-xs text-gray-400 mb-4">Which services drive your closed business</p>
          {stats.typeRows.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No won proposals yet</p>
          ) : (
            <>
              <div className="space-y-2.5">
                {stats.typeRows.map(r => (
                  <Bar key={r.type} label={r.type} pct={r.pct} count={r.count} revenue={r.revenue}
                    color={TYPE_COLORS_BAR[r.type] || 'bg-gray-400'} />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {stats.typeRows.map(r => (
                  <span key={r.type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_LIGHT[r.type] || 'bg-gray-100 text-gray-600'}`}>
                    {r.type} {r.pct.toFixed(0)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Win / loss reasons */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award size={14} className="text-emerald-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Why You Win</h2>
            </div>
            {Object.keys(stats.winReasons).length === 0 ? (
              <p className="text-xs text-gray-400">No reasons logged yet.</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(stats.winReasons).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
                  <div key={r} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{r}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{n}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={14} className="text-red-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Why You Lose</h2>
            </div>
            {Object.keys(stats.lossReasons).length === 0 ? (
              <p className="text-xs text-gray-400">No reasons logged yet.</p>
            ) : (
              <div className="space-y-1.5">
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
    </div>
  )
}
