import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSignature, FilePen, CheckCircle2, Clock, Search, X, FileX, ExternalLink, Eye, Loader2, Copy } from 'lucide-react'
import { useStore } from '../store'

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const FILTERS = ['All', 'In Progress', 'Signed', 'Not Started']

// ── Signatures Viewer Modal ─────────────────────────────────────────────────
function SignaturesModal({ recordId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [record, setRecord]   = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!recordId) return
    setLoading(true)
    fetch(`/api/sign/record-${recordId}`)
      .then(async r => {
        const text = await r.text()
        let parsed
        try { parsed = JSON.parse(text) } catch { throw new Error(text.slice(0, 200)) }
        if (!r.ok || parsed.error) throw new Error(parsed.error || `HTTP ${r.status}`)
        return parsed
      })
      .then(d => { setRecord(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [recordId])

  const ROLE_LABEL = { client: 'Client', builder: 'Builder (Ebony)', gc: 'GC (All-In-One)' }
  const sigs = record?.signatures || {}

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Signatures & Audit Trail</h2>
          <div className="flex items-center gap-3">
            <a href={`/view/${recordId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors">
              <ExternalLink size={11} /> View Full Document
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
              <Loader2 size={16} className="animate-spin" /> Loading signatures…
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Could not load record</p>
              <p className="font-mono text-xs">{error}</p>
            </div>
          )}
          {record && (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-5 bg-gray-50 rounded-xl p-4">
                <div><span className="text-gray-400 text-xs">Client</span><p className="font-semibold">{record.contractData?.client}</p></div>
                <div><span className="text-gray-400 text-xs">Contract #</span><p className="font-mono text-sm">{record.contractNum}</p></div>
                <div className="col-span-2"><span className="text-gray-400 text-xs">Address</span><p className="font-semibold">{record.contractData?.address}</p></div>
                <div>
                  <span className="text-gray-400 text-xs">Status</span>
                  <p className={`font-semibold ${record.status === 'signed' ? 'text-green-600' : 'text-amber-600'}`}>
                    {record.status === 'signed' ? 'Fully Signed' : record.status === 'partial' ? 'Partially Signed' : 'Pending'}
                  </p>
                </div>
                <div><span className="text-gray-400 text-xs">Created</span><p className="text-sm">{record.createdAt ? new Date(record.createdAt).toLocaleString() : '—'}</p></div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Signatures</p>
              <div className="space-y-3">
                {['client', 'builder', 'gc'].map(role => {
                  const sig = sigs[role]
                  if (!sig) return (
                    <div key={role} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-500 text-sm">{ROLE_LABEL[role]}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Not signed yet</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
                    </div>
                  )
                  return (
                    <div key={role} className="bg-white border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{ROLE_LABEL[role]}</p>
                          <p className="text-xs text-gray-500">{sig.printedName}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Signed
                        </span>
                      </div>
                      {sig.signatureDataUrl && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                          <img src={sig.signatureDataUrl} alt={`${role} signature`} className="max-h-20 object-contain mx-auto" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 font-mono">
                        <div><span className="text-gray-400">Signed:</span> {new Date(sig.signedAt).toLocaleString()}</div>
                        <div><span className="text-gray-400">IP:</span> {sig.ip}</div>
                        <div className="col-span-2 truncate"><span className="text-gray-400">UA:</span> {sig.userAgent}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Signing Links Modal ─────────────────────────────────────────────────────
function LinksModal({ links, onClose }) {
  const [copied, setCopied] = useState('')
  const ROLE = [
    { role: 'client',  label: 'Client',                color: 'bg-blue-50 border-blue-200' },
    { role: 'builder', label: 'Builder (Ebony)',       color: 'bg-emerald-50 border-emerald-200' },
    { role: 'gc',      label: 'GC (All-In-One)',       color: 'bg-amber-50 border-amber-200' },
  ]
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Signing Links</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {ROLE.map(({ role, label, color }) => (
            <div key={role} className={`border rounded-xl p-3 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(links[role]); setCopied(role); setTimeout(() => setCopied(''), 2000) }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-900 text-white rounded-md text-[11px] font-semibold hover:bg-gray-700"
                >
                  <Copy size={10} /> {copied === role ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="text-[11px] text-gray-600 break-all bg-white/50 rounded px-2 py-1 select-all">{links[role]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ContractsList() {
  const navigate             = useNavigate()
  const proposals            = useStore(s => s.proposals)
  const markContractSigned   = useStore(s => s.markContractSigned)

  const [filter, setFilter]  = useState('All')
  const [query,  setQuery]   = useState('')
  const [viewingRecordId, setViewingRecordId] = useState(null)
  const [viewingLinks,    setViewingLinks]    = useState(null)

  // Only Won proposals are relevant to contracts
  const wonProposals = proposals.filter(p => p.status === 'Won')

  const getContractStatus = (p) => {
    if (!p.contractDraft) return 'not-started'
    if (p.contractDraft.signed) return 'signed'
    return 'in-progress'
  }

  const filtered = wonProposals
    .filter(p => {
      const status = getContractStatus(p)
      if (filter === 'In Progress')  return status === 'in-progress'
      if (filter === 'Signed')       return status === 'signed'
      if (filter === 'Not Started')  return status === 'not-started'
      return true
    })
    .filter(p => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      const contractNum = p.contractDraft?.contractNum || ''
      return [p.client, p.address, p.email, contractNum]
        .some(v => v?.toLowerCase().includes(q))
    })
    .sort((a, b) => {
      // Signed last, then by most recently saved/created
      const sa = getContractStatus(a), sb = getContractStatus(b)
      if (sa === 'signed' && sb !== 'signed') return 1
      if (sb === 'signed' && sa !== 'signed') return -1
      const dateA = a.contractDraft?.savedAt || a.closedAt || a.createdAt || ''
      const dateB = b.contractDraft?.savedAt || b.closedAt || b.createdAt || ''
      return dateB.localeCompare(dateA)
    })

  const counts = {
    All:         wonProposals.length,
    'In Progress': wonProposals.filter(p => getContractStatus(p) === 'in-progress').length,
    Signed:      wonProposals.filter(p => getContractStatus(p) === 'signed').length,
    'Not Started': wonProposals.filter(p => getContractStatus(p) === 'not-started').length,
  }

  const openContract = (p) => {
    const contractNumber = p.contractDraft?.contractNum
      || `EOL${String(70000 + p.id).padStart(6, '0')}`
    sessionStorage.setItem('contract', JSON.stringify({
      proposalId:     p.id,
      client:         p.client,
      email:          p.email,
      phone:          p.phone,
      address:        p.address,
      total:          p.total || 0,
      lines:          p.lines || [],
      projectTypes:   p.projectTypes || [],
      projectSummary: p.projectSummary || '',
      contractNumber,
      salesperson:    p.salesperson || 'Mathew Rosa',
    }))
    navigate('/contract')
  }

  const StatusBadge = ({ status }) => {
    if (status === 'signed') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 size={10} /> Signed
      </span>
    )
    if (status === 'in-progress') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock size={10} /> In Progress
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        <FileX size={10} /> Not Started
      </span>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">All contracts from won proposals</p>
        </div>
        <div className="text-sm text-gray-400">
          {wonProposals.length} won proposal{wonProposals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
              <span className={`ml-1.5 text-xs ${filter === f ? 'text-[var(--brand-600)]' : 'text-gray-400'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-56">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder="Search contracts…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {wonProposals.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <FileSignature size={40} className="text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium mb-1">No won proposals yet</p>
          <p className="text-sm text-gray-400">Mark a proposal as Won in the Proposal Tracker to generate a contract.</p>
          <button
            onClick={() => navigate('/tracker')}
            className="mt-5 px-4 py-2 bg-[var(--brand-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-700)] transition-colors"
          >
            Go to Proposal Tracker
          </button>
        </div>
      )}

      {wonProposals.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center">
          <Search size={32} className="text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No contracts match your filter.</p>
        </div>
      )}

      {/* Contract cards */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(p => {
            const status     = getContractStatus(p)
            const draft      = p.contractDraft || {}
            const contractNum = draft.contractNum || `EOL${String(70000 + p.id).padStart(6, '0')}`
            const lastSaved  = draft.savedAt
            const signedAt   = draft.signedAt

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  status === 'signed' ? 'border-emerald-100' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-5 px-5 py-4">

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    status === 'signed'      ? 'bg-emerald-100 text-emerald-600' :
                    status === 'in-progress' ? 'bg-amber-100 text-amber-600' :
                                               'bg-gray-100 text-gray-400'
                  }`}>
                    {status === 'signed'
                      ? <CheckCircle2 size={20} />
                      : status === 'in-progress'
                        ? <FilePen size={20} />
                        : <FileSignature size={20} />}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{p.client}</span>
                      <StatusBadge status={status} />
                      <span className="text-xs text-gray-400 font-mono">{contractNum}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{p.address}</p>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--brand-700)]">${fmt(p.total || 0)}</span>
                      {status === 'signed' && signedAt && (
                        <span className="text-xs text-gray-400">Signed {fmtDate(signedAt)}</span>
                      )}
                      {status === 'in-progress' && lastSaved && (
                        <span className="text-xs text-gray-400">Last saved {fmtDate(lastSaved)}</span>
                      )}
                      {status === 'not-started' && p.closedAt && (
                        <span className="text-xs text-gray-400">Won {fmtDate(p.closedAt)}</span>
                      )}
                      {p.email && (
                        <span className="text-xs text-gray-400 truncate max-w-[180px]">{p.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {draft.signRecordId && (
                      <button
                        onClick={() => setViewingRecordId(draft.signRecordId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                        title="View signed contract and signatures"
                      >
                        <Eye size={12} /> Signatures
                      </button>
                    )}
                    {draft.signLinks && (
                      <button
                        onClick={() => setViewingLinks(draft.signLinks)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        title="Show signing links"
                      >
                        <Copy size={12} /> Links
                      </button>
                    )}
                    {status !== 'signed' && (
                      <button
                        onClick={() => openContract(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-600)] text-white rounded-lg text-xs font-medium hover:bg-[var(--brand-700)] transition-colors"
                      >
                        <ExternalLink size={12} />
                        {status === 'not-started' ? 'Start Contract' : 'Open / Edit'}
                      </button>
                    )}
                    {status === 'signed' && (
                      <button
                        onClick={() => openContract(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink size={12} /> View
                      </button>
                    )}
                    {status === 'in-progress' && (
                      <button
                        onClick={() => markContractSigned(p.id, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Mark Signed
                      </button>
                    )}
                    {status === 'signed' && (
                      <button
                        onClick={() => markContractSigned(p.id, false)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                      >
                        Undo Signed
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar for in-progress contracts */}
                {status === 'in-progress' && (
                  <div className="h-0.5 bg-amber-100">
                    <div className="h-full bg-amber-400 w-1/2" />
                  </div>
                )}
                {status === 'signed' && (
                  <div className="h-0.5 bg-emerald-400" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {viewingRecordId && (
        <SignaturesModal recordId={viewingRecordId} onClose={() => setViewingRecordId(null)} />
      )}
      {viewingLinks && (
        <LinksModal links={viewingLinks} onClose={() => setViewingLinks(null)} />
      )}

      {/* Summary footer */}
      {wonProposals.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Not Started', value: counts['Not Started'], color: 'bg-gray-50 text-gray-600' },
            { label: 'In Progress', value: counts['In Progress'], color: 'bg-amber-50 text-amber-700' },
            { label: 'Signed',      value: counts['Signed'],      color: 'bg-emerald-50 text-emerald-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl px-5 py-4 flex items-center justify-between`}>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-2xl font-bold">{value}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
