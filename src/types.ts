// Domain model for the cabin-trip expense splitter.

export type ParticipantType = 'person' | 'family'

export interface Participant {
  id: string
  type: ParticipantType
  name: string
  /** People this participant represents: a person is 1, a family is N.
   *  Only used by the per-head split. Optional for backwards compatibility. */
  members?: number
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

/** Family member-count bounds. */
export const MIN_MEMBERS = 1
export const MAX_MEMBERS = 50
