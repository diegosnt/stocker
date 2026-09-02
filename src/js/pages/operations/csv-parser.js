// Parseo de filas de CSV, sin dependencias del navegador (testeable en Node).

export function parseCsvNumber(s) {
  if (s == null || s === '') return 0
  if (typeof s === 'number') return s
  const cleaned = s.toString().trim()
  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    } else {
      return parseFloat(cleaned.replace(/,/g, ''))
    }
  } else if (hasComma) {
    return parseFloat(cleaned.replace(',', '.'))
  } else if (hasDot) {
    return parseFloat(cleaned)
  }
  return parseFloat(cleaned) || 0
}

export function parseCsvDate(dateStr) {
  if (!dateStr) return ''
  const trimmed = dateStr.trim().split('T')[0]
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const [y, m, d] = parts
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        // DD/MM/YYYY or DD/MM/YY
        const [d, m, y] = parts
        const fullYear = y.length === 2 ? `20${y}` : y
        return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
    }
  } else if (trimmed.includes('-')) {
    const parts = trimmed.split('-')
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const [y, m, d] = parts
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        // DD-MM-YYYY or DD-MM-YY
        const [d, m, y] = parts
        const fullYear = y.length === 2 ? `20${y}` : y
        return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
    }
  }
  return trimmed
}

// Parsea una fila de CSV a una operación. Devuelve { op } si es válida, o
// { failure } (misma forma que usa el modal de "Registros no importados") si no.
// No hay que "adivinar" el tipo: si "operacion" no dice exactamente compra/venta,
// es un error de datos (typo, columna corrida) — hay que avisar, no clasificarlo
// silenciosamente como venta (corrompería holdings, P&L y la evolución del patrimonio).
export function parseCsvRow(row, rowNum, headers) {
  const cols = row.split(';').map(c => c.trim())
  if (cols.length < 7) {
    return { failure: { row: rowNum, operated_at: null, _raw: {}, error: 'Fila incompleta (faltan columnas)' } }
  }

  const raw = {}
  headers.forEach((h, i) => {
    const cleanHeader = h.trim().toLowerCase().replace(/^\ufeff/, '')
    raw[cleanHeader] = cols[i]
  })

  const rawType = (raw['operacion'] || raw['operación'] || raw['tipo'])?.toLowerCase()
  if (rawType !== 'compra' && rawType !== 'venta') {
    return {
      failure: {
        row: rowNum, operated_at: null,
        _raw: { ticker: raw['especie'] || raw['ticker'], alyc: raw['alyc'] },
        error: `Tipo de operación inválido: "${raw['operacion'] || raw['operación'] || raw['tipo'] || '(vacío)'}" (debe ser "compra" o "venta")`
      }
    }
  }

  const dateRaw = raw['fecha operacion'] || raw['fecha operación'] || raw['fecha'] || ''
  const operated_at = parseCsvDate(dateRaw)

  let currency = (raw['moneda'] || raw['currency'] || 'ARS').toUpperCase()
  if (currency === 'ARG') currency = 'ARS'

  return {
    op: {
      type: rawType,
      alyc: raw['alyc'] || '',
      ticker: raw['especie'] || raw['ticker'] || '',
      operated_at,
      price: parseCsvNumber(raw['precio']),
      quantity: parseCsvNumber(raw['cantidad']),
      currency
    }
  }
}
