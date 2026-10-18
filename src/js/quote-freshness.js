import { get as cacheGet, set as cacheSet, invalidate as cacheInvalidate } from './cache.js'

// Cache de cotizaciones compartida por Dashboard y Análisis. Cada entrada guarda
// el precio y cuándo se obtuvo, para poder mostrar la antigüedad en pantalla.
// Key con versión: las entradas viejas (solo el precio, sin fecha) se ignoran.
const QUOTE_KEY = ticker => `quote_v2_${ticker}`

const TTL_MARKET_OPEN   = 15 * 60 * 1000      // 15 minutos
const TTL_MARKET_CLOSED = 2 * 60 * 60 * 1000  // 2 horas

/**
 * Mercado argentino abierto: lunes a viernes de 11 a 17 h (hora de Argentina,
 * UTC-3 sin horario de verano). No contempla feriados.
 */
export function isMarketOpen(now = new Date()) {
  const art = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const day = art.getUTCDay()
  const minutes = art.getUTCHours() * 60 + art.getUTCMinutes()
  return day >= 1 && day <= 5 && minutes >= 11 * 60 && minutes < 17 * 60
}

export function quoteTtl(now = new Date()) {
  return isMarketOpen(now) ? TTL_MARKET_OPEN : TTL_MARKET_CLOSED
}

/** { price, at } o null si no hay cotización cacheada vigente. */
export function getCachedQuote(ticker) {
  const entry = cacheGet(QUOTE_KEY(ticker), { persistent: true })
  return entry && typeof entry === 'object' && 'price' in entry ? entry : null
}

export function setCachedQuote(ticker, price, at = Date.now()) {
  cacheSet(QUOTE_KEY(ticker), { price, at }, { persistent: true, ttlMs: quoteTtl() })
}

export function clearCachedQuotes(tickers) {
  for (const t of tickers || []) cacheInvalidate(QUOTE_KEY(t), { persistent: true })
}

/** "recién", "hace 5 min", "hace 1 h 10 min". */
export function formatAge(ms) {
  const min = Math.floor(Math.max(ms, 0) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `hace ${h} h ${m} min` : `hace ${h} h`
}

const ICON_REFRESH = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`

/**
 * Indicador "Precios de hace X · ↻" dentro de `el`. Devuelve un controlador con
 * update(oldestAt) para cambiar la fecha, setLoading(bool) y destroy() para
 * cortar el timer que refresca el texto cada minuto.
 */
export function createFreshnessIndicator(el, onRefresh) {
  let oldestAt = null
  let loading = false

  el.classList.add('price-freshness')
  el.innerHTML = `
    <span class="price-freshness-text" aria-live="polite"></span>
    <button type="button" class="btn btn-sm btn-ghost price-freshness-btn" title="Actualizar precios" aria-label="Actualizar precios">${ICON_REFRESH}</button>`
  const textEl = el.querySelector('.price-freshness-text')
  const btn = el.querySelector('.price-freshness-btn')

  const paint = () => {
    btn.disabled = loading
    btn.classList.toggle('is-loading', loading)
    if (loading) { textEl.textContent = 'Actualizando precios…'; return }
    if (oldestAt === null) { textEl.textContent = ''; return }
    const market = isMarketOpen() ? '' : ' · mercado cerrado'
    textEl.textContent = `Precios de ${formatAge(Date.now() - oldestAt)}${market}`
    textEl.title = `Cotización más antigua: ${new Date(oldestAt).toLocaleString('es-AR')}`
  }

  btn.addEventListener('click', () => { if (!loading) onRefresh() })
  const timer = setInterval(paint, 60 * 1000)

  return {
    update(at) { oldestAt = at; paint() },
    setLoading(value) { loading = value; paint() },
    destroy() { clearInterval(timer) }
  }
}
