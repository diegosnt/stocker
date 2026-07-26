import { describe, it, expect } from 'vitest'
import { parseCsvRow } from './csv-parser.js'

const headers = ['fecha operacion', 'operacion', 'especie', 'alyc', 'precio', 'cantidad', 'moneda']
const row = (operacion) => `15/03/2024;${operacion};GGAL;IOL;450,50;100;ARS`

describe('parseCsvRow', () => {
  it('parses a valid "compra" row', () => {
    const { op, failure } = parseCsvRow(row('compra'), 2, headers)
    expect(failure).toBeUndefined()
    expect(op).toMatchObject({
      type: 'compra', ticker: 'GGAL', alyc: 'IOL',
      operated_at: '2024-03-15', price: 450.5, quantity: 100, currency: 'ARS'
    })
  })

  it('parses a valid "venta" row', () => {
    const { op, failure } = parseCsvRow(row('venta'), 2, headers)
    expect(failure).toBeUndefined()
    expect(op.type).toBe('venta')
  })

  it('is case-insensitive for the operation type', () => {
    const { op } = parseCsvRow(row('COMPRA'), 2, headers)
    expect(op.type).toBe('compra')
  })

  it('rejects a row with an invalid operation type instead of defaulting to "venta"', () => {
    const { op, failure } = parseCsvRow(row('Comprar'), 5, headers)
    expect(op).toBeUndefined()
    expect(failure.row).toBe(5)
    expect(failure.error).toContain('Comprar')
  })

  it('rejects a row with an empty operation type', () => {
    const { op, failure } = parseCsvRow(row(''), 3, headers)
    expect(op).toBeUndefined()
    expect(failure.error).toContain('(vacío)')
  })

  it('rejects a row with too few columns', () => {
    const { op, failure } = parseCsvRow('15/03/2024;compra;GGAL', 4, headers)
    expect(op).toBeUndefined()
    expect(failure.error).toBe('Fila incompleta (faltan columnas)')
  })

  it('normalizes ARG to ARS', () => {
    const { op } = parseCsvRow('15/03/2024;compra;GGAL;IOL;450,50;100;ARG', 2, headers)
    expect(op.currency).toBe('ARS')
  })

  it('accepts a 2-digit year', () => {
    const { op } = parseCsvRow('15/03/24;compra;GGAL;IOL;450,50;100;ARS', 2, headers)
    expect(op.operated_at).toBe('2024-03-15')
  })
})
