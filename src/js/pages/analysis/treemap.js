import { ChartManager } from '../../chart-manager.js'

export function renderTreemapChart(container, items, prevInstance) {
  if (!container || !items || items.length === 0) return prevInstance

  ChartManager.destroy(prevInstance)

  container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
  const canvas = container.querySelector('canvas')

  const getColor = (p) => {
    if (p > 5) return '#065f46'
    if (p > 0) return '#10b981'
    if (p < -5) return '#991b1b'
    if (p < 0) return '#ef4444'
    return '#64748b'
  }
  const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const data = items.map(item => ({
    ticker: item.ticker,
    value: item.currentValue,
    pct: item.pnlPct ?? 0,
    color: getColor(item.pnlPct ?? 0)
  })).filter(d => d.value > 0)

  return ChartManager.renderTreemapChart(canvas, data, {
    instance: null,
    formatter: (ctx) => {
      const d = ctx.raw?._data || ctx.raw
      if (!d || !d.ticker) return []
      const area = ctx.element?.width * ctx.element?.height || 1000
      if (area < 2500) return [d.ticker]
      return [d.ticker, (d.pct != null ? fmt(d.pct) : '0') + '%']
    },
    chartOptions: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw?._data
              if (!d) return ''
              return ` ${d.ticker}: $${fmt(d.value)} (${fmt(d.pct)}%)`
            }
          }
        }
      }
    }
  })
}
