import { useEffect, useState } from 'react'
import type { ParticipantType, Trip } from '../types'
import { emptyTrip, loadTrip, saveTrip } from './storage'

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`

export function useTrip() {
  const [trip, setTrip] = useState<Trip>(() => loadTrip())

  // Sync to localStorage whenever the trip changes (external-system sync).
  useEffect(() => {
    saveTrip(trip)
  }, [trip])

  const addParticipant = (type: ParticipantType, name: string) =>
    setTrip((t) => ({
      ...t,
      participants: [
        ...t.participants,
        { id: uid(), type, name: name.trim() },
      ],
    }))

  const removeParticipant = (participantId: string) =>
    setTrip((t) => ({
      participants: t.participants.filter((p) => p.id !== participantId),
      expenses: t.expenses.filter((e) => e.participantId !== participantId),
    }))

  const addExpense = (
    participantId: string,
    amount: number,
    description: string,
  ) =>
    setTrip((t) => ({
      ...t,
      expenses: [
        ...t.expenses,
        {
          id: uid(),
          participantId,
          amount,
          description: description.trim(),
          createdAt: Date.now(),
        },
      ],
    }))

  const removeExpense = (expenseId: string) =>
    setTrip((t) => ({
      ...t,
      expenses: t.expenses.filter((e) => e.id !== expenseId),
    }))

  const reset = () => setTrip(emptyTrip)

  return {
    trip,
    addParticipant,
    removeParticipant,
    addExpense,
    removeExpense,
    reset,
  }
}
