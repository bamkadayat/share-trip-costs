import { describe, expect, it } from 'vitest'
import { computeSettlement, type Settlement } from './settle'
import type { Trip } from '../types'

// A participant entry is [name, type] or [name, type, members].
type P = [string, 'person' | 'family'] | [string, 'person' | 'family', number]

function trip(
  participants: P[],
  expenses: Array<[string, number]>,
): Trip {
  return {
    participants: participants.map(([name, type, members], i) => ({
      id: `p${i}`,
      name,
      type,
      members: members ?? 1,
    })),
    expenses: expenses.map(([name, amount], i) => {
      const pid = participants.findIndex(([n]) => n === name)
      return {
        id: `e${i}`,
        participantId: `p${pid}`,
        amount,
        description: '',
        createdAt: i,
      }
    }),
  }
}

/** Invariants that must hold for ANY settlement. */
function expectInvariants(s: Settlement) {
  // 1. Everyone's net cancels out — no money created or lost.
  const netSum = s.balances.reduce((a, b) => a + b.net, 0)
  expect(netSum).toBeCloseTo(0, 9)

  // 2. Shares sum to the total.
  const shareSum = s.balances.reduce((a, b) => a + b.share, 0)
  expect(shareSum).toBeCloseTo(s.total, 9)

  // 3. Paid sums to the total.
  const paidSum = s.balances.reduce((a, b) => a + b.paid, 0)
  expect(paidSum).toBeCloseTo(s.total, 9)

  // 4. Transfers reconcile: in - out equals each participant's net balance.
  const recv = new Map<string, number>()
  const sent = new Map<string, number>()
  for (const t of s.transfers) {
    sent.set(t.fromId, (sent.get(t.fromId) ?? 0) + t.amount)
    recv.set(t.toId, (recv.get(t.toId) ?? 0) + t.amount)
  }
  for (const b of s.balances) {
    const net = (recv.get(b.id) ?? 0) - (sent.get(b.id) ?? 0)
    expect(net).toBeCloseTo(b.net, 9)
  }

  // 5. No zero or negative transfers.
  for (const t of s.transfers) expect(t.amount).toBeGreaterThan(0)
}

describe('computeSettlement', () => {
  it('splits equally and routes transfers to the payer', () => {
    const s = computeSettlement(
      trip(
        [
          ['Ola', 'person'],
          ['Kari', 'person'],
          ['Per', 'person'],
        ],
        [['Ola', 900]],
      ),
    )
    expect(s.share).toBe(300)
    expect(s.balances[0].net).toBe(600) // Ola gets back
    expect(s.balances[1].net).toBe(-300) // Kari should pay
    expect(s.transfers).toHaveLength(2)
    expectInvariants(s)
  })

  it('handles non-divisible totals to the øre (100 / 3)', () => {
    const s = computeSettlement(
      trip(
        [
          ['A', 'person'],
          ['B', 'person'],
          ['C', 'person'],
        ],
        [['A', 100]],
      ),
    )
    expect(s.total).toBe(100)
    expectInvariants(s)
  })

  it('treats a family as one share', () => {
    const s = computeSettlement(
      trip(
        [
          ['Ola', 'person'],
          ['Kari', 'person'],
          ['Hansen', 'family'],
        ],
        [
          ['Ola', 6000],
          ['Kari', 3000],
        ],
      ),
    )
    expect(s.share).toBe(3000)
    expect(s.balances[0].net).toBe(3000) // Ola
    expect(s.balances[1].net).toBe(0) // Kari settled
    expect(s.balances[2].net).toBe(-3000) // Hansen
    expect(s.transfers).toEqual([
      expect.objectContaining({
        fromName: 'Hansen',
        toName: 'Ola',
        amount: 3000,
      }),
    ])
    expectInvariants(s)
  })

  it('produces no transfers when everyone paid their share', () => {
    const s = computeSettlement(
      trip(
        [
          ['A', 'person'],
          ['B', 'person'],
        ],
        [
          ['A', 250],
          ['B', 250],
        ],
      ),
    )
    expect(s.transfers).toHaveLength(0)
    expectInvariants(s)
  })

  it('handles decimal amounts without drift (33.33 + 66.67 / 3)', () => {
    const s = computeSettlement(
      trip(
        [
          ['A', 'person'],
          ['B', 'person'],
          ['C', 'person'],
        ],
        [
          ['A', 33.33],
          ['B', 66.67],
        ],
      ),
    )
    expect(s.total).toBe(100)
    expectInvariants(s)
  })

  it('handles an empty trip', () => {
    const s = computeSettlement(trip([], []))
    expect(s.total).toBe(0)
    expect(s.share).toBe(0)
    expect(s.transfers).toHaveLength(0)
  })

  it('handles participants with no expenses', () => {
    const s = computeSettlement(
      trip(
        [
          ['A', 'person'],
          ['B', 'family'],
        ],
        [],
      ),
    )
    expect(s.balances.every((b) => b.net === 0)).toBe(true)
    expect(s.transfers).toHaveLength(0)
    expectInvariants(s)
  })

  it("defaults to equal split when no mode is given", () => {
    const s = computeSettlement(
      trip(
        [
          ['Ola', 'person'],
          ['Hansen', 'family', 4],
        ],
        [['Ola', 1000]],
      ),
    )
    // Equal mode ignores member count: 2 units, 500 each.
    expect(s.mode).toBe('equal')
    expect(s.share).toBe(500)
    expect(s.unitCount).toBe(2)
    expectInvariants(s)
  })
})

describe('computeSettlement — per-head split', () => {
  it('splits by the number of people (family of 4 + single person)', () => {
    const s = computeSettlement(
      trip(
        [
          ['Hansen', 'family', 4],
          ['Solo', 'person'],
        ],
        [
          ['Hansen', 5000],
          ['Solo', 1000],
        ],
      ),
      'perHead',
    )
    // Total 6000 over 5 heads = 1200 per head.
    expect(s.total).toBe(6000)
    expect(s.unitCount).toBe(5)
    expect(s.share).toBe(1200)
    // Family owes 4 × 1200 = 4800, paid 5000 → gets back 200.
    expect(s.balances[0].net).toBe(200)
    // Single owes 1200, paid 1000 → owes 200.
    expect(s.balances[1].net).toBe(-200)
    expect(s.transfers).toEqual([
      expect.objectContaining({
        fromName: 'Solo',
        toName: 'Hansen',
        amount: 200,
      }),
    ])
    expectInvariants(s)
  })

  it('charges a single person less than a larger family', () => {
    const s = computeSettlement(
      trip(
        [
          ['BigFam', 'family', 4],
          ['Solo', 'person'],
        ],
        [['BigFam', 5000]],
      ),
      'perHead',
    )
    const big = s.balances.find((b) => b.name === 'BigFam')!
    const solo = s.balances.find((b) => b.name === 'Solo')!
    expect(big.share).toBe(4000) // 4 heads
    expect(solo.share).toBe(1000) // 1 head
    expect(solo.share).toBeLessThan(big.share)
    expectInvariants(s)
  })

  it('keeps øre exact when heads do not divide the total (100 / 7)', () => {
    const s = computeSettlement(
      trip(
        [
          ['Fam', 'family', 4],
          ['A', 'person'],
          ['B', 'person'],
          ['C', 'person'],
        ],
        [['A', 100]],
      ),
      'perHead',
    )
    expect(s.total).toBe(100)
    expect(s.unitCount).toBe(7)
    expectInvariants(s)
  })
})
