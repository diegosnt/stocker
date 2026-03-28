/**
 * Gestor Centralizado de Gráficos (Basado en Chart.js)
 * Proporciona una interfaz única y consistente para todos los gráficos del proyecto.
 */

// Paleta de colores consistente con el proyecto
export const CHART_COLORS = [
  '#4f46e6', // Indigo (Primary)
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#6366f1'  // Indigo Light
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

// Configuración global dinámica según el tema
const getBaseOptions = () => {
  const textColor = getCSSVar('--text-muted') || '#64748b'
  const gridColor = 'rgba(255, 255, 255, 0.05)'
  
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
    },
    scales: {
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
    
    return new window.Chart(canvas, {
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
    return new window.Chart(canvas, {
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
            ...baseOptions.scales.x,
            display: options.showScales !== false,
            grid: { display: false },
            ticks: {
              ...baseOptions.scales.x.ticks,
              callback: v => options.isCurrency ? v.toLocaleString('es-AR', { minimumFractionDigits: 0 }) : v
            }
          },
          y: {
            ...baseOptions.scales.y,
            display: options.showScales !== false,
            grid: { display: false }
          }
        },
        ...options.chartOptions
      }
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
    return new window.Chart(canvas, {
      type: 'treemap',
      data: {
        datasets: [{
          tree: data,
          key: options.key || 'value',
          spacing: options.spacing || 1,
          borderWidth: 0,
          borderRadius: 4,
          backgroundColor: (ctx) => ctx.raw?._data?.color || '#64748b',
          labels: {
            display: true,
            formatter: options.formatter || ((ctx) => {
              const d = ctx.raw?._data
              if (!d) return []
              return [d.ticker, (d.pct || 0).toFixed(1) + '%']
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
        ...options.chartOptions
      }
    })
  },

  renderMarkowitzChart(canvas, analysis, options = {}) {
    if (!canvas || !analysis) return null

    if (options.instance && options.instance.config.type === 'scatter') {
      options.instance.data.datasets[0].data = (analysis.portfolios || []).map(p => ({ x: p.std, y: p.return }))
      options.instance.data.datasets[1].data = [{ x: analysis.optimal.std, y: analysis.optimal.return }]
      options.instance.data.datasets[2].data = [{ x: analysis.current.std, y: analysis.current.return }]
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    const gridColor = getCSSVar('--border') ? getCSSVar('--border') + '44' : 'rgba(255, 255, 255, 0.05)'
    
    return new window.Chart(canvas, {
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
          }
        ]
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...baseOptions.scales.x,
            title: { display: true, text: 'Riesgo (Volatilidad %)', color: textColor, font: { weight: '600' } },
            grid: { color: gridColor, borderDash: [4, 4] },
            ticks: { ...baseOptions.scales.x.ticks, callback: v => (v * 100).toFixed(0) + '%' }
          },
          y: {
            ...baseOptions.scales.y,
            title: { display: true, text: 'Retorno Esperado (%)', color: textColor, font: { weight: '600' } },
            grid: { color: gridColor, borderDash: [4, 4] },
            ticks: { ...baseOptions.scales.y.ticks, callback: v => (v * 100).toFixed(0) + '%' }
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

    return new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: datasets[0].data.length }, (_, i) => `D${i}`),
        datasets: processedDatasets
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...baseOptions.scales.x,
            title: { display: true, text: 'Días de Proyección', color: textColor },
            grid: { display: false }
          },
          y: {
            ...baseOptions.scales.y,
            title: { display: true, text: 'Valor Estimado ($)', color: textColor },
            ticks: {
              ...baseOptions.scales.y.ticks,
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

  renderBacktestingChart(canvas, portfolioData, benchmarkData, benchmarkLabel, options = {}) {
    if (!canvas || !portfolioData) return null

    if (options.instance && options.instance.config.type === 'line') {
      options.instance.data.datasets[0].data = portfolioData
      options.instance.data.datasets[1].data = benchmarkData
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    
    return new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: Array.from({ length: portfolioData.length }, (_, i) => i),
        datasets: [
          {
            label: 'Tu Cartera',
            data: portfolioData,
            borderColor: '#4f46e6',
            borderWidth: 3,
            backgroundColor: 'rgba(79, 70, 230, 0.1)',
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
            ...baseOptions.scales.x,
            title: { display: true, text: 'Días Transcurridos', color: textColor },
            grid: { display: false }
          },
          y: {
            ...baseOptions.scales.y,
            title: { display: true, text: 'Rendimiento Acumulado (%)', color: textColor },
            ticks: {
              ...baseOptions.scales.y.ticks,
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
    const textColor = getCSSVar('--text-muted') || '#64748b'
    
    return new window.Chart(canvas, {
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
            ...baseOptions.scales.x,
            max: 100,
            title: { display: true, text: '% de Contribución al Riesgo', color: textColor },
            ticks: { ...baseOptions.scales.x.ticks, callback: v => v + '%' }
          },
          y: {
            ...baseOptions.scales.y,
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
    const currentColors = currentData.map((val, i) => val >= investedData[i] ? '#10b981' : '#ef4444')

    if (options.instance && options.instance.config.type === 'bar') {
      options.instance.data.labels = labels
      options.instance.data.datasets[0].data = investedData
      options.instance.data.datasets[1].data = currentData
      options.instance.data.datasets[1].backgroundColor = currentColors
      options.instance.update()
      return options.instance
    }

    const baseOptions = getBaseOptions()
    const textColor = getCSSVar('--text-muted') || '#64748b'
    
    return new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Capital Invertido',
            data: investedData,
            backgroundColor: '#8b5cf6',
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          },
          {
            label: 'Valor de Mercado',
            data: currentData,
            backgroundColor: currentColors,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        ...baseOptions,
        scales: {
          x: {
            ...baseOptions.scales.x,
            grid: { display: false }
          },
          y: {
            ...baseOptions.scales.y,
            ticks: {
              ...baseOptions.scales.y.ticks,
              callback: v => '$' + v.toLocaleString('es-AR', { minimumFractionDigits: 0 })
            }
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
            callbacks: {
              label: (ctx) => {
                const i = ctx.dataIndex
                const inv = investedData[i]
                const cur = currentData[i]
                const diff = cur - inv
                const pct = ((cur / inv) - 1) * 100
                const prefix = ctx.datasetIndex === 0 ? 'Invertido' : 'Actual'
                let res = ` ${prefix}: $${ctx.parsed.y.toLocaleString('es-AR')}`
                if (ctx.datasetIndex === 1) {
                  res += ` (${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
                }
                return res
              }
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
