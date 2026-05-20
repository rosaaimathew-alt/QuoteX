import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Printer, Loader2 } from 'lucide-react'

const fmt = n => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const PROJECT_TYPES = ['Deck','Screened Porch','Sunroom','Pergola','Gazebo','Open Porch']
const METHODS = ['Electronic Wire Transfer / ACH','Cash','Check','Zelle']
const GENERAL_NOTES = [
  {t:'Ebony To Provide all labor, material sufficient to complete the accepted scope',b:false},
  {t:'Ebony to secure permits and provide owner with any required HOA submission docs',b:false},
  {t:'Ebony to dispose of new construction debris per this scope',b:false},
  {t:'One year craftsmanship warranty on new work; five years on new structure',b:true},
  {t:"Manufacturer's lifetime warranty on pressure treated wood against rot, termite infestation",b:true},
  {t:'Ebony jobsign to be posted in yard for duration of project',b:false},
  {t:'Excavation soil will remain on-site to be removed',b:false},
  {t:'Cracks in concrete are normal wear and tear and are not covered by Ebony O.L. warranty',b:false},
  {t:'Ebony is not responsible for any landscaping that needs to be removed to complete work',b:false},
  {t:"Ebony is not responsible for hanging swing / daybed's, TVs mounts and or any furniture setup. We'll gladly provide reference a trusted handyman",b:false},
  {t:'Addendums: Any change resulting in additional charges must be paid at the time of the change.',b:false},
  {t:'If the inspector requires engineering it will result in an additional charge.',b:false},
  {t:'Homeowner responsible for obtaining and paying for any required Plot survey requested by county, city, or permitting departments.',b:false},
  {t:'Homeowner responsible to pay any costs associated with a sub panel if it is required to complete the electrical work',b:false},
  {t:'Homeowner responsible to check Impervious area of the property',b:false},
  {t:'Homeowner responsible to call 811 to mark the utilities',b:false,h:true},
]
const ordinal = n => { const s=['th','st','nd','rd'],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]) }
const CB = ({checked}) => <span className="inline-block w-3.5 h-3.5 border border-gray-700 mr-1 align-middle text-center text-[10px] leading-[14px]">{checked?'X':' '}</span>

// Returns the best signature dataUrl for a given role/fieldId from the signatures store
function getSig(signatures, role, fieldId) {
  const s = signatures?.[role]
  if (!s) return null
  return s.fields?.[fieldId] || s.signatureDataUrl || null
}

function SigBlock({ signatures, role, fieldId, label, date = true }) {
  const sigUrl = getSig(signatures, role, fieldId)
  const sig = signatures?.[role]
  const sigDate = sig?.signedAt ? new Date(sig.signedAt).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}) : ''
  return (
    <div className="mt-4">
      <div className="flex gap-6 items-end">
        <div className="flex-1 border-b border-gray-500 pb-5 relative min-h-[48px]">
          {sigUrl && <img src={sigUrl} alt="sig" className="absolute left-0 bottom-0.5 h-10 object-contain" />}
          {sig?.printedName && <span className="absolute left-0 -bottom-5 text-[9px] italic text-gray-500">{sig.printedName}</span>}
        </div>
        {date && (
          <div className="w-28 border-b border-gray-500 pb-5 relative">
            {sigUrl && <span className="absolute left-0 bottom-1 text-[11px] font-medium">{sigDate}</span>}
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-1">{label}{date?' / Date':''}</p>
    </div>
  )
}

function InlineSigBlock({ signatures, role, fieldId, label, withDate }) {
  const sigUrl = getSig(signatures, role, fieldId)
  const sig = signatures?.[role]
  const sigDate = sig?.signedAt ? new Date(sig.signedAt).toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'}) : ''
  if (withDate) {
    return (
      <div className="flex gap-8 mt-4">
        <div>
          <div className="border-b border-gray-500 w-48 pb-5 relative min-h-[44px]">
            {sigUrl && <img src={sigUrl} alt="sig" className="absolute left-0 bottom-0.5 h-10 object-contain" />}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">{label}</p>
        </div>
        <div>
          <div className="border-b border-gray-500 w-32 pb-5 relative">
            {sigUrl && <span className="absolute left-0 bottom-1 text-[11px] font-medium">{sigDate}</span>}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Date</p>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <div className="border-b border-gray-500 w-56 pb-5 relative min-h-[44px]">
        {sigUrl && <img src={sigUrl} alt="sig" className="absolute left-0 bottom-0.5 h-10 object-contain" />}
      </div>
      <p className="text-[10px] text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function ContractViewFull() {
  const { recordId } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch(`/api/sign/record-${recordId}`)
      .then(async r => {
        const text = await r.text()
        let parsed
        try { parsed = JSON.parse(text) } catch { throw new Error(text.slice(0,200)) }
        if (!r.ok || parsed.error) throw new Error(parsed.error || `HTTP ${r.status}`)
        return parsed
      })
      .then(d => { setRecord(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [recordId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex items-center gap-2 text-gray-500"><Loader2 size={18} className="animate-spin" /> Loading signed contract…</div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center bg-white rounded-2xl border border-red-200 p-6">
        <p className="text-red-600 font-bold mb-2">Error</p>
        <p className="text-sm font-mono text-gray-700">{error}</p>
      </div>
    </div>
  )

  const { contractData: d, contractNum, signatures = {} } = record
  let total = 0, payments = []
  if (Number.isFinite(Number(d?.total)) && Number(d?.total) > 0) {
    total = Number(d.total)
  } else {
    total = (d?.lines||[]).reduce((s,l) => s + Number(l?.qty??1)*Number(l?.price??l?.unitPrice??0), 0)
  }
  payments = Array.isArray(d?.payments) ? d.payments : []

  const client       = d?.client || ''
  const email        = d?.email  || ''
  const phone        = d?.phone  || ''
  const address      = d?.address || ''
  const salesperson  = d?.salesperson || 'Mathew Rosa'
  const projectTypes = d?.projectTypes || []
  const city         = d?.city || ''
  const lotNumber    = d?.lotNumber || ''
  const permitNumber = d?.permitNumber || ''
  const hoa          = d?.hoa
  const permitReq    = d?.permitReq
  const specialInstructions = d?.specialInstructions || ''
  const directions   = d?.directions || ''
  const lumberDrop   = d?.lumberDrop
  const power        = d?.power
  const gateCode     = d?.gateCode || ''
  const paymentMethods = d?.paymentMethods || []
  const otherTerms   = d?.otherTerms || ''
  const projectSummary = d?.projectSummary || ''
  const ceilingFanNote = d?.ceilingFanNote || 'Homeowner to provide 1 ceiling fan with downrod'
  const scopeBullets = d?.scopeBullets || []
  const scopeLines   = d?.scopeLines || []
  const includesElectrical = !!d?.includesElectrical
  const recessedSize = d?.recessedSize || '6'
  const homePhone    = d?.homePhone || ''
  const cellPhone    = d?.cellPhone || ''
  const elecItems    = d?.elecItems || []
  const branding     = d?.branding || {}
  const logo         = branding?.logo || null
  const companyName  = branding?.companyName || 'Ebony Outdoor Living'
  const isSmallContract = d?.isSmallContract ?? (total < 40000)

  const createdDate = record.createdAt ? new Date(record.createdAt) : new Date()
  const todayLong = createdDate.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
  const todayS    = createdDate.toLocaleDateString('en-US',{month:'numeric',day:'numeric',year:'numeric'})

  const S = (props) => <SigBlock signatures={signatures} {...props} />
  const I = (props) => <InlineSigBlock signatures={signatures} {...props} />

  const docStyle = {fontFamily:'Georgia,"Times New Roman",serif',fontSize:'10.5pt',lineHeight:'1.55',color:'#1a1a1a'}

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm no-print">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {logo ? <img src={logo} alt="logo" className="h-8 object-contain" /> : <span className="font-black tracking-widest text-sm">{companyName.toUpperCase()}</span>}
            <span className="text-xs text-gray-500">Contract #{contractNum} — Signed Document</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${record.status==='signed'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
              {record.status==='signed'?'Fully Signed':'Partially Signed'}
            </span>
          </div>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto my-4 px-2 sm:px-4">
        <div className="bg-white shadow-lg rounded-sm overflow-hidden" style={docStyle}>

          {/* PAGE 1 */}
          <div className="px-6 sm:px-12 py-6">
            <div className="flex justify-between items-start mb-1 gap-4">
              <div className="min-w-0">
                {logo ? <img src={logo} alt="logo" className="h-14 object-contain mb-1" />
                  : <div className="text-xl font-black tracking-widest leading-tight" style={{fontFamily:'Arial,sans-serif'}}>{companyName}</div>}
                <div className="text-2xl font-bold mt-1" style={{fontFamily:'Arial,sans-serif'}}>CONTRACT</div>
              </div>
              <div className="text-right shrink-0" style={{fontFamily:'Arial,sans-serif',fontSize:'10pt'}}>
                <div><strong>Contract #</strong> {contractNum}</div>
                <div className="text-gray-500 mt-1"><strong>Date:</strong> {todayLong}</div>
              </div>
            </div>
            <div className="border-b-2 border-gray-900 mb-5" />

            <p className="mb-4 text-justify">THIS CONTRACT made effective on the <strong>{ordinal(createdDate.getDate())}</strong> day of <strong>{createdDate.toLocaleDateString('en-US',{month:'long'})}, {createdDate.getFullYear()}</strong> In City of <strong>{city||'___________'}</strong> and the State of <strong>North Carolina</strong> by and Between <strong>{client}</strong> (PURCHASER), At <strong>{address}</strong> and <strong>Ebony Outdoor Living</strong> (BUILDER), for work to be performed at <strong>{address}</strong> (the PREMISES).</p>

            <p className="mb-1 flex flex-wrap gap-x-4 gap-y-1">{PROJECT_TYPES.map(t => <span key={t}><CB checked={projectTypes.includes(t)} />{t}</span>)}</p>
            <p className="mb-1">( &nbsp; ) Other _______________________________________________________________________________</p>
            <div className="border-b border-gray-300 mb-4 mt-2" />

            <p className="mb-3 text-justify"><strong>1.</strong> BUILDER shall furnish services for the WORK for consideration of <strong>${fmt(total)}</strong>.</p>
            <p className="mb-1"><strong>2.</strong> Payment as follows:</p>
            {payments[0] && <p className="mb-1 font-bold">{payments[0].label} ${fmt(payments[0].amount)}</p>}
            {payments.length > 1 && <table className="w-full text-sm mb-3"><tbody>{payments.slice(1).map((p,i) => <tr key={i}><td className="pr-4 pb-1.5 font-semibold w-36">${fmt(p.amount)}</td><td className="pb-1.5 border-b border-gray-400">{p.label}</td></tr>)}</tbody></table>}
            <p className="mb-3">Down payment by {METHODS.map(m => <span key={m} className="mr-3 inline-block"><CB checked={paymentMethods.includes(m)} />{m}</span>)}</p>
            <p className="mb-4"><strong>3. OTHER TERMS:</strong> {otherTerms || <span className="inline-block w-64 border-b border-gray-400">&nbsp;</span>}</p>

            {[['4.','THE Down Payment may be used to purchase material necessary for performance of the WORK. BUILDER shall be entitled to final payment upon substantial completion of the WORK.'],['5.','Modification to the WORK or CONTRACT will be made only when a written addendum describing such modification has been signed by both PURCHASER and BUILDER.'],['6. a.','The WORK will be warranted by BUILDER. This Warrant is issued to and only applicable to the PURCHASER after payment in full of the TOTAL CONTRACT SUM.']].map(([n,t]) => <p key={n} className="mb-3 text-justify text-[10pt]"><strong>{n}</strong> {t}</p>)}
            {!isSmallContract && <p className="mb-3 text-justify text-[10pt]"><strong>B.</strong> As General contractors we have <strong>All-In-One Solutions</strong> that operate as part of Ebony Outdoor Living team.</p>}
            <p className="mb-4 text-[10pt]"><strong>7.</strong> This CONTRACT shall not be effective and binding upon BUILDER until countersigned by BUILDER and GENERAL CONTRACTOR.</p>
            <p className="text-center font-bold mb-3">ADDITIONAL TERMS ON NEXT PAGE</p>

            {isSmallContract ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <div><p className="font-bold underline mb-2">PURCHASER</p><S fieldId="c-page1" role="client" label="Signature" date={false} /></div>
                <div><p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p><S fieldId="b-page1" role="builder" label="Signature" date={false} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                <div><p className="font-bold underline mb-2">PURCHASER</p><S fieldId="c-page1" role="client" label="Signature" date={false} /></div>
                <div>
                  <p className="font-bold underline mb-2">BUILDER: EBONY OUTDOOR LIVING</p><S fieldId="b-page1" role="builder" label="Signature" date={false} />
                  <p className="font-bold mt-3">GENERAL CONTRACTOR: ALL IN ONE SOLUTIONS</p><S fieldId="g-page1" role="gc" label="Signature" date={false} />
                </div>
              </div>
            )}

            <p className="mt-3 text-[10pt] underline">115 Unionville Indian Trail Road, Indian Trail, NC 28079 Unit B15</p>
            <p className="text-[10px] text-gray-500 mb-4">(Builder Address)</p>

            {[['8.','BUILDER shall obtain applicable permits and inspections.'],['9.','PURCHASER shall provide sufficient electricity for the continuous operation of BUILDER\'s equipment.'],['10. a.',"PURCHASER agrees that should BUILDER encounter unforeseen site conditions on the PREMISES which would substantially interfere with BUILDER's completion of the WORK, BUILDER may require an addendum."],['b.',"PURCHASER agrees that BUILDER shall not be responsible for unforeseen site conditions on the PREMISES discovered or occurring after completion of the WORK."],['c.','PURCHASER shall mark the location of underground drain lines, sprinkler systems, septic tanks, septic fields or other obstructions.'],['11.',"BUILDER is not responsible or liable for delays in the commencement or completion of the WORK that are result of conditions beyond BUILDER's control."],['12.','If described as part of the WORK, this CONTRACT includes the cost of installing utility hardware or fixtures.'],['13.','Unless specifically set forth in the description of the WORK, BUILDER shall not move or dispose of soil excavated while performing the WORK.'],['14. a.',"PURCHASER acknowledges and agrees that all drawings, plans, sketches, renderings, models and designs remain the sole property of BUILDER."],['b.','PURCHASER acknowledges that the services to be provided by BUILDER hereunder are limited to construction services and shall not include any architectural or engineering services.'],['C.','PURCHASER acknowledges that technical field changes shall not constitute a modification to the WORK.'],['15.',"PURCHASER agrees that materials required for the completion of the WORK be delivered and stored at the PREMISES."],['16.',"PURCHASER recognizes and acknowledges that during the performance of the WORK, certain hazardous conditions could exist in the area of the WORK."],['17.',"BUILDER is independently owned. PURCHASER acknowledges and agrees that this CONTRACT is made solely with BUILDER."],['18.','If any provision, sentence, phrase or word of this CONTRACT or the application thereof to any person or circumstance shall be held invalid, the remainder of the CONTRACT shall not be affected thereby.'],['19.','This CONTRACT is made and shall be construed under the laws of the State set forth in the first paragraph hereof.'],['20.','Should PURCHASER fail to fulfill its obligations under this CONTRACT, BUILDER may retain as liquidated damages all consideration paid by PURCHASER to BUILDER.'],['21.',"BUILDER'S failure to exercise a right or remedy will not operate as a waiver of any of BUILDER's rights."],['22.','This CONTRACT contains the entire understanding and agreement between the parties with respect to the WORK. NO ORAL PROMISES OR AGREEMENTS ARE A PART OF THIS CONTRACT.']].map(([n,t]) => <p key={n} className="mb-3 text-justify text-[10pt]"><strong>{n}</strong> {t}</p>)}

            <S fieldId="c-clauses" role="client"  label="Client Signature" />
            <S fieldId="b-clauses" role="builder" label="Builder Signature" />
            {!isSmallContract && <S fieldId="g-clauses" role="gc" label="GC Signature" />}
          </div>

          {/* Scope & Final Payment Clarification */}
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
              ].map((t,i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="font-bold text-center mb-2 text-[10pt]">I HAVE READ AND UNDERSTAND THE ABOVE SCOPE OF WORK AND FINAL PAYMENT CLARIFICATION.</p>
            <I fieldId="c-scope-clarity" role="client" label="Signature" />
          </div>

          {/* PT Wood */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <h2 className="text-center font-bold text-base mb-4">PRESSURE-TREATED WOOD INFORMATION</h2>
            <ul className="text-[10pt] space-y-2 ml-1 mb-4">
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
              ].map((t,i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="font-bold text-center mt-3 mb-3 text-[10pt]">I HAVE READ AND UNDERSTAND THE ABOVE CHARACTERISTICS OF PRESSURE TREATED WOOD.</p>
            <I fieldId="c-ptwood" role="client" label="Signature" withDate />
          </div>

          {/* Unforeseen */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <h2 className="text-center font-bold text-base mb-4">UNFORESEEN SITE CONDITIONS POLICY</h2>
            <p className="text-[10pt] mb-3">As described in Paragraph 12(a) of the Contract, the Builder Shall not be responsible for any additional work required due to unforeseen site conditions, which include but are not limited to the following:</p>
            <ul className="text-[10pt] space-y-1.5 ml-2 mb-4">
              {[
                'Soil that will not pass building inspector requirements','Concealed plumbing, electrical lines, gas lines and mechanical lines',
                'Engineer required by building inspector (and subsequent delay waiting for the engineer)','Unforeseen load bearing walls','Rotten wood','Insect infested wood','Mold',
                'Irrigation lines and sprinkler heads','Tree roots',
                'Subsequent interior damage or exterior brick/siding damage due to construction vibrations or demolition',
                'New cracks may develop as materials are dropped in your driveway. This is an inherent risk on behalf of the homeowner and Ebony Outdoor Living is not responsible for the repair of your driveway.',
                'Should we need to cut drywall for an inspection to take place or for the specific placement of an electrical box, the drywall repair and subsequent paint touchup will be an additional change to the contract.',
                'Reconnection of existing cables, wires, internet, security systems etc., due to construction demolition or new door frame.',
                'Any concrete removal is assumed the concrete is 4" thick or less. If through the course of demolition it is discovered the concrete is thicker than 4", there will be an additional charge to account for the additional labor and haul fees.',
                'Permit delays',
              ].map((t,i) => <li key={i} className="flex gap-2"><span>●</span><span>{t}</span></li>)}
            </ul>
            <p className="text-[10pt] mb-3">If any unforeseen items are discovered during the course of your work we will immediately bring them to your attention with a recommended course of action. The labor required to correct, adjust, or work around these items will result in additional charges and work will only proceed when authorized by you.</p>
            <p className="font-bold text-[10pt] mb-6">I HAVE READ THE ABOVE UNFORESEEN SITE CONDITIONS POLICY AND AGREE TO ITS TERMS AND CONDITIONS.</p>
            <I fieldId="c-unforeseen" role="client" label="Signature" />
          </div>

          {/* Processing Form */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <div className="text-xl font-bold mb-1" style={{fontFamily:'Arial,sans-serif'}}>PROCESSING FORM</div>
            <div className="border-b border-gray-400 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[10pt] mb-4">
              <div><strong>Date sold:</strong> {todayS}</div><div><strong>Salesperson:</strong> {salesperson}</div>
              <div><strong>Job Name:</strong> {client}</div><div><strong>Contract #:</strong> {contractNum}</div>
              <div className="sm:col-span-2"><strong>Address:</strong> {address}</div>
              <div><strong>Lot #:</strong> {lotNumber||'___________'}</div><div><strong>Telephone:</strong> {phone}</div>
              <div><strong>Permit #:</strong> {permitNumber||'___________'}</div><div className="sm:col-span-2"><strong>Email:</strong> {email}</div>
              <div><strong>HOA:</strong> {hoa==='yes'?'YES':hoa==='no'?'NO':'YES / NO'}</div>
              <div><strong>Permit Required:</strong> {permitReq==='yes'?'YES':permitReq==='no'?'NO':'YES / NO'}</div>
            </div>
            {specialInstructions && <div className="text-[10pt] mb-3"><strong>Special Instructions:</strong><div className="border-b border-gray-400 mt-1 pb-2">{specialInstructions}</div></div>}
            {directions && <div className="text-[10pt] mb-3"><strong>Directions:</strong><div className="border-b border-gray-400 mt-1 pb-2">{directions}</div></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10pt] mb-4">
              <div>
                <p className="font-semibold mb-1">Lumber drop ON or OFF driveway?</p>
                <p><CB checked={lumberDrop==='on'}/> On &nbsp;&nbsp; <CB checked={lumberDrop==='off'}/> Off</p>
                <p className="font-semibold mt-3 mb-1">Power?</p>
                <p><CB checked={power==='yes'}/> Yes &nbsp;&nbsp; <CB checked={power==='no'}/> No</p>
                {gateCode && <p className="mt-3"><strong>Gate Code:</strong> {gateCode}</p>}
              </div>
              <div className="border border-gray-400 rounded flex items-center justify-center h-32 text-gray-400 text-[10px] text-center p-2">Site diagram</div>
            </div>
            <I fieldId="c-processing" role="client" label="Client Signature" withDate />
          </div>

          {/* Client Acknowledgment */}
          {!isSmallContract && (
            <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
              <h2 className="text-center font-bold text-base mb-5">Client Acknowledgment and Agreement</h2>
              <div className="text-[10pt] space-y-4">
                <p>At <strong>Ebony Outdoor Living</strong>, we are committed to transparency, contractual clarity, and professional communication with our clients. This document is intended to formalize the understanding between the parties regarding the operational structure and distribution of responsibilities related to the contracted project. Ebony Outdoor Living and <strong>All-In-One Solutions</strong> operate collaboratively as part of the same project team. All-In-One Solutions serves as the licensed General Contractor and is responsible for maintaining the applicable licenses and overall legal and regulatory compliance required for the project.</p>
                <p>Ebony Outdoor Living is solely responsible for the execution and management of the work, including, without limitation, project supervision, scheduling and timeline management, coordination of crews and subcontractors, and daily job site operations. The Client acknowledges and agrees that all communications, requests, clarifications, or questions related to project execution, timelines, scheduling, and operational responsibilities shall be directed exclusively to the official contacts provided to the Client upon receipt of the fully executed contract.</p>
                <p>All-In-One Solutions also acts as a general supervisor of the project, performing occasional site visits during the progress of the work for purposes of overall oversight and supervision. However, All-In-One Solutions is not involved in the daily management of the job site, operational coordination of crews, or direct execution of the services.</p>
                <p>This acknowledgment is supplementary in nature and forms part of the project's contractual documentation, without replacing or modifying the terms and conditions of the primary agreement previously executed between the parties.</p>
                <p>By signing below, the Client confirms that they have read, understood, and fully agree with the information and distribution of responsibilities described in this document.</p>
              </div>
              <p className="text-[10pt] mt-4"><strong>Project Address:</strong> {address}</p>
              <S fieldId="c-ack" role="client"  label="Client Signature" />
              <S fieldId="b-ack" role="builder" label="Builder Signature" />
              <S fieldId="g-ack" role="gc"      label="General Contractor Signature" date={false} />
            </div>
          )}

          {/* Scope of Work */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-1">
              {logo ? <img src={logo} alt="logo" className="h-10 object-contain" />
                : <div className="text-base font-black tracking-widest" style={{fontFamily:'Arial,sans-serif'}}>{companyName.toUpperCase()}</div>}
              <div className="text-base font-bold" style={{fontFamily:'Arial,sans-serif'}}>SCOPE OF WORK</div>
            </div>
            <div className="border-b border-gray-400 mb-4" />
            <div className="text-[10pt] mb-4 space-y-0.5">
              <p><strong>DATE:</strong> {todayLong}</p><p><strong>CONTRACT #:</strong> {contractNum}</p>
              <p><strong>CUSTOMER NAME:</strong> {client}</p><p><strong>ADDRESS:</strong> {address}</p>
              <p><strong>EMAIL:</strong> {email}</p><p><strong>PHONE:</strong> {phone}</p>
            </div>
            {projectSummary && <div className="mb-4"><p className="font-bold text-[10pt] mb-1">PROJECT SUMMARY:</p><p className="font-semibold text-[10pt] whitespace-pre-wrap">{projectSummary}</p></div>}
            {scopeBullets.length > 0 && <ul className="text-[10pt] space-y-2 mb-5">{scopeBullets.map((b,i) => { const txt=typeof b==='string'?b:(b?.text||b?.name||''); return txt?<li key={i} className="flex gap-2"><span>●</span><span className="whitespace-pre-wrap">{txt}</span></li>:null })}</ul>}
            <p className="font-bold text-[10pt] mb-3">GENERAL NOTES AND WARRANTIES TO THE ACCEPTED SCOPE OF WORK</p>
            <ul className="text-[10pt] space-y-2 mb-5">{GENERAL_NOTES.map((n,i) => <li key={i} className={`flex gap-2 ${n.h?'bg-yellow-50 -mx-1 px-1 rounded':''}`}><span>●</span><span className={n.b?'font-bold':''}>{n.t}</span></li>)}<li className="flex gap-2"><span>●</span><span>{ceilingFanNote}</span></li></ul>

            {scopeLines.length > 0 && (
              <table className="w-full text-[10pt] border-collapse mb-5">
                <thead><tr className="bg-gray-100"><th className="border border-gray-300 px-2 py-2 text-left font-bold"></th><th className="border border-gray-300 px-2 py-2 text-left font-bold"></th><th className="border border-gray-300 px-2 py-2 text-center font-bold text-[9px] uppercase tracking-wide">OWNER INITIALS</th></tr></thead>
                <tbody>
                  {scopeLines.map((line,i) => {
                    const initSig = getSig(signatures,'client',`c-init-${i}`) || signatures?.client?.signatureDataUrl
                    return <tr key={i}><td className="border border-gray-300 px-2 py-2 font-bold">{(line.name||'').toUpperCase()}</td><td className="border border-gray-300 px-2 py-2 font-semibold whitespace-nowrap">${fmt(line.price)}</td><td className="border border-gray-300 px-2 py-1.5 w-24 text-center">{initSig ? <img src={initSig} alt="initials" className="h-6 mx-auto object-contain" /> : null}</td></tr>
                  })}
                  <tr className="bg-gray-50"><td className="border border-gray-300 px-2 py-2 font-bold">INVESTMENT TOTAL</td><td className="border border-gray-300 px-2 py-2 font-bold underline whitespace-nowrap">${fmt(total)}</td><td className="border border-gray-300 px-2 py-2"></td></tr>
                  {['ADDENDUM #1:','ADDENDUM #2:'].map(l => <tr key={l}><td className="border border-gray-300 px-2 py-2 font-bold">{l}</td><td className="border border-gray-300 px-2 py-2"></td><td className="border border-gray-300 px-2 py-2"></td></tr>)}
                  <tr className="bg-gray-50"><td className="border border-gray-300 px-2 py-2 font-bold">TOTAL AFTER ADDENDUMS</td><td className="border border-gray-300 px-2 py-2"></td><td className="border border-gray-300 px-2 py-2"></td></tr>
                </tbody>
              </table>
            )}

            {payments.length > 0 && (
              <>
                <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full min-w-[480px] text-[10pt] border-collapse mb-3">
                  <thead><tr className="bg-blue-50">{['PAYMENT SCHEDULE','EOL','ADDENDUMS','TOTALS','PYM'].map(h => <th key={h} className="border border-gray-300 px-2 py-2 text-left font-bold">{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map((p,i) => <tr key={i}><td className="border border-gray-300 px-2 py-2">{p.label}</td><td className="border border-gray-300 px-2 py-2 text-center">{Math.round((p.pct||0)*100)}%</td><td className="border border-gray-300 px-2 py-2"></td><td className="border border-gray-300 px-2 py-2 font-semibold underline whitespace-nowrap">${fmt(p.amount)}</td><td className="border border-gray-300 px-2 py-2"></td></tr>)}
                    <tr className="bg-gray-50 font-bold"><td className="border border-gray-300 px-2 py-2">TOTALS</td><td className="border border-gray-300 px-2 py-2 text-center">100%</td><td className="border border-gray-300 px-2 py-2"></td><td className="border border-gray-300 px-2 py-2 underline whitespace-nowrap">${fmt(total)}</td><td className="border border-gray-300 px-2 py-2"></td></tr>
                  </tbody>
                </table>
                </div>
                <p className="text-[10px] text-gray-600 text-justify mb-6">** Initial schedule deposit paid as 20% deposit at sign.</p>
                <S fieldId="c-scope-final" role="client"  label="Client signature" />
                <S fieldId="b-scope-final" role="builder" label="Builder signature" />
              </>
            )}
          </div>

          {/* Electrical */}
          {includesElectrical && (
            <div className="px-6 sm:px-12 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-1">
                {logo ? <img src={logo} alt="logo" className="h-10 object-contain" />
                  : <div className="text-base font-black tracking-widest" style={{fontFamily:'Arial,sans-serif'}}>{companyName.toUpperCase()}</div>}
                <div className="text-base font-bold" style={{fontFamily:'Arial,sans-serif'}}>ELECTRICAL SPECIFICATION</div>
              </div>
              <div className="border-b border-gray-400 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-[10pt] mb-4"><div><strong>CUSTOMER:</strong> {client}</div><div><strong>CONTRACT #:</strong> {contractNum}</div></div>
              <table className="w-full text-[10pt] border-collapse mb-4">
                <thead><tr><th className="border border-gray-400 px-2 py-2 text-left font-bold">ELECTRICAL ITEM</th><th className="border border-gray-400 px-2 py-2 text-center font-bold w-16">QTY</th></tr></thead>
                <tbody>
                  <tr><td className="border border-gray-400 px-2 py-2"><p className="font-bold">Standard electrical package</p></td><td className="border border-gray-400 px-2 py-2 text-center">1</td></tr>
                  {elecItems.filter(i=>i.qty).map(item => <tr key={item.id}><td className="border border-gray-400 px-2 py-2">{item.label}</td><td className="border border-gray-400 px-2 py-2 text-center">{item.qty}</td></tr>)}
                </tbody>
              </table>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-5">
                <div><S fieldId="c-elec-1" role="client" label="Customer(s) Signature" /><S fieldId="c-elec-2" role="client" label="Customer(s) Signature" /></div>
                <div><S fieldId="b-elec" role="builder" label="Builder Signature" /></div>
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="px-6 sm:px-12 py-6 border-t border-gray-200 bg-gray-50 no-print">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Signature Audit Trail</p>
            <div className="space-y-2">
              {['client','builder','gc'].map(r => {
                const sig = signatures[r]
                if (!sig) return <div key={r} className="text-xs text-gray-400">{r}: not signed</div>
                return (
                  <div key={r} className="text-xs text-gray-600 font-mono bg-white rounded p-2 border border-gray-200">
                    <span className="font-bold text-gray-800">{r}</span> — {sig.printedName} — {new Date(sig.signedAt).toLocaleString()} — IP: {sig.ip}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
