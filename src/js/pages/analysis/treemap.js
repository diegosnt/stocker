import { ChartManager } from '../../chart-manager.js'
import { heatColor } from '../../theme.js'

export function renderTreemapChart(container, items, prevInstance) {
  if (!container || !items || items.length === 0) return prevInstance

  ChartManager.destroy(prevInstance)

  container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
  const canvas = container.querySelector('canvas')

  const getColor = (p) => heatColor(p, 5)
  const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalValue = items.reduce((sum, item) => sum + (item.currentValue || 0), 0)

  const data = items.map(item => ({
    ticker: item.ticker,
    value: item.currentValue,
    pct: item.pnlPct ?? 0,
    weight: totalValue > 0 ? ((item.currentValue || 0) / totalValue) * 100 : 0,
    color: getColor(item.pnlPct ?? 0)
  })).filter(d => d.value > 0)

  return ChartManager.renderTreemapChart(canvas, data, {
    instance: null,
    formatter: (ctx) => {
      const d = ctx.raw?._data || ctx.raw
      if (!d || !d.ticker) return []
      const weightStr = `${(d.weight != null ? d.weight.toFixed(1) : '0.0')}%`
      const sign = d.pct > 0 ? '+' : ''
      const pnlStr = `${sign}${d.pct != null ? fmt(d.pct) : '0,00'}%`

      const w = ctx.element?.width || 0
      const h = ctx.element?.height || 0
      const area = w * h

      if (area > 0 && (area < 1800 || w < 55 || h < 32)) {
        return [d.ticker, weightStr]
      }
      if (area > 0 && (area < 4200 || h < 52 || w < 85)) {
        return [d.ticker, `${weightStr} | ${pnlStr}`]
      }
      return [d.ticker, `Peso: ${weightStr}`, `P&L: ${pnlStr}`]
    },
    chartOptions: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const d = ctx.raw?._data
              if (!d) return ''
              const sign = d.pct > 0 ? '+' : ''
              const pnlStr = `${sign}${fmt(d.pct)}%`
              const weightStr = `${(d.weight != null ? d.weight.toFixed(1) : '0.0')}%`
              return ` ${d.ticker}: $${fmt(d.value)} | Peso: ${weightStr} | P&L: ${pnlStr}`
            }
          }
        }
      }
    }
  })
}
