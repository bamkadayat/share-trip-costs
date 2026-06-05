import type { Trip } from '../types'

// Persist the whole trip (participants, expenses) to localStorage.

const KEY = 'cabin-split.trip'

export const emptyTrip: Trip = { participants: [], expenses: [] }

export function loadTrip(): Trip {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyTrip
    return { ...emptyTrip, ...(JSON.parse(raw) as Partial<Trip>) }
  } catch {
    return emptyTrip
  }
}

export function saveTrip(trip: Trip): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(trip))
  } catch {
    // storage full or unavailable — ignore
  }
}
