import { describe, it, expect } from 'vitest'
import { computeEquitySeries, groupOperationsByCurrency } from './equity-curve.js'

// Unix seconds para fechas UTC 'YYYY-MM-DD' a mediodía (evita problemas de huso horario)
const ts = dateStr => Math.floor(new Date(`${dateStr}T12:00:00Z`).getTime() / 1000)

describe('computeEquitySeries', () => {
  it('returns empty series when there are no operations', () => {
    expect(computeEquitySeries([], {})).toEqual({ dates: [], portfolioValue: [], invested: [] })
  })

  it('tracks a single buy-and-hold position', () => {
    const operations = [
      { type: 'compra', quantity: 10, price: 100, operated_at: '2026-01-01', instrument_ticker: 'AAPL' }
    ]
    const priceHistories = {
      AAPL: [
        { date: ts('2026-01-01'), price: 100 },
        { date: ts('2026-01-02'), price: 110 },
        { date: ts('2026-01-03'), price: 120 }
      ]
    }
    const result = computeEquitySeries(operations, priceHistories)
    expect(result.dates).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(result.portfolioValue).toEqual([1000, 1100, 1200])
    expect(result.invested).toEqual([1000, 1000, 1000])
  })

  it('updates the weighted average cost on a second purchase', () => {
    const operations = [
      { type: 'compra', quantity: 10, price: 100, operated_at: '2026-01-01', instrument_ticker: 'AAPL' },
      { type: 'compra', quantity: 10, price: 200, operated_at: '2026-01-02', instrument_ticker: 'AAPL' }
    ]
    const priceHistories = {
      AAPL: [
        { date: ts('2026-01-01'), price: 100 },
        { date: ts('2026-01-02'), price: 200 }
      ]
    }
    const result = computeEquitySeries(operations, priceHistories)
    // avgCost tras la 2da compra: (100*10 + 200*10) / 20 = 150
    expect(result.invested).toEqual([1000, 3000])
    expect(result.portfolioValue).toEqual([1000, 4000])
  })

  it('reduces quantity and cost proportionally on a sale, price at cost after full exit', () => {
    const operations = [
      { type: 'compra', quantity: 10, price: 100, operated_at: '2026-01-01', instrument_ticker: 'AAPL' },
      { type: 'venta', quantity: 10, price: 150, operated_at: '2026-01-02', instrument_ticker: 'AAPL' }
    ]
    const priceHistories = {
      AAPL: [
        { date: ts('2026-01-01'), price: 100 },
        { date: ts('2026-01-02'), price: 150 }
      ]
    }
    const result = computeEquitySeries(operations, priceHistories)
    expect(result.portfolioValue).toEqual([1000, 0])
    expect(result.invested).toEqual([1000, 0])
  })

  it('forward-fills the last known price when a date has no exact price point', () => {
    const operations = [
      { type: 'compra', quantity: 1, price: 100, operated_at: '2026-01-01', instrument_ticker: 'AAPL' }
    ]
    const priceHistories = {
      AAPL: [
        { date: ts('2026-01-01'), price: 100 },
        { date: ts('2026-01-05'), price: 200 }
      ],
      // BENCH solo aporta fechas al calendario (no aporta posición)
      BENCH: [
        { date: ts('2026-01-03'), price: 999 }
      ]
    }
    const result = computeEquitySeries(operations, priceHistories)
    expect(result.dates).toEqual(['2026-01-01', '2026-01-03', '2026-01-05'])
    // 2026-01-03: no hay precio nuevo de AAPL todavía -> mantiene el de 2026-01-01
    expect(result.portfolioValue).toEqual([100, 100, 200])
  })

  it('falls back to the average cost when no price data is available yet for the ticker', () => {
    const operations = [
      { type: 'compra', quantity: 2, price: 50, operated_at: '2026-01-01', instrument_ticker: 'NEW' }
    ]
    const priceHistories = {
      NEW: [{ date: ts('2026-01-10'), price: 60 }]
    }
    const result = computeEquitySeries(operations, priceHistories)
    // Antes de la primera cotización conocida, usa el costo promedio como estimación
    expect(result.portfolioValue).toEqual([120])
  })
})

describe('groupOperationsByCurrency', () => {
  it('splits operations into separate buckets per currency', () => {
    const operations = [
      { currency: 'ARS', ticker: 'GGAL' },
      { currency: 'USD', ticker: 'AAPL' },
      { currency: 'ARS', ticker: 'YPFD' }
    ]
    const grouped = groupOperationsByCurrency(operations)
    expect(grouped.ARS).toHaveLength(2)
    expect(grouped.USD).toHaveLength(1)
  })
})
