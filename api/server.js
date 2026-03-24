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
const josePromise = import('jose')

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://esm.sh"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://esm.sh", "https://*.supabase.co", "https://cdn.jsdelivr.net"],
      imgSrc:     ["'self'", "data:"],
      fontSrc:    ["'self'"],
    }
  }
}))
app.use(compression())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))

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
    const { jwtVerify, importJWK } = await josePromise
    
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
    req.userRole = payload.user_metadata?.role
    
    if (!req.userId) {
      logger.warn({ payload }, 'Token válido pero sin campo "sub"')
      return res.status(401).json({ error: 'Token inválido' })
    }

    next()
  } catch (err) {
    logger.warn({ err: err.message }, 'Error en validación de token')
    return res.status(401).json({ error: `Sesión inválida: ${err.message}` })
  }
}

// Nuevo Middleware: Solo para el jefe (admin)
function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    logger.warn({ userId: req.userId, role: req.userRole }, 'Intento de acceso no autorizado a ruta de admin')
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' })
  }
  next()
}

// ── Validación ────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CUIT_RE = /^\d{2}-\d{8}-\d$/

const isUuid     = v => UUID_RE.test(v)
const isDate     = v => DATE_RE.test(v) && !isNaN(Date.parse(v))
const isPositive = v => { const n = Number(v); return Number.isFinite(n) && n > 0 }
const isUrl      = v => { try { new URL(v); return true } catch { return false } }

// Limpieza básica contra XSS: remueve tags de HTML.
function sanitize(v) {
  if (typeof v !== 'string') return v
  return v.replace(/<[^>]*>?/gm, '') // Vuela cualquier cosa que parezca un tag
          .trim()
}

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
      { name: sanitize(name), description: description ? sanitize(description) : null, user_id: userId })
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
      { ticker: sanitize(ticker), name: sanitize(name), instrument_type_id, user_id: userId })
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
      { name: sanitize(name), cuit: cuit || null, website: website || null, user_id: userId })
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
      operated_at, notes: notes ? sanitize(notes) : null, user_id: userId
    })
    logger.info({ id: data[0]?.id, type, instrument_id }, 'Operación creada OK')
    res.status(201).json({ data })
  } catch (err) {
    logger.warn({ status: err.status, error: err.payload }, 'Error al insertar operación')
    res.status(err.status ?? 500).json({ error: err.payload })
  }
})

// ── POST /api/operations/bulk ──────────────────────────────
app.post('/api/operations/bulk', requireAuth, async (req, res) => {
  const { operations, skip_duplicate_check = false } = req.body
  const userId = req.userId

  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: 'Se esperaba un array de operaciones' })
  }

  logger.info({ count: operations.length, skip_duplicate_check, user_id: userId }, 'Importación masiva — inicio')

  try {
    // 1. Obtener Alycs e Instrumentos del usuario para mapear nombres/tickers a IDs
    const [alycs, instruments] = await Promise.all([
      supabaseFetch('alycs', 'GET', req.headers.authorization),
      supabaseFetch('instruments', 'GET', req.headers.authorization)
    ])

    const alycMap = new Map(alycs.map(a => [a.name.toLowerCase(), a.id]))
    const instMap = new Map(instruments.map(i => [i.ticker.toLowerCase(), i.id]))

    // 2. Obtener operaciones existentes en el rango de fechas del CSV para verificar duplicados eficientemente
    const dates = operations.map(op => op.operated_at).filter(isDate)
    const minDate = dates.reduce((a, b) => a < b ? a : b)
    const maxDate = dates.reduce((a, b) => a > b ? a : b)

    const existingOps = await supabaseFetch(
      `operations?user_id=eq.${userId}&operated_at=gte.${minDate}&operated_at=lte.${maxDate}`,
      'GET', req.headers.authorization
    )

    const results = { imported: 0, skipped: 0, errors: [], duplicates: [], failed_entities: [] }
    const toInsert = []
    const cleanOps = []

    for (const [idx, op] of operations.entries()) {
      const rowNum = op.row || (idx + 2)
      
      // Resolución de IDs: Priorizar IDs directos (reintento) sobre nombres (CSV original)
      const alycId = op.alyc_id || alycMap.get(op.alyc?.toLowerCase())
      const instId = op.instrument_id || instMap.get(op.ticker?.toLowerCase())

      // Guardamos la info original para el modal de errores/duplicados
      const meta = op._raw || { ticker: op.ticker, alyc: op.alyc }

      if (!alycId || !instId) {
        results.failed_entities.push({ 
          row: rowNum, operated_at: op.operated_at, _raw: meta, 
          error: !alycId ? `ALyC no encontrada` : `Instrumento no encontrado` 
        })
        results.skipped++
        continue
      }

      if (!isDate(op.operated_at) || !isPositive(op.quantity) || !isPositive(op.price)) {
        results.failed_entities.push({ 
          row: rowNum, operated_at: op.operated_at, _raw: meta, 
          error: 'Datos numéricos o de fecha inválidos' 
        })
        results.skipped++
        continue
      }

      // Objeto limpio para Supabase
      const opData = {
        type: op.type,
        instrument_id: instId,
        alyc_id: alycId,
        quantity: parseFloat(op.quantity),
        price: parseFloat(op.price),
        currency: op.currency,
        operated_at: op.operated_at,
        user_id: userId
      }

      // Objeto con metadata para el frontend (duplicados/limpios)
      const opWithMeta = { ...opData, _raw: meta, row: rowNum }

      // 2. Verificar duplicados (solo si no es un reintento forzado)
      if (!skip_duplicate_check) {
        const isDuplicate = existingOps.some(ex => {
          const sameInst = ex.instrument_id === opData.instrument_id
          const sameAlyc = ex.alyc_id === opData.alyc_id
          const sameType = ex.type === opData.type
          const sameCurr = ex.currency === opData.currency
          // Comparación de fechas normalizada (YYYY-MM-DD)
          const sameDate = String(ex.operated_at).substring(0, 10) === String(opData.operated_at).substring(0, 10)
          // Comparación numérica con tolerancia para decimales
          const sameQty  = Math.abs(parseFloat(ex.quantity) - opData.quantity) < 0.0001
          const samePrice = Math.abs(parseFloat(ex.price) - opData.price) < 0.0001
          
          return sameInst && sameAlyc && sameType && sameCurr && sameDate && sameQty && samePrice
        })

        if (isDuplicate) {
          results.duplicates.push(opWithMeta)
          continue
        }
      }

      cleanOps.push(opWithMeta)
      toInsert.push(opData) // Solo enviamos opData (limpio) a Supabase
    }

    // Si hay duplicados y el cliente aún no confirmó, devolvemos 409
    if (results.duplicates.length > 0 && !skip_duplicate_check) {
      return res.status(409).json({ 
        error: 'Se encontraron operaciones duplicadas', 
        duplicates: results.duplicates,
        clean_ops: cleanOps,
        failed_entities: results.failed_entities
      })
    }

    // Inserción masiva en Supabase
    if (toInsert.length > 0) {
      try {
        await supabaseFetch('operations', 'POST', req.headers.authorization, toInsert)
        results.imported = toInsert.length
      } catch (err) {
        logger.error({ err: err.payload, user_id: userId }, 'Error fatal en inserción masiva Supabase')
        throw err // Re-lanzar para que el catch general lo maneje
      }
    }

    logger.info({ imported: results.imported, failed: results.failed_entities.length, user_id: userId }, 'Importación masiva — finalizada')
    res.json({ data: results })

  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Error en importación masiva')
    res.status(err.status ?? 500).json({ error: err.payload || 'Error interno en el servidor' })
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
      { name: sanitize(name), description: description ? sanitize(description) : null })
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
      { ticker: sanitize(ticker), name: sanitize(name), instrument_type_id })
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
      { name: sanitize(name), cuit: cuit || null, website: website || null })
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
      operated_at, notes: notes ? sanitize(notes) : null
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
const ALLOWED_SETTINGS = new Set(['registration_enabled', 'market_badge_enabled'])

app.patch('/api/settings/:key', requireAuth, requireAdmin, async (req, res) => {
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

// ── GET /api/quotes ───────────────────────────────────────
// Recibe una lista de tickers (query param ?tickers=AAPL,GGAL,...)
// y devuelve un objeto con los precios de todos.
app.get('/api/quotes', requireAuth, async (req, res) => {
  const { tickers: tickersStr } = req.query
  if (!tickersStr) return res.status(400).json({ error: 'Faltan tickers' })

  const tickers = [...new Set(tickersStr.split(',').filter(t => TICKER_RE.test(t)))]
  if (tickers.length === 0) return res.status(400).json({ error: 'Tickers inválidos' })

  const results = {}
  const toFetch = []

  // 1. Revisar cache
  for (const ticker of tickers) {
    const cached = quoteCache.get(ticker)
    if (cached && Date.now() < cached.expiresAt) {
      results[ticker] = { price: cached.price, currency: cached.currency }
    } else {
      toFetch.push(ticker)
    }
  }

  if (toFetch.length === 0) return res.json(results)

  // 2. Rate limiting (simplificado para bulk)
  const ip = req.ip ?? req.socket.remoteAddress
  if (!checkFetchLimit(ip)) {
    // Si estamos limitados, devolvemos lo que tenemos en cache
    return res.json(results)
  }

  try {
    const yfBase = process.env.FINANCE_URL
    const yfSuffix = process.env.FINANCE_EXCHANGE ? `.${process.env.FINANCE_EXCHANGE}` : ''

    // Consultar los que faltan en paralelo (con un límite de concurrencia implícito por el Promise.all)
    await Promise.all(toFetch.map(async (ticker) => {
      try {
        const needsSuffix = !ticker.includes('.')
        const symbol = (needsSuffix && yfSuffix) ? `${ticker}${yfSuffix}` : ticker
        
        const url = `${yfBase}/${encodeURIComponent(symbol)}?interval=1d&range=1d&includeTimestamps=false`
        const yfRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        
        if (yfRes.ok) {
          const data = await yfRes.json()
          const meta = data?.chart?.result?.[0]?.meta
          if (meta) {
            const price = meta.regularMarketPrice ?? null
            const currency = meta.currency ?? null
            quoteCache.set(ticker, { price, currency, expiresAt: Date.now() + QUOTE_TTL })
            results[ticker] = { price, currency }
          }
        }
      } catch (err) {
        logger.warn({ ticker, err: err.message }, 'Error en bulk quote individual')
      }
    }))

    res.json(results)
  } catch (err) {
    logger.error({ err: err.message }, 'Error general en /api/quotes')
    res.status(500).json({ error: 'Error interno' })
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
    const yfBase = process.env.FINANCE_URL
    // Solo agregar sufijo si el ticker NO tiene punto (ej: BYMA -> BYMA.BA, pero XLV -> XLV)
    const needsSuffix = !ticker.includes('.')
    const yfSuffix = (needsSuffix && process.env.FINANCE_EXCHANGE) ? `.${process.env.FINANCE_EXCHANGE}` : ''
    
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

app.get('/api/history/:ticker', requireAuth, async (req, res) => {
  const { ticker } = req.params
  const range = req.query.range || '6mo'

  if (!TICKER_RE.test(ticker)) {
    return res.status(400).json({ error: 'Ticker inválido' })
  }

  async function fetchFromYahoo(symbol) {
    const yfBase = process.env.FINANCE_URL
    const url = `${yfBase}/${encodeURIComponent(symbol)}?interval=1d&range=${range}&includeTimestamps=true`
    try {
      const yfRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!yfRes.ok) return []
      const data = await yfRes.json()
      const result = data?.chart?.result?.[0]
      if (!result || !result.timestamp) return []
      
      const timestamps = result.timestamp || []
      const closes     = result.indicators.quote[0].close || []
      return timestamps
        .map((t, i) => ({ date: t, price: closes[i] }))
        .filter(h => h.price !== null && h.price !== undefined && typeof h.price === 'number')
    } catch { return [] }
  }

  try {
    const yfSuffix = process.env.FINANCE_EXCHANGE ? `.${process.env.FINANCE_EXCHANGE}` : ''
    
    // Consultar ambos en paralelo
    const tasks = [fetchFromYahoo(ticker)] // USA / As-is
    if (!ticker.includes('.') && yfSuffix) {
      tasks.push(fetchFromYahoo(`${ticker}${yfSuffix}`)) // Local (BA)
    }

    const [globalData, localData = []] = await Promise.all(tasks)

    console.log(`[Backend Debug] Ticker: ${ticker} | Global: ${globalData.length} pts | Local: ${localData.length} pts`)

    // El que tenga más historia gana
    let history = globalData.length >= localData.length ? globalData : localData

    if (history.length === 0) {
      return res.status(404).json({ error: 'No se encontró historial' })
    }

    const first = new Date(history[0].date * 1000).toISOString().split('T')[0]
    const last  = new Date(history[history.length - 1].date * 1000).toISOString().split('T')[0]
    console.log(`[Backend Debug] Elegido: ${history.length} pts (${first} a ${last})`)

    res.json(history)
  } catch (err) {
    logger.warn({ ticker, err: err.message }, 'Error al consultar historial')
    res.status(500).json({ error: 'Error interno' })
  }
})

app.listen(PORT, () => {
  console.log(`Stocker corriendo en http://localhost:${PORT}`)
})
