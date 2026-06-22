import { useState } from 'react'
import type { Expense, Participant, ParticipantType } from '../types'
import { MAX_AMOUNT, MIN_AMOUNT } from '../types'
import { formatNOK } from '../lib/settle'

interface Props {
  participants: Participant[]
  expenses: Expense[]
  addParticipant: (type: ParticipantType, name: string) => void
  removeParticipant: (id: string) => void
  addExpense: (participantId: string, amount: number, description: string) => void
  removeExpense: (id: string) => void
}

export default function ParticipantsPanel({
  participants,
  expenses,
  addParticipant,
  removeParticipant,
  addExpense,
  removeExpense,
}: Props) {
  const [type, setType] = useState<ParticipantType>('person')
  const [name, setName] = useState('')

  // Shared "add an expense" form.
  const [payerId, setPayerId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const submitParticipant = () => {
    if (!name.trim()) return
    addParticipant(type, name)
    setName('')
  }

  const submitExpense = () => {
    const payer = payerId || participants[0]?.id || ''
    if (!payer) {
      setError('Add a person first.')
      return
    }
    const value = Number(amount)
    if (amount.trim() === '' || !Number.isFinite(value)) {
      setError('Enter an amount.')
      return
    }
    if (value < MIN_AMOUNT) {
      setError('Amount can’t be negative.')
      return
    }
    if (value > MAX_AMOUNT) {
      setError(`Max ${formatNOK(MAX_AMOUNT)} per expense.`)
      return
    }
    addExpense(payer, value, description)
    setAmount('')
    setDescription('')
    setError('')
  }

  const nameById = new Map(participants.map((p) => [p.id, p.name]))
  const orderedExpenses = [...expenses].sort((a, b) => a.createdAt - b.createdAt)
  const selectedPayer = payerId || participants[0]?.id || ''

  return (
    <section className="card">
      <h2 className="card__title">People &amp; expenses</h2>

      {/* Step 1: add people */}
      <div className="add-participant">
        <div className="toggle">
          <button
            className={`toggle__btn${type === 'person' ? ' is-active' : ''}`}
            onClick={() => setType('person')}
          >
            Person
          </button>
          <button
            className={`toggle__btn${type === 'family' ? ' is-active' : ''}`}
            onClick={() => setType('family')}
          >
            Family
          </button>
        </div>
        <div className="row row--tight">
          <input
            className="input"
            placeholder={
              type === 'family' ? 'Family name, e.g. Hansen' : 'Name, e.g. Ola'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitParticipant()}
          />
          <button className="btn btn--primary" onClick={submitParticipant}>
            Add
          </button>
        </div>

        {participants.length > 0 && (
          <ul className="member-list">
            {participants.map((p) => (
              <li key={p.id} className="chip">
                {p.name}
                <button
                  className="chip__x"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => removeParticipant(p.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Step 2: log an expense against a person */}
      <div className="expense-block">
        <p className="form-label">Add an expense</p>
        <div className="expense-form">
          <div className="row row--tight">
            <select
              className="input select"
              value={selectedPayer}
              onChange={(e) => setPayerId(e.target.value)}
              disabled={participants.length === 0}
            >
              {participants.length === 0 ? (
                <option value="">Add a person first</option>
              ) : (
                participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
            <input
              className="input input--amount"
              type="number"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step="0.01"
              placeholder="Amount (kr)"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (error) setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitExpense()}
              disabled={participants.length === 0}
            />
          </div>
          <input
            className="input"
            placeholder="What for? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitExpense()}
            disabled={participants.length === 0}
          />
          <button
            className="btn btn--primary btn--block"
            onClick={submitExpense}
            disabled={participants.length === 0}
          >
            Add expense
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>

      {/* Logged expenses */}
      {orderedExpenses.length > 0 && (
        <>
          <h3 className="subhead">Logged expenses</h3>
          <ul className="expense-list">
            {orderedExpenses.map((e) => (
              <li key={e.id} className="expense">
                <span className="expense__main">
                  <span className="expense__who">
                    {nameById.get(e.participantId) ?? 'Unknown'}
                  </span>
                  {e.description && (
                    <span className="expense__note"> · {e.description}</span>
                  )}
                </span>
                <span className="expense__amount">{formatNOK(e.amount)}</span>
                <button
                  className="icon-btn"
                  aria-label="Remove expense"
                  onClick={() => removeExpense(e.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
