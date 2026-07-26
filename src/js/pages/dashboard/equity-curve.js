// Reconstruye el valor de cartera y el capital invertido día a día a partir
// de las operaciones históricas y el historial de precios por ticker.
// Función pura (sin fetch/DOM) para poder testearla de forma aislada.

const toDateStr = unixSeconds => new Date(unixSeconds * 1000).toISOString().split('T')[0]

// operations: [{ type: 'compra'|'venta', quantity, price, operated_at: 'YYYY-MM-DD', instrument_ticker }]
//   ordenadas ascendente por operated_at, de UNA sola moneda.
// priceHistories: { [ticker]: [{ date: unixSeconds, price }] }
// Devuelve { dates: ['YYYY-MM-DD', ...], portfolioValue: [...], invested: [...] }
export function computeEquitySeries(operations, priceHistories) {
  if (!operations || operations.length === 0) {
    return { dates: [], portfolioValue: [], invested: [] }
  }

  const firstOpDate = operations[0].operated_at

  const dateSet = new Set()
  for (const ticker of Object.keys(priceHistories)) {
    for (const point of priceHistories[ticker]) {
      const d = toDateStr(point.date)
      if (d >= firstOpDate) dateSet.add(d)
    }
  }
  const dates = [...dateSet].sort()
  if (!dates.length) return { dates: [], portfolioValue: [], invested: [] }

  const sortedPrices = {}
  for (const ticker of Object.keys(priceHistories)) {
    sortedPrices[ticker] = priceHistories[ticker]
      .map(p => [toDateStr(p.date), p.price])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  }

  const priceCursor = {}
  Object.keys(sortedPrices).forEach(t => { priceCursor[t] = -1 })

  // Forward-fill: dates se recorre ascendente, así que el cursor por ticker
  // solo avanza, nunca retrocede (O(n) total por ticker).
  const priceAt = (ticker, dateStr) => {
    const series = sortedPrices[ticker]
    if (!series || !series.length) return null
    let idx = priceCursor[ticker]
    while (idx + 1 < series.length && series[idx + 1][0] <= dateStr) idx++
    priceCursor[ticker] = idx
    return idx >= 0 ? series[idx][1] : null
  }

  // Posición corriente por ticker: cantidad + costo promedio ponderado
  // (mismo método que get_user_realized_pnl, para consistencia con el resto de la app).
  const pos = {}
  let opIdx = 0
  const portfolioValue = []
  const invested = []

  for (const dateStr of dates) {
    while (opIdx < operations.length && operations[opIdx].operated_at <= dateStr) {
      const op = operations[opIdx]
      const ticker = op.instrument_ticker
      if (!pos[ticker]) pos[ticker] = { qty: 0, avgCost: 0 }
      const p = pos[ticker]
      if (op.type === 'compra') {
        const newQty = p.qty + op.quantity
        p.avgCost = newQty > 0 ? (p.avgCost * p.qty + op.price * op.quantity) / newQty : 0
        p.qty = newQty
      } else {
        p.qty = Math.max(0, p.qty - op.quantity)
        if (p.qty === 0) p.avgCost = 0
      }
      opIdx++
    }

    let value = 0
    let cost = 0
    for (const ticker of Object.keys(pos)) {
      const p = pos[ticker]
      if (p.qty <= 0) continue
      const price = priceAt(ticker, dateStr) ?? p.avgCost
      value += p.qty * price
      cost += p.qty * p.avgCost
    }
    portfolioValue.push(value)
    invested.push(cost)
  }

  return { dates, portfolioValue, invested }
}

// Agrupa operaciones por moneda, listas para pasarle a computeEquitySeries una vez por moneda.
export function groupOperationsByCurrency(operations) {
  const byCurrency = {}
  for (const op of operations) {
    if (!byCurrency[op.currency]) byCurrency[op.currency] = []
    byCurrency[op.currency].push(op)
  }
  return byCurrency
}
