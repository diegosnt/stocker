import { supabase } from './supabase-client.js'

let csrfToken = null

export async function fetchCsrfToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  
  try {
    const res = await fetch('/api/csrf-token', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
    if (res.ok) {
      const data = await res.json()
      csrfToken = data.csrfToken
    }
  } catch (e) {
    console.warn('Error fetching CSRF token:', e)
  }
  return csrfToken
}

export function getCsrfToken() {
  return csrfToken
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Realiza una llamada autenticada a la API del servidor.
 * Obtiene el token de la sesión activa, arma los headers y parsea la respuesta.
 * Incluye header CSRF en mutaciones.
 *
 * @param {string} method  - 'GET' | 'POST' | 'PATCH' | 'DELETE'
 * @param {string} path    - Ruta relativa, ej: '/api/instruments/123'
 * @param {object} [body]  - Payload JSON (omitir en DELETE/GET)
 * @returns {Promise<any>} - Resuelve con `data` de la respuesta, o null en 204
 * @throws {Error & { code: string }} - Error con `code` del error de Supabase si aplica
 */
export async function apiRequest(method, path, body = undefined) {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  
  if (MUTATION_METHODS.has(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('session-expired'))
    throw Object.assign(new Error('Sesión expirada'), { code: 'session_expired' })
  }
  
  if (res.status === 403 && csrfToken) {
    csrfToken = null
    throw Object.assign(new Error('Token de seguridad expirado'), { code: 'csrf_invalid' })
  }

  if (res.status === 204) return null

  const json = await res.json()
  if (!res.ok) {
    const err = new Error('Error en la solicitud')
    err.code = json.error?.[0]?.code
    err.status = res.status
    err.response = json
    throw err
  }
  return json.data ?? json
}
