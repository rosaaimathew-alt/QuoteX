// Single source of truth for a proposal's *contract* total.
//
// For an à la carte proposal the signed contract covers only the items the
// client selected, so the real contract value is the sum of the saved
// contract-draft scope-line prices — NOT proposal.total (which is the sum of
// every proposal line, including ones the client declined).
//
// Every money view that talks about the CONTRACT (Contracts list, Jobs budget,
// change-order running total, payment reminders) must use this so they agree
// with the signed document. Falls back to proposal.total before a contract
// draft exists.
export function contractTotalOf(proposal) {
  const sl = proposal?.contractDraft?.scopeLines
  if (Array.isArray(sl) && sl.length) {
    const sum = sl.reduce((s, l) => s + (Number(l.price) || 0), 0)
    if (sum > 0) return sum
  }
  return Number(proposal?.total || 0)
}
