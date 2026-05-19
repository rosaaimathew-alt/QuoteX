import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Send, ChevronDown, ChevronUp, Lock, Sparkles, Loader2, X, Save, BookOpen } from 'lucide-react'
import { useStore } from '../store'
import { generatePalette, DEFAULT_BRAND_COLOR } from '../brand'

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const PROJECT_TYPES = ['Deck', 'Screened Porch', 'Sunroom', 'Pergola', 'Gazebo', 'Open Porch']

const PAYMENT_MILESTONES = [
  { label: 'Schedule deposit — @ sign contract',            pct: 0.20 },
  { label: 'Start payment — Material drop / Framing Start', pct: 0.30 },
  { label: 'Roof Completion',                               pct: 0.40 },
  { label: 'Paint Applied',                                 pct: 0.05 },
  { label: 'Substantial completion payment',                pct: 0.05 },
]

const PAYMENT_MILESTONES_UNDER20K = [
  { label: 'Schedule deposit — @ sign contract', pct: 0.20 },
  { label: 'Material drop / Framing Start',      pct: 0.40 },
  { label: 'Substantial completion payment',     pct: 0.40 },
]

// Locked disclosures — never editable
const GENERAL_NOTES = [
  { text: 'Ebony To Provide all labor, material sufficient to complete the accepted scope', bold: false },
  { text: 'Ebony to secure permits and provide owner with any required HOA submission docs', bold: false },
  { text: 'Ebony to dispose of new construction debris per this scope', bold: false },
  { text: 'One year craftsmanship warranty on new work; five years on new structure', bold: true },
  { text: "Manufacturer's lifetime warranty on pressure treated wood against rot, termite infestation", bold: true },
  { text: 'Ebony jobsign to be posted in yard for duration of project', bold: false },
  { text: 'Excavation soil will remain on-site to be removed', bold: false },
  { text: 'Cracks in concrete are normal wear and tear and are not covered by Ebony O.L. warranty', bold: false },
  { text: 'Ebony is not responsible for any landscaping that needs to be removed to complete work', bold: false },
  { text: "Ebony is not responsible for hanging swing / daybed's, TVs mounts and or any furniture setup. We'll gladly provide reference a trusted handyman", bold: false },
  { text: 'Addendums: Any change resulting in additional charges must be paid at the time of the change.', bold: false },
  { text: 'If the inspector requires engineering it will result in an additional charge.', bold: false },
  { text: 'Homeowner responsible for obtaining and paying for any required Plot survey requested by county, city, or permitting departments.', bold: false },
  { text: 'Homeowner responsible to pay any costs associated with a sub panel if it is required to complete the electrical work', bold: false },
  { text: 'Homeowner responsible to check Impervious area of the property', bold: false },
  { text: 'Homeowner responsible to call 811 to mark the utilities', bold: false, highlight: true },
  { text: 'Homeowner to provide 1 ceiling fan with downrod', bold: false, editable: true },
]

const ordinal = (n) => {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const SigBlock = ({ label, date = true }) => (
  <div className="mt-5" style={{ pageBreakInside: 'avoid' }}>
    <div className="flex gap-8 items-end">
      <div className="flex-1 border-b border-gray-500 pb-5" />
      {date && <div className="w-40 border-b border-gray-500 pb-5" />}
    </div>
    <p className="text-xs text-gray-500 mt-1">{label}{date ? ' / Date' : ''}</p>
  </div>
)

const PageBreak = () => <div style={{ pageBreakAfter: 'always' }} />

const CB = ({ checked }) => (
  <span className="inline-block w-3.5 h-3.5 border border-gray-700 mr-1 align-middle text-center text-xs leading-none">
    {checked ? 'X' : ' '}
  </span>
)

export default function ContractView() {
  const navigate           = useNavigate()
  const branding           = useStore(s => s.branding)
  const proposals          = useStore(s => s.proposals)
  const saveContractDraft  = useStore(s => s.saveContractDraft)
  const scopeExamples      = useStore(s => s.scopeExamples)
  const saveScopeExamples  = useStore(s => s.saveScopeExamples)
  const palette            = generatePalette(branding?.primaryColor || DEFAULT_BRAND_COLOR)
  const [savedAt,          setSavedAt]         = useState(null)

  const [data, setData] = useState(null)
  const [showOptional, setShowOptional] = useState(true)

  // Optional processing-form fields
  const [lotNumber,          setLotNumber]          = useState('')
  const [permitNumber,       setPermitNumber]        = useState('')
  const [hoa,                setHoa]                = useState(null)
  const [permitReq,          setPermitReq]          = useState(null)
  const [specialInstructions,setSpecialInstructions] = useState('')
  const [directions,         setDirections]          = useState('')
  const [lumberDrop,         setLumberDrop]          = useState(null)
  const [power,              setPower]              = useState(null)
  const [gateCode,           setGateCode]            = useState('')
  const [paymentMethods,     setPaymentMethods]      = useState([])
  const [otherTerms,         setOtherTerms]          = useState('')

  // Electrical spec sheet
  const [includesElectrical, setIncludesElectrical]  = useState(false)
  const [recessedSize,       setRecessedSize]        = useState('6')
  const [homePhone,          setHomePhone]            = useState('')
  const [cellPhone,          setCellPhone]            = useState('')
  const [elecItems,          setElecItems]            = useState([
    { id: 'fan',       label: 'Prewire for homeowner supplied fan',                    qty: '' },
    { id: 'outlets',   label: 'Outlets - 120 Volt',                                    qty: '' },
    { id: 'recessed',  label: 'Recessed can lighting',                                 qty: '', isRecessed: true },
    { id: 'flood',     label: 'Flood light',                                           qty: '' },
    { id: 'cable',     label: 'Cable jack and outlet combo',                           qty: '' },
    { id: 'sconces',   label: 'Prewire for homeowner supplied sconces',                qty: '' },
    { id: 'fireplace', label: 'Electric Fireplace Installation ONLY',                  qty: '' },
    { id: 'dimmer',    label: 'Dimmer switch',                                         qty: '' },
    { id: 'heater',    label: 'Provide and Install Innova Heater with Decorative Guard', qty: '' },
  ])

  // Editable scope
  const [projectSummary,  setProjectSummary]  = useState('')
  const [scopeLines,      setScopeLines]      = useState([])
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [aiError,         setAiError]         = useState('')
  const [ceilingFanNote,  setCeilingFanNote]  = useState('Homeowner to provide 1 ceiling fan with downrod')
  const [contractNum,     setContractNum]     = useState('')
  const [city,            setCity]            = useState('')
  const [showItemPicker,  setShowItemPicker]  = useState(false)
  const [pickerSelection, setPickerSelection] = useState(new Set())
  const [milestoneLabels, setMilestoneLabels] = useState([])

  const contractDocRef = useRef(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [googleAuthed,  setGoogleAuthed]  = useState(false)
  const [signing,       setSigning]       = useState(false)
  const [signResult,    setSignResult]    = useState(null)
  const [signError,     setSignError]     = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('contract')
    if (!raw) return
    const d = JSON.parse(raw)
    setData(d)

    // Check for a saved draft on the proposal
    const proposal = proposals.find(p => p.id === d.proposalId)
    const draft    = proposal?.contractDraft

    if (draft) {
      // Restore all saved state from draft
      setContractNum(draft.contractNum ?? d.contractNumber ?? '')
      setCity(draft.city ?? '')
      setLotNumber(draft.lotNumber ?? '')
      setPermitNumber(draft.permitNumber ?? '')
      setHoa(draft.hoa ?? null)
      setPermitReq(draft.permitReq ?? null)
      setSpecialInstructions(draft.specialInstructions ?? '')
      setDirections(draft.directions ?? '')
      setLumberDrop(draft.lumberDrop ?? null)
      setPower(draft.power ?? null)
      setGateCode(draft.gateCode ?? '')
      setPaymentMethods(draft.paymentMethods ?? [])
      setOtherTerms(draft.otherTerms ?? '')
      setIncludesElectrical(draft.includesElectrical ?? false)
      setRecessedSize(draft.recessedSize ?? '6')
      setHomePhone(draft.homePhone ?? '')
      setCellPhone(draft.cellPhone ?? '')
      setElecItems(draft.elecItems ?? [
        { id: 'fan',       label: 'Prewire for homeowner supplied fan',                    qty: '' },
        { id: 'outlets',   label: 'Outlets - 120 Volt',                                    qty: '' },
        { id: 'recessed',  label: 'Recessed can lighting',                                 qty: '', isRecessed: true },
        { id: 'flood',     label: 'Flood light',                                           qty: '' },
        { id: 'cable',     label: 'Cable jack and outlet combo',                           qty: '' },
        { id: 'sconces',   label: 'Prewire for homeowner supplied sconces',                qty: '' },
        { id: 'fireplace', label: 'Electric Fireplace Installation ONLY',                  qty: '' },
        { id: 'dimmer',    label: 'Dimmer switch',                                         qty: '' },
        { id: 'heater',    label: 'Provide and Install Innova Heater with Decorative Guard', qty: '' },
      ])
      setProjectSummary(draft.projectSummary ?? d.projectSummary ?? '')
      setScopeLines(draft.scopeLines ?? (d.lines || []).map((l, i) => ({
        id: l.id ?? i, name: l.name,
        text: l.description ? `${l.name} — ${l.description}` : l.name,
        price: (l.qty || 1) * (l.unitPrice || 0),
      })))
      setCeilingFanNote(draft.ceilingFanNote ?? 'Homeowner to provide 1 ceiling fan with downrod')
      setSavedAt(draft.savedAt ?? null)
      const templateMs = d.total < 20000 ? PAYMENT_MILESTONES_UNDER20K : PAYMENT_MILESTONES
      setMilestoneLabels(draft.milestoneLabels ?? templateMs.map(m => m.label))
    } else {
      // Fresh start
      setContractNum(d.contractNumber || '')
      const parts = (d.address || '').split(',')
      setCity(parts.length >= 2 ? parts[parts.length - 2]?.trim() : '')
      const templateMs = d.total < 20000 ? PAYMENT_MILESTONES_UNDER20K : PAYMENT_MILESTONES
      setMilestoneLabels(templateMs.map(m => m.label))
      setProjectSummary(d.projectSummary || '')
      if (d.isAlaCarte && (d.lines || []).length > 0) {
        // A La Carte — ask which items to include before building scope
        setPickerSelection(new Set((d.lines).map((l, i) => l.id ?? i)))
        setShowItemPicker(true)
      } else {
        setScopeLines(
          (d.lines || []).map((l, i) => ({
            id: l.id ?? i, name: l.name,
            text: l.description ? `${l.name} — ${l.description}` : l.name,
            price: (l.qty || 1) * (l.unitPrice || 0),
          }))
        )
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/google-auth/status')
      .then(r => r.json())
      .then(d => setGoogleAuthed(d.authenticated))
      .catch(() => {})
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
      setGoogleAuthed(true)
      setShowSignModal(true)
    }
  }, [])

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="mb-4">No contract data. Open the Proposal Tracker, mark a proposal as Won, then click the contract icon.</p>
        <button onClick={() => navigate('/tracker')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          Go to Tracker →
        </button>
      </div>
    )
  }

  const { client, email, phone, address, total, projectTypes = [], contractNumber, salesperson } = data
  const logo = branding?.logo || null
  const companyName = branding?.companyName || 'Ebony Outdoor Living'
  const now    = new Date()
  const today  = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const todayS = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })

  const isSmallContract = total < 40000
  const isUnder20K     = total < 20000
  const milestones     = isUnder20K ? PAYMENT_MILESTONES_UNDER20K : PAYMENT_MILESTONES
  const payments       = milestones.map((m, i) => ({
    ...m,
    label:  milestoneLabels[i] ?? m.label,
    amount: total * m.pct,
  }))

  const updateMilestoneLabel = (i, val) =>
    setMilestoneLabels(prev => prev.map((l, idx) => idx === i ? val : l))

  const toggleMethod = (m) =>
    setPaymentMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const updateLine = (id, val) =>
    setScopeLines(prev => prev.map(l => l.id === id ? { ...l, text: val } : l))

  const removeLine = (id) =>
    setScopeLines(prev => prev.filter(l => l.id !== id))

  const addLine = () =>
    setScopeLines(prev => [...prev, { id: Date.now(), name: '', text: '' }])

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/google-auth/start')
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setSignError('Could not reach the API server. Make sure it is running on port 3001.')
    }
  }

  const handleUploadToDrive = async () => {
    setSigning(true)
    setSignError('')
    setSignResult(null)
    try {
      const { toCanvas } = await import('html-to-image')
      const { default: jsPDF } = await import('jspdf')

      const LETTER_PX = 816
      const original  = contractDocRef.current
      const overlay   = document.createElement('div')
      overlay.style.cssText = `position:fixed;top:0;left:0;z-index:99999;width:${LETTER_PX}px;opacity:0;pointer-events:none;`
      const clone = original.cloneNode(true)
      clone.style.cssText = `width:${LETTER_PX}px;max-width:${LETTER_PX}px;margin:0;border-radius:0;box-shadow:none;overflow:visible;`
      clone.querySelectorAll('.no-print').forEach(el => el.remove())
      overlay.appendChild(clone)
      document.body.appendChild(overlay)
      await new Promise(r => setTimeout(r, 200))

      const canvas  = await toCanvas(clone, { pixelRatio: 2, backgroundColor: '#ffffff' })
      document.body.removeChild(overlay)

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
      const pageW   = pdf.internal.pageSize.getWidth()
      const pageH   = pdf.internal.pageSize.getHeight()
      const imgW    = pageW
      const imgH    = (canvas.height * pageW) / canvas.width
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH)
        y += pageH
      }
      const pdfBase64 = pdf.output('datauristring').split(',')[1]
      const clientName = data?.client || 'Client'
      const fileName   = `Contract-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, fileName }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Upload failed')
      setSignResult(result)
    } catch (err) {
      setSignError(err.message)
    } finally {
      setSigning(false)
    }
  }

  const fillFromPastContracts = () => {
    if (!scopeExamples.length) return
    const score = (itemName, ex) => {
      const a = itemName.toLowerCase()
      const b = (ex.itemName || '').toLowerCase()
      if (a === b) return 100
      const words = a.split(/\s+/).filter(w => w.length > 2)
      return words.filter(w => b.includes(w)).length / Math.max(words.length, 1)
    }
    setScopeLines(prev => prev.map(line => {
      const best = scopeExamples
        .map(ex => ({ ex, s: score(line.name || line.text, ex) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => {
          if (b.s !== a.s) return b.s - a.s
          return new Date(b.ex.savedAt) - new Date(a.ex.savedAt)
        })[0]
      return best ? { ...line, text: best.ex.bulletText } : line
    }))
  }

  const generateSuggestions = async () => {
    if (!data?.lines?.length) return
    setIsGenerating(true)
    setAiError('')
    try {
      const itemList = (data.lines || []).map(l =>
        `- ${l.name}${l.description ? ': ' + l.description : ''}${l.qty && l.unit ? ` (${l.qty} ${l.unit})` : ''}`
      ).join('\n')

      // Retrieve past scope examples that match any of the current line items
      const findRelevant = (itemName) => {
        const words = itemName.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        return scopeExamples
          .filter(ex => words.some(w => ex.itemName?.toLowerCase().includes(w) || ex.bulletText?.toLowerCase().includes(w)))
          .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
          .slice(0, 2)
      }
      const seen = new Set()
      const relevant = (data.lines || []).flatMap(l => findRelevant(l.name))
        .filter(ex => { if (seen.has(ex.id)) return false; seen.add(ex.id); return true })
        .slice(0, 10)

      const styleContext = relevant.length > 0
        ? `\n\nIMPORTANT — You have written scope bullets for this contractor before. Study these EXACT past examples and match the writing style, line breaks, indentation, and level of detail PRECISELY. Replicate how sentences are broken up, what details are included, and any multi-line formatting:\n\n${
            relevant.map(ex => `[${ex.itemName}]\n${ex.bulletText}`).join('\n\n')
          }\n\nWrite the new bullets in this SAME style.`
        : ''

      const res = await fetch('/api/ai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [
            {
              role: 'system',
              content: `You are a professional scope of work writer for Ebony Outdoor Living, an outdoor construction company specializing in decks, porches, pergolas, sunrooms, and outdoor structures. Write clear, professional, complete scope of work bullet points.${styleContext}`,
            },
            {
              role: 'user',
              content: `Below are line items from an accepted proposal. For each item, write ONE professional scope of work bullet point describing the work to be performed. Use complete sentences and professional construction language. Be specific about materials and installation methods where relevant.\n\nReturn ONLY the bullet points, one per line, starting with "- ". Output exactly ${(data.lines || []).length} bullets in the same order.\n\nProposal line items:\n${itemList}`,
            },
          ],
          stream: false,
        }),
      })
      if (res.status === 503) throw new Error('Ollama is not running — open the Ollama app or run "ollama serve" in Terminal.')
      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText)
        throw new Error(`AI error (${res.status}): ${err}`)
      }
      const aiData = await res.json()
      const text   = aiData.choices[0].message.content
      const bullets = text.split('\n')
        .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
        .filter(l => l.length > 0)
      setScopeLines(prev => prev.map((line, i) => ({
        ...line,
        text: bullets[i] || line.text,
      })))
    } catch (err) {
      setAiError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const METHODS = ['Electronic Wire Transfer / ACH', 'Cash', 'Check', 'Zelle']

  // ─── Document styles ───────────────────────────────────────────
  const docStyle = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize:   '10.5pt',
    lineHeight: '1.55',
    color:      '#1a1a1a',
  }
  const bodyPad = 'px-12 py-6'

  return (
    <div className="min-h-screen bg-gray-100">


      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/tracker')} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={15} /> Back to Tracker
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium shrink-0">City / Town</label>
            <input
              className="border border-gray-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Charlotte"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium shrink-0">Contract #</label>
            <input
              className="border border-gray-300 rounded px-2 py-1 text-sm font-mono w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={contractNum}
              onChange={e => setContractNum(e.target.value)}
              placeholder="e.g. EOL070308"
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (!data?.proposalId) return
            saveContractDraft(data.proposalId, {
              contractNum, city, lotNumber, permitNumber, hoa, permitReq,
              specialInstructions, directions, lumberDrop, power, gateCode,
              paymentMethods, otherTerms, includesElectrical, recessedSize,
              homePhone, cellPhone, elecItems, projectSummary, scopeLines,
              ceilingFanNote, milestoneLabels,
            })
            // Learn from scope bullets written for this contract
            const examples = scopeLines
              .filter(l => l.text?.trim())
              .map(l => ({ itemName: l.name || l.text.split('\n')[0].slice(0, 60), bulletText: l.text }))
            if (examples.length > 0) saveScopeExamples(data.proposalId, examples)
            setSavedAt(new Date().toISOString())
          }}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          <Save size={14} /> Save Draft
        </button>
        {savedAt && (
          <span className="text-xs text-gray-400">
            Saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Printer size={14} /> Print / Save PDF
        </button>
        <button
          onClick={() => { setSignResult(null); setSignError(''); setShowSignModal(true) }}
          style={{ background: '#16a34a', color: '#fff', borderRadius: '8px', padding: '6px 16px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none' }}
        >
          <Send size={14} /> Send for Signature
        </button>
      </div>

      {/* ── A La Carte Item Picker Modal ─────────────────────────────── */}
      {showItemPicker && data && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">A La Carte</span>
                <h2 className="text-base font-bold text-gray-900">Select Items to Include in Contract</h2>
              </div>
              <p className="text-sm text-gray-500">This proposal has multiple options — uncheck any items that will <strong>not</strong> be part of this contract (e.g. flooring options the client didn't choose).</p>
            </div>

            {/* Item list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
              {(data.lines || []).map((line, i) => {
                const id = line.id ?? i
                const checked = pickerSelection.has(id)
                const price = (line.qty || 1) * (line.unitPrice || 0)
                return (
                  <label key={id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${checked ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setPickerSelection(prev => {
                        const next = new Set(prev)
                        if (next.has(id)) next.delete(id); else next.add(id)
                        return next
                      })}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${checked ? 'text-gray-900' : 'text-gray-400'}`}>{line.name}</p>
                      {line.description && <p className="text-xs text-gray-400 truncate">{line.description}</p>}
                    </div>
                    <p className={`text-sm font-semibold shrink-0 ${checked ? 'text-gray-800' : 'text-gray-300'}`}>${fmt(price)}</p>
                  </label>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{pickerSelection.size} of {(data.lines || []).length} items selected</span>
                <button
                  onClick={() => setPickerSelection(new Set((data.lines || []).map((l, i) => l.id ?? i)))}
                  className="text-xs text-blue-600 hover:underline"
                >Select all</button>
                <button
                  onClick={() => setPickerSelection(new Set())}
                  className="text-xs text-gray-400 hover:underline"
                >Clear all</button>
              </div>
              <button
                disabled={pickerSelection.size === 0}
                onClick={() => {
                  const selected = (data.lines || []).filter((l, i) => pickerSelection.has(l.id ?? i))
                  setScopeLines(selected.map((l, i) => ({
                    id: l.id ?? i, name: l.name,
                    text: l.description ? `${l.name} — ${l.description}` : l.name,
                    price: (l.qty || 1) * (l.unitPrice || 0),
                  })))
                  setShowItemPicker(false)
                }}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Selection →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Draft restored banner ────────────────────────────────────── */}
      {savedAt && (
        <div className="no-print max-w-4xl mx-auto mt-4 px-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm text-emerald-700 flex items-center gap-2">
            <Save size={13} />
            Draft last saved {new Date(savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} — all your edits have been restored.
          </div>
        </div>
      )}

      {/* ── Optional fields panel ─────────────────────────────────── */}
      <div className="no-print max-w-4xl mx-auto mt-6 mb-2 px-4">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowOptional(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">Optional Fields &amp; Processing Info</span>
            {showOptional ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {showOptional && (
            <div className="px-5 pb-5 border-t border-gray-100 grid grid-cols-2 gap-4 pt-4">

              {/* Payment method */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Payment Method</label>
                <div className="flex gap-2 flex-wrap">
                  {METHODS.map(m => (
                    <button key={m} onClick={() => toggleMethod(m)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        paymentMethods.includes(m)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other terms */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Other Terms <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={otherTerms} onChange={e => setOtherTerms(e.target.value)} placeholder="Any additional contract terms…" />
              </div>

              {/* Lot & Permit */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Lot # <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Permit # <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={permitNumber} onChange={e => setPermitNumber(e.target.value)} />
              </div>

              {/* HOA & Permit required */}
              {[['HOA', hoa, setHoa], ['Permit Required', permitReq, setPermitReq]].map(([label, val, setter]) => (
                <div key={label}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">{label}</label>
                  <div className="flex gap-2">
                    {['yes','no'].map(v => (
                      <button key={v} onClick={() => setter(p => p === v ? null : v)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${val === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                        {v.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Special instructions & directions */}
              {[
                ['Special Instructions', specialInstructions, setSpecialInstructions],
                ['Directions to Job Site', directions, setDirections],
              ].map(([label, val, setter]) => (
                <div key={label} className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">{label} <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={val} onChange={e => setter(e.target.value)} />
                </div>
              ))}

              {/* Lumber drop & power */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Lumber Drop</label>
                <div className="flex gap-2">
                  {[['on','On driveway'],['off','Off driveway']].map(([v, label]) => (
                    <button key={v} onClick={() => setLumberDrop(p => p === v ? null : v)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${lumberDrop === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Power Available</label>
                <div className="flex gap-2">
                  {['yes','no'].map(v => (
                    <button key={v} onClick={() => setPower(p => p === v ? null : v)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${power === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gate code */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Gate Code <span className="font-normal text-gray-400">(optional)</span></label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  value={gateCode} onChange={e => setGateCode(e.target.value)} />
              </div>

              {/* Electrical work toggle */}
              <div className="col-span-2 border-t border-gray-100 pt-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Includes Electrical Work?</label>
                <div className="flex gap-2 mb-3">
                  {['yes','no'].map(v => (
                    <button key={v} onClick={() => setIncludesElectrical(v === 'yes')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        (v === 'yes') === includesElectrical
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'bg-white text-gray-600 border-gray-300'
                      }`}>
                      {v.toUpperCase()}
                    </button>
                  ))}
                </div>
                {includesElectrical && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Home Phone <span className="font-normal text-gray-400">(optional)</span></label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={homePhone} onChange={e => setHomePhone(e.target.value)} placeholder={phone} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Cell Phone <span className="font-normal text-gray-400">(optional)</span></label>
                      <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        value={cellPhone} onChange={e => setCellPhone(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Scope edit note */}
              <div className="col-span-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
                <span className="mt-0.5">✏️</span>
                <span>Scope of Work bullets below are editable — click any line to refine the wording before printing or sending.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CONTRACT PACKAGE
      ══════════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto my-6 px-4 pb-16">
        <div ref={contractDocRef} className="bg-white shadow-lg print:shadow-none" style={docStyle}>

          {/* ── PAGE 1 · Contract opening + payment schedule ─────── */}
          <div className={bodyPad}>
            <div className="flex justify-between items-start mb-1">
              <div>
                {logo
                  ? <img src={logo} alt="logo" className="h-14 object-contain mb-1" />
                  : <div className="text-xl font-black tracking-widest leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>{companyName}</div>
                }
                <div className="text-2xl font-bold mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>CONTRACT</div>
              </div>
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt' }}>
                <strong>Contract # </strong>{contractNum}
              </div>
            </div>
            <div className="border-b-2 border-gray-900 mb-5" />

            <p className="mb-4 text-justify">
              THIS CONTRACT made effective on the <strong>{ordinal(now.getDate())}</strong> day of <strong>{now.toLocaleDateString('en-US',{month:'long'})}, {now.getFullYear()}</strong> In City of <strong>{city || '___________'}</strong> and the State of <strong>North Carolina</strong> by and Between <strong>{client}</strong> (PURCHASER), At <strong>{address}</strong> and <strong>Ebony Outdoor Living</strong> (BUILDER), for work to be performed at <strong>{address}</strong> (the PREMISES) in accordance with the written terms and specifications of this CONTRACT (the WORK). THE WORK shall include the following:
            </p>

            <p className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
              {PROJECT_TYPES.map(t => (
                <span key={t}><CB checked={(projectTypes).includes(t)} />{t}</span>
              ))}
            </p>
            <p className="mb-1">( &nbsp; ) Other _______________________________________________________________________________</p>
            <div className="border-b border-gray-300 mb-4 mt-2" />

            <p className="mb-3 text-justify">
              <strong>1.</strong> BUILDER shall furnish the services and material for performance of the WORK on the PREMISES described on the SCOPE OF WORK each attached to and made part of this CONTRACT, for and in consideration of the payment to BUILDER by the PURCHASER of <strong>${fmt(total)}</strong> for the WORK. Together with any amounts set forth in any addenda hereto (TOTAL CONTRACT SUM).
            </p>

            <p className="mb-1"><strong>2.</strong> THE TOTAL CONTRACT SUM shall be paid to BUILDER as follows:</p>

            <p className="mb-1 font-bold">
              <input
                className="no-print bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-400 focus:outline-none font-bold text-sm py-0.5 transition-colors w-80"
                value={payments[0]?.label ?? ''}
                onChange={e => updateMilestoneLabel(0, e.target.value)}
              />
              <span className="print-only">{payments[0]?.label}</span>
              {' '}${fmt(payments[0]?.amount ?? 0)}
            </p>
            <p className="mb-2 font-bold">Progress Payments:</p>
            <table className="w-full text-sm mb-3">
              <tbody>
                {payments.slice(1).map((p, i) => (
                  <tr key={i}>
                    <td className="pr-4 pb-1.5 font-semibold w-36">${fmt(p.amount)}</td>
                    <td className="pb-1.5 border-b border-gray-400 w-full">
                      <input
                        className="no-print w-full bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-400 focus:outline-none text-sm py-0.5 transition-colors"
                        value={p.label}
                        onChange={e => updateMilestoneLabel(i + 1, e.target.value)}
                      />
                      <span className="print-only">{p.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mb-3">
              Down payment by{' '}
              {METHODS.map(m => <span key={m} className="mr-3"><CB checked={paymentMethods.includes(m)} />{m}</span>)}
            </p>

            <p className="mb-4">
              <strong>3. OTHER TERMS:</strong> {otherTerms || <span className="inline-block w-80 border-b border-gray-400">&nbsp;</span>}
            </p>

            <p className="mb-3 text-justify text-sm">
              <strong>4.</strong> THE Down Payment may be used to purchase material necessary for performance of the WORK. BUILDER shall be entitled to final payment upon substantial completion of the WORK. The WORK is substantially complete when all items described in this CONTRACT have been constructed or installed. Substantial completion shall not include adjustment, repair, replacement or cleaning of any item so constructed or installed or final inspection by code official. PURCHASER shall be entitled to one punch list prior to final payment. Requests for adjustment, repair, replacement or cleaning of any constructed or installed item shall not be cause for delay of final payment, but rather shall be considered warranty items. After five business days from substantial completion, the unpaid balance of the TOTAL CONTRACT SUM may be subject to interest charges as allowed by applicable state law. PURCHASER acknowledges and agrees that this CONTRACT shall serve as the invoice for the TOTAL CONTRACT SUM and that no additional invoice will be provided to PURCHASER for any part thereof.
            </p>

            <p className="text-sm text-justify">
              <strong>5.</strong> Modification to the WORK or CONTRACT will be made only when a written addendum describing such modification has been signed by both PURCHASER and BUILDER. There may be an additional charge for any changes.
            </p>

          {/* ── PAGE 2 · Clauses 6-9 + Signature Block 1 ──────────── */}
            <p className="mb-3 text-justify text-sm"><strong>6. a.</strong> The WORK will be warranted by BUILDER. Existing structures to which the WORK may be affixed or interconnected are not part of the WORK and will not be covered under the Warranty. This Warrant is issued to and only applicable to the PURCHASER after payment in full of the TOTAL CONTRACT SUM.</p>
            {!isSmallContract && (
              <p className="mb-3 text-justify text-sm"><strong>B.</strong> As General contractors we have <strong>All-In-One Solutions</strong> that operate as part of Ebony Outdoor Living team. All-In-One Solutions serves as the licensed General Contractor and is responsible for maintaining the applicable licenses and overall legal and regulatory compliance required for the project. All-In-One Solutions also acts as a general supervisor of the project, performing occasional site visits during the progress of the work for purposes of overall oversight and supervision. However, All-In-One Solutions is not involved in the daily management of the job site, operational coordination of crews, or direct execution of the services.</p>
            )}
            <p className="mb-4 text-sm"><strong>7.</strong> This CONTRACT shall not be effective and binding upon BUILDER until countersigned by BUILDER and GENERAL CONTRACTOR.</p>
            <p className="text-center font-bold mb-3">ADDITIONAL TERMS ON NEXT PAGE</p>

            {isSmallContract ? (
              /* ── Under $40K: PURCHASER (2 lines) + BUILDER only, no GC ── */
              <div className="grid grid-cols-2 gap-8 mt-2" style={{ pageBreakInside: 'avoid' }}>
                <div>
                  <p className="font-bold underline mb-2">PURCHASER</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Print Name)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500">(Print Name)</p>
                </div>
                <div>
                  <p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500">(Print Name)</p>
                </div>
              </div>
            ) : (
              /* ── Over $40K: PURCHASER + BUILDER + GC ── */
              <div className="grid grid-cols-2 gap-8 mt-2" style={{ pageBreakInside: 'avoid' }}>
                <div>
                  <p className="font-bold underline mb-2">PURCHASER</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500">(Print Name)</p>
                </div>
                <div>
                  <p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500 mb-3">(Print Name)</p>
                  <p className="font-bold mt-2">GENERAL CONTRACTOR: ALL IN ONE SOLUTIONS</p>
                  <div className="border-b border-gray-500 mb-1 pb-5 mt-2" /><p className="text-xs text-gray-500 mb-2">(Signature)</p>
                  <div className="border-b border-gray-500 mb-1 pb-5" /><p className="text-xs text-gray-500">(Print Name)</p>
                </div>
              </div>
            )}

            <p className="mt-3 text-sm underline">115 Unionville Indian Trail Road, Indian Trail, NC 28079 Unit B15</p>
            <p className="text-xs text-gray-500 mb-3">(Builder Address)</p>

            <p className="mb-3 text-justify text-sm"><strong>8.</strong> BUILDER shall obtain applicable permits and inspections. Unless agreed otherwise in writing signed by the parties, or required by local code to be provided by BUILDER, PURCHASER shall be responsible for any additional approvals and processes (such as homeowner associations, special tax district, wetlands, endangered species, variances, or historic preservation). PURCHASER shall provide BUILDER with an accurate plat of PURCHASER's property.</p>
            <p className="text-justify text-sm"><strong>9.</strong> PURCHASER shall provide sufficient electricity for the continuous operation of BUILDER's equipment. There may be an additional charge if BUILDER is required to provide electricity.</p>

          {/* ── PAGE 3 · Clauses 10-18 ─────────────────────────────── */}
            {[
              ['10. a.', "PURCHASER agrees that should BUILDER encounter unforeseen site conditions on the PREMISES (including for example unsound roof shingles, buried storage tanks, solid rock, high water table, unsound house framing, or unsound or uncompacted soil conditions all the footing depth described on the Ebony Outdoor Living Specification Sheet, etc.) which would substantially interfere with BUILDER's completion of the WORK, BUILDER may require that PURCHASER and BUILDER execute an addendum to this CONTRACT describing the additional work that must be performed and setting forth the price at which BUILDER will perform such additional work. BUILDER shall not be obligated to continue the WORK if an addendum is not executed, if, in BUILDER's sole judgment, continuing the WORK as specified herein without any modifications would cause such WORK to not meet applicable local building code requirements or not meet BUILDER's construction standards."],
              ['b.', "PURCHASER agrees that BUILDER shall not be responsible for unforeseen site conditions on the PREMISES discovered or occurring after completion of the WORK."],
              ['c.', 'PURCHASER shall mark the location of underground drain lines, sprinkler systems, septic tanks, septic fields or other obstructions.'],
              ['11.', "BUILDER is not responsible or liable for delays in the commencement or completion of the WORK that are result of conditions beyond BUILDER's control (including for example weather, strikes, supplier's inability to obtain materials, or a third party's inability to comply with the terms of this CONTRACT, etc.). If PURCHASER fails to make a scheduled progress payment, BUILDER may elect to postpone its performance of the WORK and schedule continuance of the WORK at its discretion after receipt of all due and payable progress payments. Delays caused by such events do not constitute abandonment and are not included in calculating time frames for payment or performance. PURCHASER has the right to terminate CONTRACT upon BUILDER default. Default means unreasonable delay, poor/defective work, consistent failure to perform according to schedule, failure to pay subcontractors, use of inferior material, failure to communicate."],
              ['12.', 'If described as part of the WORK, this CONTRACT includes the cost of installing utility hardware or fixtures (including for example telephone and cable jacks, lights, ceiling fans, and electrical outlets). Relocation of utility services (such as wires, piping, cables, and equipment) by the utility company(ies) may be necessary, and PURCHASER shall be responsible for such costs. PURCHASER agrees to allow BUILDER to schedule and coordinate such relocation of utility services as needed.'],
              ['13.', 'Unless specifically set forth in the description of the WORK, BUILDER shall not move or dispose of soil excavated while performing the WORK. Additionally, PURCHASER acknowledges that there may be damage to or disfiguration of the turf in and about the area of the WORK and the location of the storage of materials due to foot traffic, machinery, storage of materials, or otherwise.'],
              ['14. a.', "PURCHASER acknowledges and agrees that all drawings, plans, sketches, renderings, models and designs remain the sole property of BUILDER, and BUILDER reserves the right to use such materials in any manner it shall deem appropriate. BUILDER retains copyright in all drawings, plans, sketches, renderings, models and designs created pursuant to the CONTRACT. All documents created for this purpose of constructing or installing the WORK remain the property of the BUILDER and are not a part of this CONTRACT. BUILDER further reserves the exclusive right to use photographs, drawings, and representations of the completed project in its advertising and marketing efforts."],
              ['b.', 'PURCHASER acknowledges that the services to be provided by BUILDER hereunder are limited to construction services and shall not include any architectural or engineering services.'],
              ['C.', 'PURCHASER acknowledges that technical field changes shall not constitute a modification to the WORK, and may be made by BUILDER to ensure that the WORK is performed in compliance with applicable codes regulations, or BUILDER construction standards.'],
              ['15.', "PURCHASER agrees that materials required for the completion of the WORK be delivered and stored at the PREMISES at a location reasonably determined by BUILDER to be efficient for the purpose of construction of the WORK. PURCHASER further agrees that any material not required for completion of the WORK shall, notwithstanding delivery to or storage at the PREMISES, be and remain the sole property of BUILDER, and PURCHASER shall not have any right or interest therein."],
              ['16.', "PURCHASER recognizes and acknowledges that during the performance of the WORK, certain hazardous conditions could exist in the area of the WORK. BUILDER agrees to take all reasonable steps necessary to make such conditions known and obvious to PURCHASER and to prevent PURCHASER and others from entering hazardous areas. PURCHASER shall indemnify and hold BUILDER harmless from any liability, damage, claim or expense arising out of the PURCHASER's or a third party's disregard of a clear, open and obvious danger in the WORK area."],
              ['17.', "BUILDER is independently owned. PURCHASER acknowledges and agrees that this CONTRACT is made solely with BUILDER."],
              ['18.', 'If any provision, sentence, phrase or word of this CONTRACT or the application thereof to any person or circumstance shall be held invalid, the remainder of the CONTRACT, or the application of such provision, sentence, phrase or word to persons or circumstances other than those as to which it is held invalid shall not be affected thereby.'],
            ].map(([num, text]) => (
              <p key={num} className="mb-3 text-justify text-sm"><strong>{num}</strong> {text}</p>
            ))}

          {/* ── PAGE 4 · Clauses 19-22 + final sigs ───────────────── */}
            <p className="mb-3 text-justify text-sm"><strong>19.</strong> This CONTRACT is made and shall be construed under the laws of the State set forth in the first paragraph hereof. Except as set forth below, if any controversy or claim arises out of or relates to this CONTRACT, or the breach thereof, and if said controversy or claim cannot be settled through direct discussions, the parties agree to first endeavor to settle the controversy or claim in an amicable manner by mediation administered by the American Arbitration Association under its Construction Industry Mediation Rules, before resorting to arbitration. Thereafter, any unresolved controversy or claim arising out of or relating to this CONTRACT, or breach thereof, shall be settled by arbitration administered by the American Arbitration Association in accordance with its Construction Industry Arbitration Rules, and judgment upon the award rendered by the arbitrator(s) may be entered in any court having jurisdiction thereof. The parties may agree to mediation and arbitration by the Better Business Bureau (if applicable) in lieu of the foregoing. It is further agreed that any efforts by BUILDER to collect the TOTAL CONTRACT SUM or any part thereof will not be subject to the mediation and arbitration provisions set forth above. PURCHASER will pay any collection expense, court costs, and reasonable attorney's fees which may be incurred in such collection efforts. PURCHASER hereby waives any and all rights PURCHASER may have to a jury in any suit hereunder.</p>
            <p className="mb-3 text-justify text-sm"><strong>20.</strong> Should PURCHASER fail to fulfill its obligations under this CONTRACT in addition to any other remedy at law or in equity that BUILDER may have or otherwise provided herein, BUILDER may retain as liquidated damages and not as a penalty, all consideration paid by PURCHASER to BUILDER, including, but not limited to the Down Payment referenced above.</p>
            <p className="mb-3 text-justify text-sm"><strong>21.</strong> BUILDER'S failure to exercise a right or remedy, or BUILDER's acceptance of a partial or delinquent payment, will not operate as a waiver of any of BUILDER's rights, or PURCHASER's obligations, under this CONTRACT and will not constitute a waiver of BUILDER's right to declare an immediate or a subsequent default of this CONTRACT.</p>
            <p className="mb-4 text-justify text-sm"><strong>22.</strong> This CONTRACT contains the entire understanding and agreement between the parties with respect to the WORK and supersedes all prior or contemporaneous written and oral agreements and understandings with respect to the subject matter hereof. NO ORAL PROMISES OR AGREEMENTS ARE A PART OF THIS CONTRACT.</p>

            <SigBlock label="Client Signature" />
            <SigBlock label="Builder Signature" />
            {!isSmallContract && <SigBlock label="GC Signature" />}
          </div>
          <PageBreak />

          {/* ── PAGE 5 · Scope & Payment Clarification ─────────────── */}
          <div className={bodyPad}>
            <h2 className="text-center font-bold text-base mb-5">SCOPE OF WORK &amp; FINAL PAYMENT CLARIFICATION</h2>
            <p className="text-sm mb-3">Ebony Outdoor Living and All in one Solutions's aim for customer service as our #1 priority. In order to provide you with the best possible customer experience, we are fully committed to providing you with <strong>everything</strong> written in the scope of work, specifications, and drawing.</p>
            <ul className="text-sm space-y-2 mb-5 ml-2">
              {[
                'In the event that the project proposed by Ebony Outdoor Living is not approved by the Homeowners Association (HOA) or local zoning authorities, the deposit paid by the customer shall be returned in full, minus any fees incurred by Ebony Outdoor Living and All in one Solutions related to the processing or submission of the project for approval.',
                'In the rare case there is a dispute with what we are obligated to provide, both parties agree to revert to only what is written in scope of work, specifications, and/or drawing.',
                'Any work requested on behalf of the customer that is not covered in the scope of work, specifications, and/or drawing may be added through an addendum at a signed agreed specification form upon additional cost paid at the time of addendum.',
                'Per your contract, your final payment is due upon substantial completion.',
                "We appreciate your continuous feedback throughout the construction process. If you happen to see something you don't like, please let us know immediately. We are able to address your concerns in a timelier manner if we are made aware of them while the carpenter is still working onsite.",
                'Near the end of the project we will allow for a single close out walk ("final walk through") to ensure that all expectations set forth by your scope of work, specifications, and/or drawing have been met. This final walk through creates an opportunity for a single punch list of outstanding concerns to be addressed before your project is considered complete. All partial payments prior to this punch list must be paid in full before punch list work will be performed. Any adjustments, repairs, or replacements beyond this one list will be treated as a warranty claim and addressed upon receipt of final payment, per the terms of your warranty.',
                'Duration of construction projects is often unpredictable due to weather, inspections, change orders, material availability, etc. There is NO discount for job duration. A reasonable time frame will be established for each job, and every effort will be made to adhere to that time frame.',
              ].map((t, i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="font-bold text-center mb-4">I HAVE READ AND UNDERSTAND THE ABOVE SCOPE OF WORK AND FINAL PAYMENT CLARIFICATION.</p>
            <div className="border-b border-gray-500 w-56 mt-5" />
            <p className="text-xs text-gray-500 mt-1">Signature</p>
          </div>
          <PageBreak />

          {/* ── PAGE 6 · Pressure-Treated Wood ─────────────────────── */}
          <div className={bodyPad}>
            <div className="mb-3">
              <span className="font-bold text-sm">Signature: </span>
              <span className="inline-block border-b border-gray-500 w-48 align-bottom" />
            </div>
            <h2 className="text-center font-bold text-base mb-4">PRESSURE-TREATED WOOD INFORMATION</h2>
            <ul className="text-sm space-y-2 ml-1">
              {[
                'Pressure-Treated pine is one of the most durable products for decks, porches and pergola. It is warranted against rot and termite infestation.',
                'Projects with pressure-treated wood must be maintained with stain or paint to ensure your project is warranted and lasts as long as possible.',
                'Lumber manufacturers provide a warranty against rot and insect infestation of their product. This warranty ONLY covers approved replacement material, labor is NOT included.',
                'All pressure-treat wood (including #1 grade) will have knots as it is a natural product and is part of the beauty of real wood.',
                'Even when wood filler is used, the lumber may continue to expand and contract, requiring additional maintenance.',
                'The wood is cut to provide tight joints, but as pressure-treated wood continues to expand and contract, the joints may separate (for example, at the corners where the rail caps are mitered).',
                'The lumber mill will ink stamp the wood as required by law. These stamps will fade over time. We do not recommend spot sanding these stamps, as it will show up differently when stained.',
                'Pressure-treated wood is outdoor lumber. It is not as stable and consistent as wood used for interior furniture or trim and will have natural imperfections.',
                'Surface cracks or splits (known as "checking") will develop on pressure-treated wood; this is not cause for alarm. Checking indicates that a pattern has been established to allow each piece of lumber to swell and shrink as nature intended. Large checking may develop on 4x4" and 6x6" posts as these are cut from the center of the Southern Yellow Pine Tree, where more moisture is present in the heartwood at the time of milling. Checking does not affect the structural integrity of posts or decking and does not represent a warrantable concern.',
                'Should the checking extend through the entire diameter of the wood during the applicable warranty period, it will be addressed by Ebony Outdoor Living.',
                'Checking does not negatively affect the structural integrity of the timber, but instead releases the tension built up internally. The checks will open and close as the outer layers of the timber pick up and shed moisture. It is for this reason that the checks should NOT be filled in with epoxy or something similar.',
                'Minor cupping of decking boards can occur. This occurs largely due to the evaporation of any moisture left in the board after treatment, resulting in cupping as a normal response as wood weathers.',
                "Pressure-treated wood comes from a Southern Yellow Pine Tree where sap/resin is prevalent. It is not uncommon for resin to seep from decking boards, especially during the warmer, sunny months. Sap is an uncontrollable and unpredictable characteristic and is not a warrantable item.",
              ].map((t, i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="font-bold text-center mt-3 mb-3">I HAVE READ AND UNDERSTAND THE ABOVE CHARACTERISTICS OF PRESSURE TREATED WOOD.</p>
            <div className="flex gap-8 mt-4">
              <div><div className="border-b border-gray-500 w-48 pb-5" /><p className="text-xs text-gray-500 mt-1">Signature</p></div>
              <div><div className="border-b border-gray-500 w-36 pb-5" /><p className="text-xs text-gray-500 mt-1">Date</p></div>
            </div>
          </div>
          <PageBreak />

          {/* ── PAGE 7 · Unforeseen Site Conditions ────────────────── */}
          <div className={bodyPad}>
            <h2 className="text-center font-bold text-base mb-4">UNFORESEEN SITE CONDITIONS POLICY</h2>
            <p className="text-sm mb-3">As described in Paragraph 12(a) of the Contract, the Builder Shall not be responsible for any additional work required due to unforeseen site conditions, which include but are not limited to the following:</p>
            <ul className="text-sm space-y-1.5 ml-2 mb-4">
              {[
                'Soil that will not pass building inspector requirements',
                'Concealed plumbing, electrical lines, gas lines and mechanical lines',
                'Engineer required by building inspector (and subsequent delay waiting for the engineer)',
                'Unforeseen load bearing walls','Rotten wood','Insect infested wood','Mold',
                'Irrigation lines and sprinkler heads','Tree roots',
                'Subsequent interior damage or exterior brick/siding damage due to construction vibrations or demolition',
                'New cracks may develop as materials are dropped in your driveway. This is an inherent risk on behalf of the homeowner and Ebony Outdoor Living is not responsible for the repair of your driveway.',
                'Should we need to cut drywall for an inspection to take place or for the specific placement of an electrical box, the drywall repair and subsequent paint touchup will be an additional change to the contract.',
                'Reconnection of existing cables, wires, internet, security systems etc., due to construction demolition or new door frame.',
                'Any concrete removal is assumed the concrete is 4" thick or less. If through the course of demolition it is discovered the concrete is thicker than 4", there will be an additional charge to account for the additional labor and haul fees.',
                'Permit delays',
              ].map((t, i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="text-sm mb-5">If any unforeseen items are discovered during the course of your work we will immediately bring them to your attention with a recommended course of action. The labor required to correct, adjust, or work around these items will result in additional charges and work will only proceed when authorized by you.</p>
            <p className="font-bold mb-6">I HAVE READ THE ABOVE UNFORESEEN SITE CONDITIONS POLICY AND AGREE TO ITS TERMS AND CONDITIONS.</p>
            <div className="border-b border-gray-500 w-56" /><p className="text-xs text-gray-500 mt-1">Signature</p>
          </div>
          <PageBreak />

          {/* ── PAGE 8 · Processing Form ────────────────────────────── */}
          <div className={bodyPad}>
            <div className="text-xl font-bold mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>PROCESSING FORM</div>
            <div className="border-b border-gray-400 mb-4" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-4">
              <div><strong>Date sold:</strong> {todayS}</div>
              <div><strong>Salesperson:</strong> {salesperson || 'Mathew Rosa'}</div>
              <div><strong>Job Name:</strong> {client}</div>
              <div><strong>Contract #:</strong> {contractNum}</div>
              <div><strong>Address:</strong> {address}</div>
              <div><strong>Lot #:</strong> {lotNumber || '___________'}</div>
              <div><strong>Telephone:</strong> {phone}</div>
              <div><strong>Permit #:</strong> {permitNumber || '___________'}</div>
              <div className="col-span-2"><strong>Email:</strong> {email}</div>
              <div><strong>HOA:</strong> {hoa === 'yes' ? 'YES' : hoa === 'no' ? 'NO' : 'YES &nbsp;/&nbsp; NO'}</div>
              <div><strong>Permit Required:</strong> {permitReq === 'yes' ? 'YES' : permitReq === 'no' ? 'NO' : 'YES &nbsp;/&nbsp; NO'}</div>
            </div>
            <div className="border-b border-gray-200 mb-4" />
            <div className="text-sm mb-3">
              <strong>Special Instructions:</strong>
              <div className="border-b border-gray-400 mt-1 pb-6">{specialInstructions}</div>
            </div>
            <div className="text-sm mb-3">
              <strong>Directions to Job site:</strong>
              <div className="border-b border-gray-400 mt-1 pb-6">{directions}</div>
            </div>
            <div className="border-b border-gray-200 mb-4" />
            <div className="grid grid-cols-2 gap-8 text-sm mb-4">
              <div>
                <p className="font-semibold mb-2">Lumber drop ON or OFF driveway?</p>
                <p><CB checked={lumberDrop === 'on'} /> On &nbsp;&nbsp; <CB checked={lumberDrop === 'off'} /> Off</p>
                <p className="font-semibold mt-4 mb-2">Power?</p>
                <p><CB checked={power === 'yes'} /> Yes &nbsp;&nbsp; <CB checked={power === 'no'} /> No</p>
                {gateCode && <p className="mt-4"><strong>Gate Code:</strong> {gateCode}</p>}
              </div>
              <div className="border border-gray-400 rounded flex items-center justify-center h-36 text-gray-400 text-xs text-center p-2">
                Site diagram<br />(mark lumber drop with X, power with P)
              </div>
            </div>
            <div className="border-b border-gray-200 mb-3" />
            <div className="flex gap-8 mt-4">
              <div><div className="border-b border-gray-500 w-48 pb-5" /><p className="text-xs text-gray-500 mt-1">Client Signature</p></div>
              <div><div className="border-b border-gray-500 w-36 pb-5" /><p className="text-xs text-gray-500 mt-1">Date</p></div>
            </div>
          </div>
          <PageBreak />

          {/* ── PAGE 9 · Client Acknowledgment (over $40K only) ─────── */}
          {!isSmallContract && (
            <>
              <div className={bodyPad}>
                <h2 className="text-center font-bold text-base mb-5">Client Acknowledgment and Agreement</h2>
                <div className="text-sm space-y-4">
                  <p>At <strong>Ebony Outdoor Living</strong>, we are committed to transparency, contractual clarity, and professional communication with our clients. This document is intended to formalize the understanding between the parties regarding the operational structure and distribution of responsibilities related to the contracted project. Ebony Outdoor Living and <strong>All-In-One Solutions</strong> operate collaboratively as part of the same project team. All-In-One Solutions serves as the licensed General Contractor and is responsible for maintaining the applicable licenses and overall legal and regulatory compliance required for the project.</p>
                  <p>Ebony Outdoor Living is solely responsible for the execution and management of the work, including, without limitation, project supervision, scheduling and timeline management, coordination of crews and subcontractors, and daily job site operations. The Client acknowledges and agrees that all communications, requests, clarifications, or questions related to project execution, timelines, scheduling, and operational responsibilities shall be directed exclusively to the official contacts provided to the Client upon receipt of the fully executed contract.</p>
                  <p>All-In-One Solutions also acts as a general supervisor of the project, performing occasional site visits during the progress of the work for purposes of overall oversight and supervision. However, All-In-One Solutions is not involved in the daily management of the job site, operational coordination of crews, or direct execution of the services.</p>
                  <p>This acknowledgment is supplementary in nature and forms part of the project's contractual documentation, without replacing or modifying the terms and conditions of the primary agreement previously executed between the parties.</p>
                  <p>By signing below, the Client confirms that they have read, understood, and fully agree with the information and distribution of responsibilities described in this document.</p>
                </div>
                <p className="text-sm mt-4"><strong>Project Address:</strong> {address}</p>
                <SigBlock label="Client Signature" />
                <SigBlock label="Builder Signature" />
                <SigBlock label="General Contractor Signature" date={false} />
              </div>
              <PageBreak />
            </>
          )}

          {/* ══════════════════════════════════════════════════════════
              DOCUMENT 2: SCOPE OF WORK
          ══════════════════════════════════════════════════════════ */}

          {/* ── SCOPE PAGE 1 · Header + Scope Bullets ──────────────── */}
          <div className={bodyPad}>
            <div className="flex justify-between items-center mb-1">
              {logo
                ? <img src={logo} alt="logo" className="h-12 object-contain" />
                : <div className="text-lg font-black tracking-widest" style={{ fontFamily: 'Arial, sans-serif' }}>{companyName}</div>
              }
              <div className="text-lg font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>SCOPE OF WORK</div>
            </div>
            <div className="border-b border-gray-400 mb-4" />

            <div className="text-sm mb-4 space-y-0.5">
              <p><strong>DATE:</strong> {today}</p>
              <p><strong>CONTRACT #:</strong> {contractNum}</p>
              <p><strong>CUSTOMER NAME:</strong> {client}</p>
              <p><strong>ADDRESS:</strong> {address}</p>
              <p><strong>EMAIL:</strong> {email}</p>
              <p><strong>PHONE:</strong> {phone}</p>
            </div>

            {/* Project Summary — editable on screen, static on print */}
            <div className="mb-4">
              <p className="font-bold text-sm mb-1">PROJECT SUMMARY:</p>
              <textarea
                className="no-print w-full border border-blue-200 bg-blue-50 rounded px-2 py-1.5 text-sm font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows={3}
                value={projectSummary}
                onChange={e => setProjectSummary(e.target.value)}
                placeholder="Describe the project scope in plain language — e.g. '16×16 Gable Roof Eze-Breeze Porch with vaulted ceilings and TimberTech Prime Plus open deck…'"
              />
              <p className="print-only font-semibold text-sm">{projectSummary}</p>
            </div>

            {/* Scope bullets */}
            <div className="no-print mb-2 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <span>✏️</span><span>Click any bullet to edit.</span>
                {scopeExamples.length > 0 && (
                  <span className="text-purple-500 font-medium ml-1">
                    · {scopeExamples.length} example{scopeExamples.length !== 1 ? 's' : ''} learned
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fillFromPastContracts}
                  disabled={scopeExamples.length === 0}
                  title={scopeExamples.length === 0 ? 'Save a contract draft first to build your example library' : 'Fill from your past contracts — no AI needed'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <BookOpen size={12} /> Fill from Past Contracts
                </button>
                <button
                  onClick={generateSuggestions}
                  disabled={isGenerating}
                  title="Uses Ollama (local AI, free) to generate and style bullets from your examples"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating
                    ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                    : <><Sparkles size={12} /> AI Suggest</>}
                </button>
              </div>
            </div>
            {aiError && (
              <div className="no-print mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {aiError}
              </div>
            )}
            <ul className="text-sm space-y-2">
              {scopeLines.map(line => (
                <li key={line.id} className="flex gap-2 items-start group">
                  <span className="mt-2 shrink-0 print:mt-0">●</span>
                  <div className="flex-1">
                    <textarea
                      className="no-print w-full border border-transparent hover:border-blue-200 rounded px-1 py-0.5 text-sm resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 leading-snug"
                      rows={2}
                      value={line.text}
                      onChange={e => updateLine(line.id, e.target.value)}
                    />
                    <p className="print-only text-sm leading-snug whitespace-pre-wrap">{line.text}</p>
                  </div>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="no-print mt-1.5 shrink-0 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove bullet"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={addLine}
              className="no-print mt-3 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1.5 transition-colors"
            >
              <span className="text-base leading-none">+</span> Add bullet
            </button>

          {/* ── SCOPE PAGE 2 · General Notes + Pricing Table ───────── */}
            {/* Locked disclosures */}
            <div className="no-print flex items-center gap-1.5 mb-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
              <Lock size={11} />
              <span>General Notes &amp; Warranties below are locked — these disclosures cannot be modified.</span>
            </div>
            <p className="font-bold text-sm mb-3">GENERAL NOTES AND WARRANTIES TO THE ACCEPTED SCOPE OF WORK</p>
            <ul className="text-sm space-y-2 mb-6">
              {GENERAL_NOTES.map((n, i) => (
                <li key={i} className={`flex gap-2 ${n.highlight ? 'bg-yellow-50 -mx-1 px-1 rounded' : ''}`}>
                  <span>●</span>
                  {n.editable ? (
                    <>
                      <textarea
                        className="no-print flex-1 border border-blue-200 bg-blue-50 rounded px-1 py-0.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 leading-snug"
                        rows={2}
                        value={ceilingFanNote}
                        onChange={e => setCeilingFanNote(e.target.value)}
                      />
                      <span className="print-only">{ceilingFanNote}</span>
                    </>
                  ) : (
                    <span className={n.bold ? 'font-bold' : ''}>{n.text}</span>
                  )}
                </li>
              ))}
            </ul>

            {/* Pricing breakdown — from proposal lines */}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold w-3/5"></th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-bold w-1/5"></th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-bold text-xs uppercase tracking-wide w-1/5">OWNER INITIALS</th>
                </tr>
              </thead>
              <tbody>
                {scopeLines.map(line => (
                  <tr key={line.id}>
                    <td className="border border-gray-300 px-3 py-3 font-bold">{line.name.toUpperCase()}</td>
                    <td className="border border-gray-300 px-3 py-3 font-semibold">${fmt(line.price)}</td>
                    <td className="border border-gray-300 px-3 py-3"><div className="border-b border-gray-400 mx-4 mt-5" /></td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-3 font-bold">INVESTMENT TOTAL</td>
                  <td className="border border-gray-300 px-3 py-3 font-bold underline">${fmt(total)}</td>
                  <td className="border border-gray-300 px-3 py-3"><div className="border-b border-gray-400 mx-4 mt-5" /></td>
                </tr>
                {['ADDENDUM #1:', 'ADDENDUM #2:'].map(label => (
                  <tr key={label}>
                    <td className="border border-gray-300 px-3 py-3 font-bold">{label}</td>
                    <td className="border border-gray-300 px-3 py-3"></td>
                    <td className="border border-gray-300 px-3 py-3"></td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-3 font-bold">TOTAL AFTER ADDENDUMS</td>
                  <td className="border border-gray-300 px-3 py-3"></td>
                  <td className="border border-gray-300 px-3 py-3"></td>
                </tr>
              </tbody>
            </table>

          {/* ── SCOPE PAGE 3 · Payment Schedule + Sigs ─────────────── */}
            <table className="w-full text-sm border-collapse mb-3">
              <thead>
                <tr className="bg-blue-50">
                  {['PAYMENT SCHEDULE','EOL','ADDENDUMS','TOTALS','PYM'].map(h => (
                    <th key={h} className="border border-gray-300 px-3 py-2 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-3 py-3">
                      <input
                        className="no-print w-full bg-transparent border-b border-transparent hover:border-blue-300 focus:border-blue-400 focus:outline-none text-sm py-0.5 transition-colors"
                        value={p.label}
                        onChange={e => updateMilestoneLabel(i, e.target.value)}
                      />
                      <span className="print-only">{p.label}</span>
                    </td>
                    <td className="border border-gray-300 px-3 py-3 text-center">{Math.round(p.pct * 100)}%</td>
                    <td className="border border-gray-300 px-3 py-3"></td>
                    <td className="border border-gray-300 px-3 py-3 font-semibold underline">${fmt(p.amount)}</td>
                    <td className="border border-gray-300 px-3 py-3"></td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="border border-gray-300 px-3 py-3">TOTALS</td>
                  <td className="border border-gray-300 px-3 py-3 text-center">100%</td>
                  <td className="border border-gray-300 px-3 py-3"></td>
                  <td className="border border-gray-300 px-3 py-3 underline">${fmt(total)}</td>
                  <td className="border border-gray-300 px-3 py-3"></td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-gray-600 text-justify mb-10">
              ** Initial schedule deposit paid as 20% deposit at sign. Ebony O.L. will not drop material or labor on the project until the scheduled deposit is paid in full. Ebony O.L has the rights to hold construction progress if scheduled payments are delayed.
            </p>

            <SigBlock label="Client signature" />
            <SigBlock label="Builder signature" />
          </div>

          {/* ══════════════════════════════════════════════════════════
              DOCUMENT 3: ELECTRICAL SPECIFICATION SHEET
              (only rendered when job includes electrical work)
          ══════════════════════════════════════════════════════════ */}
          {includesElectrical && (
            <>
              <PageBreak />
              <div className={bodyPad}>

                {/* Header */}
                <div className="flex justify-between items-center mb-1">
                  {logo
                    ? <img src={logo} alt="logo" className="h-12 object-contain" />
                    : <div style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="text-2xl font-black tracking-widest leading-tight">—EBONY—</div>
                        <div className="text-sm font-semibold" style={{ color: '#2563eb' }}>Outdoor Living</div>
                      </div>
                  }
                  <div className="text-xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>ELECTRICAL SPECIFICATION</div>
                </div>
                <div className="border-b border-gray-400 mb-4" />

                {/* Client info */}
                <div className="grid grid-cols-2 gap-x-6 text-sm mb-4">
                  <div><strong>CUSTOMER NAME:</strong> {client}</div>
                  <div><strong>CONTRACT #:</strong> {contractNum}</div>
                  <div className="col-span-2">
                    <strong>PHONE NUMBER:</strong>{' '}
                    {homePhone || phone}
                    {cellPhone ? ` | ${cellPhone}` : ''}
                    {' '}&nbsp;&nbsp; <strong>HOME:</strong> {homePhone || '___________'} &nbsp;&nbsp; <strong>CELL:</strong> {cellPhone || '___________'}
                  </div>
                </div>

                {/* Included items table */}
                <p className="text-sm font-bold mb-2">THE FOLLOWING ELECTRICAL ITEMS ARE INCLUDED IN YOUR ABOVE REFERENCE CONTRACT:</p>
                <table className="w-full text-sm border-collapse mb-0">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-3 py-2 text-left font-bold w-5/6">ELECTRICAL ITEM</th>
                      <th className="border border-gray-400 px-3 py-2 text-center font-bold w-1/6">QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-3 py-2">
                        <p className="font-bold">Standard electrical package:</p>
                        <p>Prewire for (1) homeowner supplied a fan with a switch, (1) outlet and (1) flood light with a switch.</p>
                        <p className="italic text-gray-500">*Dimmer switch available for additional cost</p>
                      </td>
                      <td className="border border-gray-400 px-3 py-2 text-center font-semibold">1</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="border border-gray-400 px-3 py-2 font-bold bg-gray-50">ADDITIONAL ELECTRICAL ITEMS AVAILABLE</td>
                    </tr>
                    {elecItems.map(item => (
                      <tr key={item.id}>
                        <td className="border border-gray-400 px-3 py-2">
                          {item.isRecessed ? (
                            <div className="flex items-center gap-4">
                              <span>{item.label}</span>
                              <div className="no-print flex items-center gap-3 text-xs">
                                {['6','4'].map(s => (
                                  <button key={s} onClick={() => setRecessedSize(s)}
                                    className={`px-2 py-0.5 rounded border font-medium ${recessedSize === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                                    ({s === recessedSize ? 'X' : ' '}) {s}"
                                  </button>
                                ))}
                              </div>
                              <span className="print-only text-xs">
                                ({recessedSize === '6' ? 'X' : ' '}) 6" &nbsp; ({recessedSize === '4' ? 'X' : ' '}) 4"
                              </span>
                            </div>
                          ) : item.label}
                        </td>
                        <td className="border border-gray-400 px-3 py-2 text-center">
                          <input
                            className="no-print w-full text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                            value={item.qty}
                            onChange={e => setElecItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: e.target.value } : i))}
                            placeholder="—"
                          />
                          <span className="print-only">{item.qty || ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Addendum note */}
                <p className="text-sm mt-4 mb-4">
                  If you would like any additional electrical performance, you can add it at the time we are building your project through an addendum to your contract. The Builder can process this for you.
                </p>

                {/* Disclosure bullets */}
                <ul className="text-sm space-y-2 mb-8">
                  {[
                    { text: 'Mounting and installation of your TV and/or speakers is not included.', red: false },
                    { text: 'Cable TV connections in some cases may need to be connected through your cable provider.', red: false },
                    { text: 'The electrical wiring provided may require exposed conduit piping. We will minimize this when possible. If you have any question, please do not hesitate to discuss them with the builder or you may call at (704) 776-2210', red: false },
                    { text: 'Due Breaker capacity plug-in heaters cannot be used. Please discuss if an additional heater circuit is desired.', red: false },
                    { text: 'The Outlets installed are a common household outlet, typically designed to handle 15 or 20 amps of current at 120 volts, yielding a maximum capacity of 1800 or 2400 watts, respectively. This capacity is suitable for most everyday appliances and devices such as lamps, chargers, computers, and TVs. NOT PLUG-IN HEATERS.', red: true },
                    { text: 'Ebony is not responsible for the cost of reconnecting any cables, security system, alarms, etc in case it was disconnected during the construction process. The homeowner is responsible to inform the builder the existence and location of possible wires prior to starting the work.', red: false },
                    { text: 'Due to recent code changes and grossly varying inspector interpretations, some are considering the EzeBreeze system as the same as a traditional window and a year-round usable living space, which falls under the 6/12 outlet spacing code.', red: false },
                    { text: 'Homeowners are responsible for costs of an extra Sub panel if required to perform the work.', red: true },
                  ].map((d, i) => (
                    <li key={i} className={`flex gap-2 ${d.red ? 'text-red-600' : ''}`}>
                      <span className="shrink-0">●</span>
                      <span>{d.text}</span>
                    </li>
                  ))}
                </ul>

                {/* Signature block */}
                <div className="grid grid-cols-2 gap-10 mt-5">
                  <div>
                    <div className="border-b border-gray-500 pb-5" />
                    <div className="flex gap-6 mt-1">
                      <p className="text-xs text-gray-600">CUSTOMER(S) SIGNATURE</p>
                      <p className="text-xs text-gray-600">DATE</p>
                    </div>
                    <div className="border-b border-gray-500 pb-5 mt-4" />
                    <div className="flex gap-6 mt-1">
                      <p className="text-xs text-gray-600">CUSTOMER(S) SIGNATURE</p>
                      <p className="text-xs text-gray-600">DATE</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-gray-500 pb-5" />
                    <div className="flex gap-6 mt-1">
                      <p className="text-xs text-gray-600">BUILDER SIGNATURE</p>
                      <p className="text-xs text-gray-600">DATE</p>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Google Drive / eSign Modal ───────────────────────────────── */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Send for Signature</h2>
                <p className="text-sm text-gray-500 mt-0.5">Upload contract to Google Drive</p>
              </div>
              <button onClick={() => setShowSignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!googleAuthed ? (
                <>
                  <p className="text-sm text-gray-600">
                    Connect your Google Drive account so QuoteX can upload the contract PDF there. You'll then open it in Drive to send the eSignature request.
                  </p>
                  {signError && <p className="text-sm text-red-600">{signError}</p>}
                  <button
                    onClick={handleConnectGoogle}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Connect Google Drive
                  </button>
                </>
              ) : signResult ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl text-sm font-medium">
                    ✓ Contract uploaded to Google Drive
                  </div>
                  <p className="text-sm text-gray-600">
                    Open the file in Drive, then click <strong>Tools → eSignature</strong> to send the signing request to your client.
                  </p>
                  <a
                    href={signResult.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Open in Google Drive →
                  </a>
                  <p className="text-xs text-gray-400 text-center">{signResult.fileName}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    QuoteX will generate a PDF of this contract and upload it to your Google Drive. You'll get a link to open it and send the eSignature request from Drive.
                  </p>
                  {signError && <p className="text-sm text-red-600">{signError}</p>}
                  <button
                    onClick={handleUploadToDrive}
                    disabled={signing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {signing ? <><Loader2 size={15} className="animate-spin" /> Generating PDF…</> : 'Upload to Google Drive'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
