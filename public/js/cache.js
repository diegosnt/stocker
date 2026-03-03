// Cache en memoria de sesión para datos maestros (alycs, instruments, instrument_types).
// Evita re-fetches repetidos al navegar entre la lista y el formulario de operaciones.
// TTL de 5 minutos; se puede invalidar explícitamente tras mutaciones.

const _store = new Map()
const TTL_MS = 5 * 60 * 1000

export function get(key) {
  const entry = _store.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL_MS) { _store.delete(key); return null }
  return entry.data
}

export function set(key, data) {
  _store.set(key, { data, ts: Date.now() })
}

export function invalidate(key) {
  _store.delete(key)
}
