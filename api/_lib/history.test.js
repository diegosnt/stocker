import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseChart, isValidRange } = require('./history.js')

describe('parseChart', () => {
  it('arma [{ date, price }] y descarta cierres vacíos', () => {
    const data = {
      chart: { result: [{
        timestamp: [100, 200, 300, 400],
        indicators: { quote: [{ close: [10.5, null, 12, undefined] }] }
      }] }
    }
    expect(parseChart(data)).toEqual([{ date: 100, price: 10.5 }, { date: 300, price: 12 }])
  })

  it('devuelve [] con respuestas incompletas', () => {
    expect(parseChart(null)).toEqual([])
    expect(parseChart({ chart: { result: [] } })).toEqual([])
    expect(parseChart({ chart: { result: [{ timestamp: [1] }] } })).toEqual([])
  })
})

describe('isValidRange', () => {
  it('acepta solo los rangos conocidos', () => {
    expect(isValidRange('6mo')).toBe(true)
    expect(isValidRange('5y')).toBe(true)
    expect(isValidRange('1d&interval=1m')).toBe(false)
    expect(isValidRange(undefined)).toBe(false)
  })
})
