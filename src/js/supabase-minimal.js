let cachedSession = null
let inMemoryAccessToken = null
let inMemoryRefreshToken = null

export function createClient(supabaseUrl, supabaseAnonKey) {
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json'
  }

  const execute = async (q) => {
    const { path, method, body, headers: h } = q
    
    // Si tenemos token en memoria, lo usamos
    if (inMemoryAccessToken) {
      h['Authorization'] = `Bearer ${inMemoryAccessToken}`
    }

    const isSingle = path.includes('.single()')
    const cleanPath = path.replace('.single()', '')
    const url = `${supabaseUrl}/rest/v1${cleanPath}`
    const fetchHeaders = { ...h }
    const prefer = fetchHeaders['Prefer'] || ''
    if (isSingle && !prefer.includes('return=representation')) {
      fetchHeaders['Prefer'] = prefer ? `${prefer}, return=representation` : 'return=representation'
    }
    const res = await fetch(url, { method, headers: fetchHeaders, body: body ? JSON.stringify(body) : null })
    const text = await res.text()
    if (!res.ok) {
      const err = new Error(text || 'Request failed')
      err.status = res.status
      try { err.data = JSON.parse(text) } catch { err.data = text }
      return { error: err, data: null, count: null }
    }
    try { 
      const data = JSON.parse(text)
      let count = data.length
      const range = res.headers.get('content-range')
      if (range) {
        const parts = range.split('/')
        if (parts.length === 2 && parts[1] && parts[1] !== 'undefined') {
          count = parseInt(parts[1], 10)
        }
      }
      const result = isSingle && Array.isArray(data) && data.length === 1 ? data[0] : data
      return { data: result, error: null, count: isSingle ? 1 : count }
    } catch { return { data: text, error: null, count: text.length } }
  }

  const QueryBuilder = (path, method = 'GET', body = null) => {
    const q = { path, method, body, headers: { ...headers } }
    const chain = {
      query: q,
      select: (cols = '*', opts = {}) => { 
        if (!q.path.includes('select=')) {
          q.path += `?select=${cols}`
        }
        if (opts?.count === 'exact') {
          q.headers['Prefer'] = 'count=exact'
        }
        return chain 
      },
      order: (col, opts = {}) => { q.path += `&order=${col}${opts.ascending === false ? '.desc' : ''}`; return chain },
      eq: (col, val) => { q.path += `&${col}=eq.${encodeURIComponent(val)}`; return chain },
      lt: (col, val) => { q.path += `&${col}=lt.${encodeURIComponent(val)}`; return chain },
      lte: (col, val) => { q.path += `&${col}=lte.${encodeURIComponent(val)}`; return chain },
      gt: (col, val) => { q.path += `&${col}=gt.${encodeURIComponent(val)}`; return chain },
      gte: (col, val) => { q.path += `&${col}=gte.${encodeURIComponent(val)}`; return chain },
      ilike: (col, val) => { q.path += `&${col}=ilike.${encodeURIComponent(val)}`; return chain },
      or: (filter) => { q.path += `&or=${filter}`; return chain },
      limit: (n) => { q.path += `&limit=${n}`; return chain },
      range: (from, to) => { q.headers['Range'] = `${from}-${to}`; return chain },
      single: () => { q.path += '.single()'; return chain },
      then: (resolve, reject) => execute(q).then(resolve, reject),
      catch: (fn) => execute(q).catch(fn)
    }
    return chain
  }

  const auth = {
    async setSession({ access_token, refresh_token }) {
      inMemoryAccessToken = access_token
      inMemoryRefreshToken = refresh_token
      headers['Authorization'] = `Bearer ${access_token}`
      cachedSession = null // Forzamos recarga del usuario si se pide
      return { data: { session: { access_token, refresh_token } }, error: null }
    },
    async signInWithPassword({ email, password }) {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: { message: data.error_description || data.msg || 'Error', name: data.error || 'AuthError' } }
      
      inMemoryAccessToken = data.access_token
      inMemoryRefreshToken = data.refresh_token
      headers['Authorization'] = `Bearer ${data.access_token}`
      
      const session = { access_token: data.access_token, token_type: data.token_type, expires_in: data.expires_in, expires_at: data.expires_at, user: data.user }
      window.dispatchEvent(new CustomEvent('supabase-auth', { detail: { event: 'SIGNED_IN', session } }))
      return { data: { user: data.user, session }, error: null }
    },
    async signUp({ email, password }) {
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: { message: data.error_description || data.msg || 'Error', name: data.error || 'AuthError' } }
      
      if (data.access_token) {
        inMemoryAccessToken = data.access_token
        inMemoryRefreshToken = data.refresh_token
        headers['Authorization'] = `Bearer ${data.access_token}`
      }
      return { data, error: null }
    },
    async signOut() {
      const token = inMemoryAccessToken || headers['Authorization'].replace('Bearer ', '')
      if (token && token !== supabaseAnonKey) {
        try {
          await fetch(`${supabaseUrl}/auth/v1/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
          })
        } catch (e) {}
      }
      inMemoryAccessToken = null
      inMemoryRefreshToken = null
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`
      cachedSession = null
      window.dispatchEvent(new CustomEvent('supabase-auth', { detail: { event: 'SIGNED_OUT', session: null } }))
      return { error: null }
    },
    async getSession() {
      const token = inMemoryAccessToken || headers['Authorization'].replace('Bearer ', '')
      if (!token || token === supabaseAnonKey) { cachedSession = null; return { data: { session: null }, error: null } }
      if (cachedSession?.access_token === token) return { data: { session: cachedSession }, error: null }
      
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) { 
          // Si el token no sirve, limpiamos memoria
          inMemoryAccessToken = null
          inMemoryRefreshToken = null
          cachedSession = null
          return { data: { session: null }, error: null } 
        }
        const user = await res.json()
        cachedSession = { user, access_token: token }
        return { data: { session: cachedSession }, error: null }
      } catch (e) {
        return { data: { session: null }, error: e }
      }
    },
    onAuthStateChange(callback) {
      const handle = (e) => {
        callback(e.detail?.event || 'SIGNED_OUT', e.detail?.session || null)
      }
      window.addEventListener('supabase-auth', handle)
      return { data: { subscription: { unsubscribe: () => window.removeEventListener('supabase-auth', handle) } } }
    },
    async refreshSession() {
      if (!inMemoryRefreshToken) {
        cachedSession = null
        return { data: { session: null }, error: { message: 'No refresh token' } }
      }
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
          body: JSON.stringify({ refresh_token: inMemoryRefreshToken })
        })
        const data = await res.json()
        if (!res.ok) {
          cachedSession = null
          inMemoryAccessToken = null
          inMemoryRefreshToken = null
          return { data: { session: null }, error: { message: data.error_description || 'Refresh failed' } }
        }
        inMemoryAccessToken = data.access_token
        inMemoryRefreshToken = data.refresh_token
        headers['Authorization'] = `Bearer ${data.access_token}`
        cachedSession = { user: data.user, access_token: data.access_token, expires_in: data.expires_in, expires_at: data.expires_at }
        return { data: { session: cachedSession }, error: null }
      } catch (err) {
        cachedSession = null
        return { data: { session: null }, error: err }
      }
    }
  }

  const from = (table) => {
    return {
      select: (cols = '*', opts = {}) => QueryBuilder(`/${table}`).select(cols, opts),
      insert: (data) => QueryBuilder(`/${table}`, 'POST', data),
      update: (data, filters = {}) => QueryBuilder(`/${table}?${Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&')}`, 'PATCH', data),
      delete: (filters = {}) => QueryBuilder(`/${table}?${Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&')}`, 'DELETE'),
      rpc: (fn, args = {}) => QueryBuilder(`/rpc/${fn}`, 'POST', args)
    }
  }

  const rpc = (fn, args = {}) => QueryBuilder(`/rpc/${fn}`, 'POST', args)

  return { from, auth, rpc }
}
