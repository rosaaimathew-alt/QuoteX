import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import SignaturePad from '../components/SignaturePad'

const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const ROLE_LABEL = {
  client:  'Client Signature',
  builder: 'Builder Signature — Ebony Outdoor Living',
  gc:      'General Contractor Signature — All-In-One Solutions',
}

const PROJECT_TYPES = ['Deck', 'Screened Porch', 'Sunroom', 'Pergola', 'Gazebo', 'Open Porch']

const METHODS = ['Electronic Wire Transfer / ACH', 'Cash', 'Check', 'Zelle']

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
]

const ordinal = (n) => {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const CB = ({ checked }) => (
  <span className="inline-block w-3.5 h-3.5 border border-gray-700 mr-1 align-middle text-center text-[10px] leading-[14px]">
    {checked ? 'X' : ' '}
  </span>
)

// Read-only signature line — recipient signs the live pad at the bottom of the page,
// not in these inline blocks. Shown for layout parity with the printed contract.
const SigLine = ({ label, date = true }) => (
  <div className="mt-4">
    <div className="flex gap-6 items-end">
      <div className="flex-1 border-b border-gray-500 pb-5" />
      {date && <div className="w-32 border-b border-gray-500 pb-5" />}
    </div>
    <p className="text-[10px] text-gray-500 mt-1">{label}{date ? ' / Date' : ''}</p>
  </div>
)

export default function SignPage() {
  const { token }             = useParams()
  const sigRef                = useRef(null)
  const [record, setRecord]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [printedName, setPrintedName] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [agreedAll, setAgreedAll]     = useState(false)

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(async r => {
        const text = await r.text()
        let parsed
        try { parsed = JSON.parse(text) } catch { throw new Error(`Bad response (${r.status}): ${text.slice(0, 200)}`) }
        if (!r.ok || parsed.error) throw new Error(parsed.error || `HTTP ${r.status}`)
        return parsed
      })
      .then(d => { setRecord(d); setLoading(false) })
      .catch(err => { setError(err.message || 'Failed to load contract'); setLoading(false) })
  }, [token])

  const handleSubmit = async () => {
    if (!printedName.trim()) { alert('Please enter your full name'); return }
    if (!agreedAll)          { alert('Please confirm you have read and agree to all terms'); return }
    if (sigRef.current?.isEmpty()) { alert('Please provide your signature'); return }
    setSubmitting(true)
    try {
      const signatureDataUrl = sigRef.current.toDataURL()
      const res    = await fetch(`/api/sign/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signatureDataUrl, printedName }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setDone(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center">
        <div className="text-4xl mb-3">📄</div>
        <div className="text-gray-700 text-lg font-semibold mb-1">Loading contract…</div>
        <div className="text-gray-400 text-xs font-mono">token: {token?.slice(0, 12)}…</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-red-600 font-bold text-lg mb-2">Can't load contract</p>
        <p className="text-gray-700 text-sm font-mono bg-red-50 rounded-lg p-3 text-left break-all">{error}</p>
        <p className="text-gray-400 text-xs mt-3">Token: {token}</p>
      </div>
    </div>
  )

  if (done || record?.alreadySigned) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center px-6 max-w-sm">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">{done ? 'Signed Successfully' : 'Already Signed'}</h1>
        <p className="text-gray-500">
          {done
            ? `Thank you ${printedName || ''}. Your signature has been recorded with audit trail.`
            : 'This party has already signed this contract.'}
        </p>
      </div>
    </div>
  )

  let d, contractNum, role, total = 0, payments = []
  let renderError = null
  try {
    ;({ contractData: d, contractNum, role } = record || {})
    if (Number.isFinite(Number(d?.total)) && Number(d?.total) > 0) {
      total = Number(d.total)
    } else {
      total = (d?.lines || []).reduce((s, l) => {
        const qty   = Number(l?.qty   ?? 1)
        const price = Number(l?.price ?? l?.unitPrice ?? 0)
        return s + qty * price
      }, 0)
    }
    payments = Array.isArray(d?.payments) ? d.payments : []
  } catch (e) { renderError = e.message }

  // Pull every field, fall back gracefully if older records don't have them
  const client            = d?.client || ''
  const email             = d?.email  || ''
  const phone             = d?.phone  || ''
  const address           = d?.address || ''
  const salesperson       = d?.salesperson || 'Mathew Rosa'
  const projectTypes      = d?.projectTypes || []
  const city              = d?.city || ''
  const lotNumber         = d?.lotNumber || ''
  const permitNumber      = d?.permitNumber || ''
  const hoa               = d?.hoa
  const permitReq         = d?.permitReq
  const specialInstructions = d?.specialInstructions || ''
  const directions        = d?.directions || ''
  const lumberDrop        = d?.lumberDrop
  const power             = d?.power
  const gateCode          = d?.gateCode || ''
  const paymentMethods    = d?.paymentMethods || []
  const otherTerms        = d?.otherTerms || ''
  const projectSummary    = d?.projectSummary || ''
  const ceilingFanNote    = d?.ceilingFanNote || 'Homeowner to provide 1 ceiling fan with downrod'
  const scopeBullets      = d?.scopeBullets || []
  const scopeLines        = d?.scopeLines || []
  const includesElectrical = !!d?.includesElectrical
  const recessedSize      = d?.recessedSize || '6'
  const homePhone         = d?.homePhone || ''
  const cellPhone         = d?.cellPhone || ''
  const elecItems         = d?.elecItems || []
  const branding          = d?.branding || {}
  const logo              = branding?.logo || null
  const companyName       = branding?.companyName || 'Ebony Outdoor Living'
  const isSmallContract   = d?.isSmallContract ?? (total < 40000)

  const now    = new Date()
  const today  = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const todayS = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })

  const docStyle = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize:   '10.5pt',
    lineHeight: '1.55',
    color:      '#1a1a1a',
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {renderError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 font-mono">
          Render error: {renderError}
        </div>
      )}

      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logo
              ? <img src={logo} alt="logo" className="h-8 object-contain shrink-0" />
              : <span className="font-black tracking-widest text-sm">{companyName.toUpperCase()}</span>}
            <span className="text-xs text-gray-400 truncate">Contract #{contractNum}</span>
          </div>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider shrink-0">
            {role && `Signing as ${role}`}
          </div>
        </div>
      </div>

      {/* Contract document */}
      <div className="max-w-4xl mx-auto my-4 px-2 sm:px-4">
        <div className="bg-white shadow-lg rounded-sm overflow-hidden" style={docStyle}>

          {/* ── PAGE 1 · Contract opening ─────────────────────────── */}
          <div className="px-6 sm:px-12 py-6">
            <div className="flex justify-between items-start mb-1 gap-4">
              <div className="min-w-0">
                {logo
                  ? <img src={logo} alt="logo" className="h-14 object-contain mb-1" />
                  : <div className="text-xl font-black tracking-widest leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>{companyName}</div>
                }
                <div className="text-2xl font-bold mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>CONTRACT</div>
              </div>
              <div className="text-right shrink-0" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt' }}>
                <div><strong>Contract #</strong> {contractNum}</div>
                <div className="text-gray-500 mt-1"><strong>Date:</strong> {today}</div>
              </div>
            </div>
            <div className="border-b-2 border-gray-900 mb-5" />

            <p className="mb-4 text-justify">
              THIS CONTRACT made effective on the <strong>{ordinal(now.getDate())}</strong> day of <strong>{now.toLocaleDateString('en-US',{month:'long'})}, {now.getFullYear()}</strong> In City of <strong>{city || '___________'}</strong> and the State of <strong>North Carolina</strong> by and Between <strong>{client}</strong> (PURCHASER), At <strong>{address}</strong> and <strong>Ebony Outdoor Living</strong> (BUILDER), for work to be performed at <strong>{address}</strong> (the PREMISES) in accordance with the written terms and specifications of this CONTRACT (the WORK). THE WORK shall include the following:
            </p>

            <p className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
              {PROJECT_TYPES.map(t => (
                <span key={t}><CB checked={projectTypes.includes(t)} />{t}</span>
              ))}
            </p>
            <div className="border-b border-gray-300 mb-4 mt-2" />

            <p className="mb-3 text-justify">
              <strong>1.</strong> BUILDER shall furnish the services and material for performance of the WORK on the PREMISES described on the SCOPE OF WORK each attached to and made part of this CONTRACT, for and in consideration of the payment to BUILDER by the PURCHASER of <strong>${fmt(total)}</strong> for the WORK. Together with any amounts set forth in any addenda hereto (TOTAL CONTRACT SUM).
            </p>

            <p className="mb-1"><strong>2.</strong> THE TOTAL CONTRACT SUM shall be paid to BUILDER as follows:</p>
            {payments[0] && (
              <p className="mb-1 font-bold">{payments[0].label} ${fmt(payments[0].amount)}</p>
            )}
            {payments.length > 1 && (
              <>
                <p className="mb-2 font-bold">Progress Payments:</p>
                <table className="w-full text-sm mb-3">
                  <tbody>
                    {payments.slice(1).map((p, i) => (
                      <tr key={i}>
                        <td className="pr-4 pb-1.5 font-semibold w-36">${fmt(p.amount)}</td>
                        <td className="pb-1.5 border-b border-gray-400">{p.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <p className="mb-3">
              Down payment by{' '}
              {METHODS.map(m => <span key={m} className="mr-3 inline-block"><CB checked={paymentMethods.includes(m)} />{m}</span>)}
            </p>

            <p className="mb-4">
              <strong>3. OTHER TERMS:</strong> {otherTerms || <span className="inline-block w-64 border-b border-gray-400">&nbsp;</span>}
            </p>

            <p className="mb-3 text-justify text-[10pt]">
              <strong>4.</strong> THE Down Payment may be used to purchase material necessary for performance of the WORK. BUILDER shall be entitled to final payment upon substantial completion of the WORK. The WORK is substantially complete when all items described in this CONTRACT have been constructed or installed. Substantial completion shall not include adjustment, repair, replacement or cleaning of any item so constructed or installed or final inspection by code official. PURCHASER shall be entitled to one punch list prior to final payment. Requests for adjustment, repair, replacement or cleaning of any constructed or installed item shall not be cause for delay of final payment, but rather shall be considered warranty items. After five business days from substantial completion, the unpaid balance of the TOTAL CONTRACT SUM may be subject to interest charges as allowed by applicable state law. PURCHASER acknowledges and agrees that this CONTRACT shall serve as the invoice for the TOTAL CONTRACT SUM and that no additional invoice will be provided to PURCHASER for any part thereof.
            </p>

            <p className="text-[10pt] text-justify mb-3">
              <strong>5.</strong> Modification to the WORK or CONTRACT will be made only when a written addendum describing such modification has been signed by both PURCHASER and BUILDER. There may be an additional charge for any changes.
            </p>

            <p className="mb-3 text-justify text-[10pt]"><strong>6. a.</strong> The WORK will be warranted by BUILDER. Existing structures to which the WORK may be affixed or interconnected are not part of the WORK and will not be covered under the Warranty. This Warrant is issued to and only applicable to the PURCHASER after payment in full of the TOTAL CONTRACT SUM.</p>
            {!isSmallContract && (
              <p className="mb-3 text-justify text-[10pt]"><strong>B.</strong> As General contractors we have <strong>All-In-One Solutions</strong> that operate as part of Ebony Outdoor Living team. All-In-One Solutions serves as the licensed General Contractor and is responsible for maintaining the applicable licenses and overall legal and regulatory compliance required for the project. All-In-One Solutions also acts as a general supervisor of the project, performing occasional site visits during the progress of the work for purposes of overall oversight and supervision. However, All-In-One Solutions is not involved in the daily management of the job site, operational coordination of crews, or direct execution of the services.</p>
            )}
            <p className="mb-4 text-[10pt]"><strong>7.</strong> This CONTRACT shall not be effective and binding upon BUILDER until countersigned by BUILDER and GENERAL CONTRACTOR.</p>

            {isSmallContract ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <div>
                  <p className="font-bold underline mb-2">PURCHASER</p>
                  <SigLine label="Signature" date={false} />
                  <SigLine label="Print Name" date={false} />
                </div>
                <div>
                  <p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p>
                  <SigLine label="Signature" date={false} />
                  <SigLine label="Print Name" date={false} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <div>
                  <p className="font-bold underline mb-2">PURCHASER</p>
                  <SigLine label="Signature" date={false} />
                  <SigLine label="Print Name" date={false} />
                </div>
                <div>
                  <p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p>
                  <SigLine label="Signature" date={false} />
                  <SigLine label="Print Name" date={false} />
                  <p className="font-bold mt-3">GENERAL CONTRACTOR: ALL IN ONE SOLUTIONS</p>
                  <SigLine label="Signature" date={false} />
                  <SigLine label="Print Name" date={false} />
                </div>
              </div>
            )}

            <p className="mt-3 text-[10pt] underline">115 Unionville Indian Trail Road, Indian Trail, NC 28079 Unit B15</p>
            <p className="text-[10px] text-gray-500 mb-4">(Builder Address)</p>

            <p className="mb-3 text-justify text-[10pt]"><strong>8.</strong> BUILDER shall obtain applicable permits and inspections. Unless agreed otherwise in writing signed by the parties, or required by local code to be provided by BUILDER, PURCHASER shall be responsible for any additional approvals and processes (such as homeowner associations, special tax district, wetlands, endangered species, variances, or historic preservation). PURCHASER shall provide BUILDER with an accurate plat of PURCHASER's property.</p>
            <p className="mb-3 text-justify text-[10pt]"><strong>9.</strong> PURCHASER shall provide sufficient electricity for the continuous operation of BUILDER's equipment. There may be an additional charge if BUILDER is required to provide electricity.</p>

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
              ['19.', 'This CONTRACT is made and shall be construed under the laws of the State set forth in the first paragraph hereof. Except as set forth below, if any controversy or claim arises out of or relates to this CONTRACT, or the breach thereof, and if said controversy or claim cannot be settled through direct discussions, the parties agree to first endeavor to settle the controversy or claim in an amicable manner by mediation administered by the American Arbitration Association under its Construction Industry Mediation Rules, before resorting to arbitration. Thereafter, any unresolved controversy or claim arising out of or relating to this CONTRACT, or breach thereof, shall be settled by arbitration administered by the American Arbitration Association in accordance with its Construction Industry Arbitration Rules, and judgment upon the award rendered by the arbitrator(s) may be entered in any court having jurisdiction thereof.'],
              ['20.', 'Should PURCHASER fail to fulfill its obligations under this CONTRACT in addition to any other remedy at law or in equity that BUILDER may have or otherwise provided herein, BUILDER may retain as liquidated damages and not as a penalty, all consideration paid by PURCHASER to BUILDER, including, but not limited to the Down Payment referenced above.'],
              ['21.', "BUILDER'S failure to exercise a right or remedy, or BUILDER's acceptance of a partial or delinquent payment, will not operate as a waiver of any of BUILDER's rights, or PURCHASER's obligations, under this CONTRACT and will not constitute a waiver of BUILDER's right to declare an immediate or a subsequent default of this CONTRACT."],
              ['22.', 'This CONTRACT contains the entire understanding and agreement between the parties with respect to the WORK and supersedes all prior or contemporaneous written and oral agreements and understandings with respect to the subject matter hereof. NO ORAL PROMISES OR AGREEMENTS ARE A PART OF THIS CONTRACT.'],
            ].map(([num, text]) => (
              <p key={num} className="mb-3 text-justify text-[10pt]"><strong>{num}</strong> {text}</p>
            ))}
          </div>

          {/* ── Scope & Final Payment Clarification ────────────── */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <h2 className="text-center font-bold text-base mb-5">SCOPE OF WORK &amp; FINAL PAYMENT CLARIFICATION</h2>
            <p className="text-[10pt] mb-3">Ebony Outdoor Living and All in one Solutions's aim for customer service as our #1 priority. In order to provide you with the best possible customer experience, we are fully committed to providing you with <strong>everything</strong> written in the scope of work, specifications, and drawing.</p>
            <ul className="text-[10pt] space-y-2 mb-5 ml-2">
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
            <p className="font-bold text-center mb-2 text-[10pt]">I HAVE READ AND UNDERSTAND THE ABOVE SCOPE OF WORK AND FINAL PAYMENT CLARIFICATION.</p>
          </div>

          {/* ── Pressure-Treated Wood Info ──────────────────────── */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <h2 className="text-center font-bold text-base mb-4">PRESSURE-TREATED WOOD INFORMATION</h2>
            <ul className="text-[10pt] space-y-2 ml-1">
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
                'Pressure-treated wood comes from a Southern Yellow Pine Tree where sap/resin is prevalent. It is not uncommon for resin to seep from decking boards, especially during the warmer, sunny months. Sap is an uncontrollable and unpredictable characteristic and is not a warrantable item.',
              ].map((t, i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="font-bold text-center mt-3 text-[10pt]">I HAVE READ AND UNDERSTAND THE ABOVE CHARACTERISTICS OF PRESSURE TREATED WOOD.</p>
          </div>

          {/* ── Unforeseen Site Conditions ──────────────────────── */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <h2 className="text-center font-bold text-base mb-4">UNFORESEEN SITE CONDITIONS POLICY</h2>
            <p className="text-[10pt] mb-3">As described in Paragraph 12(a) of the Contract, the Builder Shall not be responsible for any additional work required due to unforeseen site conditions, which include but are not limited to the following:</p>
            <ul className="text-[10pt] space-y-1.5 ml-2 mb-4">
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
            <p className="text-[10pt] mb-3">If any unforeseen items are discovered during the course of your work we will immediately bring them to your attention with a recommended course of action. The labor required to correct, adjust, or work around these items will result in additional charges and work will only proceed when authorized by you.</p>
            <p className="font-bold text-[10pt]">I HAVE READ THE ABOVE UNFORESEEN SITE CONDITIONS POLICY AND AGREE TO ITS TERMS AND CONDITIONS.</p>
          </div>

          {/* ── Processing Form ─────────────────────────────────── */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <div className="text-xl font-bold mb-1" style={{ fontFamily: 'Arial, sans-serif' }}>PROCESSING FORM</div>
            <div className="border-b border-gray-400 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10pt] mb-4">
              <div><strong>Date sold:</strong> {todayS}</div>
              <div><strong>Salesperson:</strong> {salesperson}</div>
              <div><strong>Job Name:</strong> {client}</div>
              <div><strong>Contract #:</strong> {contractNum}</div>
              <div className="sm:col-span-2"><strong>Address:</strong> {address}</div>
              <div><strong>Lot #:</strong> {lotNumber || '___________'}</div>
              <div><strong>Telephone:</strong> {phone}</div>
              <div><strong>Permit #:</strong> {permitNumber || '___________'}</div>
              <div className="sm:col-span-2"><strong>Email:</strong> {email}</div>
              <div><strong>HOA:</strong> {hoa === 'yes' ? 'YES' : hoa === 'no' ? 'NO' : 'YES / NO'}</div>
              <div><strong>Permit Required:</strong> {permitReq === 'yes' ? 'YES' : permitReq === 'no' ? 'NO' : 'YES / NO'}</div>
            </div>
            {specialInstructions && (
              <div className="text-[10pt] mb-3">
                <strong>Special Instructions:</strong>
                <div className="border-b border-gray-400 mt-1 pb-2">{specialInstructions}</div>
              </div>
            )}
            {directions && (
              <div className="text-[10pt] mb-3">
                <strong>Directions to Job site:</strong>
                <div className="border-b border-gray-400 mt-1 pb-2">{directions}</div>
              </div>
            )}
            <div className="border-b border-gray-200 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10pt] mb-4">
              <div>
                <p className="font-semibold mb-1">Lumber drop ON or OFF driveway?</p>
                <p><CB checked={lumberDrop === 'on'} /> On &nbsp;&nbsp; <CB checked={lumberDrop === 'off'} /> Off</p>
                <p className="font-semibold mt-3 mb-1">Power?</p>
                <p><CB checked={power === 'yes'} /> Yes &nbsp;&nbsp; <CB checked={power === 'no'} /> No</p>
                {gateCode && <p className="mt-3"><strong>Gate Code:</strong> {gateCode}</p>}
              </div>
            </div>
          </div>

          {/* ── Scope of Work Document ──────────────────────────── */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-1">
              {logo
                ? <img src={logo} alt="logo" className="h-10 object-contain" />
                : <div className="text-base font-black tracking-widest" style={{ fontFamily: 'Arial, sans-serif' }}>{companyName.toUpperCase()}</div>
              }
              <div className="text-base font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>SCOPE OF WORK</div>
            </div>
            <div className="border-b border-gray-400 mb-4" />

            <div className="text-[10pt] mb-4 space-y-0.5">
              <p><strong>DATE:</strong> {today}</p>
              <p><strong>CONTRACT #:</strong> {contractNum}</p>
              <p><strong>CUSTOMER NAME:</strong> {client}</p>
              <p><strong>ADDRESS:</strong> {address}</p>
              <p><strong>EMAIL:</strong> {email}</p>
              <p><strong>PHONE:</strong> {phone}</p>
            </div>

            {projectSummary && (
              <div className="mb-4">
                <p className="font-bold text-[10pt] mb-1">PROJECT SUMMARY:</p>
                <p className="font-semibold text-[10pt] whitespace-pre-wrap">{projectSummary}</p>
              </div>
            )}

            {scopeBullets.length > 0 && (
              <ul className="text-[10pt] space-y-2 mb-5">
                {scopeBullets.map((b, i) => {
                  const txt = typeof b === 'string' ? b : (b?.text || b?.name || '')
                  if (!txt) return null
                  return (
                    <li key={i} className="flex gap-2"><span className="shrink-0">●</span><span className="whitespace-pre-wrap leading-snug">{txt}</span></li>
                  )
                })}
              </ul>
            )}

            <p className="font-bold text-[10pt] mb-3">GENERAL NOTES AND WARRANTIES TO THE ACCEPTED SCOPE OF WORK</p>
            <ul className="text-[10pt] space-y-2 mb-5">
              {GENERAL_NOTES.map((n, i) => (
                <li key={i} className={`flex gap-2 ${n.highlight ? 'bg-yellow-50 -mx-1 px-1 rounded' : ''}`}>
                  <span>●</span>
                  <span className={n.bold ? 'font-bold' : ''}>{n.text}</span>
                </li>
              ))}
              <li className="flex gap-2"><span>●</span><span>{ceilingFanNote}</span></li>
            </ul>

            {/* Pricing table */}
            {scopeLines.length > 0 && (
              <table className="w-full text-[10pt] border-collapse mb-5">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold"></th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold"></th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-bold text-[9px] uppercase tracking-wide">OWNER INITIALS</th>
                  </tr>
                </thead>
                <tbody>
                  {scopeLines.map((line, i) => (
                    <tr key={i}>
                      <td className="border border-gray-300 px-2 py-2 font-bold">{(line.name || '').toUpperCase()}</td>
                      <td className="border border-gray-300 px-2 py-2 font-semibold whitespace-nowrap">${fmt(line.price)}</td>
                      <td className="border border-gray-300 px-2 py-2"></td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2 font-bold">INVESTMENT TOTAL</td>
                    <td className="border border-gray-300 px-2 py-2 font-bold underline whitespace-nowrap">${fmt(total)}</td>
                    <td className="border border-gray-300 px-2 py-2"></td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Payment schedule */}
            {payments.length > 0 && (
              <>
                <table className="w-full text-[10pt] border-collapse mb-3">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-gray-300 px-2 py-2 text-left font-bold">PAYMENT SCHEDULE</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-bold w-12">%</th>
                      <th className="border border-gray-300 px-2 py-2 text-left font-bold w-28">TOTALS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-2 py-2">{p.label}</td>
                        <td className="border border-gray-300 px-2 py-2 text-center">{Math.round((p.pct || 0) * 100)}%</td>
                        <td className="border border-gray-300 px-2 py-2 font-semibold whitespace-nowrap">${fmt(p.amount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                      <td className="border border-gray-300 px-2 py-2">TOTALS</td>
                      <td className="border border-gray-300 px-2 py-2 text-center">100%</td>
                      <td className="border border-gray-300 px-2 py-2 underline whitespace-nowrap">${fmt(total)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[10px] text-gray-600 text-justify mb-2">
                  ** Initial schedule deposit paid as 20% deposit at sign. Ebony O.L. will not drop material or labor on the project until the scheduled deposit is paid in full. Ebony O.L has the rights to hold construction progress if scheduled payments are delayed.
                </p>
              </>
            )}
          </div>

          {/* ── Electrical Spec Sheet (only if applicable) ──────── */}
          {includesElectrical && (
            <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-1">
                {logo
                  ? <img src={logo} alt="logo" className="h-10 object-contain" />
                  : <div className="text-base font-black tracking-widest" style={{ fontFamily: 'Arial, sans-serif' }}>{companyName.toUpperCase()}</div>
                }
                <div className="text-base font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>ELECTRICAL SPECIFICATION</div>
              </div>
              <div className="border-b border-gray-400 mb-4" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-[10pt] mb-4">
                <div><strong>CUSTOMER NAME:</strong> {client}</div>
                <div><strong>CONTRACT #:</strong> {contractNum}</div>
                <div className="sm:col-span-2"><strong>PHONE:</strong> {homePhone || phone}{cellPhone ? ` | ${cellPhone}` : ''}</div>
              </div>

              <p className="text-[10pt] font-bold mb-2">THE FOLLOWING ELECTRICAL ITEMS ARE INCLUDED IN YOUR ABOVE REFERENCE CONTRACT:</p>
              <table className="w-full text-[10pt] border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-400 px-2 py-2 text-left font-bold">ELECTRICAL ITEM</th>
                    <th className="border border-gray-400 px-2 py-2 text-center font-bold w-16">QTY</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-400 px-2 py-2">
                      <p className="font-bold">Standard electrical package:</p>
                      <p>Prewire for (1) homeowner supplied a fan with a switch, (1) outlet and (1) flood light with a switch.</p>
                    </td>
                    <td className="border border-gray-400 px-2 py-2 text-center font-semibold">1</td>
                  </tr>
                  {elecItems.filter(i => i.qty).map(item => (
                    <tr key={item.id}>
                      <td className="border border-gray-400 px-2 py-2">
                        {item.isRecessed
                          ? <>{item.label} <span className="text-[9px]">({recessedSize === '6' ? 'X' : ' '}) 6" &nbsp; ({recessedSize === '4' ? 'X' : ' '}) 4"</span></>
                          : item.label}
                      </td>
                      <td className="border border-gray-400 px-2 py-2 text-center">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════
            SIGNATURE BLOCK — what the recipient actually fills
        ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border-2 border-blue-300 p-5 mt-4 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Your Signature</span>
            <span className="text-xs text-gray-400">— {role || 'party'}</span>
          </div>
          <h2 className="font-bold text-base mb-3">{ROLE_LABEL[role] || 'Signature'}</h2>

          <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedAll}
              onChange={e => setAgreedAll(e.target.checked)}
              className="mt-1 accent-blue-600"
            />
            <span>
              I have read and agree to <strong>all terms</strong> of this contract, including the
              Scope of Work, Final Payment Clarification, Pressure-Treated Wood Information,
              Unforeseen Site Conditions Policy{includesElectrical ? ', and Electrical Specification' : ''}.
            </span>
          </label>

          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Print Full Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Full legal name"
              value={printedName}
              onChange={e => setPrintedName(e.target.value)}
            />
          </div>

          <div className="mb-1">
            <label className="block text-sm font-semibold text-gray-600 mb-1">Signature</label>
            <SignaturePad ref={sigRef} />
          </div>
          <button className="text-xs text-gray-400 underline mt-1 mb-4 block" onClick={() => sigRef.current?.clear()}>Clear</button>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting…' : 'Sign & Submit'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Your IP address, timestamp, and device info are recorded as your legal audit trail.
          </p>
        </div>
      </div>
    </div>
  )
}
