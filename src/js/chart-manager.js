import { Chart, registerables } from 'chart.js'
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap'
Chart.register(...registerables, TreemapController, TreemapElement)

// Re-exportado para que otros módulos (ej. analysis.js) usen la misma instancia
// ya registrada con todos los controllers, sin depender de `window`.
export { Chart }

/**
 * Gestor Centralizado de Gráficos (Basado en Chart.js)
 * Proporciona una interfaz única y consistente para todos los gráficos del proyecto.
 */

// Paleta de colores consistente con el proyecto ("Fintech sobrio")
export const CHART_COLORS = [
  '#7c3aed', // Violeta (Primary)
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#64748b'  // Slate
]

// Función auxiliar para obtener colores de variables CSS reales (para modo dark/light)
const getCSSVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim()

// Plugin para dibujar etiquetas con contorno (Outline)
const outlinedTextPlugin = {
  id: 'outlinedText',
  afterDatasetsDraw(chart, args, options) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return
    
    const { ctx, data } = chart
    const minLabelPct = options.minLabelPct || 0.06
    
    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
      const { x, y } = datapoint.tooltipPosition()
      const value = data.datasets[0].data[index]
      const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
      const pct = value / total
      
      if (pct < minLabelPct) return
      
      const label = data.labels[index]
      const pctText = (pct * 100).toFixed(0) + '%'
      
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Estilo de la etiqueta superior
      ctx.font = '800 13px Inter, sans-serif'
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.strokeText(label, x, y - 6)
      ctx.fillStyle = 'white'
      ctx.fillText(label, x, y - 6)
      
      // Estilo de la etiqueta inferior
      ctx.font = '500 12px Inter, sans-serif'
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 2.5
      ctx.strokeText(pctText, x, y + 10)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fillText(pctText, x, y + 10)
      
      ctx.restore()
    })
  }
}

const barPercentageLabelsPlugin = {
  id: 'barPercentageLabels',
  afterDatasetsDraw(chart, args, options) {
    if (chart.config.type !== 'bar') return
    
    const { ctx, data } = chart
    const total = options.total || data.datasets[0].data.reduce((a, b) => a + b, 0)
    if (!total) return
    
    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
      const value = data.datasets[0].data[index]
      const pct = (value / total) * 100
      const pctText = pct.toFixed(1) + '%'
      
      const { x, y } = datapoint
      const isVertical = chart.config.options.indexAxis === 'x'
      
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = isVertical ? 'bottom' : 'middle'
      
      ctx.font = 'bold 11px Inter, sans-serif'
      ctx.fillStyle = getCSSVar('--text-main') || '#ffffff'
      
      ctx.strokeStyle = getCSSVar('--bg-card') || '#1e293b'
      ctx.lineWidth = 3.5
      ctx.lineJoin = 'round'
      
      if (isVertical) {
        ctx.strokeText(pctText, x, y - 6)
        ctx.fillText(pctText, x, y - 6)
      } else {
        ctx.strokeText(pctText, x + 18, y)
        ctx.fillText(pctText, x + 18, y)
      }
      ctx.restore()
    })
  }
}

// Configuración global dinámica según el tema
const getBaseOptions = () => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  }
}

const getScaleOptions = () => {
  const textColor = getCSSVar('--text-muted') || '#64748b'
  const gridColor = getCSSVar('--border') || 'rgba(120, 120, 130, 0.15)'
  return {
    x: {
      ticks: { color: textColor },
      grid: { color: gridColor }
    },
    y: {
      ticks: { color: textColor },
      grid: { color: gridColor }
    }
  }
}

export const ChartManager = {
  renderPieChart(canvas, items, options = {}) {
    if (!canvas) return null
    const labels = items.map(item => item.label || item.ticker)
    const data = items.map(item => item.value || item.currentValue)
    const backgroundColor = options.colors || CHART_COLORS

    // Si ya existe la instancia, la actualizamos
    if (options.instance && options.instance.config.type === (options.type === 'pie' ? 'pie' : 'doughnut')) {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = data
      options.instance.data.datasets[0].backgroundColor = backgroundColor
      options.instance.update()
      return options.instance
    }

    const isDoughnut = options.type !== 'pie'
    const baseOptions = getBaseOptions()
    
    return new Chart(canvas, {
      type: isDoughnut ? 'doughnut' : 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        ...baseOptions,
        cutout: isDoughnut ? '68%' : 0,
        plugins: {
          ...baseOptions.plugins,
          outlinedText: { minLabelPct: options.minLabelPct || 0.06 }
        },
        ...options.chartOptions
      },
      plugins: [outlinedTextPlugin]
    })
  },

  renderBarChart(canvas, items, options = {}) {
    if (!canvas) return null
    const labels = items.map(item => item.label || item.ticker)
    const data = items.map(item => item.value || item.pnl)
    const isPos = v => v >= 0
    const backgroundColor = items.map(item => item.color || (isPos(item.value || item.pnl) ? '#10b981' : '#ef4444'))

    if (options.instance && options.instance.config.type === 'bar') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = data
      options.instance.data.datasets[0].backgroundColor = backgroundColor
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderRadius: 4,
          barThickness: options.barThickness || 20
        }]
      },
      options: {
        ...baseOptions,
        indexAxis: options.indexAxis || 'y',
        scales: {
          x: {
            ...scales.x,
            display: options.showScales !== false,
            grid: { display: false },
            ticks: {
              ...scales.x.ticks,
              callback: v => options.isCurrency ? v.toLocaleString('es-AR', { minimumFractionDigits: 0 }) : v
            }
          },
          y: {
            ...scales.y,
            display: options.showScales !== false,
            grid: { display: false }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: ctx => options.tooltipFormatter
                ? options.tooltipFormatter(ctx.parsed.x)
                : ` ${ctx.parsed.x}`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderVerticalBarChart(canvas, items, options = {}) {
    if (!canvas) return null
    const labels = items.map(item => item.label || item.ticker)
    const data = items.map(item => item.value || item.currentValue)
    const colors = options.colors || CHART_COLORS
    const backgroundColor = items.map((_, i) => colors[i % colors.length])

    if (options.instance && options.instance.config.type === 'bar' && options.instance.config.options.indexAxis === 'x') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = data
      options.instance.data.datasets[0].backgroundColor = backgroundColor
      if (options.instance.options.plugins) {
        if (!options.instance.options.plugins.barPercentageLabels) {
          options.instance.options.plugins.barPercentageLabels = {}
        }
        options.instance.options.plugins.barPercentageLabels.total = options.total
      }
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColor,
          borderRadius: 4,
          barThickness: options.barThickness || 24
        }]
      },
      options: {
        ...baseOptions,
        indexAxis: 'x',
        scales: {
          x: {
            ...scales.x,
            grid: { display: false }
          },
          y: {
            ...scales.y,
            grid: { color: getCSSVar('--border') || 'rgba(120, 120, 130, 0.15)' },
            ticks: {
              ...scales.y.ticks,
              callback: v => {
                if (options.isPercentage) return v.toFixed(0) + '%'
                return '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
              }
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          barPercentageLabels: {
            total: options.total
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y
                if (options.isPercentage) {
                  return ` Porcentaje: ${val.toFixed(1)}%`
                }
                const formatted = val.toLocaleString('es-AR', { minimumFractionDigits: 2 })
                if (options.total) {
                  const pct = ((val / options.total) * 100).toFixed(1)
                  return ` Valor: $${formatted} (${pct}%)`
                }
                return ` Valor: $${formatted}`
              }
            }
          }
        },
        ...options.chartOptions
      },
      plugins: [barPercentageLabelsPlugin]
    })
  },

  renderTreemapChart(canvas, data, options = {}) {
    if (!canvas) return null

    if (options.instance && options.instance.config.type === 'treemap') {
      options.instance.data.datasets[0].tree = data
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    return new Chart(canvas, {
      type: 'treemap',
      data: {
        datasets: [{
          tree: data,
          key: options.key || 'value',
          spacing: 1, // Espacio entre rectángulos para que se distingan
          borderWidth: 1, // Un borde sutil
          borderColor: getCSSVar('--bg-card') || '#ffffff',
          borderRadius: 4,
          backgroundColor: (ctx) => ctx.raw?._data?.color || '#64748b',
          labels: {
            display: true,
            formatter: options.formatter || ((ctx) => {
              const d = ctx.raw?._data || ctx.raw
              if (!d || !d.ticker) return []
              return [d.ticker, (d.pct != null ? d.pct.toFixed(1) : '0') + '%']
            }),
            font: { size: 13, weight: 'bold' },
            color: '#ffffff',
            overflow: 'fit'
          },
          ...options.datasetOptions
        }]
      },
      options: {
        ...baseOptions,
        ...options.chartOptions,
        plugins: {
          ...(baseOptions?.plugins || {}),
          ...(options.chartOptions?.plugins || {}),
          legend: { display: false }
        }
      }
    })
  },

  renderMarkowitzChart(canvas, analysis, options = {}) {
    if (!canvas || !analysis) return null

    if (options.instance && options.instance.config.type === 'scatter') {
      options.instance.data.datasets[0].data = (analysis.portfolios || []).map(p => ({ x: p.std, y: p.return }))
      options.instance.data.datasets[1].data = [{ x: analysis.optimal.std, y: analysis.optimal.return }]
      options.instance.data.datasets[2].data = [{ x: analysis.current.std, y: analysis.current.return }]
      if (options.instance.data.datasets[3]) {
        options.instance.data.datasets[3].data = (analysis.assets || []).map(a => ({ x: a.std, y: a.return, ticker: a.ticker, weight: a.weight }))
      }
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    const gridColor = getCSSVar('--border') ? getCSSVar('--border') + '44' : 'rgba(255, 255, 255, 0.05)'
    
    return new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Carteras Aleatorias',
            data: (analysis.portfolios || []).map(p => ({ x: p.std, y: p.return })),
            backgroundColor: 'rgba(148, 163, 184, 0.25)',
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 0
          },
          {
            label: 'Máximo Sharpe (Óptimo)',
            data: [{ x: analysis.optimal.std, y: analysis.optimal.return }],
            backgroundColor: '#10b981',
            pointRadius: 8,
            pointHoverRadius: 10,
            borderColor: getCSSVar('--bg-card') || '#ffffff',
            borderWidth: 3,
            zIndex: 10
          },
          {
            label: 'Cartera Actual',
            data: [{ x: analysis.current.std, y: analysis.current.return }],
            backgroundColor: '#3b82f6',
            pointRadius: 8,
            pointHoverRadius: 10,
            borderColor: getCSSVar('--bg-card') || '#ffffff',
            borderWidth: 3,
            pointStyle: 'rectRot',
            zIndex: 11
          },
          {
            label: 'Activos Individuales',
            data: (analysis.assets || []).map(a => ({ x: a.std, y: a.return, ticker: a.ticker, weight: a.weight })),
            backgroundColor: 'rgba(245, 158, 11, 0.85)',
            borderColor: getCSSVar('--bg-card') || '#ffffff',
            borderWidth: 1.5,
            pointRadius: (ctx) => 5 + (ctx.raw?.weight || 0) * 35,
            pointHoverRadius: (ctx) => 7 + (ctx.raw?.weight || 0) * 35,
            zIndex: 9
          }
        ]
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...scales.x,
            title: { display: true, text: 'Riesgo (Volatilidad %)', color: textColor, font: { weight: '600' } },
            grid: { color: gridColor, borderDash: [4, 4] },
            ticks: { ...scales.x.ticks, callback: v => (v * 100).toFixed(0) + '%' }
          },
          y: {
            ...scales.y,
            title: { display: true, text: 'Retorno Esperado (%)', color: textColor, font: { weight: '600' } },
            grid: { color: gridColor, borderDash: [4, 4] },
            ticks: { ...scales.y.ticks, callback: v => (v * 100).toFixed(0) + '%' }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const x = (ctx.parsed.x * 100).toFixed(2) + '%'
                const y = (ctx.parsed.y * 100).toFixed(2) + '%'
                if (ctx.raw?.ticker) {
                  const w = ctx.raw.weight != null ? ` | Peso: ${(ctx.raw.weight * 100).toFixed(1)}%` : ''
                  return ` ${ctx.raw.ticker}: Riesgo ${x}, Retorno ${y}${w}`
                }
                return ` ${ctx.dataset.label}: Riesgo ${x}, Retorno ${y}`
              }
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderMonteCarloChart(canvas, datasets, options = {}) {
    if (!canvas || !datasets) return null

    if (options.instance && options.instance.config.type === 'line') {
      datasets.forEach((ds, i) => {
        if (options.instance.data.datasets[i]) {
          options.instance.data.datasets[i].data = ds.data
        }
      })
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    
    const processedDatasets = datasets.map((ds, i) => {
      const isMedian = ds.label === 'Mediana' || i === 0
      return {
        ...ds,
        label: isMedian ? 'Proyección Mediana' : ds.label,
        borderColor: isMedian ? '#8b5cf6' : 'rgba(148, 163, 184, 0.12)',
        borderWidth: isMedian ? 3 : 1,
        pointRadius: 0,
        fill: isMedian ? 'origin' : false,
        backgroundColor: isMedian ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
        tension: 0.3,
        zIndex: isMedian ? 10 : 1
      }
    })

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: datasets[0].data.length }, (_, i) => `D${i}`),
        datasets: processedDatasets
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...scales.x,
            title: { display: true, text: 'Días de Proyección', color: textColor },
            grid: { display: false }
          },
          y: {
            ...scales.y,
            title: { display: true, text: 'Valor Estimado ($)', color: textColor },
            ticks: {
              ...scales.y.ticks,
              callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            intersect: false,
            mode: 'index',
            filter: (item) => item.dataset.zIndex > 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderPriceWithTradesChart(canvas, data, options = {}) {
    if (!canvas || !data) return null
    const { labels, price, compras, ventas } = data

    if (options.instance && options.instance.config.type === 'line') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = price
      options.instance.data.datasets[1].data = compras
      options.instance.data.datasets[2].data = ventas
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    const cardBg = getCSSVar('--bg-card') || '#ffffff'
    const primary = getCSSVar('--color-primary') || '#7c3aed'
    const primaryRgb = getCSSVar('--color-primary-rgb') || '91, 91, 214'

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Precio',
            data: price,
            borderColor: primary,
            backgroundColor: `rgba(${primaryRgb}, 0.08)`,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 3,
            fill: true,
            tension: 0.15,
            order: 3
          },
          {
            label: 'Compras',
            data: compras,
            pointStyle: 'triangle',
            pointRadius: 7,
            pointHoverRadius: 9,
            pointBackgroundColor: '#10b981',
            pointBorderColor: cardBg,
            pointBorderWidth: 1.5,
            showLine: false,
            order: 1
          },
          {
            label: 'Ventas',
            data: ventas,
            pointStyle: 'triangle',
            pointRotation: 180,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: cardBg,
            pointBorderWidth: 1.5,
            showLine: false,
            order: 2
          }
        ]
      },
      options: {
        ...baseOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            ...scales.x,
            grid: { display: false },
            ticks: { ...scales.x.ticks, maxTicksLimit: 8 }
          },
          y: {
            ...scales.y,
            title: { display: true, text: 'Precio', color: textColor },
            ticks: { ...scales.y.ticks, callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 }) }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          legend: { display: true, position: 'top', labels: { color: textColor, boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            filter: (item) => item.parsed.y != null,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderBacktestingChart(canvas, portfolioData, benchmarkData, benchmarkLabel, options = {}) {
    if (!canvas || !portfolioData) return null

    if (options.instance && options.instance.config.type === 'line') {
      options.instance.data.datasets[0].data = portfolioData
      options.instance.data.datasets[1].data = benchmarkData
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    const primary = getCSSVar('--color-primary') || '#7c3aed'
    const primaryRgb = getCSSVar('--color-primary-rgb') || '91, 91, 214'

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: portfolioData.length }, (_, i) => i),
        datasets: [
          {
            label: 'Tu Cartera',
            data: portfolioData,
            borderColor: primary,
            borderWidth: 3,
            backgroundColor: `rgba(${primaryRgb}, 0.12)`,
            fill: true,
            pointRadius: 0,
            tension: 0.2,
            zIndex: 10
          },
          {
            label: benchmarkLabel,
            data: benchmarkData,
            borderColor: textColor,
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.2,
            zIndex: 1
          }
        ]
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...scales.x,
            title: { display: true, text: 'Días Transcurridos', color: textColor },
            grid: { display: false }
          },
          y: {
            ...scales.y,
            title: { display: true, text: 'Rendimiento Acumulado (%)', color: textColor },
            ticks: {
              ...scales.y.ticks,
              callback: v => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: { color: textColor, boxWidth: 12, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            intersect: false,
            mode: 'index',
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y >= 0 ? '+' : '')}${ctx.parsed.y.toFixed(2)}%`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderRiskChart(canvas, items, options = {}) {
    if (!canvas || !items) return null
    const labels = items.map(item => item.ticker)
    const data = items.map(item => item.value)
    const colors = items.map(item => {
      const val = item.value || 0
      if (val > 25) return '#ef4444'
      if (val > 12) return '#f59e0b'
      return '#3b82f6'
    })

    if (options.instance && options.instance.config.type === 'bar') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = data
      options.instance.data.datasets[0].backgroundColor = colors
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '% del Riesgo Total',
          data: data,
          backgroundColor: colors,
          borderRadius: 6,
          barThickness: options.barThickness || 24
        }]
      },
      options: {
        ...baseOptions,
        indexAxis: 'y',
        scales: {
          x: {
            ...scales.x,
            max: 100,
            title: { display: true, text: '% de Contribución al Riesgo', color: textColor },
            ticks: { ...scales.x.ticks, callback: v => v + '%' }
          },
          y: {
            ...scales.y,
            grid: { display: false }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (ctx) => ` Contribución: ${ctx.parsed.x.toFixed(1)}% del riesgo total`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderComparisonChart(canvas, labels, investedData, currentData, options = {}) {
    if (!canvas || !investedData) return null

    // Barra única apilada por activo:
    //  - Segmento base (índigo) = capital "en juego" = min(invertido, actual)
    //  - Segmento superior      = |resultado|; azul si es ganancia, rojo si es pérdida
    // Ganancia  -> la barra llega hasta el valor actual (base = invertido, +azul encima)
    // Pérdida   -> la barra llega hasta el capital invertido (base = actual, +rojo encima)
    const BASE_COLOR = getCSSVar('--color-primary') || '#7c3aed'
    const GAIN_COLOR = '#3b82f6'
    const LOSS_COLOR = '#ef4444'

    const baseData  = currentData.map((cur, i) => Math.min(investedData[i], cur))
    const deltaData = currentData.map((cur, i) => Math.abs(cur - investedData[i]))
    const baseColors  = labels.map(() => BASE_COLOR)
    const deltaColors = currentData.map((cur, i) => (cur >= investedData[i] ? GAIN_COLOR : LOSS_COLOR))

    if (options.instance && options.instance.config.type === 'bar') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = baseData
      options.instance.data.datasets[0].backgroundColor = baseColors
      options.instance.data.datasets[1].data = deltaData
      options.instance.data.datasets[1].backgroundColor = deltaColors
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Capital Invertido',
            data: baseData,
            backgroundColor: baseColors,
            stack: 'comp',
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Resultado',
            data: deltaData,
            backgroundColor: deltaColors,
            stack: 'comp',
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...scales.x,
            stacked: true,
            grid: { display: false }
          },
          y: {
            ...scales.y,
            stacked: true,
            ticks: {
              ...scales.y.ticks,
              callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              boxWidth: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              generateLabels: (chart) => [
                { text: 'Capital Invertido', fillStyle: BASE_COLOR, strokeStyle: BASE_COLOR, fontColor: textColor, pointStyle: 'circle', datasetIndex: 0, hidden: !chart.isDatasetVisible(0) },
                { text: 'Ganancia', fillStyle: GAIN_COLOR, strokeStyle: GAIN_COLOR, fontColor: textColor, pointStyle: 'circle', datasetIndex: 1, hidden: !chart.isDatasetVisible(1) },
                { text: 'Pérdida', fillStyle: LOSS_COLOR, strokeStyle: LOSS_COLOR, fontColor: textColor, pointStyle: 'circle', datasetIndex: 1, hidden: !chart.isDatasetVisible(1) }
              ]
            },
            onClick: (e, legendItem, legend) => {
              const chart = legend.chart
              const index = legendItem.datasetIndex
              chart.isDatasetVisible(index) ? chart.hide(index) : chart.show(index)
            }
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const i = ctx.dataIndex
                const inv = investedData[i]
                const cur = currentData[i]
                const diff = cur - inv
                const pct = inv ? (cur / inv - 1) * 100 : 0
                if (ctx.datasetIndex === 0) {
                  return ` Invertido: $${inv.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                }
                const tag = diff >= 0 ? 'Ganancia' : 'Pérdida'
                return [
                  ` Valor actual: $${cur.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
                  ` ${tag}: ${diff >= 0 ? '+' : '-'}$${Math.abs(diff).toLocaleString('es-AR', { maximumFractionDigits: 0 })} (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
                ]
              }
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderStackedBarChart(canvas, labels, datasets, options = {}) {
    if (!canvas || !datasets.length) return null

    if (options.instance && options.instance.config.type === 'bar') {
      options.instance.data.labels = labels
      options.instance.data.datasets = datasets
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'

    return new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...baseOptions,
        indexAxis: 'y',
        scales: {
          x: {
            ...scales.x,
            stacked: true,
            grid: { display: false },
            ticks: {
              ...scales.x.ticks,
              callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
            }
          },
          y: {
            ...scales.y,
            stacked: true,
            grid: { display: false }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: true,
            position: 'top',
            labels: { color: textColor, boxWidth: 12, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            filter: (item) => item.parsed.x > 0,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.x.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  renderEquityCurveChart(canvas, dates, series, options = {}) {
    if (!canvas || !dates || !series) return null

    if (options.instance && options.instance.config.type === 'line') {
      options.instance.data.labels = dates
      series.forEach((s, i) => {
        if (options.instance.data.datasets[i]) options.instance.data.datasets[i].data = s.data
      })
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const scales = getScaleOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'

    const datasets = series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: s.color + '22',
      borderWidth: 2,
      borderDash: s.dashed ? [5, 5] : [],
      pointRadius: 0,
      pointHitRadius: 8,
      fill: s.fill ? 'origin' : false,
      tension: 0.15
    }))

    return new Chart(canvas, {
      type: 'line',
      data: { labels: dates, datasets },
      options: {
        ...baseOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            ...scales.x,
            grid: { display: false },
            ticks: { ...scales.x.ticks, maxTicksLimit: 8, autoSkip: true, maxRotation: 0 }
          },
          y: {
            ...scales.y,
            ticks: {
              ...scales.y.ticks,
              callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
            }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: series.length > 1,
            position: 'top',
            labels: { color: textColor, boxWidth: 12, usePointStyle: true, pointStyle: 'circle' }
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            }
          }
        },
        ...options.chartOptions
      }
    })
  },

  destroy(chart) {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy()
    }
    return null
  }
}
