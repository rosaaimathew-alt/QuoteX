import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, PROPOSAL_STATUSES } from '../store'
import { DollarSign, ChevronRight, UserX, TrendingUp } from 'lucide-react'

const fmtDol = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const STAGE_META = {
  Draft:         { color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',    border: 'border-gray-200' },
  Sent:          { color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-400',    border: 'border-blue-200' },
  'Followed Up': { color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-400',  border: 'border-purple-200' },
  Negotiating:   { color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400',   border: 'border-amber-200' },
  Won:           { color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',   border: 'border-green-200' },
  Lost:          { color: 'bg-red-100 text-red-700',      dot: 'bg-red-400',     border: 'border-red-200' },
  MIA:           { color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400',   border: 'border-slate-200' },
}

const PIPELINE_STAGES = ['Draft', 'Sent', 'Followed Up', 'Negotiating', 'Won', 'MIA', 'Lost']

export default function Pipeline() {
  const proposals  = useStore(s => s.proposals)
  const updateProposalStatus = useStore(s => s.updateProposalStatus)
  const navigate   = useNavigate()

  const [active, setActive] = useState('All')
  const [changing, setChanging] = useState(null)

  const byStatus = useMemo(() => {
    const map = {}
    PIPELINE_STAGES.forEach(s => { map[s] = [] })
    proposals.forEach(p => {
      const bucket = map[p.status] || map['Draft']
      bucket.push(p)
    })
    return map
  }, [proposals])

  const closeStats = useMemo(() => {
    const total = proposals.length
    const won   = proposals.filter(p => p.status === 'Won').length
    const rate  = total > 0 ? (won / total) * 100 : 0
    return { total, won, rate }
  }, [proposals])

  const displayed = active === 'All'
    ? proposals.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    : (byStatus[active] || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  const openProposal = (p) => {
    sessionStorage.setItem('proposal', JSON.stringify({
      client: p.client, email: p.email, phone: p.phone,
      address: p.address, expiration: p.expiration,
      lines: p.lines || [], margin: 0, proposalId: p.id,
    }))
    navigate('/proposal')
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Pipeline</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          All proposals by stage — every non-Won proposal counts against close rate.
        </p>
      </div>

      {/* Stage summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {PIPELINE_STAGES.map(stage => {
          const list  = byStatus[stage] || []
          const value = list.reduce((s, p) => s + (Number(p.total) || 0), 0)
          const meta  = STAGE_META[stage]
          return (
            <button
              key={stage}
              onClick={() => setActive(active === stage ? 'All' : stage)}
              className={`text-left rounded-xl border p-3 transition-all ${
                active === stage
                  ? `${meta.border} ring-2 ring-offset-1 ${meta.border.replace('border-', 'ring-')}`
                  : 'border-gray-200 hover:border-gray-300'
              } bg-white`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-xs font-semibold text-gray-500 truncate">{stage}</span>
                {stage === 'MIA' && <UserX size={10} className="text-slate-400 ml-auto" />}
              </div>
              <p className="text-xl font-bold text-gray-900">{list.length}</p>
              <p className="text-xs text-gray-400">{fmtDol(value)}</p>
            </button>
          )
        })}
      </div>

      {/* Win rate bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Close Rate</span>
          </div>
          <span className={`text-sm font-bold ${
            closeStats.rate >= 50 ? 'text-green-600' : closeStats.rate >= 30 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {closeStats.rate.toFixed(1)}% &nbsp;·&nbsp; {closeStats.won} won of {closeStats.total}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(closeStats.rate, 100)}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          {PIPELINE_STAGES.filter(s => s !== 'Won').map(s => {
            const n = (byStatus[s] || []).length
            if (!n) return null
            return (
              <span key={s}><span className={`inline-block w-2 h-2 rounded-full mr-1 ${STAGE_META[s].dot}`} />{s}: {n}</span>
            )
          })}
        </div>
      </div>

      {/* Proposal list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap">
          {['All', ...PIPELINE_STAGES].map(s => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                active === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s} {s !== 'All' && `(${(byStatus[s] || []).length})`}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No proposals in this stage.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayed.map(p => {
              const meta = STAGE_META[p.status] || STAGE_META['Draft']
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => openProposal(p)}
                      className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate block text-left"
                    >
                      {p.client || 'Unnamed'}
                    </button>
                    <p className="text-xs text-gray-400 truncate">
                      {p.address || p.email || '—'}
                      {p.createdAt && ` · ${new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    {fmtDol(p.total)}
                  </span>

                  {/* Status selector */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setChanging(changing === p.id ? null : p.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {p.status}
                      <ChevronRight size={10} className="ml-0.5" />
                    </button>
                    {changing === p.id && (
                      <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                        {PIPELINE_STAGES.map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              updateProposalStatus(p.id, s)
                              setChanging(null)
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 ${
                              p.status === s ? 'text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${STAGE_META[s].dot}`} />
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openProposal(p)}
                    className="text-gray-300 hover:text-gray-500 shrink-0"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
