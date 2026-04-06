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
    const res = await fetch('/api/auth/session')
    if (!res.ok) return null
    
    const data = await res.json()
    if (data.access_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: null // La cookie es la que manda la persistencia
      })
      await fetchCsrfToken()
      return data.user
    }
  } catch (e) {
    console.warn('No se pudo recuperar la sesión:', e)
  }
  return null
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
      refresh_token: data.refresh_token
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
      refresh_token: data.refresh_token
    })

    await fetchCsrfToken()

    window.dispatchEvent(new CustomEvent('supabase-auth', {
      detail: { event: 'SIGNED_IN', session: { user: data.user, access_token: data.access_token } }
    }))
  }
  
  return data
}

export async function signOut() {
  // Intentamos cerrar sesión en el backend para limpiar la cookie HttpOnly
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
    }
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
