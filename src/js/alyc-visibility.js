import { invalidate as cacheInvalidate } from './cache.js'

export const ALYC_VISIBILITY_STORAGE_KEY = 'stocker_hidden_alycs'

function getStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage
  }
  return null
}

/**
 * Retorna los IDs de las ALyCs ocultas como un array de strings.
 */
export function getHiddenAlycIds() {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(ALYC_VISIBILITY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/**
 * Retorna un Set con los IDs de las ALyCs ocultas.
 */
export function getHiddenAlycSet() {
  return new Set(getHiddenAlycIds())
}

/**
 * Indica si una ALyC está visible (no oculta).
 */
export function isAlycVisible(alycId, hiddenSet = null) {
  if (!alycId) return true
  const set = hiddenSet || getHiddenAlycSet()
  return !set.has(String(alycId))
}

/**
 * Establece si una ALyC debe estar oculta o visible.
 */
export function setAlycHidden(alycId, hidden) {
  if (!alycId) return
  const idStr = String(alycId)
  const current = getHiddenAlycIds()
  let next
  if (hidden) {
    next = current.includes(idStr) ? current : [...current, idStr]
  } else {
    next = current.filter(id => id !== idStr)
  }

  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(ALYC_VISIBILITY_STORAGE_KEY, JSON.stringify(next))
    } catch (e) {
      console.warn('Error al guardar visibilidad de ALyC en localStorage:', e)
    }
  }

  cacheInvalidate('user_holdings')
  cacheInvalidate('alycs')

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('alyc-visibility-changed', {
      detail: { alycId: idStr, hidden: !!hidden, hiddenIds: next }
    }))
  }
}

/**
 * Invierte la visibilidad de una ALyC.
 * Retorna true si ahora quedó visible, false si quedó oculta.
 */
export function toggleAlycVisibility(alycId) {
  const isHidden = getHiddenAlycSet().has(String(alycId))
  const willBeHidden = !isHidden
  setAlycHidden(alycId, willBeHidden)
  return !willBeHidden
}

/**
 * Agrega tenencias (rows de get_user_holdings) agrupándolas por instrumento,
 * excluyendo cualquier ALyC oculta.
 * 
 * holdingsList: [{ alyc_id, alyc_name, ticker, instrument_name, instrument_type_name, total_quantity, avg_buy_price, currency }]
 * hiddenIds: Set de IDs de ALyCs ocultas (opcional, por defecto getHiddenAlycSet())
 * 
 * Retorna: { items, totalARS, totalUSD, tickers, summary }
 */
export function aggregateHoldings(holdingsList, hiddenIds = null) {
  const hiddenSet = hiddenIds instanceof Set
    ? hiddenIds
    : new Set((hiddenIds || getHiddenAlycIds()).map(String))

  const visible = (holdingsList || []).filter(h => !hiddenSet.has(String(h.alyc_id)))

  const map = new Map()

  for (const h of visible) {
    const qty = parseFloat(h.total_quantity) || 0
    if (qty <= 0.000001) continue

    const abp = parseFloat(h.avg_buy_price) || 0
    const invested = qty * abp
    const key = `${h.ticker}|${h.currency || 'ARS'}`

    if (!map.has(key)) {
      map.set(key, {
        ticker: h.ticker,
        name: h.instrument_name || h.ticker,
        instrumentType: h.instrument_type_name || 'Otros',
        currency: h.currency || 'ARS',
        quantity: 0,
        invested: 0
      })
    }

    const item = map.get(key)
    item.quantity += qty
    item.invested += invested
  }

  let totalARS = 0, totalUSD = 0
  const items = []
  const summary = {}

  for (const item of map.values()) {
    const avgBuyPrice = item.quantity > 0 ? item.invested / item.quantity : 0
    if (item.currency === 'ARS') {
      totalARS += item.invested
    } else {
      totalUSD += item.invested
    }

    items.push({
      ticker: item.ticker,
      name: item.name,
      instrumentType: item.instrumentType,
      quantity: item.quantity,
      avgBuyPrice,
      currency: item.currency,
      invested: item.invested
    })

    summary[item.ticker] = {
      currency: item.currency,
      quantity: item.quantity,
      avgBuyPrice
    }
  }

  items.sort((a, b) => b.invested - a.invested)
  const tickers = items.map(h => h.ticker)

  return { items, totalARS, totalUSD, tickers, summary }
}

/**
 * Filtra un array de operaciones excluyendo aquellas de ALyCs ocultas.
 */
export function filterOperationsByAlyc(operations, hiddenIds = null) {
  const hiddenSet = hiddenIds instanceof Set
    ? hiddenIds
    : new Set((hiddenIds || getHiddenAlycIds()).map(String))

  return (operations || []).filter(op => !hiddenSet.has(String(op.alyc_id)))
}

/**
 * Calcula ganancias realizadas (P&L realizado) a partir de operaciones históricas,
 * excluyendo cualquier ALyC oculta, usando costo promedio ponderado.
 * 
 * operations: [{ type: 'compra'|'venta', quantity, price, currency, operated_at, instrument_ticker, instrument_name, alyc_id }]
 * hiddenIds: Set de IDs de ALyCs ocultas (opcional)
 * 
 * Retorna array de: [{ ticker, instrument_name, currency, total_sold_qty, sell_count, realized_pnl }]
 */
export function computeRealizedPnl(operations, hiddenIds = null) {
  const visibleOps = filterOperationsByAlyc(operations, hiddenIds)
  if (!visibleOps.length) return []

  const sortedOps = [...visibleOps].sort((a, b) => {
    const dateComp = String(a.operated_at || '').localeCompare(String(b.operated_at || ''))
    if (dateComp !== 0) return dateComp
    if (a.type === 'compra' && b.type === 'venta') return -1
    if (a.type === 'venta' && b.type === 'compra') return 1
    return 0
  })

  const groups = new Map()
  for (const op of sortedOps) {
    const ticker = op.instrument_ticker
    if (!ticker) continue
    const key = `${ticker}|${op.currency || 'ARS'}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(op)
  }

  const result = []

  for (const ops of groups.values()) {
    let posQty = 0
    let avgCost = 0
    let totalSoldQty = 0
    let sellCount = 0
    let realizedPnl = 0
    let instrumentName = ops[0].instrument_name || ops[0].instrument_ticker
    const ticker = ops[0].instrument_ticker
    const currency = ops[0].currency || 'ARS'

    for (const op of ops) {
      if (op.instrument_name) instrumentName = op.instrument_name
      const qty = parseFloat(op.quantity) || 0
      const price = parseFloat(op.price) || 0
      if (qty <= 0 || price <= 0) continue

      if (op.type === 'compra') {
        const newQty = posQty + qty
        avgCost = newQty > 0 ? (avgCost * posQty + price * qty) / newQty : 0
        posQty = newQty
      } else if (op.type === 'venta') {
        sellCount++
        totalSoldQty += qty
        realizedPnl += (price - avgCost) * qty
        posQty = Math.max(0, posQty - qty)
        if (posQty === 0) avgCost = 0
      }
    }

    if (sellCount > 0) {
      result.push({
        ticker,
        instrument_name: instrumentName,
        currency,
        total_sold_qty: totalSoldQty,
        sell_count: sellCount,
        realized_pnl: realizedPnl
      })
    }
  }

  return result.sort((a, b) => Math.abs(b.realized_pnl) - Math.abs(a.realized_pnl))
}
