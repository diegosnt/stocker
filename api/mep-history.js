// Serie histórica del dólar MEP (venta) desde argentinadatos.com, para guardar
// en cada operación en ARS la cotización del día en que se hizo.

const MEP_HISTORY_URL = 'https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa'
const MEP_HISTORY_TTL = 12 * 60 * 60 * 1000  // 12 horas en ms (la serie es diaria)

let historyCache = null  // { dates: ['YYYY-MM-DD', ...], rates: [...], expiresAt }
let inflight = null

/**
 * Normaliza la respuesta de argentinadatos ([{ fecha, venta }, ...]) a dos arrays
 * paralelos ordenados por fecha, descartando entradas inválidas.
 */
function parseMepHistory(raw) {
  const rows = (Array.isArray(raw) ? raw : [])
    .map(r => ({ date: String(r?.fecha ?? '').slice(0, 10), rate: Number(r?.venta) }))
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.rate) && r.rate > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return { dates: rows.map(r => r.date), rates: rows.map(r => r.rate) }
}

/**
 * Cotización vigente en `date` (YYYY-MM-DD): la de ese día o, si no hubo
 * (fin de semana, feriado), la última anterior. Null si la fecha es anterior
 * al inicio de la serie.
 */
function rateAt(series, date) {
  const { dates, rates } = series
  let lo = 0, hi = dates.length - 1, found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (dates[mid] <= date) { found = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  return found === -1 ? null : rates[found]
}

/**
 * Devuelve la serie histórica cacheada. Si falla la descarga, usa la última
 * serie conocida aunque esté vencida; si nunca se pudo obtener, devuelve null.
 */
async function getMepHistory(logger) {
  if (historyCache && Date.now() < historyCache.expiresAt) return historyCache
  if (inflight) return inflight

  inflight = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(MEP_HISTORY_URL, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const series = parseMepHistory(await res.json())
      if (!series.dates.length) throw new Error('Serie vacía')
      historyCache = { ...series, expiresAt: Date.now() + MEP_HISTORY_TTL }
      return historyCache
    } catch (err) {
      logger?.warn({ err: err.name === 'AbortError' ? 'Timeout' : err.message }, 'Error al descargar MEP histórico')
      return historyCache
    } finally {
      clearTimeout(timeoutId)
      inflight = null
    }
  })()
  return inflight
}

/** Cotización MEP para una operación en ARS; null para USD o si no hay dato. */
async function getMepRateFor(currency, date, logger) {
  if (currency !== 'ARS') return null
  const series = await getMepHistory(logger)
  return series ? rateAt(series, date) : null
}

module.exports = { parseMepHistory, rateAt, getMepHistory, getMepRateFor }
