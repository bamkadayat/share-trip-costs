import { useState } from 'react'
import { formatNOK, type Settlement } from '../lib/settle'
import {
  canShareSettlementImage,
  downloadSettlementImage,
  shareSettlementImage,
} from '../lib/settlementImage'

interface Props {
  settlement: Settlement
}

export default function ResultsPanel({ settlement }: Props) {
  const { total, share, unitCount, balances, transfers } = settlement
  const [busy, setBusy] = useState<null | 'download' | 'share'>(null)
  const [error, setError] = useState<string | null>(null)
  const canShare = canShareSettlementImage()
  const canExport = balances.length > 0

  async function handleDownload() {
    setError(null)
    setBusy('download')
    try {
      await downloadSettlementImage(settlement)
    } catch {
      setError('Could not create the image. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function handleShare() {
    setError(null)
    setBusy('share')
    try {
      const shared = await shareSettlementImage(settlement)
      if (!shared) await downloadSettlementImage(settlement)
    } catch {
      setError('Could not share the image. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card card--results">
      <div className="results__head">
        <h2 className="card__title">Settlement</h2>
        {canExport && (
          <div className="row row--tight">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleDownload}
              disabled={busy !== null}
            >
              {busy === 'download' ? 'Saving…' : '⬇ Download'}
            </button>
            {canShare && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleShare}
                disabled={busy !== null}
              >
                {busy === 'share' ? 'Sharing…' : '📤 Share'}
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}

      <div className="stats">
        <div className="stat">
          <span className="stat__label">Total spent</span>
          <span className="stat__value">{formatNOK(total)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Per person</span>
          <span className="stat__value">{formatNOK(share)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">People</span>
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
                  <span className="balance__who">
                    <span className="balance__name">{b.name}</span>
                    <span className="balance__paid">
                      paid {formatNOK(b.paid)}
                    </span>
                  </span>
                  <span className={`balance__net balance__net--${status}`}>
                    {status === 'gets' && `gets back ${formatNOK(b.net)}`}
                    {status === 'owes' && `owes ${formatNOK(-b.net)}`}
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
