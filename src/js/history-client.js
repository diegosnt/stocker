import { apiRequest } from './api-client.js'
import { get as cacheGet, set as cacheSet } from './cache.js'

const BATCH_MAX = 40 // mismo tope que HISTORY_BATCH_MAX en api/server.js

/**
 * Historial de varios tickers para un rango. Usa la cache persistente por
 * ticker+rango y pide los faltantes en un solo request (o en tandas de 40).
 * Devuelve { ticker: [{ date, price }] }, con [] para los que no tienen datos.
 */
export async function fetchHistories(tickers, range, { ttlMs, timeoutMs = 20000, cachePrefix = 'history' } = {}) {
  const unique = [...new Set(tickers)]
  const keyOf = t => `${cachePrefix}_${t}_${range}`
  const result = {}
  const missing = []

  for (const t of unique) {
    const cached = cacheGet(keyOf(t), { persistent: true })
    if (cached) result[t] = cached
    else missing.push(t)
  }
  if (!missing.length) return result

  const batches = []
  for (let i = 0; i < missing.length; i += BATCH_MAX) batches.push(missing.slice(i, i + BATCH_MAX))

  await Promise.all(batches.map(async batch => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const data = await apiRequest(
        'GET',
        `/api/history?tickers=${encodeURIComponent(batch.join(','))}&range=${encodeURIComponent(range)}`,
        null,
        { signal: controller.signal }
      )
      for (const t of batch) {
        const history = Array.isArray(data?.[t]) ? data[t] : []
        result[t] = history
        if (history.length) cacheSet(keyOf(t), history, { persistent: true, ttlMs })
      }
    } catch (err) {
      console.warn('[History] Error al pedir historiales:', err)
      for (const t of batch) result[t] = []
    } finally {
      clearTimeout(timeoutId)
    }
  }))

  return result
}
