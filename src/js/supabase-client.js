import { createClient } from './supabase-minimal.js'

let _client = null

function getClient() {
  if (!_client) {
    const url = window.__SUPABASE_URL__
    const key = window.__SUPABASE_ANON_KEY__
    if (!url || !key) {
      console.error('Supabase no configurado. Revisá el archivo .env')
    }
    _client = createClient(url, key)
  }
  return _client
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    return Reflect.get(getClient(), prop)
  }
})
