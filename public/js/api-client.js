import { supabase } from './supabase-client.js'

/**
 * Realiza una llamada autenticada a la API del servidor.
 * Obtiene el token de la sesión activa, arma los headers y parsea la respuesta.
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

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('session-expired'))
    throw Object.assign(new Error('Sesión expirada'), { code: 'session_expired' })
  }

  if (res.status === 204) return null

  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Error en la solicitud'), { code: json.error?.[0]?.code })
  return json.data ?? json
}
