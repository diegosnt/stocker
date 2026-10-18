// Historial de precios diarios desde Finance, con cache en memoria compartida
// entre el endpoint individual y el de lote (/api/history?tickers=...).

const HISTORY_TTL       = 30 * 60 * 1000  // 30 minutos en ms
const HISTORY_CACHE_MAX = 400             // tope de entradas ticker+rango
const UPSTREAM_TIMEOUT  = 8000            // por request a Finance
const VALID_RANGES      = new Set(['5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])

const historyCache = new Map()  // `${ticker}|${range}` → { history, expiresAt }
const inflight     = new Map()  // `${ticker}|${range}` → Promise

/** Convierte la respuesta de chart de Finance en [{ date, price }], sin cierres vacíos. */
function parseChart(data) {
  const result = data?.chart?.result?.[0]
  if (!result || !result.timestamp) return []
  const timestamps = result.timestamp || []
  const closes     = result.indicators?.quote?.[0]?.close || []
  return timestamps
    .map((t, i) => ({ date: t, price: closes[i] }))
    .filter(h => typeof h.price === 'number')
}

async function fetchSymbol(symbol, range) {
  const url = `${process.env.FINANCE_URL}/${encodeURIComponent(symbol)}?interval=1d&range=${range}&includeTimestamps=true`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal })
    if (!res.ok) return []
    return parseChart(await res.json())
  } catch {
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Historial de un ticker. Consulta en paralelo el símbolo tal cual y el local
 * (con FINANCE_EXCHANGE, ej. GGAL.BA) y prefiere el local cuando existe: el
 * subyacente en USA casi siempre tiene más historia, pero cotiza en otra moneda
 * y otra escala de precio — "el que tenga más historia gana" elegía
 * sistemáticamente el subyacente para CEDEARs, mezclando precios en USD con
 * operaciones en ARS. Devuelve [] si no hay datos.
 */
async function getHistory(ticker, range, logger) {
  const key = `${ticker}|${range}`
  const cached = historyCache.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached.history
  if (inflight.has(key)) return inflight.get(key)

  const promise = (async () => {
    const suffix = process.env.FINANCE_EXCHANGE ? `.${process.env.FINANCE_EXCHANGE}` : ''
    const tasks = [fetchSymbol(ticker, range)]
    if (!ticker.includes('.') && suffix) tasks.push(fetchSymbol(`${ticker}${suffix}`, range))
    const [globalData, localData = []] = await Promise.all(tasks)

    const history = localData.length > 0 ? localData : globalData
    logger?.debug({ ticker, range, global: globalData.length, local: localData.length }, 'Historial obtenido')
    // Solo se cachean resultados con datos: un fallo transitorio no queda pegado 30 min
    if (history.length) historyCache.set(key, { history, expiresAt: Date.now() + HISTORY_TTL })
    return history
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

// Limpieza periódica, igual que quoteCache en server.js
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of historyCache) {
    if (entry.expiresAt <= now) historyCache.delete(key)
  }
  if (historyCache.size > HISTORY_CACHE_MAX) {
    const excess = historyCache.size - HISTORY_CACHE_MAX
    for (const key of [...historyCache.keys()].slice(0, excess)) historyCache.delete(key)
  }
}, HISTORY_TTL).unref()

const isValidRange = range => VALID_RANGES.has(range)

module.exports = { getHistory, parseChart, isValidRange }
