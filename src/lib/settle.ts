import type { Trip } from '../types'

export interface Balance {
  id: string
  name: string
  subtitle: string
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
  /** Equal share per participant (nominal, for display). */
  share: number
  unitCount: number
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

export function computeSettlement(trip: Trip): Settlement {
  const totalOre = trip.expenses.reduce((sum, e) => sum + toOre(e.amount), 0)

  const paidOreById = new Map<string, number>()
  for (const e of trip.expenses) {
    paidOreById.set(
      e.participantId,
      (paidOreById.get(e.participantId) ?? 0) + toOre(e.amount),
    )
  }

  const n = trip.participants.length
  // Split the total into n shares that sum back to exactly totalOre:
  // the first `remainder` participants pay one extra øre.
  const baseShare = n > 0 ? Math.floor(totalOre / n) : 0
  const remainder = n > 0 ? totalOre - baseShare * n : 0

  const oreBalances: OreBalance[] = trip.participants.map((p, idx) => {
    const shareOre = baseShare + (idx < remainder ? 1 : 0)
    const paidOre = paidOreById.get(p.id) ?? 0
    return {
      id: p.id,
      name: p.name,
      subtitle: p.type === 'family' ? 'Family' : 'Person',
      paidOre,
      shareOre,
      netOre: paidOre - shareOre,
    }
  })

  const balances: Balance[] = oreBalances.map((b) => ({
    id: b.id,
    name: b.name,
    subtitle: b.subtitle,
    paid: toKr(b.paidOre),
    share: toKr(b.shareOre),
    net: toKr(b.netOre),
  }))

  return {
    total: toKr(totalOre),
    share: n > 0 ? Math.round((totalOre / n)) / 100 : 0,
    unitCount: n,
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
