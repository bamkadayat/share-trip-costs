import { formatNOK, type Settlement } from './settle'

// Renders the settlement as a self-contained PNG so people can share it.
// Drawn manually on a <canvas> (no dependencies) using the app's design
// tokens so the image matches what's on screen.

const C = {
  bg: '#e9edf1',
  surface: '#ffffff',
  surface2: '#f3f7fa',
  border: '#d7e3ec',
  navy: '#003554',
  ink: '#051923',
  primaryDark: '#006494',
  accent: '#00a6fb',
  muted: '#5b7384',
  good: '#0a7d4d',
  bad: '#c0392b',
} as const

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

// Logical layout units (the canvas is scaled up for a crisp image).
const SCALE = 2
const W = 720
const PAD = 40
const CONTENT_W = W - PAD * 2

const ROW_BALANCE = 54
const ROW_TRANSFER = 50
const SUBHEAD = 40
const STATS_H = 84

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function measureHeight(s: Settlement): number {
  let h = PAD // top padding
  h += 64 // title + subtitle block
  h += 20 // gap
  h += STATS_H
  h += 24 // gap

  if (s.balances.length === 0) {
    h += SUBHEAD + 40
  } else {
    h += SUBHEAD + s.balances.length * ROW_BALANCE
    h += 20
    h += SUBHEAD
    h += s.transfers.length === 0 ? 40 : s.transfers.length * ROW_TRANSFER
  }

  h += 28 // gap before footer
  h += 28 // footer
  h += PAD // bottom padding
  return h
}

/** Draw the settlement onto a fresh canvas and return it. */
export function drawSettlementCanvas(s: Settlement): HTMLCanvasElement {
  const H = measureHeight(s)
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'alphabetic'

  // Background.
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  // Card.
  ctx.fillStyle = C.surface
  roundRect(ctx, PAD / 2, PAD / 2, W - PAD, H - PAD, 16)
  ctx.fill()

  let y = PAD + 8

  // Title.
  ctx.fillStyle = C.navy
  ctx.font = `750 26px ${FONT}`
  ctx.fillText('Trip settlement', PAD, y + 8)

  // Date (right-aligned).
  const dateStr = new Date().toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  ctx.fillStyle = C.muted
  ctx.font = `500 14px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - PAD, y + 4)
  ctx.textAlign = 'left'

  y += 44

  // Stats row: Total spent / Equal share / Participants.
  const stats: Array<[string, string]> = [
    ['TOTAL SPENT', formatNOK(s.total)],
    ['EQUAL SHARE', formatNOK(s.share)],
    ['PARTICIPANTS', String(s.unitCount)],
  ]
  const gap = 12
  const boxW = (CONTENT_W - gap * 2) / 3
  stats.forEach(([label, value], i) => {
    const x = PAD + i * (boxW + gap)
    ctx.fillStyle = C.surface2
    roundRect(ctx, x, y, boxW, STATS_H - 12, 9)
    ctx.fill()
    ctx.fillStyle = C.muted
    ctx.font = `700 11px ${FONT}`
    ctx.fillText(label, x + 14, y + 24)
    ctx.fillStyle = C.navy
    ctx.font = `750 19px ${FONT}`
    ctx.fillText(value, x + 14, y + 50)
  })
  y += STATS_H + 12

  if (s.balances.length === 0) {
    ctx.fillStyle = C.muted
    ctx.font = `400 15px ${FONT}`
    ctx.fillText('Add participants and expenses to see the split.', PAD, y + 24)
    drawFooter(ctx, H)
    return canvas
  }

  // Balances.
  y = drawSubhead(ctx, 'Balances', y)
  s.balances.forEach((b) => {
    const net = b.net
    const status = net > 0.005 ? 'gets' : net < -0.005 ? 'owes' : 'even'

    ctx.strokeStyle = C.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PAD, y)
    ctx.lineTo(W - PAD, y)
    ctx.stroke()

    ctx.fillStyle = C.ink
    ctx.font = `600 16px ${FONT}`
    ctx.fillText(b.name, PAD, y + 24)

    ctx.fillStyle = C.muted
    ctx.font = `400 12px ${FONT}`
    ctx.fillText(`${b.subtitle} · paid ${formatNOK(b.paid)}`, PAD, y + 42)

    const netText =
      status === 'gets'
        ? `gets back ${formatNOK(net)}`
        : status === 'owes'
          ? `should pay ${formatNOK(-net)}`
          : 'settled'
    ctx.fillStyle =
      status === 'gets' ? C.good : status === 'owes' ? C.bad : C.muted
    ctx.font = `700 15px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText(netText, W - PAD, y + 32)
    ctx.textAlign = 'left'

    y += ROW_BALANCE
  })

  y += 20

  // Who pays whom.
  y = drawSubhead(ctx, 'Who pays whom', y)
  if (s.transfers.length === 0) {
    ctx.fillStyle = C.muted
    ctx.font = `400 15px ${FONT}`
    ctx.fillText('Everyone is settled up. 🎉', PAD, y + 24)
  } else {
    s.transfers.forEach((t) => {
      const h = ROW_TRANSFER - 8
      ctx.fillStyle = C.surface2
      ctx.strokeStyle = C.border
      ctx.lineWidth = 1
      roundRect(ctx, PAD, y, CONTENT_W, h, 9)
      ctx.fill()
      ctx.stroke()

      const midY = y + h / 2 + 5
      ctx.fillStyle = C.ink
      ctx.font = `600 15px ${FONT}`
      ctx.fillText(t.fromName, PAD + 14, midY)
      const fromW = ctx.measureText(t.fromName).width

      ctx.fillStyle = C.accent
      ctx.font = `700 15px ${FONT}`
      ctx.fillText('→', PAD + 14 + fromW + 8, midY)
      const arrowW = ctx.measureText('→').width

      ctx.fillStyle = C.ink
      ctx.font = `600 15px ${FONT}`
      ctx.fillText(t.toName, PAD + 14 + fromW + 8 + arrowW + 8, midY)

      ctx.fillStyle = C.primaryDark
      ctx.font = `750 16px ${FONT}`
      ctx.textAlign = 'right'
      ctx.fillText(formatNOK(t.amount), W - PAD - 14, midY)
      ctx.textAlign = 'left'

      y += ROW_TRANSFER
    })
  }

  drawFooter(ctx, H)
  return canvas
}

function drawSubhead(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
): number {
  ctx.fillStyle = C.primaryDark
  ctx.font = `700 12px ${FONT}`
  ctx.fillText(text.toUpperCase(), PAD, y + 18)
  return y + SUBHEAD
}

function drawFooter(ctx: CanvasRenderingContext2D, H: number) {
  ctx.fillStyle = C.muted
  ctx.font = `500 12px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('Made with Share trip costs', W / 2, H - PAD)
  ctx.textAlign = 'left'
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not create image.'))
    }, 'image/png')
  })
}

/** Build the settlement PNG as a Blob. */
export async function settlementImageBlob(s: Settlement): Promise<Blob> {
  return canvasToBlob(drawSettlementCanvas(s))
}

/** Trigger a browser download of the settlement PNG. */
export async function downloadSettlementImage(
  s: Settlement,
  filename = 'trip-settlement.png',
) {
  const blob = await settlementImageBlob(s)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** True when the device can share image files (mostly mobile browsers). */
export function canShareSettlementImage(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    const probe = new File([new Blob()], 'trip-settlement.png', {
      type: 'image/png',
    })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/**
 * Share the settlement image via the Web Share API (file share).
 * Returns false if sharing isn't available so callers can fall back.
 */
export async function shareSettlementImage(
  s: Settlement,
  filename = 'trip-settlement.png',
): Promise<boolean> {
  if (!canShareSettlementImage()) return false
  const blob = await settlementImageBlob(s)
  const file = new File([blob], filename, { type: 'image/png' })
  try {
    await navigator.share({
      files: [file],
      title: 'Trip settlement',
      text: 'Here is how we split the trip costs.',
    })
    return true
  } catch (err) {
    // User cancelled the share sheet — treat as handled, not a failure.
    if (err instanceof DOMException && err.name === 'AbortError') return true
    return false
  }
}
