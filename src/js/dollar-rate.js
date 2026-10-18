import { apiRequest } from './api-client.js'
import { get as cacheGet, set as cacheSet } from './cache.js'

const RATE_CACHE_KEY = 'dollar_rate_mep'
const RATE_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

let _inflight = null

/**
 * Devuelve la cotización del dólar MEP (venta) o null si no está disponible.
 * Cachea el valor y comparte el request en curso entre llamadas simultáneas.
 */
export async function getMepRate() {
  const cached = cacheGet(RATE_CACHE_KEY, { persistent: true })
  if (cached !== null) return cached

  if (!_inflight) {
    _inflight = apiRequest('GET', '/api/dollar-rate')
      .then(data => {
        const rate = Number(data?.rate)
        if (!Number.isFinite(rate) || rate <= 0) return null
        cacheSet(RATE_CACHE_KEY, rate, { persistent: true, ttlMs: RATE_CACHE_TTL })
        return rate
      })
      .catch(err => {
        console.warn('Error al obtener dólar MEP:', err)
        return null
      })
      .finally(() => { _inflight = null })
  }
  return _inflight
}

/**
 * Placeholder para el equivalente en dólares de un importe en pesos.
 * Se completa con fillUsdEquivalents() una vez que se conoce la cotización.
 */
export function usdEquivSpan(ars, { signed = false } = {}) {
  if (!Number.isFinite(ars)) return ''
  return `<span class="kpi-usd" data-ars="${ars}"${signed ? ' data-signed' : ''}></span>`
}

/** Completa todos los placeholders de usdEquivSpan() dentro de `root`. */
export async function fillUsdEquivalents(root = document) {
  if (!root?.querySelector('.kpi-usd[data-ars]')) return
  const rate = await getMepRate()
  if (!rate) return

  const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const title = `Dólar MEP: $ ${fmt(rate)}`
  // Se vuelve a consultar el DOM: puede haber cambiado mientras se esperaba la cotización
  root.querySelectorAll('.kpi-usd[data-ars]').forEach(el => {
    const usd = Number(el.dataset.ars) / rate
    const sign = el.hasAttribute('data-signed') && usd > 0 ? '+' : ''
    el.textContent = `≈ US$ ${sign}${fmt(usd)}`
    el.title = title
  })
}
