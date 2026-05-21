import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays,
  FileSignature, AlertCircle, ClipboardList, User, MapPin, DollarSign,
  StickyNote, X,
} from 'lucide-react'

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ── Stage templates per project type ────────────────────────────────────────
const STAGE_TEMPLATES = {
  default: [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'zoning',    label: 'Zoning Permit' },
    { key: 'building',  label: 'Building Permit' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Footing Inspection' },
    { key: 'framing',   label: 'Framing Complete' },
    { key: 'decking',   label: 'Decking / Flooring' },
    { key: 'railing',   label: 'Railing Install' },
    { key: 'final_insp',label: 'Final Inspection' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  'Screened Porch': [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'zoning',    label: 'Zoning Permit' },
    { key: 'building',  label: 'Building Permit' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Footing Inspection' },
    { key: 'framing',   label: 'Framing Complete' },
    { key: 'roof',      label: 'Roof Installed' },
    { key: 'screening', label: 'Screening Complete' },
    { key: 'electrical',label: 'Electrical Rough-In' },
    { key: 'final_insp',label: 'Final Inspection' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  'Sunroom': [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'zoning',    label: 'Zoning Permit' },
    { key: 'building',  label: 'Building Permit' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Footing Inspection' },
    { key: 'framing',   label: 'Framing Complete' },
    { key: 'roof',      label: 'Roof Installed' },
    { key: 'windows',   label: 'Windows / Glass Installed' },
    { key: 'electrical',label: 'Electrical Rough-In' },
    { key: 'hvac',      label: 'HVAC / Insulation' },
    { key: 'drywall',   label: 'Drywall / Finishing' },
    { key: 'final_insp',label: 'Final Inspection' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  'Pergola': [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Posts & Footings' },
    { key: 'framing',   label: 'Beam & Rafter Install' },
    { key: 'finish',    label: 'Stain / Seal' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  'Gazebo': [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'building',  label: 'Building Permit' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'footing',   label: 'Foundation / Footings' },
    { key: 'framing',   label: 'Structure Complete' },
    { key: 'roof',      label: 'Roof Installed' },
    { key: 'finish',    label: 'Stain / Seal / Finish' },
    { key: 'final_insp',label: 'Final Inspection' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  'Open Porch': [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'zoning',    label: 'Zoning Permit' },
    { key: 'building',  label: 'Building Permit' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'ready',     label: 'Ready to Start' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Footing Inspection' },
    { key: 'framing',   label: 'Framing Complete' },
    { key: 'roof',      label: 'Roof Installed' },
    { key: 'decking',   label: 'Decking / Flooring' },
    { key: 'railing',   label: 'Railing Install' },
    { key: 'final_insp',label: 'Final Inspection' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'payment',   label: 'Final Payment Collected' },
    { key: 'closed',    label: 'Job Closed' },
  ],
}

function getStages(proposal) {
  const draft = proposal.contractDraft || {}
  const types = draft.projectTypes || []
  // Pick template based on first project type found
  for (const t of types) {
    if (STAGE_TEMPLATES[t]) return STAGE_TEMPLATES[t]
  }
  return STAGE_TEMPLATES.default
}

function getProgress(stages, completedStages) {
  const done = stages.filter(s => completedStages.includes(s.key)).length
  return { done, total: stages.length, pct: Math.round((done / stages.length) * 100) }
}

// ── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ proposal }) {
  const { toggleJobStage, updateJobData } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(proposal.jobData?.notes || '')

  const jobData = proposal.jobData || {}
  const completedStages = jobData.completedStages || []
  const stages = getStages(proposal)
  const { done, total, pct } = getProgress(stages, completedStages)
  const isClosed = completedStages.includes('closed')

  const draft = proposal.contractDraft || {}
  const contractNum = draft.contractNum || `EOL${String(70000 + proposal.id).padStart(6, '0')}`
  const projectTypes = (draft.projectTypes || []).join(', ') || 'Not specified'

  const saveNote = () => {
    updateJobData(proposal.id, { notes: noteText })
    setEditingNote(false)
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      isClosed ? 'border-emerald-200' : pct > 0 ? 'border-blue-100' : 'border-gray-100'
    }`}>
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Progress ring */}
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={isClosed ? '#10b981' : pct > 0 ? '#3b82f6' : '#d1d5db'}
              strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600">{pct}%</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{proposal.client}</span>
            <span className="text-xs text-gray-400 font-mono">{contractNum}</span>
            {isClosed && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Closed</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={10} />{proposal.address || '—'}</span>
            <span className="flex items-center gap-1"><DollarSign size={10} />${fmt(proposal.total)}</span>
            <span>{projectTypes}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
            <div
              className={`h-full rounded-full transition-all ${isClosed ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{done} of {total} stages complete</p>
        </div>

        {/* Dates + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          {jobData.startDate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CalendarDays size={10} /> {fmtDate(jobData.startDate)}
            </span>
          )}
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">

          {/* Dates row */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
              <input
                type="date"
                value={jobData.startDate || ''}
                onChange={e => updateJobData(proposal.id, { startDate: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Complete</label>
              <input
                type="date"
                value={jobData.targetDate || ''}
                onChange={e => updateJobData(proposal.id, { targetDate: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Stage checklist */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Job Stages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {stages.map(stage => {
                const done = completedStages.includes(stage.key)
                return (
                  <button
                    key={stage.key}
                    onClick={() => toggleJobStage(proposal.id, stage.key)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                      done
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {done
                      ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      : <Circle size={15} className="text-gray-300 shrink-0" />}
                    <span className={done ? 'line-through opacity-60' : ''}>{stage.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Job Notes</p>
              {!editingNote && (
                <button onClick={() => setEditingNote(true)} className="text-xs text-blue-600 hover:underline">
                  {jobData.notes ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>
            {editingNote ? (
              <div>
                <textarea
                  autoFocus
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Add job notes, special instructions, sub contacts…"
                />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={saveNote} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                  <button onClick={() => { setNoteText(jobData.notes || ''); setEditingNote(false) }} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : jobData.notes ? (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{jobData.notes}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No notes yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Jobs Page ───────────────────────────────────────────────────────────
export default function Jobs() {
  const proposals = useStore(s => s.proposals)
  const [filter, setFilter] = useState('active')
  const [query,  setQuery]  = useState('')

  const wonJobs = proposals.filter(p => p.status === 'Won')

  const filtered = wonJobs.filter(p => {
    const jobData = p.jobData || {}
    const completedStages = jobData.completedStages || []
    const isClosed = completedStages.includes('closed')
    if (filter === 'active' && isClosed) return false
    if (filter === 'closed' && !isClosed) return false
    if (query) {
      const q = query.toLowerCase()
      return [p.client, p.address, p.email].some(v => v?.toLowerCase().includes(q))
    }
    return true
  }).sort((a, b) => {
    const aDate = a.jobData?.startDate || a.closedAt || ''
    const bDate = b.jobData?.startDate || b.closedAt || ''
    return aDate < bDate ? 1 : -1
  })

  const activeCount = wonJobs.filter(p => !(p.jobData?.completedStages || []).includes('closed')).length
  const closedCount = wonJobs.filter(p => (p.jobData?.completedStages || []).includes('closed')).length

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track stage progress on all active jobs</p>
        </div>
      </div>

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start">
          {[
            { key: 'all',    label: 'All',    count: wonJobs.length },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'closed', label: 'Closed', count: closedCount },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.label} <span className="ml-1 text-gray-400">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-full sm:w-52">
          <ClipboardList size={13} className="text-gray-400 shrink-0" />
          <input className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            placeholder="Search jobs…" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>}
        </div>
      </div>

      {/* Empty states */}
      {wonJobs.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <FileSignature size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No won jobs yet</p>
          <p className="text-sm text-gray-400 mt-1">Mark a proposal as Won in the Proposal Tracker to create a job.</p>
        </div>
      )}

      {wonJobs.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
          <p className="text-gray-400 text-sm">No jobs match your filter.</p>
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-3">
        {filtered.map(p => <JobCard key={p.id} proposal={p} />)}
      </div>
    </div>
  )
}
