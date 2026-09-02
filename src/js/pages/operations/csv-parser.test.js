import { describe, it, expect } from 'vitest'
import { parseCsvRow, parseCsvNumber, parseCsvDate } from './csv-parser.js'

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

  it('parses all 4 user example rows accurately', () => {
    const r1 = parseCsvRow('15/03/2024;compra;GGAL;IOL;450,50;100;ARS', 2, headers)
    expect(r1.failure).toBeUndefined()
    expect(r1.op).toEqual({
      type: 'compra', ticker: 'GGAL', alyc: 'IOL',
      operated_at: '2024-03-15', price: 450.5, quantity: 100, currency: 'ARS'
    })

    const r2 = parseCsvRow('20/03/2024;venta;YPFD;PPI;25000;50;ARS', 3, headers)
    expect(r2.failure).toBeUndefined()
    expect(r2.op).toEqual({
      type: 'venta', ticker: 'YPFD', alyc: 'PPI',
      operated_at: '2024-03-20', price: 25000, quantity: 50, currency: 'ARS'
    })

    const r3 = parseCsvRow('05/04/2024;compra;BMA;Balanz;550,75;200;ARS', 4, headers)
    expect(r3.failure).toBeUndefined()
    expect(r3.op).toEqual({
      type: 'compra', ticker: 'BMA', alyc: 'Balanz',
      operated_at: '2024-04-05', price: 550.75, quantity: 200, currency: 'ARS'
    })

    const r4 = parseCsvRow('10/04/2024;compra;AAPL;IOL;185.30;10;USD', 5, headers)
    expect(r4.failure).toBeUndefined()
    expect(r4.op).toEqual({
      type: 'compra', ticker: 'AAPL', alyc: 'IOL',
      operated_at: '2024-04-10', price: 185.3, quantity: 10, currency: 'USD'
    })
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

  it('accepts ISO YYYY-MM-DD date', () => {
    const { op } = parseCsvRow('2024-03-15;compra;GGAL;IOL;450,50;100;ARS', 2, headers)
    expect(op.operated_at).toBe('2024-03-15')
  })

  it('handles UTF-8 BOM in headers seamlessly', () => {
    const bomHeaders = ['\ufefffecha operacion', 'operacion', 'especie', 'alyc', 'precio', 'cantidad', 'moneda']
    const { op } = parseCsvRow(row('compra'), 2, bomHeaders)
    expect(op.operated_at).toBe('2024-03-15')
  })
})

describe('parseCsvNumber', () => {
  it('parses comma and dot decimal formats', () => {
    expect(parseCsvNumber('450,50')).toBe(450.5)
    expect(parseCsvNumber('185.30')).toBe(185.3)
    expect(parseCsvNumber('25000')).toBe(25000)
    expect(parseCsvNumber('1.250,75')).toBe(1250.75)
    expect(parseCsvNumber('1,250.75')).toBe(1250.75)
    expect(parseCsvNumber('')).toBe(0)
    expect(parseCsvNumber(null)).toBe(0)
  })
})
