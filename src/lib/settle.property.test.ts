import { describe, expect, it } from 'vitest'
import { computeSettlement, type SplitMode } from './settle'
import type { Trip } from '../types'

// Small deterministic PRNG (mulberry32) so failures are reproducible.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomTrip(rand: () => number): Trip {
  const n = 1 + Math.floor(rand() * 6) // 1..6 participants
  const participants = Array.from({ length: n }, (_, i) => {
    const isFamily = rand() < 0.5
    return {
      id: `p${i}`,
      name: `P${i}`,
      type: isFamily ? ('family' as const) : ('person' as const),
      members: isFamily ? 1 + Math.floor(rand() * 6) : 1, // family 1..6
    }
  })
  const m = Math.floor(rand() * 8) // 0..7 expenses
  const expenses = Array.from({ length: m }, (_, i) => {
    const p = participants[Math.floor(rand() * participants.length)]
    // Random amount with up to 2 decimals, including awkward fractions.
    const amount = Math.round(rand() * 1000000) / 100 // 0..10000.00
    return {
      id: `e${i}`,
      participantId: p.id,
      amount,
      description: '',
      createdAt: i,
    }
  })
  return { participants, expenses }
}

function checkInvariants(trip: Trip, mode: SplitMode) {
  const s = computeSettlement(trip, mode)

  // Conservation in øre (avoid float drift in the assertion itself).
  const ore = (n: number) => Math.round(n * 100)
  const totalOre = ore(s.total)
  const shareSumOre = s.balances.reduce((a, b) => a + ore(b.share), 0)
  const paidSumOre = s.balances.reduce((a, b) => a + ore(b.paid), 0)
  const netSumOre = s.balances.reduce((a, b) => a + ore(b.net), 0)

  expect(shareSumOre).toBe(totalOre) // shares sum exactly to total
  expect(paidSumOre).toBe(totalOre) // paid sums exactly to total
  expect(netSumOre).toBe(0) // no money created or lost

  // net == paid - share for each participant.
  for (const b of s.balances) {
    expect(ore(b.net)).toBe(ore(b.paid) - ore(b.share))
  }

  // Transfers: positive, integer øre, and reconcile to each net balance.
  const recv = new Map<string, number>()
  const sent = new Map<string, number>()
  for (const t of s.transfers) {
    expect(t.amount).toBeGreaterThan(0)
    sent.set(t.fromId, (sent.get(t.fromId) ?? 0) + ore(t.amount))
    recv.set(t.toId, (recv.get(t.toId) ?? 0) + ore(t.amount))
  }
  for (const b of s.balances) {
    const flow = (recv.get(b.id) ?? 0) - (sent.get(b.id) ?? 0)
    expect(flow).toBe(ore(b.net))
  }

  // Fairness: per-head charge differs by at most 1 øre between participants.
  // shareOre_i / weight_i should be within 1 øre of baseline for all i.
  const perHeadOre = s.balances.map((b) => {
    const w = mode === 'perHead' ? b.members : 1
    return ore(b.share) / w
  })
  const min = Math.min(...perHeadOre)
  const max = Math.max(...perHeadOre)
  // Each head pays baseShare or baseShare+1 øre, so a participant's average
  // per-head charge stays within (min, min+1].
  expect(max - min).toBeLessThanOrEqual(1 + 1e-9)

  return s
}

describe('computeSettlement — property tests', () => {
  it('holds all invariants across 4000 random trips (both modes)', () => {
    const rand = rng(123456789)
    for (let k = 0; k < 2000; k++) {
      const trip = randomTrip(rand)
      checkInvariants(trip, 'equal')
      checkInvariants(trip, 'perHead')
    }
  })

  it('per-head: a single person never pays more than a larger family', () => {
    const rand = rng(987654321)
    for (let k = 0; k < 2000; k++) {
      const trip = randomTrip(rand)
      const s = computeSettlement(trip, 'perHead')
      for (const a of s.balances) {
        for (const b of s.balances) {
          if (a.members < b.members) {
            // Fewer heads ⇒ never a larger fair share.
            expect(a.share).toBeLessThanOrEqual(b.share + 1e-9)
          }
        }
      }
    }
  })
})
