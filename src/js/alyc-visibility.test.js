import { describe, it, expect, beforeEach } from 'vitest'
import {
  aggregateHoldings,
  filterOperationsByAlyc,
  computeRealizedPnl,
  getHiddenAlycIds,
  setAlycHidden,
  isAlycVisible,
  toggleAlycVisibility,
  ALYC_VISIBILITY_STORAGE_KEY
} from './alyc-visibility.js'

describe('alyc-visibility storage & toggle', () => {
  let mockStorage = {}

  beforeEach(() => {
    mockStorage = {}
    globalThis.localStorage = {
      getItem: (k) => mockStorage[k] ?? null,
      setItem: (k, v) => { mockStorage[k] = String(v) },
      removeItem: (k) => { delete mockStorage[k] },
      clear: () => { mockStorage = {} }
    }
  })

  it('devuelve array vacío por defecto si no hay nada en storage', () => {
    expect(getHiddenAlycIds()).toEqual([])
    expect(isAlycVisible('alyc-1')).toBe(true)
  })

  it('permite ocultar y desocultar ALyCs', () => {
    setAlycHidden('alyc-1', true)
    expect(getHiddenAlycIds()).toEqual(['alyc-1'])
    expect(isAlycVisible('alyc-1')).toBe(false)
    expect(isAlycVisible('alyc-2')).toBe(true)

    setAlycHidden('alyc-2', true)
    expect(getHiddenAlycIds()).toEqual(['alyc-1', 'alyc-2'])

    setAlycHidden('alyc-1', false)
    expect(getHiddenAlycIds()).toEqual(['alyc-2'])
    expect(isAlycVisible('alyc-1')).toBe(true)
  })

  it('toggleAlycVisibility alterna el estado correctamente', () => {
    const res1 = toggleAlycVisibility('alyc-x')
    expect(res1).toBe(false) // Ahora está oculta
    expect(isAlycVisible('alyc-x')).toBe(false)

    const res2 = toggleAlycVisibility('alyc-x')
    expect(res2).toBe(true) // Ahora está visible
    expect(isAlycVisible('alyc-x')).toBe(true)
  })
})

describe('aggregateHoldings', () => {
  const mockHoldings = [
    {
      alyc_id: 'alyc-1',
      alyc_name: 'IOL',
      ticker: 'GGAL',
      instrument_name: 'Grupo Financiero Galicia',
      instrument_type_name: 'Acción',
      total_quantity: '100',
      avg_buy_price: '400',
      currency: 'ARS'
    },
    {
      alyc_id: 'alyc-2',
      alyc_name: 'Balanz',
      ticker: 'GGAL',
      instrument_name: 'Grupo Financiero Galicia',
      instrument_type_name: 'Acción',
      total_quantity: '200',
      avg_buy_price: '500',
      currency: 'ARS'
    },
    {
      alyc_id: 'alyc-2',
      alyc_name: 'Balanz',
      ticker: 'AAPL',
      instrument_name: 'Apple Inc',
      instrument_type_name: 'CEDEAR',
      total_quantity: '10',
      avg_buy_price: '150',
      currency: 'USD'
    }
  ]

  it('agrega todas las tenencias si no hay ALyCs ocultas', () => {
    const res = aggregateHoldings(mockHoldings, new Set())
    expect(res.items.length).toBe(2)

    // GGAL en ARS: 100*400 + 200*500 = 40000 + 100000 = 140000
    // Qty: 300. avgBuyPrice: 140000 / 300 = 466.6666...
    const ggal = res.items.find(i => i.ticker === 'GGAL')
    expect(ggal.quantity).toBe(300)
    expect(ggal.invested).toBe(140000)
    expect(ggal.avgBuyPrice).toBeCloseTo(466.67, 1)

    // AAPL en USD: 10*150 = 1500
    const aapl = res.items.find(i => i.ticker === 'AAPL')
    expect(aapl.quantity).toBe(10)
    expect(aapl.invested).toBe(1500)

    expect(res.totalARS).toBe(140000)
    expect(res.totalUSD).toBe(1500)
    expect(res.tickers).toEqual(['GGAL', 'AAPL'])
    expect(res.summary['GGAL']).toBeDefined()
    expect(res.summary['AAPL']).toBeDefined()
  })

  it('excluye completamente las tenencias de ALyCs ocultas', () => {
    // Si ocultamos alyc-2 (Balanz)
    const res = aggregateHoldings(mockHoldings, new Set(['alyc-2']))
    expect(res.items.length).toBe(1)

    // Solo debe quedar GGAL de alyc-1 (100 @ 400)
    const ggal = res.items[0]
    expect(ggal.ticker).toBe('GGAL')
    expect(ggal.quantity).toBe(100)
    expect(ggal.avgBuyPrice).toBe(400)
    expect(ggal.invested).toBe(40000)

    // AAPL no debe existir porque solo estaba en alyc-2
    expect(res.tickers).toEqual(['GGAL'])
    expect(res.summary['AAPL']).toBeUndefined()
    expect(res.totalUSD).toBe(0)
    expect(res.totalARS).toBe(40000)
  })

  it('devuelve vacío si todas las ALyCs están ocultas', () => {
    const res = aggregateHoldings(mockHoldings, new Set(['alyc-1', 'alyc-2']))
    expect(res.items).toEqual([])
    expect(res.tickers).toEqual([])
    expect(res.totalARS).toBe(0)
    expect(res.totalUSD).toBe(0)
    expect(res.summary).toEqual({})
  })
})

describe('filterOperationsByAlyc & computeRealizedPnl', () => {
  const mockOperations = [
    {
      type: 'compra',
      quantity: 10,
      price: 100,
      currency: 'USD',
      operated_at: '2025-01-01',
      instrument_ticker: 'SPY',
      instrument_name: 'SPDR S&P 500',
      alyc_id: 'alyc-1'
    },
    {
      type: 'venta',
      quantity: 5,
      price: 120,
      currency: 'USD',
      operated_at: '2025-02-01',
      instrument_ticker: 'SPY',
      instrument_name: 'SPDR S&P 500',
      alyc_id: 'alyc-1'
    },
    {
      type: 'compra',
      quantity: 20,
      price: 50,
      currency: 'ARS',
      operated_at: '2025-01-10',
      instrument_ticker: 'YPFD',
      instrument_name: 'YPF',
      alyc_id: 'alyc-2'
    },
    {
      type: 'venta',
      quantity: 10,
      price: 80,
      currency: 'ARS',
      operated_at: '2025-03-01',
      instrument_ticker: 'YPFD',
      instrument_name: 'YPF',
      alyc_id: 'alyc-2'
    }
  ]

  it('calcula realized PnL con todas las ALyCs visibles', () => {
    const res = computeRealizedPnl(mockOperations, new Set())
    expect(res.length).toBe(2)

    // SPY: vendió 5 a 120 (costo 100). Ganancia: (120 - 100) * 5 = 100 USD
    const spy = res.find(r => r.ticker === 'SPY')
    expect(spy.total_sold_qty).toBe(5)
    expect(spy.sell_count).toBe(1)
    expect(spy.realized_pnl).toBe(100)

    // YPFD: vendió 10 a 80 (costo 50). Ganancia: (80 - 50) * 10 = 300 ARS
    const ypfd = res.find(r => r.ticker === 'YPFD')
    expect(ypfd.total_sold_qty).toBe(10)
    expect(ypfd.sell_count).toBe(1)
    expect(ypfd.realized_pnl).toBe(300)
  })

  it('excluye el P&L realizado de ALyCs ocultas', () => {
    // Si ocultamos alyc-2 (YPFD)
    const res = computeRealizedPnl(mockOperations, new Set(['alyc-2']))
    expect(res.length).toBe(1)
    expect(res[0].ticker).toBe('SPY')
    expect(res[0].realized_pnl).toBe(100)
  })
})
