require('dotenv').config()

const express = require('express')
const path    = require('path')
const logger  = require('./logger')
const { renderPage } = require('./views/renderPage')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
  res.send(renderPage({
    supabaseUrl:     process.env.SUPABASE_URL     || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  }))
})

// Middleware: verifica el JWT consultando a Supabase y adjunta el user_id verificado.
// Rechaza cualquier token inválido, expirado o forjado antes de procesar el request.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': authHeader
      }
    })

    if (!userRes.ok) {
      logger.warn({ status: userRes.status }, 'Token inválido o expirado')
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    const user = await userRes.json()
    req.userId = user.id  // user_id verificado por Supabase, no extraído del payload
    next()
  } catch (err) {
    logger.error({ err }, 'Error al verificar autenticación')
    return res.status(401).json({ error: 'Error al verificar autenticación' })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instrument_types`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ name, description: description || null, user_id: userId })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al insertar tipo de instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id: payload[0]?.id, name }, 'Tipo de instrumento creado OK')
  res.status(201).json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instruments`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ ticker, name, instrument_type_id, user_id: userId })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al insertar instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id: payload[0]?.id, ticker }, 'Instrumento creado OK')
  res.status(201).json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/alycs`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ name, cuit: cuit || null, website: website || null, user_id: userId })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al insertar ALyC')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id: payload[0]?.id, name }, 'ALyC creada OK')
  res.status(201).json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/operations`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        type, instrument_id, alyc_id, quantity, price, currency,
        operated_at, notes: notes || null, user_id: userId
      })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al insertar operación')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id: payload[0]?.id, type, instrument_id }, 'Operación creada OK')
  res.status(201).json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instrument_types?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ name, description: description || null })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al actualizar tipo de instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id, name }, 'Tipo de instrumento actualizado OK')
  res.json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instruments?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ ticker, name, instrument_type_id })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al actualizar instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id, ticker }, 'Instrumento actualizado OK')
  res.json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/alycs?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({ name, cuit: cuit || null, website: website || null })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al actualizar ALyC')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id, name }, 'ALyC actualizada OK')
  res.json({ data: payload })
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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/operations?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        type, instrument_id, alyc_id, quantity, price, currency,
        operated_at, notes: notes || null
      })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al actualizar operación')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id, type, instrument_id }, 'Operación actualizada OK')
  res.json({ data: payload })
})

// ── DELETE /api/instrument-types/:id ──────────────────────
app.delete('/api/instrument-types/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación tipo de instrumento — solicitada')

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instrument_types?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? ''
      }
    }
  )

  if (!supabaseRes.ok) {
    const payload = await supabaseRes.json()
    logger.warn({ id, status: supabaseRes.status, error: payload }, 'Error al eliminar tipo de instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id }, 'Tipo de instrumento eliminado OK')
  res.status(204).send()
})

// ── DELETE /api/instruments/:id ────────────────────────────
app.delete('/api/instruments/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación instrumento — solicitada')

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/instruments?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? ''
      }
    }
  )

  if (!supabaseRes.ok) {
    const payload = await supabaseRes.json()
    logger.warn({ id, status: supabaseRes.status, error: payload }, 'Error al eliminar instrumento')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id }, 'Instrumento eliminado OK')
  res.status(204).send()
})

// ── DELETE /api/alycs/:id ──────────────────────────────────
app.delete('/api/alycs/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación ALyC — solicitada')

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/alycs?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? ''
      }
    }
  )

  if (!supabaseRes.ok) {
    const payload = await supabaseRes.json()
    logger.warn({ id, status: supabaseRes.status, error: payload }, 'Error al eliminar ALyC')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id }, 'ALyC eliminada OK')
  res.status(204).send()
})

// ── DELETE /api/operations/:id ─────────────────────────────
app.delete('/api/operations/:id', requireAuth, async (req, res) => {
  const { id }     = req.params
  const userId = req.userId

  if (!isUuid(id)) return res.status(400).json({ error: { id: 'ID inválido' } })

  logger.info({ id, user_id: userId }, 'Eliminación operación — solicitada')

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/operations?id=eq.${id}`,
    {
      method: 'DELETE',
      headers: {
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? ''
      }
    }
  )

  if (!supabaseRes.ok) {
    const payload = await supabaseRes.json()
    logger.warn({ id, status: supabaseRes.status, error: payload }, 'Error al eliminar operación')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ id }, 'Operación eliminada OK')
  res.status(204).send()
})

// ── PATCH /api/settings/:key ───────────────────────────────
const ALLOWED_SETTINGS = new Set(['allow_registration'])

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

  const supabaseRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/app_settings?key=eq.${encodeURIComponent(key)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        process.env.SUPABASE_ANON_KEY,
        'Authorization': req.headers.authorization ?? '',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        value,
        updated_at: new Date().toISOString(),
        updated_by: updated_by || null
      })
    }
  )

  const payload = await supabaseRes.json()

  if (!supabaseRes.ok) {
    logger.warn({ status: supabaseRes.status, error: payload }, 'Error al actualizar configuración')
    return res.status(supabaseRes.status).json({ error: payload })
  }

  logger.info({ key, value }, 'Configuración actualizada OK')
  res.json({ data: payload[0] })
})

app.listen(PORT, () => {
  logger.info(`Stocker corriendo en http://localhost:${PORT}`)
})
