import { supabase } from './supabase-client.js'

let csrfToken = null

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken
  
  let session = (await supabase.auth.getSession())?.data?.session
  if (!session?.access_token) {
    try {
      const { refreshSession } = await import('./auth.js')
      const data = await refreshSession()
      if (data && data.access_token) {
        session = { access_token: data.access_token }
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }
  
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

export async function fetchCsrfToken() {
  return ensureCsrfToken()
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
 * @param {object} [options] - Opciones adicionales para fetch (ej: { signal })
 * @returns {Promise<any>} - Resuelve con `data` de la respuesta, o null en 204
 * @throws {Error & { code: string }} - Error con `code` del error de Supabase si aplica
 */
export async function apiRequest(method, path, body = undefined, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = { 'Authorization': `Bearer ${session?.access_token ?? ''}` }
  if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json'
  
  if (MUTATION_METHODS.has(method)) {
    const token = await ensureCsrfToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
  }

  const fetchOptions = {
    method,
    headers,
    ...options
  }

  // Solo incluimos body si NO es un GET y si tenemos datos
  if (method !== 'GET' && body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body)
  }

  const res = await fetch(path, fetchOptions)

  if (res.status === 401 && !options._retry) {
    try {
      const { refreshSession } = await import('./auth.js')
      const data = await refreshSession()
      if (data && data.access_token) {
        // Reintentar con el nuevo token (los headers necesitan actualizarse)
        const retryOptions = { ...options, _retry: true }
        const newHeaders = { ...headers, 'Authorization': `Bearer ${data.access_token}` }
        
        // Si era una mutación, también refrescamos el CSRF por las dudas
        if (MUTATION_METHODS.has(method)) {
          csrfToken = null
          const newToken = await ensureCsrfToken()
          if (newToken) newHeaders['X-CSRF-Token'] = newToken
        }

        const retryRes = await fetch(path, { ...fetchOptions, headers: newHeaders })
        if (retryRes.status === 401) throw new Error('Refresh fallido post-reintento')
        if (retryRes.status === 204) return null
        const json = await retryRes.json()
        if (!retryRes.ok) throw Object.assign(new Error('Error en reintento'), { status: retryRes.status, response: json })
        return json.data ?? json
      }
    } catch (e) {
      console.warn('Silent refresh fallido:', e)
    }
    
    window.dispatchEvent(new CustomEvent('session-expired'))
    throw Object.assign(new Error('Sesión expirada'), { code: 'session_expired' })
  }

  if (res.status === 403 && !headers['X-CSRF-Retry']) {
    csrfToken = null
    const newToken = await ensureCsrfToken()
    if (newToken) {
      headers['X-CSRF-Token'] = newToken
      headers['X-CSRF-Retry'] = 'true'
      const retryRes = await fetch(path, {
        ...fetchOptions,
        headers: { ...headers, 'X-CSRF-Token': newToken, 'X-CSRF-Retry': 'true' }
      })
      if (retryRes.status === 401) {
        window.dispatchEvent(new CustomEvent('session-expired'))
        throw Object.assign(new Error('Sesión expirada'), { code: 'session_expired' })
      }
      if (retryRes.ok) {
        if (retryRes.status === 204) return null
        const json = await retryRes.json()
        return json.data ?? json
      }
      // Si el reintento falla, procesamos su error
      const json = await retryRes.json()
      const err = new Error('Error en la solicitud de reintento')
      err.code = json.error?.[0]?.code || json.code
      err.status = retryRes.status
      err.response = json
      throw err
    }
    throw Object.assign(new Error('Token de seguridad inválido'), { code: 'csrf_invalid' })
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
