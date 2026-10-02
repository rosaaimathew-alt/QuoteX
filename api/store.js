import { requireAuth } from './_auth.js'

const KV_KEY = 'quotex:store'
const REV_KEY = 'quotex:store:rev'   // bumps on every write; polled instead of the blob

async function getKV() {
  const { kv } = await import('@vercel/kv')
  return kv
}

// ── Server-side merge ────────────────────────────────────────────────────────
// The store is one shared blob. A plain overwrite lets any client's save clobber
// records other users created but that this client hadn't synced yet (proposals
// "disappearing"). So merge the incoming state INTO the stored state: union every
// record list (proposals newest-wins), union deletion tombstones, then drop any
// record a tombstone marks. This makes concurrent multi-user writes non-destructive.
const _score = (p) => {
  let m = 0
  for (const k of ['updatedAt', 'closedAt', 'sentAt', 'createdAt']) {
    const t = p && p[k] ? Date.parse(p[k]) : 0
    if (t && t > m) m = t
  }
  return m
}
const _richness = (p) => {
  const j = (p && p.jobData) || {}
  return (p?.lines?.length || 0) + (p?.activities?.length || 0) + (p?.reminders?.length || 0)
    + (j.changeOrders?.length || 0) + (j.completedStages?.length || 0) + (j.dailyLogs?.length || 0)
    + (j.warrantyItems?.length || 0) + Object.keys(j.stageDates || {}).length
    + (j.startDate ? 1 : 0) + (j.targetDate ? 1 : 0)
}
// Recency of the editable contract draft (Scope of Work, project types, milestone
// edits). These don't move the proposal's top-level dates, so the score/richness
// merge can pick a copy lacking the latest edits — carry the newest draft across.
const _draftTime = (d) => {
  if (!d) return 0
  const t = Math.max(d.savedAt ? Date.parse(d.savedAt) : 0, d.signedAt ? Date.parse(d.signedAt) : 0)
  return t || 0
}
function _keepNewerDraft(winner, loser) {
  const dw = winner && winner.contractDraft, dl = loser && loser.contractDraft
  if (!dl) return winner
  if (!dw) return { ...winner, contractDraft: dl }
  const tw = _draftTime(dw), tl = _draftTime(dl)
  const draft = tl > tw ? { ...dl } : { ...dw }
  const other = tl > tw ? dw : dl
  if (other.signed && !draft.signed) { draft.signed = true; draft.signedAt = other.signedAt || draft.signedAt }
  return { ...winner, contractDraft: draft }
}
// Change orders live inside jobData: merge them by id (newest edit wins) so a
// stale copy from another device can't drop a fresh signing link or revision.
const _coTime = (co) => {
  let m = 0
  for (const k of ['updatedAt', 'signedAt', 'createdAt']) {
    const v = co && co[k]
    const t = typeof v === 'number' ? v : (v ? Date.parse(v) : 0)
    if (t && t > m) m = t
  }
  return m
}
function _mergeChangeOrders(winner, loser) {
  const b = loser?.jobData?.changeOrders
  if (!b || !b.length) return winner
  const map = new Map()
  for (const co of (winner?.jobData?.changeOrders || [])) if (co && co.id != null) map.set(String(co.id), co)
  for (const co of b) {
    if (!co || co.id == null) continue
    const ex = map.get(String(co.id))
    if (!ex || _coTime(co) > _coTime(ex)) map.set(String(co.id), co)
  }
  return { ...winner, jobData: { ...(winner.jobData || {}), changeOrders: [...map.values()] } }
}
function _mergeProposals(a = [], b = []) {
  const map = new Map()
  for (const p of a) if (p && p.id != null) map.set(p.id, p)
  for (const p of b) {
    if (!p || p.id == null) continue
    const ex = map.get(p.id)
    if (!ex) { map.set(p.id, p); continue }
    const sp = _score(p), se = _score(ex)
    const incomingWins = sp > se || (sp === se && _richness(p) >= _richness(ex))
    const winner = incomingWins ? _keepNewerDraft(p, ex) : _keepNewerDraft(ex, p)
    map.set(p.id, _mergeChangeOrders(winner, incomingWins ? ex : p))
  }
  return [...map.values()]
}
function _union(a = [], b = []) {
  const map = new Map()
  for (const it of a || []) if (it && it.id != null) map.set(it.id, it)
  for (const it of b || []) if (it && it.id != null) map.set(it.id, it) // incoming wins on tie
  return [...map.values()]
}
function mergeState(existing, incoming) {
  const a = existing?.state || {}, b = incoming?.state || {}
  const merged = { ...a, ...b } // incoming wins for scalar/singleton settings
  merged.proposals = _mergeProposals(a.proposals, b.proposals)
  for (const k of ['catalog', 'templates', 'scopeTemplates', 'paymentSchedules', 'subcontractors',
    'standaloneChangeOrders', 'todos', 'checklists', 'plannedProjects', 'emailTemplates',
    'financeCards', 'expenses', 'deckCustomComponents', 'porchCustomComponents']) {
    merged[k] = _union(a[k], b[k])
  }
  merged.jobCosts = { ...(a.jobCosts || {}), ...(b.jobCosts || {}) }
  merged.tombstones = [...new Set([...(a.tombstones || []), ...(b.tombstones || [])])]
  const dead = new Set(merged.tombstones)
  merged.proposals  = merged.proposals.filter(p => !dead.has(`proposal:${p.id}`))
  // Deleted change orders stay deleted (tombstoned as co:<proposalId>:<coId>).
  merged.proposals  = merged.proposals.map(p => {
    const cos = p?.jobData?.changeOrders
    if (!cos || !cos.length) return p
    const kept = cos.filter(co => !dead.has(`co:${p.id}:${co.id}`))
    return kept.length === cos.length ? p : { ...p, jobData: { ...p.jobData, changeOrders: kept } }
  })
  merged.todos      = (merged.todos || []).filter(t => !dead.has(`todo:${t.id}`))
  merged.checklists = (merged.checklists || []).filter(c => !dead.has(`checklist:${c.id}`))
  merged.expenses   = (merged.expenses || []).filter(e => !dead.has(`expense:${e.id}`))
  for (const k of ['nextCatalogId', 'nextProposalId', 'nextTemplateId', 'nextScopeTemplateId', 'nextPaymentScheduleId', 'nextSubId']) {
    const v = Math.max(Number(a[k]) || 0, Number(b[k]) || 0)
    if (v) merged[k] = v
  }
  return { state: merged, version: Math.max(Number(existing?.version) || 0, Number(incoming?.version) || 0) }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    try {
      const kv = await getKV()
      // Cheap change check: clients poll this (a few bytes) and only download
      // the multi-MB dataset when the revision actually moved.
      if (req.query && req.query.rev !== undefined) {
        const rev = await kv.get(REV_KEY)
        return res.status(200).json({ rev: Number(rev) || 0 })
      }
      const [data, rev] = await Promise.all([kv.get(KV_KEY), kv.get(REV_KEY)])
      res.setHeader('X-Store-Rev', String(Number(rev) || 0))
      return res.status(200).send(data ? JSON.stringify(data) : 'null')
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    try {
      const { value } = req.body || {}
      if (typeof value !== 'string') return res.status(400).json({ error: 'Invalid payload' })
      let parsed
      try {
        parsed = JSON.parse(value)
      } catch {
        return res.status(400).json({ error: 'Invalid payload' })
      }
      if (typeof parsed !== 'object' || parsed === null) return res.status(400).json({ error: 'Invalid payload' })
      const kv = await getKV()
      // Merge into the existing shared blob instead of overwriting, so one user's
      // save can't wipe records another user created but this client hadn't synced.
      const existing = await kv.get(KV_KEY)
      const toStore = existing && typeof existing === 'object' && existing.state
        ? mergeState(existing, parsed)
        : parsed
      await kv.set(KV_KEY, toStore)
      const rev = Date.now()
      await kv.set(REV_KEY, rev)
      return res.status(200).json({ ok: true, rev })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
