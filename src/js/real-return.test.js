import { describe, it, expect } from 'vitest'
import { computeUsdCostBasis } from './real-return.js'

const op = (type, quantity, price, usd_rate, operated_at, extra = {}) => ({
  type, quantity, price, usd_rate, operated_at,
  currency: 'ARS', instrument_ticker: 'GGAL', alyc_id: 'a1', ...extra
})

describe('computeUsdCostBasis', () => {
  it('convierte una compra con el MEP de su día', () => {
    const r = computeUsdCostBasis([op('compra', 10, 1000, 1000, '2025-01-02')])
    expect(r).toEqual({ costUsd: 10, positions: 1, incomplete: 0 })
  })

  it('suma varias compras, cada una con su propio MEP', () => {
    const r = computeUsdCostBasis([
      op('compra', 10, 1000, 1000, '2025-01-02'), // US$ 10
      op('compra', 10, 2000, 1250, '2025-06-02')  // US$ 16
    ])
    expect(r.costUsd).toBeCloseTo(26)
  })

  it('una venta parcial reduce el costo en proporción', () => {
    const r = computeUsdCostBasis([
      op('compra', 10, 1000, 1000, '2025-01-02'),
      op('compra', 10, 2000, 1250, '2025-06-02'),
      op('venta', 5, 3000, 1500, '2025-09-01')
    ])
    expect(r.costUsd).toBeCloseTo(26 * 15 / 20)
  })

  it('una venta total cierra la posición', () => {
    const r = computeUsdCostBasis([
      op('compra', 10, 1000, 1000, '2025-01-02'),
      op('venta', 10, 3000, 1500, '2025-09-01')
    ])
    expect(r).toEqual({ costUsd: 0, positions: 0, incomplete: 0 })
  })

  it('ordena por fecha aunque las operaciones lleguen desordenadas', () => {
    const r = computeUsdCostBasis([
      op('venta', 5, 3000, 1500, '2025-09-01'),
      op('compra', 10, 1000, 1000, '2025-01-02')
    ])
    expect(r.costUsd).toBeCloseTo(5)
  })

  it('marca como incompleta una posición con compras sin MEP', () => {
    const r = computeUsdCostBasis([
      op('compra', 10, 1000, null, '2017-05-02'),
      op('compra', 10, 1000, 1000, '2025-01-02')
    ])
    expect(r).toEqual({ costUsd: 10, positions: 1, incomplete: 1 })
  })

  it('separa posiciones por ALyC', () => {
    const r = computeUsdCostBasis([
      op('compra', 10, 1000, 1000, '2025-01-02', { alyc_id: 'a1' }),
      op('compra', 10, 1000, 1000, '2025-01-02', { alyc_id: 'a2' }),
      op('venta', 10, 1000, 1000, '2025-02-02', { alyc_id: 'a2' })
    ])
    expect(r).toEqual({ costUsd: 10, positions: 1, incomplete: 0 })
  })

  it('ignora operaciones en USD', () => {
    const r = computeUsdCostBasis([op('compra', 10, 150, null, '2025-01-02', { currency: 'USD' })])
    expect(r).toEqual({ costUsd: 0, positions: 0, incomplete: 0 })
  })
})
