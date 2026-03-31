import { useState, useRef } from 'react'
import { Upload, FileText, Image, File, Trash2, CheckCircle, AlertCircle, Plus, Save } from 'lucide-react'
import { useStore } from '../store'

const CATEGORIES = ['Fencing', 'Gates', 'Demo', 'Materials', 'Labor', 'Framing', 'Concrete', 'Electrical', 'Plumbing', 'General']

function parseEstimateText(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
  const items = []

  const unitMap = {
    'lf': 'LF', 'linear ft': 'LF', 'linear foot': 'LF', 'linear feet': 'LF',
    'sf': 'SF', 'sq ft': 'SF', 'square ft': 'SF', 'square feet': 'SF',
    'ea': 'EA', 'each': 'EA', 'unit': 'EA', 'pc': 'EA', 'piece': 'EA',
    'hr': 'HR', 'hour': 'HR', 'hrs': 'HR', 'hours': 'HR',
    'ls': 'LS', 'lump sum': 'LS', 'lot': 'LS',
    'load': 'LOAD', 'loads': 'LOAD',
    'ton': 'TON', 'tons': 'TON',
    'day': 'DAY', 'days': 'DAY',
  }

  const pricePattern = /\$?([\d,]+(?:\.\d{1,2})?)/g
  const qtyPattern = /(\d+(?:\.\d+)?)\s*(?:x\s*)?(lf|linear\s*f(?:t|oot|eet)|sf|sq\.?\s*ft|square\s*f(?:t|eet)|ea(?:ch)?|unit|pc|piece|hr|hour|ls|lump\s*sum|load|ton|day)/i

  for (const line of lines) {
    const prices = [...line.matchAll(pricePattern)].map(m => parseFloat(m[1].replace(/,/g, '')))
    if (!prices.length) continue

    const qtyMatch = line.match(qtyPattern)
    const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1
    const rawUnit = qtyMatch ? qtyMatch[2].toLowerCase().replace(/\s+/g, ' ') : 'ea'
    const unit = Object.entries(unitMap).find(([k]) => rawUnit.startsWith(k))?.[1] || 'EA'

    // Use last price as total or only price as unit price
    const totalPrice = prices[prices.length - 1]
    const unitPrice = qty > 1 ? Math.round(totalPrice / qty) : totalPrice
    if (unitPrice < 1) continue

    // Clean name: strip prices and qty/unit references
    let name = line
      .replace(/\$[\d,]+(?:\.\d+)?/g, '')
      .replace(qtyMatch?.[0] || '', '')
      .replace(/[\d,]+(?:\.\d+)?\s*(?:lf|sf|ea|each|unit|hr|ls|load|ton|day)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .replace(/^[-:,.\s]+|[-:,.\s]+$/g, '')

    if (!name || name.length < 3) continue

    const cat = CATEGORIES.find(c => name.toLowerCase().includes(c.toLowerCase())) || 'General'

    items.push({
      id: Date.now() + Math.random(),
      name,
      qty,
      unit,
      unitPrice,
      category: cat,
      confidence: qtyMatch ? 80 : 60,
      source: 'text-parse',
    })
  }
  return items
}

export default function AnalyzeEstimate() {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState([])
  const [profitable, setProfitable] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const addCatalogItems = useStore(s => s.addCatalogItems)

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')
    setSaved(false)
    setResults([])

    const ext = f.name.split('.').pop().toLowerCase()

    if (ext === 'txt' || ext === 'csv') {
      const t = await f.text()
      setText(t)
    } else {
      // For PDF/image: show filename, will be sent to API as base64
      setText('')
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    setResults([])
    setSaved(false)

    try {
      let items = []

      if (file) {
        const ext = file.name.split('.').pop().toLowerCase()
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(ext)) {
          // Send file as base64 to API
          const base64 = await fileToBase64(file)
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64, fileName: file.name, mimeType: file.type }),
          })
          if (res.ok) {
            items = await res.json()
          } else {
            throw new Error(`API error: ${res.status}`)
          }
        } else if (['txt', 'csv'].includes(ext)) {
          // Try API first, fallback to local parse
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          }).catch(() => null)
          items = res?.ok ? await res.json() : parseEstimateText(text)
        }
      } else if (text.trim()) {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }).catch(() => null)
        items = res?.ok ? await res.json() : parseEstimateText(text)
      }

      if (!items.length) {
        setError('No line items found. Try pasting text with quantities and prices.')
      } else {
        const withIds = items.map((item, i) => ({ ...item, id: Date.now() + i }))
        setResults(withIds)
        setSelected(new Set(withIds.map(i => i.id)))
      }
    } catch (err) {
      setError(err.message || 'Analysis failed. Check your connection or try pasting text.')
    } finally {
      setAnalyzing(false)
    }
  }

  const fileToBase64 = (f) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(f)
    })

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateResult = (id, field, val) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, [field]: field === 'unitPrice' || field === 'qty' ? parseFloat(val) || 0 : val } : r))
  }

  const saveSelected = () => {
    const toSave = results.filter(r => selected.has(r.id)).map(r => ({ ...r, profitable }))
    addCatalogItems(toSave)
    setSaved(true)
  }

  const clear = () => {
    setText('')
    setFile(null)
    setResults([])
    setSelected(new Set())
    setSaved(false)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const fileExt = file ? file.name.split('.').pop().toLowerCase() : ''
  const isImageOrPdf = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'].includes(fileExt)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Analyze Estimate</h2>
      <p className="text-gray-500 text-sm mb-6">
        Upload a past estimate (PDF, image, or text) and the AI will extract line items with suggested pricing.
      </p>

      {/* Upload area */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="flex gap-4 flex-wrap mb-4">
          {/* Drop/click upload */}
          <label
            className="flex-1 min-w-48 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile({ target: { files: [f] } })
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv"
              className="hidden"
              onChange={handleFile}
            />
            {file ? (
              <div className="text-center">
                {isImageOrPdf && ['jpg','jpeg','png','gif','webp'].includes(fileExt)
                  ? <Image size={28} className="mx-auto text-blue-500 mb-2" />
                  : fileExt === 'pdf'
                    ? <File size={28} className="mx-auto text-red-500 mb-2" />
                    : <FileText size={28} className="mx-auto text-green-500 mb-2" />
                }
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">Drop file or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF · JPG · PNG · TXT · CSV</p>
              </>
            )}
          </label>

          {/* Paste text */}
          <div className="flex-1 min-w-48 flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1.5">Or paste estimate text</label>
            <textarea
              className="flex-1 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-32"
              placeholder={'Example:\nRemove 140 LF chain link fence\nInstall 6ft cedar privacy fence 140 LF  $38/lf\n(2) single walk gates  $320 ea\nSet all posts in concrete'}
              value={text}
              onChange={e => { setText(e.target.value); setFile(null); setSaved(false); setResults([]) }}
            />
          </div>
        </div>

        {/* Profitable toggle */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-600">Was this a profitable job?</span>
          <button
            onClick={() => setProfitable(p => !p)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${profitable ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profitable ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className={`text-xs font-medium ${profitable ? 'text-green-600' : 'text-gray-400'}`}>
            {profitable ? 'Yes — weighted 1.3×' : 'No'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!text.trim() && !file)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Estimate'}
          </button>
          {(text || file || results.length > 0) && (
            <button onClick={clear} className="px-4 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1.5">
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">
              {results.length} Line Item{results.length !== 1 ? 's' : ''} Found
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(results.map(r => r.id)))}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-500 hover:underline"
              >
                None
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {results.map((item) => (
              <div key={item.id} className={`px-5 py-3 flex items-center gap-3 ${selected.has(item.id) ? 'bg-blue-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="w-4 h-4 accent-blue-600"
                />
                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 text-sm text-gray-800 border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none bg-transparent"
                    value={item.name}
                    onChange={e => updateResult(item.id, 'name', e.target.value)}
                  />
                  <input
                    className="col-span-1 text-sm text-center border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none bg-transparent"
                    value={item.qty}
                    onChange={e => updateResult(item.id, 'qty', e.target.value)}
                    type="number"
                    min="0"
                  />
                  <select
                    className="col-span-1 text-xs border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none bg-transparent"
                    value={item.unit}
                    onChange={e => updateResult(item.id, 'unit', e.target.value)}
                  >
                    {['LF','SF','EA','HR','LS','LOAD','TON','DAY'].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <div className="col-span-2 flex items-center gap-0.5">
                    <span className="text-gray-400 text-sm">$</span>
                    <input
                      className="w-full text-sm font-medium text-gray-800 border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none bg-transparent"
                      value={item.unitPrice}
                      onChange={e => updateResult(item.id, 'unitPrice', e.target.value)}
                      type="number"
                      min="0"
                    />
                  </div>
                  <select
                    className="col-span-2 text-xs border border-transparent rounded px-1 py-0.5 hover:border-gray-200 focus:border-blue-300 focus:outline-none bg-transparent"
                    value={item.category}
                    onChange={e => updateResult(item.id, 'category', e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <div className="col-span-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      item.confidence >= 85 ? 'bg-green-100 text-green-700' :
                      item.confidence >= 70 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item.confidence}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">{selected.size} of {results.length} selected</span>
            <div className="flex gap-2">
              {saved ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={16} /> Saved to catalog
                </span>
              ) : (
                <button
                  onClick={saveSelected}
                  disabled={!selected.size}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} /> Save {selected.size} item{selected.size !== 1 ? 's' : ''} to catalog
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {!results.length && !analyzing && !error && (
        <div className="text-center py-10 text-gray-400">
          <FileText size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Upload a PDF, photo, or paste your estimate text above, then click <strong>Analyze Estimate</strong>.</p>
          <p className="text-xs mt-2 text-gray-300">Supported: PDF · JPEG · PNG · TXT · CSV</p>
        </div>
      )}
    </div>
  )
}
