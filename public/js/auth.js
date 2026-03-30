import { supabase } from './supabase-client.js'
import { fetchCsrfToken } from './api-client.js'

const SUPABASE_TOKEN_KEY = 'sb-access-token'

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

function saveSupabaseToken(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(SUPABASE_TOKEN_KEY, accessToken)
  }
  if (refreshToken) {
    localStorage.setItem('sb-refresh-token', refreshToken)
  }
}

export async function signIn(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  
  if (data.access_token) {
    saveSupabaseToken(data.access_token, data.refresh_token)
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
    saveSupabaseToken(data.access_token, data.refresh_token)
    await fetchCsrfToken()
    window.dispatchEvent(new CustomEvent('supabase-auth', {
      detail: { event: 'SIGNED_IN', session: { user: data.user, access_token: data.access_token } }
    }))
  }
  
  return data
}

export async function signOut() {
  const token = localStorage.getItem(SUPABASE_TOKEN_KEY)
  
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
  }
  
  localStorage.removeItem(SUPABASE_TOKEN_KEY)
  localStorage.removeItem('sb-refresh-token')
  
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
