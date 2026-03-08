require('dotenv').config()

const express        = require('express')
const path           = require('path')
const compression    = require('compression')
const helmet         = require('helmet')
const logger         = require('./logger')
const { renderPage } = require('./views/renderPage')

const app  = express()
const PORT = process.env.PORT || 3000
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://esm.sh"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://esm.sh", "https://*.supabase.co"],
      imgSrc:     ["'self'", "data:"],
      fontSrc:    ["'self'"],
    }
  }
}))
app.use(compression())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.send(renderPage({
    supabaseUrl:     process.env.SUPABASE_URL     || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  }))
})

// Middleware: verifica el JWT localmente.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const token = authHeader.split(' ')[1]

  if (!SUPABASE_JWT_SECRET) {
    logger.error('SUPABASE_JWT_SECRET no configurado en .env')
    return res.status(500).json({ error: 'Error de configuración en el servidor' })
  }

  try {
    const { jwtVerify, importJWK } = await import('jose')
    
    let secretStr = SUPABASE_JWT_SECRET.trim()
    
    // Limpiar comillas accidentales (comunes al pegar en paneles de control)
    if ((secretStr.startsWith("'") && secretStr.endsWith("'")) || 
        (secretStr.startsWith('"') && secretStr.endsWith('"'))) {
      secretStr = secretStr.slice(1, -1).trim()
    }

    let key
    if (secretStr.startsWith('{')) {
      // Caso 1: Es un JWK (JSON) - Para algoritmos ES256
      const jwk = JSON.parse(secretStr)
      key = await importJWK(jwk, 'ES256')
    } else {
      // Caso 2: Es un secreto tradicional (String) - Solo para HS256
      key = new TextEncoder().encode(secretStr)
    }

    // Validamos con 'authenticated' como audience, que es el estándar de Supabase
    const { payload } = await jwtVerify(token, key, {
      audience: 'authenticated'
    })
    
    req.userId = payload.sub
    
    if (!req.userId) {
      logger.warn({ payload }, 'Token válido pero sin campo "sub"')
      return res.status(401).json({ error: 'Token inválido' })
    }

    next()
  } catch (err) {
    logger.warn({ err: err.message, stack: err.stack }, 'Error en validación de token')
    return res.status(401).json({ error: `Sesión inválida: ${err.message}` })
  }
}

// ── Validación ────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CUIT_RE = /^\d{2}-\d{8}-\d$/

const isUuid     = v => UUID_RE.test(v)
const isDate     = v => DATE_RE.test(v) && !isNaN(Date.parse(v))
const isPositive = v => { const n = Number(v); return Number.isFinite(n) && n > 0 }
const isUrl      = v => { try { new URL(v); return true } catch { return false } }

// Wrapper de fetch a Supabase REST. Lanza un error con { status, payload } si la respuesta no es ok.
async function supabaseFetch(path, method, authHeader, body) {
  const headers = {
    'apikey':        process.env.SUPABASE_ANON_KEY,
    'Authorization': authHeader ?? ''
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    headers['Prefer']       = 'return=representation'
  }
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  if (res.status === 204) return null
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Supabase error'), { status: res.status, payload: json })
  return json
}

// Recibe { campo: [[testFn, mensaje], ...] } y devuelve un objeto de errores o null.
function validate(body, rules) {
  const errs = {}
  for (const [field, checks] of Object.entries(rules)) {
    const val = body[field]
    for (const [test, msg] of checks) {
      if (!test(val)) { errs[field] = msg; break }
    }
  }
  return Object.keys(errs).length ? errs : null
}

// ── POST /api/instrument-types ─────────────────────────────
// Recibe el payload, lo loguea con Pino y lo reenvía a Supabase
// manteniendo el token del usuario para que RLS siga activo.
app.post('/api/instrument-types', requireAuth, async (req, res) => {
  const { name, description } = req.body
  const userId = req.userId

  const errs = validate(req.body, {
    name:        [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                  [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    description: [[v => !v || (typeof v === 'string' && v.length <= 500), 'Máximo 500 caracteres']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ name, description, user_id: userId }, 'Alta tipo de instrumento — datos recibidos')

  try {
    const data = await supabaseFetch('instrument_types', 'POST', req.headers.authorization,
      { name, description: description || null, user_id: userId })
    logger.info({ id: data[0]?.id, name }, 'Tipo de instrumento creado OK')
    res.status(201).json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al insertar tipo de instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── POST /api/instruments ──────────────────────────────────
app.post('/api/instruments', requireAuth, async (req, res) => {
  const { ticker, name, instrument_type_id } = req.body
  const userId = req.userId

  const errs = validate(req.body, {
    ticker:             [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                         [v => v.trim().length <= 20, 'Máximo 20 caracteres']],
    name:               [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                         [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    instrument_type_id: [[v => v && isUuid(v), 'UUID inválido']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ ticker, name, instrument_type_id, user_id: userId }, 'Alta instrumento — datos recibidos')

  try {
    const data = await supabaseFetch('instruments', 'POST', req.headers.authorization,
      { ticker, name, instrument_type_id, user_id: userId })
    logger.info({ id: data[0]?.id, ticker }, 'Instrumento creado OK')
    res.status(201).json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al insertar instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── POST /api/alycs ────────────────────────────────────────
app.post('/api/alycs', requireAuth, async (req, res) => {
  const { name, cuit, website } = req.body
  const userId = req.userId

  const errs = validate(req.body, {
    name:    [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
              [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    cuit:    [[v => !v || CUIT_RE.test(v), 'Formato inválido (XX-XXXXXXXX-X)']],
    website: [[v => !v || isUrl(v), 'URL inválida']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ name, cuit, website, user_id: userId }, 'Alta ALyC — datos recibidos')

  try {
    const data = await supabaseFetch('alycs', 'POST', req.headers.authorization,
      { name, cuit: cuit || null, website: website || null, user_id: userId })
    logger.info({ id: data[0]?.id, name }, 'ALyC creada OK')
    res.status(201).json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al insertar ALyC')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── POST /api/operations ───────────────────────────────────
app.post('/api/operations', requireAuth, async (req, res) => {
  const { type, instrument_id, alyc_id, quantity, price, currency, operated_at, notes } = req.body
  const userId = req.userId

  const errs = validate(req.body, {
    type:          [[v => v === 'compra' || v === 'venta', 'Debe ser "compra" o "venta"']],
    instrument_id: [[v => v && isUuid(v), 'UUID inválido']],
    alyc_id:       [[v => v && isUuid(v), 'UUID inválido']],
    quantity:      [[v => isPositive(v), 'Debe ser un número positivo']],
    price:         [[v => isPositive(v), 'Debe ser un número positivo']],
    currency:      [[v => v === 'ARS' || v === 'USD', 'Debe ser "ARS" o "USD"']],
    operated_at:   [[v => v && isDate(v), 'Fecha inválida (YYYY-MM-DD)']],
    notes:         [[v => !v || (typeof v === 'string' && v.length <= 1000), 'Máximo 1000 caracteres']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info(
    { type, instrument_id, alyc_id, quantity, price, currency, operated_at, user_id: userId },
    'Alta operación — datos recibidos'
  )

  try {
    const data = await supabaseFetch('operations', 'POST', req.headers.authorization, {
      type, instrument_id, alyc_id, quantity, price, currency,
      operated_at, notes: notes || null, user_id: userId
    })
    logger.info({ id: data[0]?.id, type, instrument_id }, 'Operación creada OK')
    res.status(201).json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al insertar operación')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── PATCH /api/instrument-types/:id ───────────────────────
app.patch('/api/instrument-types/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { name, description } = req.body
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })
  const errs = validate(req.body, {
    name:        [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                  [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    description: [[v => !v || (typeof v === 'string' && v.length <= 500), 'Máximo 500 caracteres']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ id, name, description, user_id: userId }, 'Edición tipo de instrumento — datos recibidos')

  try {
    const data = await supabaseFetch(`instrument_types?id=eq.${id}`, 'PATCH', req.headers.authorization,
      { name, description: description || null })
    logger.info({ id, name }, 'Tipo de instrumento actualizado OK')
    res.json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al actualizar tipo de instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── PATCH /api/instruments/:id ─────────────────────────────
app.patch('/api/instruments/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { ticker, name, instrument_type_id } = req.body
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })
  const errs = validate(req.body, {
    ticker:             [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                         [v => v.trim().length <= 20, 'Máximo 20 caracteres']],
    name:               [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
                         [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    instrument_type_id: [[v => v && isUuid(v), 'UUID inválido']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ id, ticker, name, instrument_type_id, user_id: userId }, 'Edición instrumento — datos recibidos')

  try {
    const data = await supabaseFetch(`instruments?id=eq.${id}`, 'PATCH', req.headers.authorization,
      { ticker, name, instrument_type_id })
    logger.info({ id, ticker }, 'Instrumento actualizado OK')
    res.json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al actualizar instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── PATCH /api/alycs/:id ───────────────────────────────────
app.patch('/api/alycs/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { name, cuit, website } = req.body
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })
  const errs = validate(req.body, {
    name:    [[v => typeof v === 'string' && v.trim().length > 0, 'Requerido'],
              [v => v.trim().length <= 100, 'Máximo 100 caracteres']],
    cuit:    [[v => !v || CUIT_RE.test(v), 'Formato inválido (XX-XXXXXXXX-X)']],
    website: [[v => !v || isUrl(v), 'URL inválida']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ id, name, cuit, website, user_id: userId }, 'Edición ALyC — datos recibidos')

  try {
    const data = await supabaseFetch(`alycs?id=eq.${id}`, 'PATCH', req.headers.authorization,
      { name, cuit: cuit || null, website: website || null })
    logger.info({ id, name }, 'ALyC actualizada OK')
    res.json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al actualizar ALyC')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── PATCH /api/operations/:id ──────────────────────────────
app.patch('/api/operations/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { type, instrument_id, alyc_id, quantity, price, currency, operated_at, notes } = req.body
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })
  const errs = validate(req.body, {
    type:          [[v => v === 'compra' || v === 'venta', 'Debe ser "compra" o "venta"']],
    instrument_id: [[v => v && isUuid(v), 'UUID inválido']],
    alyc_id:       [[v => v && isUuid(v), 'UUID inválido']],
    quantity:      [[v => isPositive(v), 'Debe ser un número positivo']],
    price:         [[v => isPositive(v), 'Debe ser un número positivo']],
    currency:      [[v => v === 'ARS' || v === 'USD', 'Debe ser "ARS" o "USD"']],
    operated_at:   [[v => v && isDate(v), 'Fecha inválida (YYYY-MM-DD)']],
    notes:         [[v => !v || (typeof v === 'string' && v.length <= 1000), 'Máximo 1000 caracteres']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info(
    { id, type, instrument_id, alyc_id, quantity, price, currency, operated_at, user_id: userId },
    'Edición operación — datos recibidos'
  )

  try {
    const data = await supabaseFetch(`operations?id=eq.${id}`, 'PATCH', req.headers.authorization, {
      type, instrument_id, alyc_id, quantity, price, currency,
      operated_at, notes: notes || null
    })
    logger.info({ id, type, instrument_id }, 'Operación actualizada OK')
    res.json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al actualizar operación')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── DELETE /api/instrument-types/:id ──────────────────────
app.delete('/api/instrument-types/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación tipo de instrumento — solicitada')

  try {
    await supabaseFetch(`instrument_types?id=eq.${id}`, 'DELETE', req.headers.authorization)
    logger.info({ id }, 'Tipo de instrumento eliminado OK')
    res.status(204).send()
  } catch (err) {
    logger.warn({ id, status: err.status, error: err.payload }, 'Error al eliminar tipo de instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── DELETE /api/instruments/:id ────────────────────────────
app.delete('/api/instruments/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación instrumento — solicitada')

  try {
    await supabaseFetch(`instruments?id=eq.${id}`, 'DELETE', req.headers.authorization)
    logger.info({ id }, 'Instrumento eliminado OK')
    res.status(204).send()
  } catch (err) {
    logger.warn({ id, status: err.status, error: err.payload }, 'Error al eliminar instrumento')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── DELETE /api/alycs/:id ──────────────────────────────────
app.delete('/api/alycs/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación ALyC — solicitada')

  try {
    await supabaseFetch(`alycs?id=eq.${id}`, 'DELETE', req.headers.authorization)
    logger.info({ id }, 'ALyC eliminada OK')
    res.status(204).send()
  } catch (err) {
    logger.warn({ id, status: err.status, error: err.payload }, 'Error al eliminar ALyC')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── DELETE /api/operations/:id ─────────────────────────────
app.delete('/api/operations/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación operación — solicitada')

  try {
    await supabaseFetch(`operations?id=eq.${id}`, 'DELETE', req.headers.authorization)
    logger.info({ id }, 'Operación eliminada OK')
    res.status(204).send()
  } catch (err) {
    logger.warn({ id, status: err.status, error: err.payload }, 'Error al eliminar operación')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── PATCH /api/settings/:key ───────────────────────────────
const ALLOWED_SETTINGS = new Set(['registration_enabled'])

app.patch('/api/settings/:key', requireAuth, async (req, res) => {
  const { key }                  = req.params
  const { value, updated_by }    = req.body
  const userId = req.userId

  if (!ALLOWED_SETTINGS.has(key)) return res.status(400).json({ error: { key: 'Clave de configuración no permitida' } })
  const errs = validate(req.body, {
    value: [[v => v !== undefined && v !== null && String(v).trim().length > 0, 'Requerido']],
  })
  if (errs) return res.status(400).json({ error: errs })

  logger.info({ key, value, updated_by, user_id: userId }, 'Configuración — cambio solicitado')

  try {
    const data = await supabaseFetch(`app_settings?key=eq.${encodeURIComponent(key)}`, 'PATCH', req.headers.authorization, {
      value,
      updated_at: new Date().toISOString(),
      updated_by: updated_by || null
    })
    logger.info({ key, value }, 'Configuración actualizada OK')
    res.json({ data: data[0] })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al actualizar configuración')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── GET /api/quote/:ticker ─────────────────────────────────
const TICKER_RE  = /^[A-Za-z0-9.\-^=]{1,20}$/

// Rate limit solo sobre llamadas reales a Finance (cache miss), no sobre hits de cache
const QUOTE_TTL      = 5 * 60 * 1000  // 5 minutos en ms
const FETCH_LIMIT    = 30              // máx llamadas a Finance por IP por ventana
const FETCH_WINDOW   = 5 * 60 * 1000  // ventana de 5 minutos
const quoteCache     = new Map()       // ticker → { price, currency, expiresAt }
const fetchCounters  = new Map()       // ip → { count, resetAt }

function checkFetchLimit(ip) {
  const now   = Date.now()
  const entry = fetchCounters.get(ip)
  if (!entry || now > entry.resetAt) {
    fetchCounters.set(ip, { count: 1, resetAt: now + FETCH_WINDOW })
    return true
  }
  if (entry.count >= FETCH_LIMIT) return false
  entry.count++
  return true
}

app.get('/api/quote/:ticker', requireAuth, async (req, res) => {
  const { ticker } = req.params
  if (!TICKER_RE.test(ticker)) {
    return res.status(400).json({ error: 'Ticker inválido' })
  }

  const cached = quoteCache.get(ticker)
  if (cached && Date.now() < cached.expiresAt) {
    return res.json({ price: cached.price, currency: cached.currency, marketState: cached.marketState })
  }

  const ip = req.ip ?? req.socket.remoteAddress
  if (!checkFetchLimit(ip)) {
    return res.status(429).json({ error: 'Demasiadas consultas. Intentá de nuevo en unos minutos.' })
  }

  try {
    const yfBase   = process.env.FINANCE_URL ?? process.env.FINANCE_URL
    const yfSuffix = process.env.FINANCE_EXCHANGE ? `.${process.env.FINANCE_EXCHANGE}` : ''
    const url = `${yfBase}/${encodeURIComponent(ticker)}${yfSuffix}?interval=1d&range=1d&includeTimestamps=false`
    const yfRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Stocker/1.0)' }
    })

    if (!yfRes.ok) {
      return res.status(yfRes.status).json({ error: 'Error al consultar Finance' })
    }

    const data = await yfRes.json()
    const meta = data?.chart?.result?.[0]?.meta

    if (!meta) {
      return res.status(404).json({ error: 'Ticker no encontrado' })
    }

    const price    = meta.regularMarketPrice ?? null
    const currency = meta.currency ?? null

    quoteCache.set(ticker, { price, currency, expiresAt: Date.now() + QUOTE_TTL })
    res.json({ price, currency })
  } catch (err) {
    logger.warn({ ticker, err: err.message }, 'Error al consultar Finance')
    res.status(500).json({ error: 'Error interno al consultar precio' })
  }
})

app.listen(PORT, () => {
  console.log(`Stocker corriendo en http://localhost:${PORT}`)
})
