// Cache persistente y en memoria
// Store en memoria para datos de navegación rápida (5 min)
const _memStore = new Map()
const MEM_TTL = 5 * 60 * 1000

// Store persistente (localStorage) para datos pesados (históricos)
const PERSISTENT_PREFIX = 'stocker_cache_'

export function get(key, options = { persistent: false }) {
  if (!options.persistent) {
    const entry = _memStore.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > MEM_TTL) { _memStore.delete(key); return null }
    return entry.data
  }

  try {
    const raw = localStorage.getItem(PERSISTENT_PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(PERSISTENT_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function set(key, data, options = { persistent: false, ttlMs: MEM_TTL }) {
  if (!options.persistent) {
    _memStore.set(key, { data, ts: Date.now() })
    return
  }

  try {
    const entry = {
      data,
      expiresAt: Date.now() + (options.ttlMs || MEM_TTL)
    }
    localStorage.setItem(PERSISTENT_PREFIX + key, JSON.stringify(entry))
  } catch (e) {
    console.warn('Error al guardar en localStorage (posiblemente lleno):', e)
  }
}

export function invalidate(key, options = { persistent: false }) {
  if (!options.persistent) {
    _memStore.delete(key)
  } else {
    localStorage.removeItem(PERSISTENT_PREFIX + key)
  }
}

// Limpia entradas expiradas de localStorage (opcional para mantenimiento)
export function prunePersistentCache() {
  try {
    const now = Date.now()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(PERSISTENT_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const entry = JSON.parse(raw)
          if (now > entry.expiresAt) localStorage.removeItem(key)
        }
      }
    }
  } catch {}
}
