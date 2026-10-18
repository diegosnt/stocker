// Costo en dólares de las posiciones abiertas en ARS, usando el dólar MEP
// guardado en cada operación (usd_rate). Mismo método de costo promedio
// ponderado que equity-curve.js: las ventas reducen el costo en proporción.
//
// operations: [{ type: 'compra'|'venta', quantity, price, currency, operated_at, instrument_ticker, alyc_id, usd_rate }]
// Devuelve { costUsd, positions, incomplete }:
//   costUsd    — costo total en US$ de lo que sigue en cartera
//   positions  — cantidad de posiciones abiertas (ticker + ALyC)
//   incomplete — posiciones abiertas con alguna compra sin usd_rate (su costo
//                en US$ queda subestimado)

const EPS = 0.000001

export function computeUsdCostBasis(operations) {
  const ops = (operations || [])
    .filter(op => op.currency === 'ARS')
    .slice()
    .sort((a, b) => String(a.operated_at).localeCompare(String(b.operated_at)))

  // Por ticker + ALyC, igual que las tenencias: una venta en un ALyC no
  // modifica el costo de la misma especie en otro
  const pos = new Map()

  for (const op of ops) {
    const key = `${op.instrument_ticker}|${op.alyc_id}`
    if (!pos.has(key)) pos.set(key, { qty: 0, costUsd: 0, missing: false })
    const p = pos.get(key)
    const qty = parseFloat(op.quantity) || 0
    if (qty <= 0) continue

    if (op.type === 'compra') {
      const rate = parseFloat(op.usd_rate)
      if (rate > 0) p.costUsd += (parseFloat(op.price) * qty) / rate
      else p.missing = true
      p.qty += qty
    } else if (op.type === 'venta' && p.qty > 0) {
      const remaining = Math.max(p.qty - qty, 0)
      p.costUsd *= remaining / p.qty
      p.qty = remaining
      if (p.qty <= EPS) { p.qty = 0; p.costUsd = 0; p.missing = false }
    }
  }

  let costUsd = 0, positions = 0, incomplete = 0
  for (const p of pos.values()) {
    if (p.qty <= EPS) continue
    positions++
    costUsd += p.costUsd
    if (p.missing) incomplete++
  }
  return { costUsd, positions, incomplete }
}
