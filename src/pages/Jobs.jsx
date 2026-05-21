import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, CalendarDays,
  FileSignature, ClipboardList, MapPin, DollarSign, X, Plus,
  AlertTriangle, CheckCheck, Clock, Wrench, FileText, Mail, Send,
} from 'lucide-react'

const fmt    = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDol = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const today = () => new Date().toISOString().split('T')[0]

const STAGE_TEMPLATES = {
  porch_conversion: [
    { key: 'hoa',               label: 'HOA Approval' },
    { key: 'precon',            label: 'Pre-Con Scheduled' },
    { key: 'start',             label: 'Start Date Given' },
    { key: 'demo',              label: 'Demo' },
    { key: 'materials',         label: 'Material Ordered' },
    { key: 'framing',           label: 'Framing Complete' },
    { key: 'measurements',      label: 'Measurements Received' },
    { key: 'paint',             label: 'Paint Completed' },
    { key: 'windows_delivered', label: 'Windows Delivered' },
    { key: 'windows_installed', label: 'Windows Installed' },
    { key: 'punch',             label: 'Punch List' },
    { key: 'closed',            label: 'Job Closed' },
  ],
  deck_resurface: [
    { key: 'hoa',                 label: 'HOA Approval' },
    { key: 'precon',              label: 'Pre-Con Scheduled' },
    { key: 'start',               label: 'Start Date Given' },
    { key: 'demo',                label: 'Demo' },
    { key: 'materials',           label: 'Material Ordered' },
    { key: 'framing_restructure', label: 'Framing/Restructuring Complete' },
    { key: 'decking_railings',    label: 'Decking and Railings Installed' },
    { key: 'paint',               label: 'Paint Completed' },
    { key: 'punch',               label: 'Punch List' },
    { key: 'closed',              label: 'Job Closed' },
  ],
  deck_new: [
    { key: 'hoa',               label: 'HOA Approval' },
    { key: 'zoning',            label: 'Zoning Permit' },
    { key: 'building',          label: 'Building Permit' },
    { key: 'precon',            label: 'Pre-Con Scheduled' },
    { key: 'start',             label: 'Start Date Given' },
    { key: 'demo_footings',     label: 'Demo and Footings' },
    { key: 'footing_insp',      label: 'Footing Inspection Completed' },
    { key: 'materials',         label: 'Material Ordered' },
    { key: 'framing',           label: 'Framing Complete' },
    { key: 'floor_framing_insp',label: 'Floor Framing Inspection' },
    { key: 'decking_railings',  label: 'Decking and Railings Installed' },
    { key: 'paint',             label: 'Paint Completed' },
    { key: 'final_insp',        label: 'Final Inspection' },
    { key: 'punch',             label: 'Punch List' },
    { key: 'closed',            label: 'Job Closed' },
  ],
  porch_ground: [
    { key: 'hoa',                 label: 'HOA Approval' },
    { key: 'zoning',              label: 'Zoning Permit' },
    { key: 'building',            label: 'Building Permit' },
    { key: 'precon',              label: 'Pre-Con Scheduled' },
    { key: 'start',               label: 'Start Date Given' },
    { key: 'demo_footings',       label: 'Demo and Footings' },
    { key: 'footing_insp',        label: 'Footing Inspection Completed' },
    { key: 'materials',           label: 'Material Ordered' },
    { key: 'roof',                label: 'Roof Complete' },
    { key: 'rough_electrical',    label: 'Rough Electrical Complete' },
    { key: 'rough_building_insp', label: 'Rough Building Inspection' },
    { key: 'rough_elec_insp',     label: 'Rough Electrical Inspection' },
    { key: 'carpentry',           label: 'Carpentry Finish' },
    { key: 'paint',               label: 'Paint Completed' },
    { key: 'electrical_finish',   label: 'Electrical Finish' },
    { key: 'final_insp',          label: 'Final Inspection' },
    { key: 'punch',               label: 'Punch List' },
    { key: 'closed',              label: 'Job Closed' },
  ],
  porch_ground_windows: [
    { key: 'hoa',                 label: 'HOA Approval' },
    { key: 'zoning',              label: 'Zoning Permit' },
    { key: 'building',            label: 'Building Permit' },
    { key: 'precon',              label: 'Pre-Con Scheduled' },
    { key: 'start',               label: 'Start Date Given' },
    { key: 'demo_footings',       label: 'Demo and Footings' },
    { key: 'footing_insp',        label: 'Footing Inspection Completed' },
    { key: 'materials',           label: 'Material Ordered' },
    { key: 'roof',                label: 'Roof Complete' },
    { key: 'rough_electrical',    label: 'Rough Electrical Complete' },
    { key: 'rough_building_insp', label: 'Rough Building Inspection' },
    { key: 'rough_elec_insp',     label: 'Rough Electrical Inspection' },
    { key: 'carpentry',           label: 'Carpentry Finish' },
    { key: 'paint',               label: 'Paint Completed' },
    { key: 'electrical_finish',   label: 'Electrical Finish' },
    { key: 'window_delivery',     label: 'Window Delivery' },
    { key: 'windows_glass',       label: 'Windows, Doors and Glass Installed' },
    { key: 'final_insp',          label: 'Final Inspection' },
    { key: 'punch',               label: 'Punch List' },
    { key: 'closed',              label: 'Job Closed' },
  ],
  porch_over_deck: [
    { key: 'hoa',                 label: 'HOA Approval' },
    { key: 'zoning',              label: 'Zoning Permit' },
    { key: 'building',            label: 'Building Permit' },
    { key: 'precon',              label: 'Pre-Con Scheduled' },
    { key: 'start',               label: 'Start Date Given' },
    { key: 'demo_footings',       label: 'Demo and Footings' },
    { key: 'footing_insp',        label: 'Footing Inspection Completed' },
    { key: 'floor_framing_insp',  label: 'Floor Framing Inspection' },
    { key: 'install_decking',     label: 'Install Decking' },
    { key: 'roof_framing',        label: 'Roof Framing Complete' },
    { key: 'rough_electrical',    label: 'Rough Electrical Complete' },
    { key: 'rough_building_insp', label: 'Rough Building Inspection' },
    { key: 'rough_elec_insp',     label: 'Rough Electrical Inspection' },
    { key: 'carpentry',           label: 'Carpentry Finish' },
    { key: 'paint',               label: 'Paint Completed' },
    { key: 'electrical_finish',   label: 'Electrical Finish' },
    { key: 'final_insp',          label: 'Final Inspection' },
    { key: 'punch',               label: 'Punch List' },
    { key: 'closed',              label: 'Job Closed' },
  ],
  porch_over_deck_windows: [
    { key: 'hoa',                 label: 'HOA Approval' },
    { key: 'zoning',              label: 'Zoning Permit' },
    { key: 'building',            label: 'Building Permit' },
    { key: 'precon',              label: 'Pre-Con Scheduled' },
    { key: 'start',               label: 'Start Date Given' },
    { key: 'demo_footings',       label: 'Demo and Footings' },
    { key: 'footing_insp',        label: 'Footing Inspection Completed' },
    { key: 'floor_framing_insp',  label: 'Floor Framing Inspection' },
    { key: 'install_decking',     label: 'Install Decking' },
    { key: 'roof_framing',        label: 'Roof Framing Complete' },
    { key: 'rough_electrical',    label: 'Rough Electrical Complete' },
    { key: 'rough_building_insp', label: 'Rough Building Inspection' },
    { key: 'rough_elec_insp',     label: 'Rough Electrical Inspection' },
    { key: 'carpentry',           label: 'Carpentry Finish' },
    { key: 'paint',               label: 'Paint Completed' },
    { key: 'electrical_finish',   label: 'Electrical Finish' },
    { key: 'window_delivery',     label: 'Window Delivery' },
    { key: 'windows_glass',       label: 'Windows, Doors and Glass Installed' },
    { key: 'final_insp',          label: 'Final Inspection' },
    { key: 'punch',               label: 'Punch List' },
    { key: 'closed',              label: 'Job Closed' },
  ],
  pergola: [
    { key: 'hoa',       label: 'HOA Approval' },
    { key: 'precon',    label: 'Pre-Con Scheduled' },
    { key: 'start',     label: 'Start Date Given' },
    { key: 'materials', label: 'Materials Ordered' },
    { key: 'demo',      label: 'Demo / Site Prep' },
    { key: 'footing',   label: 'Posts & Footings' },
    { key: 'framing',   label: 'Beam & Rafter Install' },
    { key: 'finish',    label: 'Stain / Seal' },
    { key: 'punch',     label: 'Punch List' },
    { key: 'closed',    label: 'Job Closed' },
  ],
  gazebo: [
    { key: 'hoa',        label: 'HOA Approval' },
    { key: 'building',   label: 'Building Permit' },
    { key: 'precon',     label: 'Pre-Con Scheduled' },
    { key: 'start',      label: 'Start Date Given' },
    { key: 'materials',  label: 'Materials Ordered' },
    { key: 'footing',    label: 'Foundation / Footings' },
    { key: 'framing',    label: 'Structure Complete' },
    { key: 'roof',       label: 'Roof Installed' },
    { key: 'finish',     label: 'Stain / Seal / Finish' },
    { key: 'final_insp', label: 'Final Inspection' },
    { key: 'punch',      label: 'Punch List' },
    { key: 'closed',     label: 'Job Closed' },
  ],
}

function getStages(proposal) {
  const types = proposal.contractDraft?.projectTypes || []
  const scope = [
    ...(proposal.contractDraft?.scopeBullets || []),
    ...(proposal.contractDraft?.scopeLines   || []),
  ].join(' ')
  const hasWindows = /window|glass|enclos/i.test(scope)

  const isDeckType  = types.some(t => ['Deck', 'Deck (New)', 'Deck (Resurface / Rebuild)'].includes(t))
  const isPorchType = types.some(t => ['Screened Porch', 'Open Porch', 'Ground Level Porch', 'Porch Over Deck'].includes(t))

  if (types.includes('Porch Conversion') || types.includes('Sunroom'))
    return STAGE_TEMPLATES.porch_conversion
  if (types.includes('Deck (Resurface / Rebuild)'))
    return STAGE_TEMPLATES.deck_resurface
  if (types.includes('Porch Over Deck') || (isDeckType && isPorchType))
    return hasWindows ? STAGE_TEMPLATES.porch_over_deck_windows : STAGE_TEMPLATES.porch_over_deck
  if (types.includes('Deck (New)') || types.includes('Deck'))
    return STAGE_TEMPLATES.deck_new
  if (types.includes('Ground Level Porch') || types.includes('Screened Porch') || types.includes('Open Porch'))
    return hasWindows ? STAGE_TEMPLATES.porch_ground_windows : STAGE_TEMPLATES.porch_ground
  if (types.includes('Pergola')) return STAGE_TEMPLATES.pergola
  if (types.includes('Gazebo'))  return STAGE_TEMPLATES.gazebo

  return STAGE_TEMPLATES.porch_ground
}

const CO_STATUSES = ['Pending', 'Approved', 'Rejected']
const CO_STATUS_STYLE = {
  Pending:  'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
}

// ── Change Orders tab ────────────────────────────────────────────────────────
function ChangeOrdersTab({ proposal }) {
  const { addChangeOrder, updateChangeOrder, deleteChangeOrder } = useStore()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', notes: '' })
  const cos = proposal.jobData?.changeOrders || []
  const total = cos.filter(c => c.status === 'Approved').reduce((s, c) => s + Number(c.amount || 0), 0)

  const save = () => {
    if (!form.description.trim()) return
    addChangeOrder(proposal.id, { description: form.description, amount: form.amount, notes: form.notes })
    setForm({ description: '', amount: '', notes: '' })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">Change Orders</p>
          {cos.length > 0 && <p className="text-xs text-green-700 font-medium mt-0.5">+${fmtDol(total)} approved</p>}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={13} /> New CO
        </button>
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what changed…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
            <input type="number" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <input value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {cos.length === 0 && !adding && (
        <p className="text-xs text-gray-400 italic">No change orders yet.</p>
      )}

      {cos.map(co => (
        <div key={co.id} className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 flex-1">{co.description}</p>
            <button onClick={() => { if (window.confirm('Delete this change order?')) deleteChangeOrder(proposal.id, co.id) }}
              className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">${fmtDol(co.amount)}</span>
            <select value={co.status}
              onChange={e => updateChangeOrder(proposal.id, co.id, { status: e.target.value })}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none ${CO_STATUS_STYLE[co.status]}`}>
              {CO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-gray-400">{fmtDate(co.createdAt)}</span>
          </div>
          {co.notes && <p className="text-xs text-gray-500 mt-1">{co.notes}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Daily Log tab ────────────────────────────────────────────────────────────
function DailyLogTab({ proposal }) {
  const { addDailyLog, deleteDailyLog } = useStore()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: today(), crew: '', weather: '', notes: '' })
  const logs = proposal.jobData?.dailyLogs || []

  const save = () => {
    if (!form.notes.trim()) return
    addDailyLog(proposal.id, { date: form.date, crew: form.crew, weather: form.weather, notes: form.notes })
    setForm({ date: today(), crew: '', weather: '', notes: '' })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">{logs.length} log{logs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={13} /> Add log
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Crew Size</label>
              <input value={form.crew} onChange={e => setForm(f => ({ ...f, crew: e.target.value }))}
                placeholder="e.g. 3 men"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Weather</label>
            <input value={form.weather} onChange={e => setForm(f => ({ ...f, weather: e.target.value }))}
              placeholder="e.g. Sunny 78°F"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Progress Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What was accomplished today…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {logs.length === 0 && !adding && <p className="text-xs text-gray-400 italic">No daily logs yet.</p>}

      {logs.map(log => (
        <div key={log.id} className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-700">{fmtDate(log.date)}</span>
              {log.crew && <span className="text-xs text-gray-500">👷 {log.crew}</span>}
              {log.weather && <span className="text-xs text-gray-500">🌤 {log.weather}</span>}
            </div>
            <button onClick={() => deleteDailyLog(proposal.id, log.id)}
              className="text-gray-300 hover:text-red-500 shrink-0"><X size={13} /></button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.notes}</p>
        </div>
      ))}
    </div>
  )
}

// ── Warranty tab ─────────────────────────────────────────────────────────────
function WarrantyTab({ proposal }) {
  const { addWarrantyItem, updateWarrantyItem } = useStore()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ description: '', reportedDate: today() })
  const items = proposal.jobData?.warrantyItems || []

  const save = () => {
    if (!form.description.trim()) return
    addWarrantyItem(proposal.id, { description: form.description, reportedDate: form.reportedDate })
    setForm({ description: '', reportedDate: today() })
    setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">Warranty / Callbacks</p>
          {items.filter(i => i.status === 'Open').length > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">
              {items.filter(i => i.status === 'Open').length} open
            </p>
          )}
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={13} /> Log issue
        </button>
      </div>

      {adding && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Issue Description</label>
            <textarea rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the client's issue…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date Reported</label>
            <input type="date" value={form.reportedDate}
              onChange={e => setForm(f => ({ ...f, reportedDate: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors">Save</button>
            <button onClick={() => setAdding(false)} className="flex-1 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && <p className="text-xs text-gray-400 italic">No warranty items logged.</p>}

      {items.map(item => (
        <div key={item.id} className={`border rounded-xl p-3 ${item.status === 'Open' ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm text-gray-900 flex-1">{item.description}</p>
            <select value={item.status}
              onChange={e => updateWarrantyItem(proposal.id, item.id, { status: e.target.value })}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none shrink-0 ${
                item.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">Reported {fmtDate(item.reportedDate)}</p>
          {item.status === 'Open' && (
            <div className="mt-2">
              <input
                value={item.resolutionNotes || ''}
                onChange={e => updateWarrantyItem(proposal.id, item.id, { resolutionNotes: e.target.value })}
                placeholder="Resolution notes…"
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Default payment milestone templates (mirrors ContractView.jsx)
const PM_STANDARD = [
  { label: 'Schedule deposit — @ sign contract',            pct: 0.20 },
  { label: 'Start payment — Material drop / Framing Start', pct: 0.30 },
  { label: 'Roof Completion',                               pct: 0.40 },
  { label: 'Paint Applied',                                 pct: 0.05 },
  { label: 'Substantial completion payment',                pct: 0.05 },
]
const PM_UNDER20K = [
  { label: 'Schedule deposit — @ sign contract', pct: 0.20 },
  { label: 'Material drop / Framing Start',      pct: 0.40 },
  { label: 'Substantial completion payment',     pct: 0.40 },
]

function getPaymentSchedule(proposal) {
  const saved = proposal.contractDraft?.payments
  if (Array.isArray(saved) && saved.length > 0) return saved
  const base = proposal.total || 0
  return (base < 20000 ? PM_UNDER20K : PM_STANDARD).map(m => ({ ...m, amount: base * m.pct }))
}

// ── Payment Reminder Modal ───────────────────────────────────────────────────
function PaymentReminderModal({ proposal, onClose }) {
  const draft        = proposal.contractDraft || {}
  const contractNum  = draft.contractNum || `EOL${String(70000 + proposal.id).padStart(6, '0')}`
  const projectTypes = (draft.projectTypes || []).join(', ') || ''

  const schedule       = getPaymentSchedule(proposal)
  const contractBase   = proposal.total || 0
  const approvedCOs    = (proposal.jobData?.changeOrders || []).filter(co => co.status === 'Approved')
  const approvedCOTotal = approvedCOs.reduce((s, co) => s + Number(co.amount || 0), 0)
  const pendingCOs     = (proposal.jobData?.changeOrders || []).filter(co => co.status === 'Pending')

  const [selectedIdx, setSelectedIdx] = useState(null)
  const [includeCOs,  setIncludeCOs]  = useState(false)
  const [customAmt,   setCustomAmt]   = useState('')
  const [isCustom,    setIsCustom]    = useState(false)
  const [dueDate,     setDueDate]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)
  const [error,       setError]       = useState('')

  const milestoneAmt   = selectedIdx !== null ? (schedule[selectedIdx]?.amount ?? 0) : 0
  const coAddon        = includeCOs ? approvedCOTotal : 0
  const suggestedAmt   = milestoneAmt + coAddon
  const finalAmt       = isCustom ? Number(customAmt || 0) : suggestedAmt
  const milestoneLabel = selectedIdx !== null ? schedule[selectedIdx]?.label : null

  const selectMilestone = (i) => { setSelectedIdx(i); setIsCustom(false) }

  const send = async () => {
    if (!proposal.email) { setError('No email on file for this client.'); return }
    if (finalAmt <= 0)   { setError('Please select a payment milestone or enter an amount.'); return }
    setSending(true); setError('')
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:      'payment-reminder',
          toEmail:     proposal.email,
          client:      proposal.client,
          amount:      finalAmt,
          milestone:   milestoneLabel || 'Payment Due',
          dueDate,
          contractNum,
          address:     proposal.address,
          projectType: projectTypes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSent(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <p className="font-semibold text-gray-900">Send Payment Reminder</p>
            <p className="text-xs text-gray-500 mt-0.5">{proposal.client} · {contractNum}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
        </div>

        {sent ? (
          <div className="px-5 py-10 text-center">
            <CheckCircle2 size={36} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Reminder Sent!</p>
            <p className="text-sm text-gray-500 mt-1">
              Payment reminder for <strong>${fmtDol(finalAmt)}</strong> emailed to {proposal.email}
            </p>
            <button onClick={onClose} className="mt-5 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Done</button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-5">

            {/* Contract totals summary */}
            <div className={`grid gap-3 bg-gray-50 rounded-xl px-4 py-3 ${approvedCOTotal > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div>
                <p className="text-xs text-gray-400 font-medium">Contract Total</p>
                <p className="text-base font-bold text-gray-900">${fmtDol(contractBase)}</p>
              </div>
              {approvedCOTotal > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium">Approved COs</p>
                  <p className="text-base font-bold text-green-600">+${fmtDol(approvedCOTotal)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 font-medium">Grand Total</p>
                <p className="text-base font-bold text-blue-700">${fmtDol(contractBase + approvedCOTotal)}</p>
              </div>
            </div>

            {/* Milestone selector */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Payment Milestone
              </p>
              <div className="space-y-1.5">
                {schedule.map((m, i) => {
                  const isSelected = selectedIdx === i
                  return (
                    <button key={i} onClick={() => selectMilestone(i)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100'
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium leading-snug ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>{m.label}</p>
                          <p className="text-xs text-gray-400">{Math.round(m.pct * 100)}% of contract</p>
                        </div>
                      </div>
                      <p className={`text-sm font-bold shrink-0 ml-3 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                        ${fmtDol(m.amount)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Approved CO add-on toggle */}
            {approvedCOTotal > 0 && selectedIdx !== null && (
              <label className="flex items-start gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <input type="checkbox" checked={includeCOs}
                  onChange={e => { setIncludeCOs(e.target.checked); setIsCustom(false) }}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-300" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Add approved change orders to this payment</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {approvedCOs.length} CO{approvedCOs.length !== 1 ? 's' : ''} · <strong>${fmtDol(approvedCOTotal)}</strong> total
                  </p>
                  {approvedCOs.map(co => (
                    <p key={co.id} className="text-xs text-green-600 mt-0.5">· {co.description} — ${fmtDol(co.amount)}</p>
                  ))}
                </div>
              </label>
            )}

            {pendingCOs.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <p className="text-xs font-semibold text-amber-700">
                  {pendingCOs.length} pending CO{pendingCOs.length !== 1 ? 's' : ''} not included
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Approve them in the Change Orders tab first to add them here.</p>
              </div>
            )}

            {/* Amount summary + override */}
            {selectedIdx !== null && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 space-y-1.5 text-sm bg-white">
                  <div className="flex justify-between text-gray-600">
                    <span>Milestone amount</span>
                    <span className="font-medium">${fmtDol(milestoneAmt)}</span>
                  </div>
                  {includeCOs && approvedCOTotal > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>+ Approved change orders</span>
                      <span className="font-medium">${fmtDol(approvedCOTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-1">
                    <span>Suggested total</span>
                    <span className="text-blue-700 text-base">${fmtDol(suggestedAmt)}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={isCustom} onChange={e => setIsCustom(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-300" />
                    <span className="text-xs text-gray-600 font-medium">Override — enter a different amount</span>
                  </label>
                  {isCustom && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input autoFocus type="number" value={customAmt}
                        onChange={e => setCustomAmt(e.target.value)}
                        placeholder={fmtDol(suggestedAmt)}
                        className="w-full pl-7 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            {/* Final callout */}
            {finalAmt > 0 && (
              <div className="bg-blue-600 rounded-xl px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-blue-100 font-medium">Amount to bill client</p>
                <p className="text-xl font-bold text-white">${fmtDol(finalAmt)}</p>
              </div>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            {!proposal.email && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">No email address on file — add one to the original proposal first.</p>}

            <div className="flex gap-2 pb-2">
              <button onClick={send} disabled={sending || !proposal.email || finalAmt <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {sending ? 'Sending…' : <><Send size={14} /> Send Reminder</>}
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Close-Out Modal ──────────────────────────────────────────────────────────
function CloseOutModal({ proposal, onClose }) {
  const { toggleJobStage, updateJobData } = useStore()
  const draft = proposal.contractDraft || {}
  const contractNum = draft.contractNum || `EOL${String(70000 + proposal.id).padStart(6, '0')}`
  const projectTypes = (draft.projectTypes || []).join(', ') || ''

  const [completionDate, setCompletionDate] = useState(today())
  const [sendEmail, setSendEmail] = useState(true)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')

  const closeOut = async () => {
    setClosing(true); setError('')
    try {
      updateJobData(proposal.id, { completionDate, closedAt: new Date().toISOString() })
      toggleJobStage(proposal.id, 'payment')
      toggleJobStage(proposal.id, 'closed')

      if (sendEmail && proposal.email) {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'closeout',
            toEmail: proposal.email,
            client: proposal.client,
            contractNum,
            address: proposal.address,
            projectType: projectTypes,
            completionDate,
          }),
        })
      }
      onClose(true)
    } catch (e) {
      setError(e.message)
      setClosing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => onClose(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Close Out Job</p>
            <p className="text-xs text-gray-500 mt-0.5">{proposal.client} · {contractNum}</p>
          </div>
          <button onClick={() => onClose(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-1">Ready to close this job?</p>
            <p className="text-xs text-emerald-700">This will mark the job as complete and check off the Final Payment and Job Closed stages.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Completion Date</label>
            <input type="date" value={completionDate} onChange={e => setCompletionDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-300" />
            <span className="text-sm text-gray-700">
              Send close-out email to client
              {!proposal.email && <span className="text-xs text-amber-600 ml-1">(no email on file)</span>}
            </span>
          </label>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={closeOut} disabled={closing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors">
              {closing ? 'Closing…' : <><CheckCheck size={15} /> Close Job</>}
            </button>
            <button onClick={() => onClose(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildCloseOutHtml({ client, contractNum, address, projectType, completionDate }) {
  const company = 'Ebony Outdoor Living'
  const completionFormatted = completionDate
    ? new Date(completionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'recently'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td style="background:#064e3b;padding:28px 40px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${company}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#6ee7b7;">Project Complete</p>
      </td></tr>
      <tr><td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Hi ${client || 'there'},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
          We're thrilled to let you know that your project has been completed on <strong>${completionFormatted}</strong>.
          It was a pleasure working with you, and we hope you love the final result!
        </p>
        ${address ? `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Project at: ${address}</p>` : ''}
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
          If you have any questions or need anything in the future, please don't hesitate to reach out.
          We'd also love it if you could share your experience — referrals mean the world to us!
        </p>
      </td></tr>
      <tr><td style="background:#f0fdf4;padding:20px 40px;border-top:1px solid #d1fae5;">
        <p style="margin:0;font-size:12px;color:#6b7280;">
          <strong style="color:#374151;">${company}</strong> · Thank you for choosing us!
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ── Job Card ────────────────────────────────────────────────────────────────
function JobCard({ proposal }) {
  const { toggleJobStage, updateJobData } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState('stages')
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState(proposal.jobData?.notes || '')
  const [showReminder, setShowReminder] = useState(false)
  const [showCloseOut, setShowCloseOut] = useState(false)

  const jobData = proposal.jobData || {}
  const completedStages = jobData.completedStages || []
  const stages = getStages(proposal)
  const done = stages.filter(s => completedStages.includes(s.key)).length
  const pct  = Math.round((done / stages.length) * 100)
  const isClosed = completedStages.includes('closed')

  const draft = proposal.contractDraft || {}
  const contractNum   = draft.contractNum || `EOL${String(70000 + proposal.id).padStart(6, '0')}`
  const projectTypes  = (draft.projectTypes || []).join(', ') || 'Not specified'
  const coCount       = (jobData.changeOrders || []).length
  const openWarranty  = (jobData.warrantyItems || []).filter(w => w.status === 'Open').length
  const logCount      = (jobData.dailyLogs || []).length

  const saveNote = () => { updateJobData(proposal.id, { notes: noteText }); setEditingNote(false) }

  const TABS = [
    { key: 'stages',  label: 'Stages' },
    { key: 'co',      label: `Change Orders${coCount ? ` (${coCount})` : ''}` },
    { key: 'log',     label: `Daily Log${logCount ? ` (${logCount})` : ''}` },
    { key: 'warranty',label: `Warranty${openWarranty ? ` (${openWarranty})` : ''}` },
  ]

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      isClosed ? 'border-emerald-200' : pct > 0 ? 'border-blue-100' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={isClosed ? '#10b981' : pct > 0 ? '#3b82f6' : '#d1d5db'}
              strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600">{pct}%</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{proposal.client}</span>
            <span className="text-xs text-gray-400 font-mono">{contractNum}</span>
            {isClosed && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Closed</span>}
            {openWarranty > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ {openWarranty} warranty</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={10} />{proposal.address || '—'}</span>
            <span className="flex items-center gap-1"><DollarSign size={10} />${fmt(proposal.total)}</span>
            <span>{projectTypes}</span>
          </div>
          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
            <div className={`h-full rounded-full transition-all ${isClosed ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{done} of {stages.length} stages complete</p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {jobData.startDate && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CalendarDays size={10} /> {jobData.startDate}
            </span>
          )}
          <div className="flex items-center gap-1">
            {!isClosed && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setShowReminder(true) }}
                  title="Send payment reminder"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <Mail size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowCloseOut(true) }}
                  title="Close out job"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                  <CheckCheck size={13} />
                </button>
              </>
            )}
            {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
          </div>
        </div>
      </div>

      {showReminder && <PaymentReminderModal proposal={proposal} onClose={() => setShowReminder(false)} />}
      {showCloseOut && <CloseOutModal proposal={proposal} onClose={(closed) => { setShowCloseOut(false); if (closed) setExpanded(false) }} />}

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Dates */}
          <div className="flex flex-wrap gap-4 px-4 pt-4 pb-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Date</label>
              <input type="date" value={jobData.startDate || ''}
                onChange={e => updateJobData(proposal.id, { startDate: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Complete</label>
              <input type="date" value={jobData.targetDate || ''}
                onChange={e => updateJobData(proposal.id, { targetDate: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-100 px-4 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-4">
            {tab === 'stages' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stages.map(stage => {
                    const done = completedStages.includes(stage.key)
                    return (
                      <button key={stage.key} onClick={() => toggleJobStage(proposal.id, stage.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                          done
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-blue-200 hover:bg-blue-50'
                        }`}>
                        {done
                          ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                          : <Circle size={15} className="text-gray-300 shrink-0" />}
                        <span className={done ? 'line-through opacity-60' : ''}>{stage.label}</span>
                      </button>
                    )
                  })}
                </div>
                {/* Notes */}
                <div className="pt-2 border-t border-gray-100">
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
                      <textarea autoFocus value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        placeholder="Add job notes, special instructions, sub contacts…" />
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={saveNote} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                        <button onClick={() => { setNoteText(jobData.notes || ''); setEditingNote(false) }}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
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
            {tab === 'co'      && <ChangeOrdersTab proposal={proposal} />}
            {tab === 'log'     && <DailyLogTab proposal={proposal} />}
            {tab === 'warranty'&& <WarrantyTab proposal={proposal} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Jobs() {
  const proposals = useStore(s => s.proposals)
  const [filter, setFilter] = useState('active')
  const [query,  setQuery]  = useState('')

  const wonJobs = proposals.filter(p => p.status === 'Won')
  const filtered = wonJobs.filter(p => {
    const completedStages = p.jobData?.completedStages || []
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
  const closedCount = wonJobs.filter(p =>  (p.jobData?.completedStages || []).includes('closed')).length

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Stages · Change orders · Daily logs · Warranty</p>
        </div>
      </div>

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

      <div className="space-y-3">
        {filtered.map(p => <JobCard key={p.id} proposal={p} />)}
      </div>
    </div>
  )
}
