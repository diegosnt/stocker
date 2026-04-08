import { supabase } from './supabase-client.js'
import { fetchCsrfToken } from './api-client.js'

// Los tokens ya no se guardan en localStorage por seguridad (XSS).
// El servidor maneja la sesión mediante cookies HttpOnly (sb-session).

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Error en la solicitud')
    err.status = res.status
    throw err
  }
  return data
}

export async function recoverSession() {
  try {
    let res = await fetch('/api/auth/session')
    let data = null

    if (res.status === 401) {
      // Si la sesión no es válida, intentamos refrescar usando la cookie refresh_token
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' })
      if (refreshRes.ok) {
        data = await refreshRes.json()
      }
    } else if (res.ok) {
      data = await res.json()
    }

    if (data && data.access_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: null // La cookie HttpOnly maneja la persistencia del refresh
      })
      await fetchCsrfToken()
      return data.user
    }
  } catch (e) {
    console.warn('No se pudo recuperar la sesión:', e)
  }
  return null
}

export async function refreshSession() {
  const res = await fetch('/api/auth/refresh', { method: 'POST' })
  if (!res.ok) {
    throw new Error('No se pudo refrescar la sesión')
  }
  const data = await res.json()
  if (data.access_token) {
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: null
    })
    await fetchCsrfToken()
  }
  return data
}

export async function signIn(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  
  if (data.access_token) {
    // Al loguearnos, actualizamos la sesión de Supabase en memoria
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: null // La cookie HttpOnly maneja la persistencia
    })
    
    await fetchCsrfToken()
    
    window.dispatchEvent(new CustomEvent('supabase-auth', {
      detail: { event: 'SIGNED_IN', session: { user: data.user, access_token: data.access_token } }
    }))
  }
  
  return data
}

export async function signUp(email, password) {
  const data = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  
  if (data.access_token) {
    // Actualizamos la sesión de Supabase en memoria
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: null // La cookie HttpOnly maneja la persistencia
    })

    await fetchCsrfToken()

    window.dispatchEvent(new CustomEvent('supabase-auth', {
      detail: { event: 'SIGNED_IN', session: { user: data.user, access_token: data.access_token } }
    }))
  }
  
  return data
}

export async function signOut() {
  // Intentamos cerrar sesión en el backend para limpiar las cookies HttpOnly
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
  } catch (e) {
    console.warn('Error en logout backend:', e)
  }
  
  // Limpiamos el estado de Supabase (memoria)
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data?.session
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session) fetchCsrfToken()
    callback(session)
  })
}
