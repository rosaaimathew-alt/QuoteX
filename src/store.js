import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from './supabase'
import { DEMO, DEMO_STORE_KEY, buildDemoSeed } from './demo'
import { HISTORICAL_JOBS, HISTORICAL_APPTS } from './historicalData'

// Demo builds persist ONLY to the visitor's own browser under a separate key and
// never touch the backend / Vercel KV — see smartStorage swap in persist config.
const demoLocalStorage = {
  getItem:    (name) => { try { return localStorage.getItem(name) } catch { return null } },
  setItem:    (name, value) => { try { localStorage.setItem(name, value) } catch { /* ignore */ } },
  removeItem: (name) => { try { localStorage.removeItem(name) } catch { /* ignore */ } },
}

// Smart storage: the shared server (Vercel KV via /api/store) is the source of
// truth. Every signed-in write is pushed up automatically, and every read
// MERGES the server copy with this device's local copy — a union that never
// drops records — so data can never get stranded on a single device again.
const STORE_KEY = 'quotex-store'
let _initial = null // cached promise for the first GET

// Persistence is BLOCKED until the initial load (hydration) completes. This is
// a hard safety net: before real data arrives the store holds its empty startup
// state, and without this guard any early write would save that emptiness over
// the real data in both localStorage and the KV server. Flipped true in
// persist's onRehydrateStorage callback, which fires after hydration finishes.
let _hydrated = false

function _token() {
  try { return localStorage.getItem('qx_token') } catch { return null }
}

// ── Supabase per-organization data ─────────────────────────────────────────
// When the user has a Supabase session, their org's data document (org_stores)
// is the source of truth. Without a session, everything falls back to the
// legacy KV/localStorage path below — so the app is unchanged until sign-in.
let _orgIdCache = null
export function _resetOrgCache() { _orgIdCache = null }

async function _orgContext() {
  if (!supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    if (_orgIdCache) return _orgIdCache
    const { data } = await supabase.from('memberships').select('org_id').eq('user_id', session.user.id).maybeSingle()
    _orgIdCache = data?.org_id || null
    return _orgIdCache
  } catch {
    return null
  }
}
function _authHeaders(extra = {}) {
  const token = _token()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra }
}

// Fire-and-forget push of the full persisted state to the shared server.
function _pushToServer(value) {
  if (!_token()) return // not signed in — nothing to push to
  fetch('/api/store', {
    method: 'POST',
    headers: _authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ value }),
  }).catch(() => {})
}

// Most-recent timestamp on a proposal, used to resolve same-id conflicts.
function _score(p) {
  let m = 0
  for (const k of ['updatedAt', 'closedAt', 'sentAt', 'createdAt']) {
    const t = p && p[k] ? Date.parse(p[k]) : 0
    if (t && t > m) m = t
  }
  return m
}
function _unionById(a = [], b = [], newerWins = false) {
  const map = new Map()
  for (const it of (a || [])) if (it && it.id != null) map.set(it.id, it)
  for (const it of (b || [])) {
    if (!it || it.id == null) continue
    const ex = map.get(it.id)
    if (!ex) { map.set(it.id, it); continue }
    map.set(it.id, newerWins ? (_score(it) >= _score(ex) ? it : ex) : it)
  }
  return [...map.values()]
}

// How much nested content a proposal carries — used to break merge ties when
// dates are equal (adding a change order/stage/note doesn't change the top-level
// date, so without this a stale copy would win and the change wouldn't sync).
function _richness(p) {
  const j = p?.jobData || {}
  return (p?.lines?.length || 0)
    + (p?.activities?.length || 0)
    + (p?.reminders?.length || 0)
    + (j.changeOrders?.length || 0)
    + (j.completedStages?.length || 0)
    + (j.dailyLogs?.length || 0)
    + (j.warrantyItems?.length || 0)
    + Object.keys(j.stageDates || {}).length
    + (j.startDate ? 1 : 0) + (j.targetDate ? 1 : 0)
}

// Merge proposal lists: newest by date wins; on a date tie, the copy with more
// nested content wins (so change orders, stages and notes propagate reliably).
function _mergeProposals(server = [], local = []) {
  const map = new Map()
  for (const p of (server || [])) if (p && p.id != null) map.set(p.id, p)
  for (const p of (local || [])) {
    if (!p || p.id == null) continue
    const ex = map.get(p.id)
    if (!ex) { map.set(p.id, p); continue }
    const sp = _score(p), se = _score(ex)
    if (sp > se) map.set(p.id, p)
    else if (sp === se && _richness(p) >= _richness(ex)) map.set(p.id, p)
    // otherwise keep the existing (server) copy
  }
  return [...map.values()]
}

// Pick the customized side of a singleton slice (a rate map, a lock flag, a scope
// string). Prefer the local value when it exists and differs from the factory
// default; otherwise take the server value if it's been customized; otherwise fall
// back to whichever value is present (default last). Keeps a second device's
// untouched defaults from overwriting rates a manager actually set.
function _preferCustomized(local, server, def) {
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  if (local !== undefined && !eq(local, def)) return local
  if (server !== undefined && !eq(server, def)) return server
  if (local !== undefined) return local
  if (server !== undefined) return server
  return def
}

// Merge two persisted store strings ({state, version}) into one. Union of all
// record lists (proposals newest-wins), max of id counters. Never loses data.
export function mergeStoreStrings(serverStr, localStr) {
  let S, L
  try { S = JSON.parse(serverStr) } catch { return localStr }
  try { L = JSON.parse(localStr) } catch { return serverStr }
  const s = S.state || {}, l = L.state || {}
  const merged = { ...s, ...l } // local wins for scalar settings (branding, theme…)
  merged.proposals        = _mergeProposals(s.proposals, l.proposals)
  merged.catalog          = _unionById(s.catalog, l.catalog)
  merged.templates        = _unionById(s.templates, l.templates)
  merged.scopeTemplates   = _unionById(s.scopeTemplates, l.scopeTemplates)
  merged.paymentSchedules = _unionById(s.paymentSchedules, l.paymentSchedules)
  merged.subcontractors   = _unionById(s.subcontractors, l.subcontractors)
  merged.standaloneChangeOrders = _unionById(s.standaloneChangeOrders, l.standaloneChangeOrders, true)
  merged.todos            = _unionById(s.todos, l.todos, true)
  merged.plannedProjects  = _unionById(s.plannedProjects, l.plannedProjects, true)
  merged.emailTemplates   = _unionById(s.emailTemplates, l.emailTemplates)
  merged.financeCards     = _unionById(s.financeCards, l.financeCards)
  merged.expenses         = _unionById(s.expenses, l.expenses, true)
  merged.jobCosts         = { ...(s.jobCosts || {}), ...(l.jobCosts || {}) }
  // Manager-set deck/porch pricing. Without these explicit merges the wholesale
  // {...s, ...l} above lets a second device's untouched defaults win, silently
  // resetting customized rates on cross-device sync. Union the custom-component
  // lists by id (keep both devices' lines); for the rate maps, lock flags and
  // scope strings prefer the customized (non-default) side.
  merged.deckCustomComponents  = _unionById(s.deckCustomComponents,  l.deckCustomComponents)
  merged.porchCustomComponents = _unionById(s.porchCustomComponents, l.porchCustomComponents)
  merged.deckComponentRates  = _preferCustomized(l.deckComponentRates,  s.deckComponentRates,  DECK_COMPONENT_DEFAULTS)
  merged.porchComponentRates = _preferCustomized(l.porchComponentRates, s.porchComponentRates, PORCH_COMPONENT_DEFAULTS)
  merged.deckFormulaLocked   = _preferCustomized(l.deckFormulaLocked,   s.deckFormulaLocked,   false)
  merged.porchFormulaLocked  = _preferCustomized(l.porchFormulaLocked,  s.porchFormulaLocked,  false)
  merged.deckScopeTemplate   = _preferCustomized(l.deckScopeTemplate,   s.deckScopeTemplate,   DECK_SCOPE_DEFAULT)
  merged.porchScopeTemplate  = _preferCustomized(l.porchScopeTemplate,  s.porchScopeTemplate,  PORCH_SCOPE_DEFAULT)
  for (const k of ['nextCatalogId', 'nextProposalId', 'nextTemplateId', 'nextScopeTemplateId', 'nextPaymentScheduleId', 'nextSubId']) {
    const v = Math.max(Number(s[k]) || 0, Number(l[k]) || 0)
    if (v) merged[k] = v
  }
  return JSON.stringify({ state: merged, version: Math.max(Number(S.version) || 0, Number(L.version) || 0) })
}

function _proposalCount(str) {
  try { return (JSON.parse(str).state?.proposals || []).length } catch { return 0 }
}

function _fetchInitial() {
  if (!_initial) {
    _initial = fetch('/api/store', { headers: _authHeaders(), signal: AbortSignal.timeout(6000) })
      .then(async r => {
        if (!r.ok) return { reachable: false, data: null } // offline / not signed in
        const text = await r.text()
        return { reachable: true, data: (text && text !== 'null') ? text : null }
      })
      .catch(() => ({ reachable: false, data: null }))
  }
  return _initial
}

const smartStorage = {
  getItem: async (name) => {
    // ── Supabase org path (active only when signed in) ──
    const orgId = await _orgContext()
    if (orgId) {
      try {
        const { data: row } = await supabase.from('org_stores').select('data').eq('org_id', orgId).maybeSingle()
        const stored = row?.data
        if (stored && Object.keys(stored).length > 0) return JSON.stringify(stored)
        // Org document is empty → one-time migration: seed it from this device's
        // existing local data (never deletes anything).
        let seed = null
        try { seed = localStorage.getItem(name) } catch {}
        if (seed) {
          try {
            const parsed = JSON.parse(seed)
            if ((parsed?.state?.proposals?.length || 0) > 0) {
              await supabase.from('org_stores').upsert({ org_id: orgId, data: parsed, updated_at: new Date().toISOString() })
              return seed
            }
          } catch {}
        }
        return null // fresh org, nothing to seed yet
      } catch {
        // fall through to legacy on transient error
      }
    }

    // ── Legacy path (KV + localStorage) ──
    const { reachable, data: serverStr } = await _fetchInitial()
    let localStr = null
    try { localStr = localStorage.getItem(name) } catch {}

    // Couldn't reach or authenticate with the server — use local only, and never
    // touch the server (we can't tell if it holds data we simply couldn't read).
    if (!reachable) return localStr

    if (!localStr)  return serverStr                       // nothing local → server wins
    if (!serverStr) { _pushToServer(localStr); return localStr } // server empty → seed it from local

    // Both have data → merge. The merge keeps the richer/newer copy of every
    // record, so `merged` is always a superset — pushing it heals the server
    // whenever this device holds something the server was missing (e.g. a change
    // order added on another device that hadn't synced up).
    const merged = mergeStoreStrings(serverStr, localStr)
    if (merged !== serverStr) _pushToServer(merged)
    try { localStorage.setItem(name, merged) } catch {}
    return merged
  },

  setItem: async (name, value) => {
    // Never persist before hydration completes — otherwise the empty startup
    // state could overwrite real data locally and on the server.
    if (!_hydrated) return
    try { localStorage.setItem(name, value) } catch {} // fast local cache + offline copy
    const orgId = await _orgContext()
    if (orgId) {
      try {
        await supabase.from('org_stores').upsert({ org_id: orgId, data: JSON.parse(value), updated_at: new Date().toISOString() })
        return
      } catch { /* fall through to legacy */ }
    }
    _pushToServer(value) // legacy shared-KV sync
  },

  removeItem: (name) => localStorage.removeItem(name),
}

// Manual merge-up used by the Settings "Push to server" button: pulls the
// current server copy, unions this browser's data into it, and saves the
// result — so it merges rather than overwrites.
export async function syncThisDeviceUp() {
  const token = _token()
  if (!token) throw new Error('Please sign in first.')
  let localStr = null
  try { localStr = localStorage.getItem(STORE_KEY) } catch {}
  if (!localStr) throw new Error('No data found in this browser to sync.')

  let serverStr = null
  try {
    const r = await fetch('/api/store', { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) { const t = await r.text(); serverStr = (t && t !== 'null') ? t : null }
  } catch {}

  const merged = serverStr ? mergeStoreStrings(serverStr, localStr) : localStr
  const res = await fetch('/api/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value: merged }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `Server returned ${res.status}. Try signing out and back in.`)
  }
  return { count: _proposalCount(merged) }
}

const SEED_CATALOG = [
  { id: 1, name: 'Chain Link Fence Installation', description: 'Supply and install chain link fence with posts set in concrete, including all hardware.', unit: 'LF', unitPrice: 22, minPrice: 18, maxPrice: 28, count: 12, category: 'Fencing', confidence: 95 },
  { id: 2, name: 'Wood Privacy Fence (6ft Cedar)', description: 'Supply and install 6ft cedar privacy fence with pressure-treated posts set in concrete, including all hardware and fasteners.', unit: 'LF', unitPrice: 38, minPrice: 32, maxPrice: 46, count: 18, category: 'Fencing', confidence: 97 },
  { id: 3, name: 'Fence Post (Set in Concrete)', description: 'Set fence post in concrete footing, including excavation and backfill.', unit: 'EA', unitPrice: 45, minPrice: 38, maxPrice: 55, count: 22, category: 'Fencing', confidence: 94 },
  { id: 4, name: 'Single Walk Gate', description: 'Supply and install single walk gate with hardware, hinges, and latch.', unit: 'EA', unitPrice: 320, minPrice: 265, maxPrice: 390, count: 15, category: 'Gates', confidence: 92 },
  { id: 5, name: 'Double Drive Gate', description: 'Supply and install double drive gate with hardware, hinges, drop rod, and latch.', unit: 'EA', unitPrice: 680, minPrice: 580, maxPrice: 800, count: 9, category: 'Gates', confidence: 89 },
  { id: 6, name: 'Fence Removal & Haul-off', description: 'Remove existing fence and haul off all debris.', unit: 'LF', unitPrice: 8, minPrice: 6, maxPrice: 12, count: 14, category: 'Demo', confidence: 91 },
  { id: 7, name: 'Debris Haul-off', description: 'Load and haul off job site debris.', unit: 'EA', unitPrice: 175, minPrice: 150, maxPrice: 210, count: 11, category: 'Demo', confidence: 88 },
  { id: 8, name: 'Vinyl Fence Installation', description: 'Supply and install vinyl fence panels with posts set in concrete.', unit: 'LF', unitPrice: 44, minPrice: 37, maxPrice: 52, count: 7, category: 'Fencing', confidence: 85 },
  { id: 9, name: 'Aluminum Fence Installation', description: 'Supply and install aluminum fence panels with posts set in concrete.', unit: 'LF', unitPrice: 52, minPrice: 44, maxPrice: 62, count: 6, category: 'Fencing', confidence: 83 },
  { id: 10, name: 'Concrete Footing (per post)', description: 'Pour concrete footing for fence post, including excavation.', unit: 'EA', unitPrice: 28, minPrice: 22, maxPrice: 35, count: 20, category: 'Materials', confidence: 96 },
]

// Deck Builder pricing lives in one place (the "Deck Builder Pricing" editor,
// opened from the Item Catalog) instead of loose catalog rows.
//
//  • Per-collection prices (decking $/LF AND fascia $/LF) ride on each
//    "… Porch Floor Upgrade" catalog item — decking in unitPrice/cost, fascia in
//    the fasciaRate/fasciaCost fields — so every collection carries its own two prices.
//  • Shared component rates (framing, stairs, railing, etc.) that don't vary by
//    collection live in the `deckComponentRates` slice below.
// The Deck Builder reads from both; nothing is typed twice.
export const DECK_COMPONENT_DEFAULTS = {
  framing:     { label: 'Framing',                unit: 'SF', rate: 14,   cost: 9 },
  stairs:      { label: 'Stairs (per step)',      unit: 'EA', rate: 145,  cost: 90 },
  railing:     { label: 'Railing',                unit: 'LF', rate: 52,   cost: 30 },
  landing:     { label: 'Landing',                unit: 'EA', rate: 1200, cost: 700 },
  blocking:    { label: 'Picture-frame blocking', unit: 'LF', rate: 3.5,  cost: 2.2 },
  borderlabor: { label: 'Border labor / miters',  unit: 'LF', rate: 4,    cost: 2 },
  splinejoist: { label: 'Spline sister joist',    unit: 'LF', rate: 9,    cost: 6 },
  fascia:      { label: 'Fascia 1×12 board (16′, default)', unit: 'EA', rate: 55, cost: 34 },  // sold per 16' board
}

// Porch Conversion (Eze-Breeze) formula. Placeholder rates — the manager sets the
// real numbers in Item Catalog → Formulas. Layout math lives in the builder.
export const PORCH_COMPONENT_DEFAULTS = {
  column:    { label: 'Plates & 6×6 columns',       unit: 'EA', rate: 250,  cost: 150 },  // per column (plates rolled in)
  window:    { label: 'Eze-Breeze window unit',     unit: 'EA', rate: 650,  cost: 420 },  // per window
  transom:   { label: 'Transom unit (wall > 105″)', unit: 'EA', rate: 300,  cost: 190 },  // per transom
  door:      { label: 'Exit / storm door (36″)',    unit: 'EA', rate: 900,  cost: 560 },  // per door
  finishing: { label: 'Paint, seal & refinish',     unit: 'LS', rate: 1500, cost: 800 },  // flat per porch
}

// Standard open-deck scope of work (materials & methods) — one bullet per line.
// The builder prepends the deck size and appends option lines (decking brand,
// railing, stairs, fascia, border…) so the customer sees the build, not our math.
export const DECK_SCOPE_DEFAULT = [
  'Set concrete block footers and install 6×6 support posts and beams, sized as required.',
  'Frame with 2×10 pressure-treated floor joists at 12" on center.',
  'Purchase and apply FastenMaster framing coating tape to all joists and beams.',
].join('\n')

export const PORCH_SCOPE_DEFAULT = [
  'Install 6×6 pressure-treated support columns with top and bottom plates between each opening.',
  'Install Eze-Breeze 4-track vinyl window units.',
  'Paint, seal, and refinish the enclosed porch.',
].join('\n')

// One-time cleanup: an earlier build injected "Deck Components" catalog items
// (tagged `deckComp`). That approach was dropped in favor of the Deck Pricing
// editor, so strip those orphaned rows from any catalog on load.
const stripDeckItems = (catalog) => {
  const list = Array.isArray(catalog) ? catalog : []
  return list.some(c => c?.deckComp) ? list.filter(c => !c?.deckComp) : list
}

export const PROPOSAL_STATUSES = ['Draft', 'Sent', 'Followed Up', 'Negotiating', 'Won', 'Lost', 'MIA', 'Archived']

// 'Archived' = an earlier revision the customer didn't move forward with, but
// the deal was won on a different version. Kept in the system and grouped under
// the customer, but neutral in analytics: excluded from won, lost, and pipeline.

// Starter follow-up email templates. {client} is replaced with the customer name.
export const DEFAULT_EMAIL_TEMPLATES = [
  { id: 1, name: 'Gentle nudge', body: "Hi {client},\n\nJust circling back on the proposal I sent over — did you have any questions? Happy to walk through anything or adjust the scope to fit your needs.\n\nTalk soon!" },
  { id: 2, name: 'Ready to schedule', body: "Hi {client},\n\nWe have a few openings coming up and I'd love to get your project on the calendar. A 20% deposit locks in your start date. Want me to send over the next steps?\n\nThanks!" },
  { id: 3, name: 'Last check-in', body: "Hi {client},\n\nWanted to check in one more time before I close out your file. Are you still interested in moving forward? Just reply and let me know either way — no pressure.\n\nAppreciate it!" },
  { id: 4, name: 'Thanks for your time', body: "Hi {client},\n\nThank you for taking the time to meet with us. It was great learning about your project. Your proposal is attached — reach out anytime with questions.\n\nBest," },
]

// Fill in any branding fields missing from an older persisted install. Existing
// installs (which predate the plan/color fields) are treated as the owner's own
// account: full Enterprise access, and their prior look (sky blue) is preserved
// rather than being reset to the new free-tier charcoal/brass default.
export function normalizeBranding(b) {
  if (!b) {
    return {
      companyName: 'QUOTEX', tagline: 'Smart Contractor Pricing', logo: null,
      primaryColor: '#b0894f', sidebarColor: '#26262b', accentColor: null, plan: 'enterprise',
    }
  }
  return {
    companyName: b.companyName ?? 'QUOTEX',
    tagline: b.tagline ?? 'Smart Contractor Pricing',
    logo: b.logo ?? null,
    primaryColor: b.primaryColor || '#b0894f',   // brass default when unset (matches charcoal/brass identity)
    sidebarColor: b.sidebarColor || '#26262b',     // charcoal default when unset
    accentColor: b.accentColor ?? null,
    plan: b.plan || 'enterprise',
  }
}

export const WIN_REASONS = [
  'Price competitive', 'Strong relationship', 'Fast turnaround',
  'Client referral', 'Quality reputation', 'Best value', 'Other',
]
export const LOSS_REASONS = [
  'Price too high', 'Went with competitor', 'Project cancelled',
  'No response', 'Timing not right', 'Scope mismatch', 'Other',
]

export const ACTIVITY_TYPES = ['Call', 'Follow-up', 'Meeting', 'Email', 'Objection', 'Note']

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Catalog ──────────────────────────────────────────────────────────
      catalog: SEED_CATALOG,
      nextCatalogId: SEED_CATALOG.length + 1,

      addCatalogItems: (items) => {
        const { catalog, nextCatalogId } = get()
        let idCounter = nextCatalogId
        const updated = [...catalog]
        items.forEach((item) => {
          const existing = updated.find(
            (c) => c.name.toLowerCase().trim() === item.name.toLowerCase().trim()
          )
          const weight = item.profitable ? 1.3 : 1.0
          if (existing) {
            const totalWeight = existing.count + weight
            existing.unitPrice = Math.round(
              (existing.unitPrice * existing.count + item.unitPrice * weight) / totalWeight
            )
            existing.minPrice = Math.min(existing.minPrice, item.unitPrice)
            existing.maxPrice = Math.max(existing.maxPrice, item.unitPrice)
            existing.count += 1
            existing.confidence = Math.min(99, existing.confidence + 1)
            existing.lastUpdated = new Date().toLocaleDateString()
            if (item.description) existing.description = item.description
          } else {
            updated.push({
              id: idCounter++,
              name: item.name,
              section: item.section || '',
              description: item.description || '',
              unit: item.unit || 'EA',
              unitPrice: item.unitPrice,
              minPrice: item.unitPrice,
              maxPrice: item.unitPrice,
              count: 1,
              category: item.category || 'General',
              confidence: item.confidence || 70,
              lastUpdated: new Date().toLocaleDateString(),
            })
          }
        })
        set({ catalog: updated, nextCatalogId: idCounter })
      },

      updateCatalogItem: (id, changes) =>
        set((s) => ({
          catalog: s.catalog.map((c) => (c.id === id ? { ...c, ...changes } : c)),
        })),

      deleteCatalogItem: (id) =>
        set((s) => ({ catalog: s.catalog.filter((c) => c.id !== id) })),

      // ── Deck Builder shared component rates (edited in the Deck Pricing editor) ──
      // Per-collection decking + fascia prices live on the catalog items themselves;
      // these are the rates that DON'T vary by collection.
      deckComponentRates: JSON.parse(JSON.stringify(DECK_COMPONENT_DEFAULTS)),

      setDeckComponentRate: (key, changes) =>
        set((s) => ({
          deckComponentRates: {
            ...s.deckComponentRates,
            [key]: { ...(s.deckComponentRates?.[key] || DECK_COMPONENT_DEFAULTS[key]), ...changes },
          },
        })),

      // User-defined shared components — manual-qty lines the contractor adds once
      // (e.g. "$1,000 per extra foot of height"); they appear on every deck quote.
      deckCustomComponents: [],

      addDeckCustomComponent: (comp) =>
        set((s) => ({
          deckCustomComponents: [
            ...s.deckCustomComponents,
            {
              id: `dcc-${Math.random().toString(36).slice(2, 9)}`,
              label: (comp?.label || '').trim() || 'Custom component',
              unit: comp?.unit || 'EA',
              rate: Number(comp?.rate) || 0,
              cost: Number(comp?.cost) || 0,
            },
          ],
        })),

      updateDeckCustomComponent: (id, changes) =>
        set((s) => ({
          deckCustomComponents: s.deckCustomComponents.map(c => c.id === id ? { ...c, ...changes } : c),
        })),

      removeDeckCustomComponent: (id) =>
        set((s) => ({ deckCustomComponents: s.deckCustomComponents.filter(c => c.id !== id) })),

      // Manager control: when true, sales can't change any deck-formula pricing in
      // the builder — they enter dimensions/quantities and the rates come from here.
      deckFormulaLocked: false,
      setDeckFormulaLocked: (locked) => set({ deckFormulaLocked: !!locked }),

      // Standard open-deck scope of work (materials & methods) — one bullet per line.
      // The builder prepends the deck size and appends option lines (decking brand,
      // railing, stairs, fascia, border…) so the customer sees the build, not our math.
      deckScopeTemplate: DECK_SCOPE_DEFAULT,
      setDeckScopeTemplate: (t) => set({ deckScopeTemplate: t }),

      // ── Porch Conversion (Eze-Breeze) formula — mirrors the deck slices ──────
      porchComponentRates: JSON.parse(JSON.stringify(PORCH_COMPONENT_DEFAULTS)),
      setPorchComponentRate: (key, changes) =>
        set((s) => ({
          porchComponentRates: {
            ...s.porchComponentRates,
            [key]: { ...(s.porchComponentRates?.[key] || PORCH_COMPONENT_DEFAULTS[key]), ...changes },
          },
        })),

      porchCustomComponents: [],
      addPorchCustomComponent: (comp) =>
        set((s) => ({
          porchCustomComponents: [
            ...s.porchCustomComponents,
            {
              id: `pcc-${Math.random().toString(36).slice(2, 9)}`,
              label: (comp?.label || '').trim() || 'Custom component',
              unit: comp?.unit || 'EA',
              rate: Number(comp?.rate) || 0,
              cost: Number(comp?.cost) || 0,
            },
          ],
        })),
      updatePorchCustomComponent: (id, changes) =>
        set((s) => ({ porchCustomComponents: s.porchCustomComponents.map(c => c.id === id ? { ...c, ...changes } : c) })),
      removePorchCustomComponent: (id) =>
        set((s) => ({ porchCustomComponents: s.porchCustomComponents.filter(c => c.id !== id) })),

      porchFormulaLocked: false,
      setPorchFormulaLocked: (locked) => set({ porchFormulaLocked: !!locked }),

      porchScopeTemplate: PORCH_SCOPE_DEFAULT,
      setPorchScopeTemplate: (t) => set({ porchScopeTemplate: t }),

      // ── Catalog categories (user-editable) ───────────────────────────────
      catalogCategories: [
        'Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical',
        'Plumbing','Roofing','Flooring','Drywall','Painting','HVAC','Windows','Doors',
        'Tile','Insulation','Siding','General',
      ],

      addCatalogCategory: (name) =>
        set((s) => {
          const trimmed = name.trim()
          if (!trimmed || s.catalogCategories.includes(trimmed)) return s
          return { catalogCategories: [...s.catalogCategories, trimmed] }
        }),

      renameCatalogCategory: (oldName, newName) =>
        set((s) => {
          const trimmed = newName.trim()
          if (!trimmed || trimmed === oldName) return s
          return {
            catalogCategories: s.catalogCategories.map(c => c === oldName ? trimmed : c),
            catalog: s.catalog.map(item => item.category === oldName ? { ...item, category: trimmed } : item),
          }
        }),

      deleteCatalogCategory: (name) =>
        set((s) => ({ catalogCategories: s.catalogCategories.filter(c => c !== name) })),

      // ── Project / service types (analytics, user-editable) ───────────────
      projectTypes: [
        'Open Deck','Screen Porches','Eze-Breeze Porches','Open Porches',
        'Porch Conversions','Sunrooms','Hardscapes',
      ],

      addProjectType: (name) =>
        set((s) => {
          const t = name.trim()
          if (!t || s.projectTypes.includes(t)) return s
          return { projectTypes: [...s.projectTypes, t] }
        }),

      renameProjectType: (oldName, newName) =>
        set((s) => {
          const t = newName.trim()
          if (!t || t === oldName) return s
          return {
            projectTypes: s.projectTypes.map(p => p === oldName ? t : p),
            proposals: s.proposals.map(p => ({
              ...p,
              projectTypes: (p.projectTypes || []).map(pt => pt === oldName ? t : pt),
              contractDraft: p.contractDraft ? {
                ...p.contractDraft,
                projectTypes: (p.contractDraft.projectTypes || []).map(pt => pt === oldName ? t : pt),
              } : p.contractDraft,
            })),
          }
        }),

      deleteProjectType: (name) =>
        set((s) => ({ projectTypes: s.projectTypes.filter(p => p !== name) })),

      // ── Templates (quote line items) ─────────────────────────────────────
      templates: [],
      nextTemplateId: 1,

      saveTemplate: ({ name, description, lines }) => {
        const { templates, nextTemplateId } = get()
        set({
          templates: [
            { id: nextTemplateId, name, description, lines, createdAt: new Date().toISOString() },
            ...templates,
          ],
          nextTemplateId: nextTemplateId + 1,
        })
      },

      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      // ── Scope Templates (pre-built bullet sets for contract scope) ────────
      scopeTemplates: [],
      nextScopeTemplateId: 1,

      saveScopeTemplate: ({ name, projectType, bullets }) => {
        const { scopeTemplates, nextScopeTemplateId } = get()
        set({
          scopeTemplates: [
            { id: nextScopeTemplateId, name, projectType, bullets, createdAt: new Date().toISOString() },
            ...scopeTemplates,
          ],
          nextScopeTemplateId: nextScopeTemplateId + 1,
        })
      },

      deleteScopeTemplate: (id) =>
        set((s) => ({ scopeTemplates: s.scopeTemplates.filter((t) => t.id !== id) })),

      // ── Payment Schedule Templates ─────────────────────────────────────────
      paymentSchedules: [],
      nextPaymentScheduleId: 1,

      savePaymentSchedule: ({ name, milestones }) => {
        const { paymentSchedules, nextPaymentScheduleId } = get()
        set({
          paymentSchedules: [
            { id: nextPaymentScheduleId, name, milestones, createdAt: new Date().toISOString() },
            ...paymentSchedules,
          ],
          nextPaymentScheduleId: nextPaymentScheduleId + 1,
        })
      },

      deletePaymentSchedule: (id) =>
        set((s) => ({ paymentSchedules: s.paymentSchedules.filter((t) => t.id !== id) })),

      // ── Payment Schedule Learning ──────────────────────────────────────────
      // Tracks { [projectTag]: { [scheduleKey]: usageCount } }
      paymentScheduleLearning: {},

      recordPaymentScheduleUsage: (tag, scheduleKey) => {
        if (!tag || !scheduleKey || scheduleKey === 'auto') return
        set(s => {
          const learning = { ...s.paymentScheduleLearning }
          if (!learning[tag]) learning[tag] = {}
          learning[tag] = { ...learning[tag], [scheduleKey]: (learning[tag][scheduleKey] || 0) + 1 }
          return { paymentScheduleLearning: learning }
        })
      },

      // ── Proposals (CRM log) ───────────────────────────────────────────────
      proposals: [],
      nextProposalId: 1,

      saveProposal: (proposalData) => {
        const { proposals, nextProposalId } = get()
        const existing = proposals.find((p) => p.id === proposalData.id)
        if (existing) {
          set({
            proposals: proposals.map((p) =>
              p.id === proposalData.id ? { ...p, ...proposalData } : p
            ),
          })
          return proposalData.id
        }
        // Auto-compute version number for revisions
        const version = proposalData.parentId
          ? proposals.filter(
              (p) => p.id === proposalData.parentId || p.parentId === proposalData.parentId
            ).length + 1
          : 1
        const id = nextProposalId
        set({
          proposals: [
            {
              id,
              parentId: proposalData.parentId || null,
              version,
              ...proposalData,
              status: 'Draft',
              createdAt: new Date().toISOString(),
              sentAt: null,
              closedAt: null,
              winLossReason: null,
              activities: [],
              reminders: [],
            },
            ...proposals,
          ],
          nextProposalId: id + 1,
        })
        return id
      },

      markProposalSent: (id) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === id ? { ...p, status: 'Sent', sentAt: new Date().toISOString() } : p
          ),
        })),

      updateProposalStatus: (id, status) =>
        set((s) => {
          const target = s.proposals.find((p) => p.id === id)
          // When a proposal is Won, the other revisions in the same customer's
          // group weren't lost — they were superseded by the winning version.
          // Auto-archive those siblings (unless already Won/Lost/Archived) so
          // they stay in the system without distorting win/loss/pipeline stats.
          const rootId = target ? (target.parentId || target.id) : null
          const siblingIds =
            status === 'Won' && rootId != null
              ? new Set(
                  s.proposals
                    .filter(
                      (p) =>
                        p.id !== id &&
                        (p.parentId || p.id) === rootId &&
                        !['Won', 'Lost', 'Archived'].includes(p.status)
                    )
                    .map((p) => p.id)
                )
              : new Set()
          return {
            proposals: s.proposals.map((p) => {
              if (p.id === id) {
                const closed = status === 'Won' || status === 'Lost'
                // Stamp the change so any manual status action resets the
                // 90-day stale-Sent clock (e.g. reviving an MIA back to Sent).
                return {
                  ...p,
                  status,
                  statusChangedAt: new Date().toISOString(),
                  autoMIA: false,
                  closedAt: closed ? new Date().toISOString() : p.closedAt,
                }
              }
              if (siblingIds.has(p.id)) return { ...p, status: 'Archived' }
              return p
            }),
          }
        }),

      setWinLossReason: (id, reason) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === id ? { ...p, winLossReason: reason } : p
          ),
        })),

      // ── Activities ───────────────────────────────────────────────────────
      addActivity: (proposalId, { type, text }) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  activities: [
                    { id: Date.now(), type, text, createdAt: new Date().toISOString() },
                    ...(p.activities || []),
                  ],
                }
              : p
          ),
        })),

      deleteActivity: (proposalId, activityId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? { ...p, activities: (p.activities || []).filter((a) => a.id !== activityId) }
              : p
          ),
        })),

      // ── Reminders ────────────────────────────────────────────────────────
      addReminder: (proposalId, reminder) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  reminders: [
                    ...p.reminders,
                    { id: Date.now(), ...reminder, dismissed: false },
                  ],
                }
              : p
          ),
        })),

      dismissReminder: (proposalId, reminderId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  reminders: p.reminders.map((r) =>
                    r.id === reminderId ? { ...r, dismissed: true } : r
                  ),
                }
              : p
          ),
        })),

      // Bulk-add historical non-won proposals (Lost / MIA) to calibrate win rate.
      // Distributes count proposals evenly across the startDate–endDate range.
      bulkImportHistoricalProposals: ({ count, status, startDate, endDate }) =>
        set((s) => {
          const start = new Date(startDate + 'T12:00:00').getTime()
          const end   = new Date(endDate   + 'T12:00:00').getTime()
          const step  = count > 1 ? (end - start) / (count - 1) : 0
          let id = s.nextProposalId
          const newProposals = Array.from({ length: count }, (_, i) => {
            const ts = new Date(start + step * i).toISOString()
            const closed = status === 'Lost' || status === 'MIA'
            return {
              id: id++,
              parentId: null,
              version: 1,
              client: '', email: '', phone: '', address: '',
              total: 0, projectTypes: [], projectSummary: '',
              lines: [], isAlaCarte: false, showBreakdown: false,
              margin: 0, expiration: '',
              status,
              createdAt: ts,
              sentAt: ts,
              closedAt: closed ? ts : null,
              winLossReason: null,
              activities: [],
              reminders: [],
              isHistorical: true,
            }
          })
          return { proposals: [...s.proposals, ...newProposals], nextProposalId: id }
        }),

      // Import a historical won job with a real sale date (bypasses saveProposal's
      // forced status=Draft and createdAt=now so analytics bucket it correctly).
      importHistoricalJob: ({ client, address, projectTypes, total, saleDate }) =>
        set((s) => {
          const id = s.nextProposalId
          const iso = saleDate
            ? new Date(saleDate + 'T12:00:00').toISOString()
            : new Date().toISOString()
          return {
            proposals: [
              ...s.proposals,
              {
                id,
                parentId: null,
                version: 1,
                client: client || '',
                email: '',
                phone: '',
                address: address || '',
                total: Number(total) || 0,
                projectTypes: projectTypes || [],
                projectSummary: '',
                lines: [],
                isAlaCarte: false,
                showBreakdown: false,
                margin: 0,
                expiration: '',
                status: 'Won',
                createdAt: iso,
                sentAt: iso,
                closedAt: iso,
                winLossReason: null,
                activities: [],
                reminders: [],
                isHistorical: true,
              },
            ],
            nextProposalId: id + 1,
          }
        }),

      // One-click load of the real 2024–2025 history from historicalData.js:
      // every won job as a dated Won proposal, plus the non-won remainder of each
      // month's real appointment count as blank Lost proposals — all isHistorical
      // so they feed revenue/appointment analytics without touching the live
      // pipeline. Guarded so it can't double-import.
      historyImported: false,
      importHistory2024_2025: () =>
        set((s) => {
          if (s.historyImported) return {}
          let id = s.nextProposalId
          const mk = (over) => ({
            id: id++, parentId: null, version: 1,
            client: '', email: '', phone: '', address: '',
            total: 0, projectTypes: ['Other'], projectSummary: '',
            lines: [], isAlaCarte: false, showBreakdown: false,
            margin: 0, expiration: '',
            status: 'Won', winLossReason: null, activities: [], reminders: [],
            isHistorical: true, ...over,
          })
          const props = []
          for (const j of HISTORICAL_JOBS) {
            const iso = new Date(j.date + 'T12:00:00Z').toISOString()
            props.push(mk({ client: j.client, total: Number(j.total) || 0, status: 'Won', createdAt: iso, sentAt: iso, closedAt: iso }))
          }
          const wonByKey = {}
          HISTORICAL_JOBS.forEach(j => { const k = j.date.slice(0, 7); wonByKey[k] = (wonByKey[k] || 0) + 1 })
          for (const a of HISTORICAL_APPTS) {
            const key = `${a.year}-${String(a.month + 1).padStart(2, '0')}`
            const blanks = Math.max(0, a.appts - (wonByKey[key] || 0))
            for (let i = 0; i < blanks; i++) {
              const iso = new Date(Date.UTC(a.year, a.month, 2 + (i % 26), 12)).toISOString()
              props.push(mk({ status: 'Lost', createdAt: iso, sentAt: iso, closedAt: iso }))
            }
          }
          return { proposals: [...s.proposals, ...props], nextProposalId: id, historyImported: true }
        }),

      // Undo the historical import (remove every isHistorical proposal + reset the flag).
      clearHistory2024_2025: () =>
        set((s) => ({ proposals: s.proposals.filter(p => !p.isHistorical), historyImported: false })),

      deleteProposal: (id) =>
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

      // ── Manual grouping controls ─────────────────────────────────────────
      // Pull a single proposal out of its group so it stands alone as its own
      // client. If the proposal is the group's root and still has alternatives,
      // the earliest remaining alternative is promoted to anchor the rest so
      // nothing gets orphaned.
      detachProposal: (id) =>
        set((s) => {
          const target = s.proposals.find((p) => p.id === id)
          if (!target) return {}
          const rootId = target.parentId || target.id
          if (target.id === rootId) {
            const children = s.proposals.filter(
              (p) => p.parentId === rootId && p.id !== id
            )
            if (children.length === 0) return {} // already standalone
            const newRoot = children.reduce((a, b) =>
              new Date(a.createdAt || 0) <= new Date(b.createdAt || 0) ? a : b
            )
            return {
              proposals: s.proposals.map((p) => {
                if (p.id === id) return { ...p, parentId: null, version: 1 }
                if (p.id === newRoot.id) return { ...p, parentId: null, version: 1 }
                if (p.parentId === rootId) return { ...p, parentId: newRoot.id }
                return p
              }),
            }
          }
          // Target is an alternative — simply cut it loose.
          return {
            proposals: s.proposals.map((p) =>
              p.id === id ? { ...p, parentId: null, version: 1 } : p
            ),
          }
        }),

      // Merge an entire client group into another. Every proposal in the source
      // group becomes an alternative under the target group's root.
      mergeProposalGroups: (sourceId, targetId) =>
        set((s) => {
          const byId = Object.fromEntries(s.proposals.map((p) => [p.id, p]))
          const rootOf = (pid) => {
            const p = byId[pid]
            return p && p.parentId && byId[p.parentId] ? p.parentId : pid
          }
          const srcRoot = rootOf(sourceId)
          const tgtRoot = rootOf(targetId)
          if (!srcRoot || !tgtRoot || srcRoot === tgtRoot) return {}
          const srcMemberIds = new Set(
            s.proposals
              .filter((p) => p.id === srcRoot || p.parentId === srcRoot)
              .map((p) => p.id)
          )
          let version = s.proposals.filter(
            (p) => p.id === tgtRoot || p.parentId === tgtRoot
          ).length
          return {
            proposals: s.proposals.map((p) => {
              if (!srcMemberIds.has(p.id)) return p
              version += 1
              return { ...p, parentId: tgtRoot, version }
            }),
          }
        }),

      clearAllProposals: () => set({ proposals: [], nextProposalId: 1 }),

      saveContractDraft: (proposalId, draft) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId ? { ...p, contractDraft: { ...(p.contractDraft || {}), ...draft, savedAt: new Date().toISOString() } } : p
          ),
        })),

      markContractSigned: (proposalId, signed) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  contractDraft: {
                    ...(p.contractDraft || {}),
                    signed,
                    signedAt: signed ? new Date().toISOString() : null,
                  },
                }
              : p
          ),
        })),

      // Bulk-mark contracts that were signed OUTSIDE the software (paper /
      // pre-existing deals imported into the app). Marks each given proposal's
      // contract as signed and tags it signedOffPlatform so it's clear these
      // weren't e-signed here. Gives them a contract number if missing so they
      // sit correctly in the Signed section.
      markContractsSignedOffPlatform: (ids) =>
        set((s) => {
          const idSet = new Set(ids)
          const now = new Date().toISOString()
          return {
            proposals: s.proposals.map((p) => {
              if (!idSet.has(p.id)) return p
              const existing = p.contractDraft || {}
              return {
                ...p,
                contractDraft: {
                  ...existing,
                  contractNum: existing.contractNum || `EOL${String(70000 + p.id).padStart(6, '0')}`,
                  signed: true,
                  signedAt: existing.signedAt || now,
                  signedOffPlatform: true,
                },
              }
            }),
          }
        }),

      // Auto-flag stale proposals: a 'Sent' proposal that has gone 90 days with
      // no newer iteration, no logged activity, and no status change becomes
      // 'MIA' (missing in action). Uses the most recent touch across the whole
      // customer group, so making another revision anywhere in the group keeps
      // all its proposals alive. Idempotent — safe to call on every app load.
      //
      // CRITICAL: this reads state via get() and only calls set() when something
      // actually changes. It must NEVER write on an empty/unhydrated store —
      // otherwise, if it runs before async data has loaded, persist would save
      // the empty startup state over the real data (in localStorage AND the KV
      // server). The `proposals.length === 0` guard and the change check ensure
      // no write happens unless there is real, loaded data with a stale 'Sent'.
      autoExpireStaleSent: () => {
        const s = get()
        const list = s.proposals || []
        if (list.length === 0) return   // unhydrated or genuinely empty → never write
        const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000
        const now = Date.now()
        const lastTouch = (p) => {
          const ts = [p.sentAt, p.createdAt, p.updatedAt, p.statusChangedAt,
            ...((p.activities || []).map((a) => a.createdAt))]
            .filter(Boolean)
            .map((t) => new Date(t).getTime())
            .filter((n) => !Number.isNaN(n))
          return ts.length ? Math.max(...ts) : 0
        }
        // Most recent touch per customer group (root id).
        const groupTouch = {}
        for (const p of list) {
          const root = p.parentId || p.id
          groupTouch[root] = Math.max(groupTouch[root] || 0, lastTouch(p))
        }
        let changed = false
        const proposals = list.map((p) => {
          if (p.status !== 'Sent') return p
          const root = p.parentId || p.id
          const touch = groupTouch[root] || lastTouch(p)
          if (touch && now - touch >= NINETY_DAYS) {
            changed = true
            return { ...p, status: 'MIA', autoMIA: true, statusChangedAt: new Date().toISOString() }
          }
          return p
        })
        if (changed) set({ proposals })   // only write when a real change occurred
      },

      // ── Job Management (stages, notes, dates per won proposal) ──────────
      updateJobData: (proposalId, changes) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId
              ? { ...p, jobData: { ...(p.jobData || {}), ...changes } }
              : p
          ),
        })),

      // Schedule (or clear) a single job stage on the PM calendar.
      setJobStageDate: (proposalId, stageKey, date) =>
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== proposalId) return p
            const stageDates = { ...((p.jobData?.stageDates) || {}) }
            if (date) stageDates[stageKey] = date
            else delete stageDates[stageKey]
            return { ...p, jobData: { ...(p.jobData || {}), stageDates } }
          }),
        })),

      toggleJobStage: (proposalId, stageKey) =>
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== proposalId) return p
            const completed = new Set(p.jobData?.completedStages || [])
            if (completed.has(stageKey)) completed.delete(stageKey)
            else completed.add(stageKey)
            return { ...p, jobData: { ...(p.jobData || {}), completedStages: [...completed] } }
          }),
        })),

      // ── Change Orders ────────────────────────────────────────────────────
      addChangeOrder: (proposalId, co) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                changeOrders: [
                  ...((p.jobData?.changeOrders) || []),
                  { id: Date.now(), status: 'Pending', ...co, createdAt: new Date().toISOString() },
                ],
              },
            }
          ),
        })),

      updateChangeOrder: (proposalId, coId, changes) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                changeOrders: (p.jobData?.changeOrders || []).map((co) =>
                  co.id === coId ? { ...co, ...changes } : co
                ),
              },
            }
          ),
        })),

      deleteChangeOrder: (proposalId, coId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                changeOrders: (p.jobData?.changeOrders || []).filter((co) => co.id !== coId),
              },
            }
          ),
        })),

      // ── Standalone Change Orders (for contracts signed outside QuoteX) ────
      addStandaloneCO: (co) =>
        set((s) => ({
          standaloneChangeOrders: [
            { id: Date.now(), status: 'Pending', createdAt: new Date().toISOString(), ...co },
            ...(s.standaloneChangeOrders || []),
          ],
        })),

      updateStandaloneCO: (coId, changes) =>
        set((s) => ({
          standaloneChangeOrders: (s.standaloneChangeOrders || []).map((co) =>
            co.id === coId ? { ...co, ...changes } : co
          ),
        })),

      deleteStandaloneCO: (coId) =>
        set((s) => ({
          standaloneChangeOrders: (s.standaloneChangeOrders || []).filter((co) => co.id !== coId),
        })),

      // ── Daily Logs ───────────────────────────────────────────────────────
      addDailyLog: (proposalId, log) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                dailyLogs: [
                  { id: Date.now(), ...log, createdAt: new Date().toISOString() },
                  ...((p.jobData?.dailyLogs) || []),
                ],
              },
            }
          ),
        })),

      deleteDailyLog: (proposalId, logId) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                dailyLogs: (p.jobData?.dailyLogs || []).filter((l) => l.id !== logId),
              },
            }
          ),
        })),

      // ── Warranty / Callback Log ──────────────────────────────────────────
      addWarrantyItem: (proposalId, item) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                warrantyItems: [
                  { id: Date.now(), ...item, status: 'Open', createdAt: new Date().toISOString() },
                  ...((p.jobData?.warrantyItems) || []),
                ],
              },
            }
          ),
        })),

      updateWarrantyItem: (proposalId, itemId, changes) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id !== proposalId ? p : {
              ...p,
              jobData: {
                ...(p.jobData || {}),
                warrantyItems: (p.jobData?.warrantyItems || []).map((w) =>
                  w.id === itemId ? { ...w, ...changes } : w
                ),
              },
            }
          ),
        })),

      // ── Subcontractors ───────────────────────────────────────────────────
      subcontractors: [],
      nextSubId: 1,

      addSubcontractor: (sub) =>
        set((s) => ({
          subcontractors: [
            { id: s.nextSubId, ...sub, createdAt: new Date().toISOString() },
            ...s.subcontractors,
          ],
          nextSubId: s.nextSubId + 1,
        })),

      updateSubcontractor: (id, changes) =>
        set((s) => ({
          subcontractors: s.subcontractors.map((sub) =>
            sub.id === id ? { ...sub, ...changes } : sub
          ),
        })),

      deleteSubcontractor: (id) =>
        set((s) => ({ subcontractors: s.subcontractors.filter((s) => s.id !== id) })),

      // ── Standalone change orders (contracts signed outside QuoteX) ────────
      standaloneChangeOrders: [],

      // ── Job Costs (actual costs entered per won proposal) ────────────────
      jobCosts: {},

      saveJobCosts: (proposalId, costs) =>
        set((s) => ({
          jobCosts: {
            ...s.jobCosts,
            [proposalId]: { ...costs, updatedAt: new Date().toISOString() },
          },
        })),

      deleteJobCosts: (proposalId) =>
        set((s) => {
          const updated = { ...s.jobCosts }
          delete updated[proposalId]
          return { jobCosts: updated }
        }),

      // ── Scope Examples (learned from past contracts) ──────────────────────
      scopeExamples: [],

      saveScopeExamples: (contractId, examples) =>
        set((s) => {
          const updated = [...s.scopeExamples]
          examples.forEach(ex => {
            if (!ex.itemName || !ex.bulletText?.trim()) return
            const idx = updated.findIndex(e => e.itemName === ex.itemName && e.contractId === contractId)
            if (idx >= 0) updated[idx] = { ...updated[idx], ...ex }
            else updated.push({ id: `${contractId}-${ex.itemName}`, contractId, savedAt: new Date().toISOString(), ...ex })
          })
          return { scopeExamples: updated }
        }),

      // ── Import (from backup JSON) ─────────────────────────────────────────
      importCatalog: (items) => {
        if (!Array.isArray(items) || items.length === 0) return
        const maxId = items.reduce((m, i) => Math.max(m, i.id || 0), 0)
        set({ catalog: items, nextCatalogId: maxId + 1 })
      },

      importProposals: (items) => {
        if (!Array.isArray(items) || items.length === 0) return
        const maxId = items.reduce((m, i) => Math.max(m, i.id || 0), 0)
        set({ proposals: items, nextProposalId: maxId + 1 })
      },

      importTemplates: (items) => {
        if (!Array.isArray(items) || items.length === 0) return
        const maxId = items.reduce((m, i) => Math.max(m, i.id || 0), 0)
        set({ templates: items, nextTemplateId: maxId + 1 })
      },

      // ── Theme ────────────────────────────────────────────────────────────────
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // ── Active role view (sales | pm | manager) ──────────────────────────────
      role: 'manager',
      setRole: (role) => set({ role }),

      // ── PM calendar: tentative projects + which jobs are hidden ───────────────
      plannedProjects: [],
      addPlannedProject: (proj) =>
        set((s) => ({ plannedProjects: [{ id: Date.now(), color: '#2563eb', ...proj }, ...s.plannedProjects] })),
      updatePlannedProject: (id, changes) =>
        set((s) => ({ plannedProjects: s.plannedProjects.map((p) => (p.id === id ? { ...p, ...changes } : p)) })),
      deletePlannedProject: (id) =>
        set((s) => ({ plannedProjects: s.plannedProjects.filter((p) => p.id !== id) })),
      calendarHiddenJobs: [],
      toggleCalendarHiddenJob: (id) =>
        set((s) => ({
          calendarHiddenJobs: s.calendarHiddenJobs.includes(id)
            ? s.calendarHiddenJobs.filter((x) => x !== id)
            : [...s.calendarHiddenJobs, id],
        })),

      // ── Finance: cards + expenses (manager / accounting side) ────────────────
      financeCards: [],
      addFinanceCard: (c) =>
        set((s) => ({ financeCards: [...s.financeCards, { id: Date.now(), color: '#0f766e', ...c }] })),
      updateFinanceCard: (id, changes) =>
        set((s) => ({ financeCards: s.financeCards.map((c) => (c.id === id ? { ...c, ...changes } : c)) })),
      deleteFinanceCard: (id) =>
        set((s) => ({ financeCards: s.financeCards.filter((c) => c.id !== id) })),

      expenses: [],
      addExpense: (e) =>
        set((s) => ({ expenses: [{ id: Date.now(), createdAt: new Date().toISOString(), ...e }, ...s.expenses] })),
      addExpenses: (arr) =>
        set((s) => ({
          expenses: [
            ...arr.map((e, i) => ({ id: Date.now() + i, createdAt: new Date().toISOString(), ...e })),
            ...s.expenses,
          ],
        })),
      updateExpense: (id, changes) =>
        set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...changes } : e)) })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      // ── One-click follow-up email templates ──────────────────────────────────
      emailTemplates: DEFAULT_EMAIL_TEMPLATES,
      addEmailTemplate: (t) =>
        set((s) => ({ emailTemplates: [...s.emailTemplates, { id: Date.now(), ...t }] })),
      updateEmailTemplate: (id, changes) =>
        set((s) => ({ emailTemplates: s.emailTemplates.map((t) => (t.id === id ? { ...t, ...changes } : t)) })),
      deleteEmailTemplate: (id) =>
        set((s) => ({ emailTemplates: s.emailTemplates.filter((t) => t.id !== id) })),

      // ── Daily to-do list ─────────────────────────────────────────────────────
      todos: [],
      todoPin: 'off', // 'off' | 'right' — pins the list as a side panel
      addTodo: (text) =>
        set((s) => ({ todos: [{ id: Date.now(), text, done: false, createdAt: new Date().toISOString() }, ...s.todos] })),
      toggleTodo: (id) =>
        set((s) => ({ todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
      deleteTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
      clearDoneTodos: () =>
        set((s) => ({ todos: s.todos.filter((t) => !t.done) })),
      setTodoPin: (side) => set({ todoPin: side }),

      // ── Branding ─────────────────────────────────────────────────────────────
      branding: {
        companyName: 'QUOTEX',
        tagline: 'Smart Contractor Pricing',
        logo: null,           // base64 data URL
        primaryColor: '#b0894f',  // brass (free-tier default accent)
        sidebarColor: '#26262b',  // charcoal (free-tier default sidebar)
        accentColor: null,        // optional secondary highlight (Pro)
        plan: 'free',             // 'free' | 'pro' — Pro unlocks custom colors
      },

      updateBranding: (changes) =>
        set((s) => ({ branding: { ...s.branding, ...changes } })),

      // ── Read message tracking (IDs of messages the user has opened) ───────
      readMessageIds: [],

      markMessageRead: (id) =>
        set((s) => ({
          readMessageIds: s.readMessageIds.includes(id)
            ? s.readMessageIds
            : [...s.readMessageIds, id],
        })),
    }),
    {
      name: DEMO ? DEMO_STORE_KEY : 'quotex-store',
      storage: createJSONStorage(() => (DEMO ? demoLocalStorage : smartStorage)),
      version: 6,
      migrate: (persisted) => {
        const persistedCatalog = persisted?.catalog
        // Preserve user catalog if it exists; fall back to seed only on fresh install
        const catalog = Array.isArray(persistedCatalog) && persistedCatalog.length > 0
          ? persistedCatalog
          : SEED_CATALOG
        const maxId = catalog.reduce((m, i) => Math.max(m, i.id || 0), 0)

        // Restore missing proposals
        const existingProposals = persisted?.proposals || []

        const ginaExists = existingProposals.some(p =>
          p.id === 'p-restored-gina-reid' ||
          (p.client === 'Gina Reid' && (p.address || '').includes('8409 Newton'))
        )
        const amberExists = existingProposals.some(p =>
          p.id === 'p-restored-amber-rivera'
        )

        const restoredProposals = [...existingProposals]
        if (!ginaExists) restoredProposals.push({
          id: 'p-restored-gina-reid',
          client: 'Gina Reid',
          email: 'ginawarr@gmail.com',
          phone: '614-270-5143',
          address: '8409 Newton Ln, Ballantyne, NC 28277, USA',
          total: 20244,
          lines: [
            { id: 'gl1', name: 'Debris Haul-off', qty: 1, unitPrice: 1000, description: 'Load and haul off all job site debris and excess materials.', section: 'General' },
            { id: 'gl2', name: 'TechoBloc Blu-60 Grande and Valet Paver Patio', qty: 1, unitPrice: 15444, description: 'Design and build new paver patio with TechoBloc Blu-60 Grande smooth slab pavers 24x32 inches and 6x6 inch valet pieces in basket woven pattern, including 4 inches ABC base, 1 inch screening, polymeric sand grout, 6mm weed prevention tarp, and all materials and labor.', section: 'General' },
            { id: 'gl3', name: 'Pressure Treated Decking Privacy Fence', qty: 1, unitPrice: 3800, description: "Supply and install pressure-treated wood decking privacy fence 16' wide all materials and labor included.", section: 'General' },
          ],
          status: 'Sent',
          createdAt: '2026-06-05T12:00:00.000Z',
          sentAt: '2026-06-05T12:00:00.000Z',
          expiration: '2026-07-04',
          projectTypes: ['Hardscapes'],
          projectSummary: 'Open Patio and Privacy Fence',
          isAlaCarte: false,
        })
        if (!amberExists) restoredProposals.push({
          id: 'p-restored-amber-rivera',
          client: 'Amber Rivera',
          email: 'anhyde85@yahoo.com',
          phone: '317-966-6372',
          address: '4110 Woolcott Avenue Charlotte NC',
          total: 0,
          lines: [
            { id: 'ar1',  name: 'Gable Roof Engineering Letter',                          qty: 1, unitPrice: 900,   description: 'Gable Roof Engineers Report for headers and LVL Ridge Beam. Note: Additional Engineering Costs May Inquire Additional Fees.', section: 'General' },
            { id: 'ar2',  name: "12'x24' Gable Roof Open Porch",                          qty: 1, unitPrice: 32000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, LVL engineered beam for long spans, Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar3',  name: "12'x24' Cathedral Roof Open Porch",                      qty: 1, unitPrice: 31000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, Ridge beam with collar ties. Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar4',  name: "12'x24' Shed Roof Open Porch",                           qty: 1, unitPrice: 30000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, LVL engineered beam for long spans. Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar5',  name: 'Shiplap and Vinyl Siding TV-Wall (TV Install Included)', qty: 1, unitPrice: 3150,  description: 'Interior Finish: Shiplap. Exterior Finish: Matching Vinyl Siding. Install 1 (one) 120v Outlet. Install Homeowner provided TV mount and TV.', section: 'General' },
            { id: 'ar6',  name: 'Standard Electrical Package',                             qty: 1, unitPrice: 3810,  description: 'Supply and install electrical wiring package including two ceiling fans and six 6" recessed can lights, one flood light, and one 120v outlet with all associated materials and labor.', section: 'General' },
            { id: 'ar7',  name: '6000W Innova Heater Electrical Heater Material and Labor',qty: 1, unitPrice: 3500,  description: 'Supply and Install 220V, 6000w Innova electrical heater.', section: 'General' },
            { id: 'ar8',  name: 'Eze Breeze Windows',                                     qty: 1, unitPrice: 7650,  description: 'Purchase and install 6"x6" Cox laminated columns, 2"x6" vertical 4-track Eze-Breeze single unit windows with frame and vinyl colors, Larson storm doors as needed, and 1/4" tempered glass on gables — all materials and labor included. 54" Max Opening, 105" Max Height.', section: 'General' },
            { id: 'ar9',  name: '6/12 Electrical Compliance- Eze Breeze Outlets',         qty: 1, unitPrice: 2640,  description: 'Install 120v outlet with box, cover plate, and all labor to adhere to Eze-Breeze electrical code compliance.', section: 'General' },
            { id: 'ar10', name: 'LVP Floor as Porch Floor',                               qty: 1, unitPrice: 3744,  description: 'Provide and install 3/4" plywood subfloor and underlayment, then install LVP flooring as porch floor with color selection — all materials and labor included.', section: 'General' },
            { id: 'ar11', name: 'Shiplap Finished Back-wall',                             qty: 1, unitPrice: 4000,  description: 'Demo and Haul Exterior Siding left inside enclosure. Provide and Install Shiplap Finished Porch Back Wall. Provide and Paint Shiplap.', section: 'General' },
            { id: 'ar12', name: 'TechoBloc Blu-60 Paver Patio',                          qty: 1, unitPrice: 6150,  description: 'Design and Build New Paver Patio. Provide and install 4" ABC, 1" screening, polymeric sand grout, 6mm tarp for weed prevention. Material: Techo-Bloc Blu 60 smooth or slate slab. Standard 3 piece pattern.', section: 'General' },
            { id: 'ar13', name: 'Keystone Plaza Stone Paver Patio',                       qty: 1, unitPrice: 5740,  description: 'Design and Build New Paver Patio. Provide and install 4" ABC, 1" screening, polymeric sand grout, 6mm tarp for weed prevention. Material: Keystone Plaza Stone Paver. Standard 3 piece pattern.', section: 'General' },
            { id: 'ar14', name: 'Concrete Paver Patio',                                   qty: 1, unitPrice: 3075,  description: 'Excavate, prepare subgrade, and install brushed concrete extension with all materials and labor included.', section: 'General' },
            { id: 'ar15', name: 'Fullview 36" Exterior Door Installation',                qty: 1, unitPrice: 6000,  description: '6\' Reliabilt French Full-view Exterior Door and Installation. Purchase and Install 6\' Sliding Glass Door. Remove existing window/door and house siding. Relocate inside outlets or switches if necessary. Build new door frame. Repair siding on House Exterior if necessary. Install french door with associated hardware. Fix House Interior Drywall — Paint NOT included. Install Door trims.', section: 'General' },
          ],
          status: 'Sent',
          createdAt: '2026-06-23T12:00:00.000Z',
          sentAt: '2026-06-23T12:00:00.000Z',
          expiration: '2026-07-22',
          projectTypes: ['Open Porches'],
          projectSummary: 'Open Porch Options',
          isAlaCarte: true,
        })

        const proposals = restoredProposals

        return {
          catalog,
          nextCatalogId: Math.max(SEED_CATALOG.length + 1, maxId + 1, persisted?.nextCatalogId || 0),
          templates:          persisted?.templates          || [],
          nextTemplateId:     persisted?.nextTemplateId     || 1,
          scopeTemplates:        persisted?.scopeTemplates        || [],
          nextScopeTemplateId:   persisted?.nextScopeTemplateId   || 1,
          paymentSchedules:        persisted?.paymentSchedules        || [],
          nextPaymentScheduleId:   persisted?.nextPaymentScheduleId   || 1,
          paymentScheduleLearning: persisted?.paymentScheduleLearning || {},
          subcontractors:      persisted?.subcontractors      || [],
          nextSubId:           persisted?.nextSubId           || 1,
          proposals,
          nextProposalId:     persisted?.nextProposalId     || 1,
          readMessageIds:     persisted?.readMessageIds     || [],
          todos:              persisted?.todos              || [],
          todoPin:            persisted?.todoPin            || 'off',
          role:               persisted?.role               || 'manager',
          plannedProjects:    persisted?.plannedProjects    || [],
          calendarHiddenJobs: persisted?.calendarHiddenJobs || [],
          emailTemplates:     persisted?.emailTemplates     || DEFAULT_EMAIL_TEMPLATES,
          financeCards:       persisted?.financeCards       || [],
          expenses:           persisted?.expenses           || [],
          theme:              persisted?.theme              || 'light',
          branding:           normalizeBranding(persisted?.branding),
          scopeExamples:      persisted?.scopeExamples      || [],
          jobCosts:           persisted?.jobCosts           || {},
          standaloneChangeOrders: persisted?.standaloneChangeOrders || [],
          // Manager-set deck/porch pricing — carry through so a version bump
          // never resets customized rates, custom lines, locks, or scope text.
          deckComponentRates:  persisted?.deckComponentRates  ?? JSON.parse(JSON.stringify(DECK_COMPONENT_DEFAULTS)),
          porchComponentRates: persisted?.porchComponentRates ?? JSON.parse(JSON.stringify(PORCH_COMPONENT_DEFAULTS)),
          deckCustomComponents:  persisted?.deckCustomComponents  ?? [],
          porchCustomComponents: persisted?.porchCustomComponents ?? [],
          deckFormulaLocked:  persisted?.deckFormulaLocked  ?? false,
          porchFormulaLocked: persisted?.porchFormulaLocked ?? false,
          deckScopeTemplate:  persisted?.deckScopeTemplate  ?? DECK_SCOPE_DEFAULT,
          porchScopeTemplate: persisted?.porchScopeTemplate ?? PORCH_SCOPE_DEFAULT,
          historyImported:    persisted?.historyImported    || false,
          catalogCategories:  persisted?.catalogCategories  || [
            'Fencing','Gates','Demo','Materials','Labor','Framing','Concrete','Electrical',
            'Plumbing','Roofing','Flooring','Drywall','Painting','HVAC','Windows','Doors',
            'Tile','Insulation','Siding','General',
          ],
          projectTypes: persisted?.projectTypes || [
            'Open Deck','Screen Porches','Eze-Breeze Porches','Open Porches',
            'Porch Conversions','Sunrooms','Hardscapes',
          ],
        }
      },
      merge: (persistedState, currentState) => {
        // Demo builds are fully isolated — never inject the real restored
        // proposals; the demo seed populates sample data separately.
        if (DEMO) {
          return {
            ...currentState,
            ...persistedState,
            branding: normalizeBranding(persistedState?.branding),
            catalog: stripDeckItems((persistedState?.catalog?.length > 0)
              ? persistedState.catalog
              : currentState.catalog),
          }
        }
        // Always ensure restored proposals are present — runs on every load
        const stored = persistedState?.proposals || []
        const ginaExists = stored.some(p =>
          p.id === 'p-restored-gina-reid' ||
          (p.client === 'Gina Reid' && (p.address || '').includes('8409 Newton'))
        )
        const amberExists = stored.some(p =>
          p.id === 'p-restored-amber-rivera'
        )
        const proposals = [...stored]
        if (!ginaExists) proposals.push({
          id: 'p-restored-gina-reid',
          client: 'Gina Reid',
          email: 'ginawarr@gmail.com',
          phone: '614-270-5143',
          address: '8409 Newton Ln, Ballantyne, NC 28277, USA',
          total: 20244,
          lines: [
            { id: 'gl1', name: 'Debris Haul-off', qty: 1, unitPrice: 1000, description: 'Load and haul off all job site debris and excess materials.', section: 'General' },
            { id: 'gl2', name: 'TechoBloc Blu-60 Grande and Valet Paver Patio', qty: 1, unitPrice: 15444, description: 'Design and build new paver patio with TechoBloc Blu-60 Grande smooth slab pavers 24x32 inches and 6x6 inch valet pieces in basket woven pattern, including 4 inches ABC base, 1 inch screening, polymeric sand grout, 6mm weed prevention tarp, and all materials and labor.', section: 'General' },
            { id: 'gl3', name: 'Pressure Treated Decking Privacy Fence', qty: 1, unitPrice: 3800, description: "Supply and install pressure-treated wood decking privacy fence 16' wide all materials and labor included.", section: 'General' },
          ],
          status: 'Sent',
          createdAt: '2026-06-05T12:00:00.000Z',
          sentAt: '2026-06-05T12:00:00.000Z',
          expiration: '2026-07-04',
          projectTypes: ['Hardscapes'],
          projectSummary: 'Open Patio and Privacy Fence',
          isAlaCarte: false,
        })
        if (!amberExists) proposals.push({
          id: 'p-restored-amber-rivera',
          client: 'Amber Rivera',
          email: 'anhyde85@yahoo.com',
          phone: '317-966-6372',
          address: '4110 Woolcott Avenue Charlotte NC',
          total: 0,
          lines: [
            { id: 'ar1',  name: 'Gable Roof Engineering Letter',                          qty: 1, unitPrice: 900,   description: 'Gable Roof Engineers Report for headers and LVL Ridge Beam. Note: Additional Engineering Costs May Inquire Additional Fees.', section: 'General' },
            { id: 'ar2',  name: "12'x24' Gable Roof Open Porch",                          qty: 1, unitPrice: 32000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, LVL engineered beam for long spans, Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar3',  name: "12'x24' Cathedral Roof Open Porch",                      qty: 1, unitPrice: 31000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, Ridge beam with collar ties. Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar4',  name: "12'x24' Shed Roof Open Porch",                           qty: 1, unitPrice: 30000, description: "Erect Base structure per plan: Concrete block footings. Purchase and install 6'X6' PT-Wood columns, 2\"x6\" plates, LVL engineered beam for long spans. Wrap Columns and Headers. Purchase and install 2\"x10\" rafters, 1/2\" OSB sheathing and 15# felt. Install ply bead ceiling with 1\"x4\" Trim covering seams. Design Open Gable With Wagon Wheel Trim on Gable. Install shingles, regular gutters and soffit all matching the existing house.", section: 'General' },
            { id: 'ar5',  name: 'Shiplap and Vinyl Siding TV-Wall (TV Install Included)', qty: 1, unitPrice: 3150,  description: 'Interior Finish: Shiplap. Exterior Finish: Matching Vinyl Siding. Install 1 (one) 120v Outlet. Install Homeowner provided TV mount and TV.', section: 'General' },
            { id: 'ar6',  name: 'Standard Electrical Package',                             qty: 1, unitPrice: 3810,  description: 'Supply and install electrical wiring package including two ceiling fans and six 6" recessed can lights, one flood light, and one 120v outlet with all associated materials and labor.', section: 'General' },
            { id: 'ar7',  name: '6000W Innova Heater Electrical Heater Material and Labor',qty: 1, unitPrice: 3500,  description: 'Supply and Install 220V, 6000w Innova electrical heater.', section: 'General' },
            { id: 'ar8',  name: 'Eze Breeze Windows',                                     qty: 1, unitPrice: 7650,  description: 'Purchase and install 6"x6" Cox laminated columns, 2"x6" vertical 4-track Eze-Breeze single unit windows with frame and vinyl colors, Larson storm doors as needed, and 1/4" tempered glass on gables — all materials and labor included. 54" Max Opening, 105" Max Height.', section: 'General' },
            { id: 'ar9',  name: '6/12 Electrical Compliance- Eze Breeze Outlets',         qty: 1, unitPrice: 2640,  description: 'Install 120v outlet with box, cover plate, and all labor to adhere to Eze-Breeze electrical code compliance.', section: 'General' },
            { id: 'ar10', name: 'LVP Floor as Porch Floor',                               qty: 1, unitPrice: 3744,  description: 'Provide and install 3/4" plywood subfloor and underlayment, then install LVP flooring as porch floor with color selection — all materials and labor included.', section: 'General' },
            { id: 'ar11', name: 'Shiplap Finished Back-wall',                             qty: 1, unitPrice: 4000,  description: 'Demo and Haul Exterior Siding left inside enclosure. Provide and Install Shiplap Finished Porch Back Wall. Provide and Paint Shiplap.', section: 'General' },
            { id: 'ar12', name: 'TechoBloc Blu-60 Paver Patio',                          qty: 1, unitPrice: 6150,  description: 'Design and Build New Paver Patio. Provide and install 4" ABC, 1" screening, polymeric sand grout, 6mm tarp for weed prevention. Material: Techo-Bloc Blu 60 smooth or slate slab. Standard 3 piece pattern.', section: 'General' },
            { id: 'ar13', name: 'Keystone Plaza Stone Paver Patio',                       qty: 1, unitPrice: 5740,  description: 'Design and Build New Paver Patio. Provide and install 4" ABC, 1" screening, polymeric sand grout, 6mm tarp for weed prevention. Material: Keystone Plaza Stone Paver. Standard 3 piece pattern.', section: 'General' },
            { id: 'ar14', name: 'Concrete Paver Patio',                                   qty: 1, unitPrice: 3075,  description: 'Excavate, prepare subgrade, and install brushed concrete extension with all materials and labor included.', section: 'General' },
            { id: 'ar15', name: 'Fullview 36" Exterior Door Installation',                qty: 1, unitPrice: 6000,  description: '6\' Reliabilt French Full-view Exterior Door and Installation. Purchase and Install 6\' Sliding Glass Door. Remove existing window/door and house siding. Relocate inside outlets or switches if necessary. Build new door frame. Repair siding on House Exterior if necessary. Install french door with associated hardware. Fix House Interior Drywall — Paint NOT included. Install Door trims.', section: 'General' },
          ],
          status: 'Sent',
          createdAt: '2026-06-23T12:00:00.000Z',
          sentAt: '2026-06-23T12:00:00.000Z',
          expiration: '2026-07-22',
          projectTypes: ['Open Porches'],
          projectSummary: 'Open Porch Options',
          isAlaCarte: true,
        })

        return {
          ...currentState,
          ...persistedState,
          proposals,
          branding: normalizeBranding(persistedState?.branding),
          // Catalog: always prefer stored data; only fall back to seed when truly empty.
          // Always ensure the editable deck-component defaults are present.
          catalog: stripDeckItems((persistedState?.catalog?.length > 0)
            ? persistedState.catalog
            : currentState.catalog),
        }
      },
      // Storage is async (KV). Mark hydration complete FIRST so writes are now
      // allowed, then run the stale-Sent → MIA sweep. Fires after hydration
      // whether it succeeded or errored, so persistence is never permanently
      // blocked.
      onRehydrateStorage: () => (state, error) => {
        // Fail CLOSED: only enable persistence after a clean load. If hydration
        // threw, the store holds its empty default — leaving writes blocked means
        // an in-memory-only session (changes won't save this load) rather than
        // risking the empty default overwriting real data. Non-destructive.
        if (error) return
        _hydrated = true
        try { state?.autoExpireStaleSent?.() } catch {}
      },
    }
  )
)

// Demo mode: seed the sandbox with fictional sample data the first time a
// visitor loads it (i.e. when their browser has no demo data yet).
if (DEMO && typeof window !== 'undefined') {
  const seedIfEmpty = () => {
    const s = useStore.getState()
    if (!s.proposals || s.proposals.length === 0) {
      useStore.setState(buildDemoSeed())
    }
  }
  if (useStore.persist?.hasHydrated?.()) seedIfEmpty()
  else useStore.persist?.onFinishHydration?.(seedIfEmpty)
}
