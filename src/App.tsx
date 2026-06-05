import { useMemo, useState } from 'react'
import ParticipantsPanel from './components/ParticipantsPanel'
import ResultsPanel from './components/ResultsPanel'
import ConfirmDialog from './components/ConfirmDialog'
import { computeSettlement } from './lib/settle'
import { useTrip } from './lib/useTrip'
import './App.css'

export default function App() {
  const {
    trip,
    addParticipant,
    removeParticipant,
    addExpense,
    removeExpense,
    reset,
  } = useTrip()

  const settlement = useMemo(() => computeSettlement(trip), [trip])

  const [confirmOpen, setConfirmOpen] = useState(false)

  const hasData = trip.participants.length > 0 || trip.expenses.length > 0

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Share trip costs</h1>
          <p className="app__tagline">
            Add each family or person, log expenses, see who owes whom.
          </p>
        </div>
        {hasData && (
          <button
            className="btn btn--ghost btn--danger"
            onClick={() => setConfirmOpen(true)}
          >
            Reset
          </button>
        )}
      </header>

      <div className="app__grid">
        <div className="app__col">
          <ParticipantsPanel
            participants={trip.participants}
            expenses={trip.expenses}
            addParticipant={addParticipant}
            removeParticipant={removeParticipant}
            addExpense={addExpense}
            removeExpense={removeExpense}
          />
        </div>

        <div className="app__col">
          <ResultsPanel settlement={settlement} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset everything?"
        message="This clears all participants and expenses. This can’t be undone."
        confirmLabel="Yes, reset"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          reset()
          setConfirmOpen(false)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
