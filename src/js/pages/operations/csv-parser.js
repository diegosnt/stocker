// Parseo de filas de CSV, sin dependencias del navegador (testeable en Node).

function parseCsvNumber(s) {
  if (!s) return 0
  const cleaned = s.trim()
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
    return parseFloat(cleaned.replace(/,/g, ''))
  }
  return parseFloat(cleaned) || 0
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
  headers.forEach((h, i) => raw[h] = cols[i])

  const rawType = raw['operacion']?.toLowerCase()
  if (rawType !== 'compra' && rawType !== 'venta') {
    return {
      failure: {
        row: rowNum, operated_at: null,
        _raw: { ticker: raw['especie'], alyc: raw['alyc'] },
        error: `Tipo de operación inválido: "${raw['operacion'] || '(vacío)'}" (debe ser "compra" o "venta")`
      }
    }
  }

  let operated_at = ''
  const dateParts = raw['fecha operacion']?.split('/')
  if (dateParts?.length === 3) {
    const [d, m, y] = dateParts
    const fullYear = y.length === 2 ? `20${y}` : y
    operated_at = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  let currency = raw['moneda']?.toUpperCase()
  if (currency === 'ARG') currency = 'ARS'

  return {
    op: {
      type: rawType,
      alyc: raw['alyc'],
      ticker: raw['especie'],
      operated_at,
      price: parseCsvNumber(raw['precio']),
      quantity: parseCsvNumber(raw['cantidad']),
      currency
    }
  }
}
