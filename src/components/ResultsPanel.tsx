import { formatNOK, type Settlement } from '../lib/settle'

interface Props {
  settlement: Settlement
}

export default function ResultsPanel({ settlement }: Props) {
  const { total, share, unitCount, balances, transfers } = settlement

  return (
    <section className="card card--results">
      <h2 className="card__title">Settlement</h2>

      <div className="stats">
        <div className="stat">
          <span className="stat__label">Total spent</span>
          <span className="stat__value">{formatNOK(total)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Equal share</span>
          <span className="stat__value">{formatNOK(share)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Participants</span>
          <span className="stat__value">{unitCount}</span>
        </div>
      </div>

      {balances.length === 0 ? (
        <p className="muted">Add participants and expenses to see the split.</p>
      ) : (
        <>
          <h3 className="subhead">Balances</h3>
          <ul className="balance-list">
            {balances.map((b) => {
              const status =
                b.net > 0.005 ? 'gets' : b.net < -0.005 ? 'owes' : 'even'
              return (
                <li key={b.id} className="balance">
                  <div className="balance__who">
                    <span className="balance__name">{b.name}</span>
                    <span className="balance__sub">{b.subtitle}</span>
                  </div>
                  <span className="balance__paid">paid {formatNOK(b.paid)}</span>
                  <span className={`balance__net balance__net--${status}`}>
                    {status === 'gets' && `gets back ${formatNOK(b.net)}`}
                    {status === 'owes' && `should pay ${formatNOK(-b.net)}`}
                    {status === 'even' && 'settled'}
                  </span>
                </li>
              )
            })}
          </ul>

          <h3 className="subhead">Who pays whom</h3>
          {transfers.length === 0 ? (
            <p className="muted">Everyone is settled up. 🎉</p>
          ) : (
            <ul className="transfer-list">
              {transfers.map((t, i) => (
                <li key={i} className="transfer">
                  <span className="transfer__from">{t.fromName}</span>
                  <span className="transfer__arrow">→</span>
                  <span className="transfer__to">{t.toName}</span>
                  <span className="transfer__amount">{formatNOK(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
