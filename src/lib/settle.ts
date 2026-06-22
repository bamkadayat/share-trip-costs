import type { Trip } from '../types'

/**
 * How the total is divided:
 * - 'equal'   — every participant pays an equal share (a family counts as one).
 * - 'perHead' — split by the number of people, so a family of 4 pays 4 shares.
 */
export type SplitMode = 'equal' | 'perHead'

export interface Balance {
  id: string
  name: string
  subtitle: string
  /** People this participant represents (1 for a person, N for a family). */
  members: number
  paid: number
  share: number
  /** paid - share. Positive = gets money back, negative = should pay. */
  net: number
}

export interface Transfer {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

export interface Settlement {
  total: number
  /** Nominal share per unit — per participant ('equal') or per head ('perHead'). */
  share: number
  /** Number of units the total was divided by: participants ('equal') or heads ('perHead'). */
  unitCount: number
  mode: SplitMode
  balances: Balance[]
  transfers: Transfer[]
}

// Work in integer øre internally so nothing is lost to floating-point or
// rounding: shares always sum back to the total and transfers reconcile
// exactly with the displayed balances.
const toOre = (kr: number) => Math.round(kr * 100)
const toKr = (ore: number) => ore / 100

interface OreBalance {
  id: string
  name: string
  subtitle: string
  members: number
  paidOre: number
  shareOre: number
  netOre: number
}

/** Greedy settlement on integer øre: biggest debtor pays biggest creditor. */
function settleBalances(balances: OreBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.netOre < 0)
    .map((b) => ({ id: b.id, name: b.name, net: b.netOre }))
    .sort((a, b) => a.net - b.net) // most negative first
  const creditors = balances
    .filter((b) => b.netOre > 0)
    .map((b) => ({ id: b.id, name: b.name, net: b.netOre }))
    .sort((a, b) => b.net - a.net) // most positive first

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]
    const amount = Math.min(-d.net, c.net) // integer øre
    if (amount > 0) {
      transfers.push({
        fromId: d.id,
        fromName: d.name,
        toId: c.id,
        toName: c.name,
        amount: toKr(amount),
      })
    }
    d.net += amount
    c.net -= amount
    if (d.net === 0) i++
    if (c.net === 0) j++
  }
  return transfers
}

/** People a participant represents (a family of N, a person = 1). */
function memberCount(members: number | undefined): number {
  return Math.max(1, Math.floor(members ?? 1))
}

export function computeSettlement(
  trip: Trip,
  mode: SplitMode = 'equal',
): Settlement {
  const totalOre = trip.expenses.reduce((sum, e) => sum + toOre(e.amount), 0)

  const paidOreById = new Map<string, number>()
  for (const e of trip.expenses) {
    paidOreById.set(
      e.participantId,
      (paidOreById.get(e.participantId) ?? 0) + toOre(e.amount),
    )
  }

  // Each participant gets a weight: 1 in 'equal' mode, its member count in
  // 'perHead' mode. The total is divided into `totalWeight` equal øre-shares.
  const weights = trip.participants.map((p) =>
    mode === 'perHead' ? memberCount(p.members) : 1,
  )
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  // Split into `totalWeight` shares that sum back to exactly totalOre:
  // the first `remainder` of those øre-shares carry one extra øre.
  const baseShare = totalWeight > 0 ? Math.floor(totalOre / totalWeight) : 0
  const remainder = totalWeight > 0 ? totalOre - baseShare * totalWeight : 0

  let unit = 0 // running index across all weight units (heads)
  const oreBalances: OreBalance[] = trip.participants.map((p, idx) => {
    const w = weights[idx]
    // Extra øre this participant absorbs: its weight-units that fall within
    // the first `remainder` units.
    const extra = Math.min(w, Math.max(0, remainder - unit))
    unit += w
    const shareOre = baseShare * w + extra
    const paidOre = paidOreById.get(p.id) ?? 0
    return {
      id: p.id,
      name: p.name,
      subtitle: p.type === 'family' ? 'Family' : 'Person',
      members: memberCount(p.members),
      paidOre,
      shareOre,
      netOre: paidOre - shareOre,
    }
  })

  const balances: Balance[] = oreBalances.map((b) => ({
    id: b.id,
    name: b.name,
    subtitle: b.subtitle,
    members: b.members,
    paid: toKr(b.paidOre),
    share: toKr(b.shareOre),
    net: toKr(b.netOre),
  }))

  return {
    total: toKr(totalOre),
    share: totalWeight > 0 ? Math.round(totalOre / totalWeight) / 100 : 0,
    unitCount: totalWeight,
    mode,
    balances,
    transfers: settleBalances(oreBalances),
  }
}

export function formatNOK(n: number): string {
  return `${n.toLocaleString('nb-NO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} kr`
}
