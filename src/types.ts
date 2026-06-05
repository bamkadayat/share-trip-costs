// Domain model for the cabin-trip expense splitter.

export type ParticipantType = 'person' | 'family'

export interface Participant {
  id: string
  type: ParticipantType
  name: string
}

export interface Expense {
  id: string
  /** Participant who paid. */
  participantId: string
  amount: number
  description: string
  createdAt: number
}

export interface Trip {
  participants: Participant[]
  expenses: Expense[]
}

/** Expense amount bounds (kr). */
export const MIN_AMOUNT = 0
export const MAX_AMOUNT = 10000
