import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseMepHistory, rateAt } = require('./mep-history.js')

const raw = [
  { casa: 'bolsa', compra: 1010, venta: 1020, fecha: '2025-01-06' },
  { casa: 'bolsa', compra: 1000, venta: 1000, fecha: '2025-01-02' },
  { casa: 'bolsa', compra: 1005, venta: 1005, fecha: '2025-01-03' },
  { casa: 'bolsa', venta: null, fecha: '2025-01-07' },
  { casa: 'bolsa', venta: 1030, fecha: 'basura' }
]

describe('parseMepHistory', () => {
  it('ordena por fecha y descarta entradas inválidas', () => {
    const s = parseMepHistory(raw)
    expect(s.dates).toEqual(['2025-01-02', '2025-01-03', '2025-01-06'])
    expect(s.rates).toEqual([1000, 1005, 1020])
  })

  it('tolera respuestas que no son array', () => {
    expect(parseMepHistory(null)).toEqual({ dates: [], rates: [] })
  })
})

describe('rateAt', () => {
  const s = parseMepHistory(raw)

  it('devuelve la cotización exacta del día', () => {
    expect(rateAt(s, '2025-01-03')).toBe(1005)
  })

  it('en fin de semana usa la última cotización anterior', () => {
    expect(rateAt(s, '2025-01-05')).toBe(1005)
  })

  it('después del final de la serie usa la última', () => {
    expect(rateAt(s, '2026-01-01')).toBe(1020)
  })

  it('antes del inicio de la serie devuelve null', () => {
    expect(rateAt(s, '2024-12-31')).toBeNull()
  })

  it('serie vacía devuelve null', () => {
    expect(rateAt({ dates: [], rates: [] }, '2025-01-03')).toBeNull()
  })
})
