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

// Extrae el user_id del claim `sub` del JWT sin verificar firma
// (Supabase lo verifica en su extremo al recibir el Authorization header)
function getUserIdFromBearer(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const [, payloadB64] = authHeader.slice(7).split('.')
  const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  return decoded.sub ?? null
}

// ── POST /api/instrument-types ─────────────────────────────
// Recibe el payload, lo loguea con Pino y lo reenvía a Supabase
// manteniendo el token del usuario para que RLS siga activo.
app.post('/api/instrument-types', async (req, res) => {
  const { name, description } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.post('/api/instruments', async (req, res) => {
  const { ticker, name, instrument_type_id } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.post('/api/alycs', async (req, res) => {
  const { name, cuit, website } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.post('/api/operations', async (req, res) => {
  const { type, instrument_id, alyc_id, quantity, price, currency, operated_at, notes } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.patch('/api/instrument-types/:id', async (req, res) => {
  const { id } = req.params
  const { name, description } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.patch('/api/instruments/:id', async (req, res) => {
  const { id } = req.params
  const { ticker, name, instrument_type_id } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.patch('/api/alycs/:id', async (req, res) => {
  const { id } = req.params
  const { name, cuit, website } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
app.patch('/api/operations/:id', async (req, res) => {
  const { id } = req.params
  const { type, instrument_id, alyc_id, quantity, price, currency, operated_at, notes } = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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

// ── PATCH /api/settings/:key ───────────────────────────────
app.patch('/api/settings/:key', async (req, res) => {
  const { key }                  = req.params
  const { value, updated_by }    = req.body
  const userId = getUserIdFromBearer(req.headers.authorization)

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
