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

  const submitParticipant = () => {
    if (!name.trim()) return
    addParticipant(type, name)
    setName('')
  }

  return (
    <section className="card">
      <h2 className="card__title">Participants &amp; expenses</h2>

      {/* Step 1: add a family or person */}
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
            placeholder={type === 'family' ? 'Family name (e.g. Hansen)' : 'Person name (e.g. Ola)'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitParticipant()}
          />
          <button className="btn btn--primary" onClick={submitParticipant}>
            Add
          </button>
        </div>
      </div>

      {/* Step 2: each participant, with their expenses */}
      {participants.length === 0 ? (
        <p className="muted">
          Add a family or person to start. No expenses counts as 0.
        </p>
      ) : (
        <ul className="participant-list">
          {participants.map((p) => (
            <ParticipantCard
              key={p.id}
              participant={p}
              expenses={expenses.filter((e) => e.participantId === p.id)}
              onRemove={() => removeParticipant(p.id)}
              onAddExpense={(amount, desc) => addExpense(p.id, amount, desc)}
              onRemoveExpense={removeExpense}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface CardProps {
  participant: Participant
  expenses: Expense[]
  onRemove: () => void
  onAddExpense: (amount: number, description: string) => void
  onRemoveExpense: (id: string) => void
}

function ParticipantCard({
  participant,
  expenses,
  onRemove,
  onAddExpense,
  onRemoveExpense,
}: CardProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const submit = () => {
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
    onAddExpense(value, description)
    setAmount('')
    setDescription('')
    setError('')
  }

  return (
    <li className="participant">
      <div className="participant__head">
        <div className="participant__title">
          <span className="participant__name">{participant.name}</span>
          <span className={`badge badge--${participant.type}`}>
            {participant.type === 'family' ? 'Family' : 'Person'}
          </span>
        </div>
        <div className="participant__total">
          <span className="muted">spent</span> {formatNOK(total)}
          <button
            className="icon-btn"
            aria-label={`Remove ${participant.name}`}
            onClick={onRemove}
          >
            ✕
          </button>
        </div>
      </div>

      {expenses.length > 0 && (
        <ul className="expense-list">
          {[...expenses]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((e) => (
              <li key={e.id} className="expense">
                <span className="expense__desc">
                  {e.description || 'Expense'}
                </span>
                <span className="expense__amount">{formatNOK(e.amount)}</span>
                <button
                  className="icon-btn"
                  aria-label="Remove expense"
                  onClick={() => onRemoveExpense(e.id)}
                >
                  ✕
                </button>
              </li>
            ))}
        </ul>
      )}

      <div className="expense-add">
        <input
          className="input input--sm"
          placeholder="What for? (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <input
          className="input input--sm input--amount"
          type="number"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step="0.01"
          placeholder="kr"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button className="btn btn--ghost" onClick={submit}>
          + Expense
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </li>
  )
}
