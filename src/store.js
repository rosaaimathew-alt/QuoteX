import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Smart storage: saves to a file on the local Mac (via /api/store) so every
// device on the network always reads the same data. Automatically falls back
// to localStorage when the API is not available (e.g. cloud deployment).
let _initial = null // cached promise for the first GET

function _fetchInitial() {
  if (!_initial) {
    _initial = fetch('/api/store', { signal: AbortSignal.timeout(1500) })
      .then(async r => {
        if (!r.ok) return { mode: 'local', data: null }
        const text = await r.text()
        return { mode: 'file', data: (text && text !== 'null') ? text : null }
      })
      .catch(() => ({ mode: 'local', data: null }))
  }
  return _initial
}

const smartStorage = {
  getItem: async (name) => {
    const { mode, data } = await _fetchInitial()
    if (mode === 'file') {
      // File exists and has data — use it
      if (data !== null) return data
      // File is empty — migrate any existing localStorage data into the file
      const local = localStorage.getItem(name)
      if (local) {
        fetch('/api/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: local }),
        }).catch(() => {})
        return local
      }
      return null
    }
    return localStorage.getItem(name)
  },

  setItem: async (name, value) => {
    const { mode } = await _fetchInitial()
    if (mode === 'file') {
      // Fire-and-forget — don't block the UI while saving
      fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      }).catch(() => localStorage.setItem(name, value))
      return
    }
    localStorage.setItem(name, value)
  },

  removeItem: (name) => localStorage.removeItem(name),
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

export const PROPOSAL_STATUSES = ['Draft', 'Sent', 'Followed Up', 'Negotiating', 'Won', 'Lost']

export const WIN_REASONS = [
  'Price competitive', 'Strong relationship', 'Fast turnaround',
  'Client referral', 'Quality reputation', 'Best value', 'Other',
]
export const LOSS_REASONS = [
  'Price too high', 'Went with competitor', 'Project cancelled',
  'No response', 'Timing not right', 'Scope mismatch', 'Other',
]

export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Follow-up', 'Note']

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

      // ── Templates ────────────────────────────────────────────────────────
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
        set((s) => ({
          proposals: s.proposals.map((p) => {
            if (p.id !== id) return p
            const closed = status === 'Won' || status === 'Lost'
            return {
              ...p,
              status,
              closedAt: closed ? new Date().toISOString() : p.closedAt,
            }
          }),
        })),

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

      deleteProposal: (id) =>
        set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

      saveContractDraft: (proposalId, draft) =>
        set((s) => ({
          proposals: s.proposals.map((p) =>
            p.id === proposalId ? { ...p, contractDraft: { ...draft, savedAt: new Date().toISOString() } } : p
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

      // ── Branding ─────────────────────────────────────────────────────────────
      branding: {
        companyName: 'QUOTEX',
        tagline: 'Smart Contractor Pricing',
        logo: null,           // base64 data URL
        primaryColor: null,   // hex string, null = default sky-700
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
      name: 'quotex-store',
      storage: createJSONStorage(() => smartStorage),
      version: 4,
      migrate: (persisted) => {
        const persistedCatalog = persisted?.catalog
        // Preserve user catalog if it exists; fall back to seed only on fresh install
        const catalog = Array.isArray(persistedCatalog) && persistedCatalog.length > 0
          ? persistedCatalog
          : SEED_CATALOG
        const maxId = catalog.reduce((m, i) => Math.max(m, i.id || 0), 0)
        return {
          catalog,
          nextCatalogId: Math.max(SEED_CATALOG.length + 1, maxId + 1, persisted?.nextCatalogId || 0),
          templates:     persisted?.templates     || [],
          nextTemplateId:persisted?.nextTemplateId|| 1,
          proposals:     persisted?.proposals     || [],
          nextProposalId:persisted?.nextProposalId|| 1,
          readMessageIds:persisted?.readMessageIds|| [],
          theme:         persisted?.theme         || 'light',
          branding:      persisted?.branding      || { companyName: 'QUOTEX', tagline: 'Smart Contractor Pricing', logo: null, primaryColor: null },
          scopeExamples: persisted?.scopeExamples || [],
          jobCosts:      persisted?.jobCosts      || {},
        }
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...persistedState,
        // Catalog: always prefer stored data; only fall back to seed when truly empty
        catalog: (persistedState?.catalog?.length > 0)
          ? persistedState.catalog
          : currentState.catalog,
      }),
    }
  )
)
