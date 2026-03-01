import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'

export const HoldingsAnalysisPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Análisis de Tenencia por ALyC</h2>
      </div>
      <div id="holdings-content" class="holdings-grid">
        <div class="card" style="grid-column: 1 / -1">
          <p class="table-empty"><span class="spinner"></span> Cargando análisis...</p>
        </div>
      </div>`

    try {
      const data = await this._calculateHoldingsByAlyc()
      this._renderHoldingsByAlyc(data)
    } catch (error) {
      console.error(error)
      content.innerHTML = `
        <div class="page-header">
          <h2>Análisis de Tenencia por ALyC</h2>
        </div>
        <div class="card">
          <p class="table-empty">Error al cargar el análisis. Por favor, intente de nuevo.</p>
        </div>`
    }
  },

  async _calculateHoldingsByAlyc() {
    // 1. Obtener todas las operaciones con info de instrumentos y alycs
    const { data: operations, error: opError } = await supabase
      .from('operations')
      .select('*, instruments(ticker, name), alycs(name)')
      .order('operated_at', { ascending: true })

    if (opError) throw opError

    // 2. Agrupar por ALyC y luego por Instrumento
    const alycMap = {}

    for (const op of operations) {
      const inst = op.instruments
      const alyc = op.alycs
      if (!inst || !alyc) continue

      const alycId = op.alyc_id
      if (!alycMap[alycId]) {
        alycMap[alycId] = {
          name: alyc.name,
          holdings: {}
        }
      }

      const hMap = alycMap[alycId].holdings
      if (!hMap[inst.ticker]) {
        hMap[inst.ticker] = {
          ticker: inst.ticker,
          name: inst.name,
          quantity: 0,
          lastPrice: 0,
          currency: op.currency
        }
      }

      const h = hMap[inst.ticker]
      const qty = parseFloat(op.quantity)
      const price = parseFloat(op.price)

      if (op.type === 'compra') {
        h.quantity += qty
      } else {
        h.quantity -= qty
      }
      
      h.lastPrice = price
      h.currency = op.currency
    }

    // 3. Limpiar y calcular valores actuales
    const result = []
    for (const alycId in alycMap) {
      const alyc = alycMap[alycId]
      const items = Object.values(alyc.holdings)
        .filter(h => h.quantity > 0.000001)
        .map(h => ({
          ...h,
          currentValue: h.quantity * h.lastPrice
        }))

      if (items.length > 0) {
        // Agrupar por moneda dentro de la ALyC
        const byCurrency = {}
        items.forEach(h => {
          if (!byCurrency[h.currency]) byCurrency[h.currency] = []
          byCurrency[h.currency].push(h)
        })

        result.push({
          name: alyc.name,
          currencies: byCurrency
        })
      }
    }

    // Ordenar ALyCs por nombre
    result.sort((a, b) => a.name.localeCompare(b.name))
    
    return result
  },

  _renderHoldingsByAlyc(data) {
    const container = document.getElementById('holdings-content')
    if (!data.length) {
      container.innerHTML = `
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas para analizar.</p>
        </div>`
      return
    }

    let html = ''

    for (const alyc of data) {
      html += `
        <div class="card" style="border-top: 4px solid var(--color-primary)">
      `

      for (const [curr, items] of Object.entries(alyc.currencies)) {
        const totalVal = items.reduce((acc, h) => acc + h.currentValue, 0)
        items.sort((a, b) => b.currentValue - a.currentValue)
        const instrumentCount = items.length

        html += `
          <div style="margin-bottom: 2rem">
            <h3 style="border-bottom: 1px solid var(--color-border); padding-bottom: .5rem">
              ${alyc.name} (${instrumentCount})
            </h3>
            <p>Valor total estimado en ${curr}: <strong>${totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${curr}</strong></p>
            
            <div class="chart-container" style="margin: 1.5rem 0">
              ${this._renderBarChart(items, totalVal)}
            </div>

            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th style="text-align:right">Cant.</th>
                    <th style="text-align:right">Últ. Precio</th>
                    <th style="text-align:right">Valor Est.</th>
                    <th style="text-align:right">%</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(h => `
                    <tr>
                      <td>
                        <span class="ticker-chip" title="${h.name}">${h.ticker}</span>
                      </td>
                      <td class="amount">${h.quantity.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                      <td class="amount">${h.lastPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td class="amount"><strong>${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                      <td class="amount">${((h.currentValue / totalVal) * 100).toFixed(2)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `
      }

      html += `</div>`
    }

    container.innerHTML = html
  },

  _renderBarChart(items, total) {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]

    return `
      <div style="display: flex; height: 24px; width: 100%; border-radius: 12px; overflow: hidden; background: var(--color-bg); border: 1px solid var(--color-border)">
        ${items.map((h, i) => {
          const pct = (h.currentValue / total) * 100
          if (pct < 0.5) return '' 
          return `<div style="width: ${pct}%; background-color: ${colors[i % colors.length]};" title="${h.ticker}: ${pct.toFixed(2)}%"></div>`
        }).join('')}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1rem; justify-content: start">
        ${items.map((h, i) => `
          <div style="display: flex; align-items: center; font-size: 0.75rem">
            <div style="width: 10px; height: 10px; background-color: ${colors[i % colors.length]}; border-radius: 2px; margin-right: 4px"></div>
            <span><strong>${h.ticker}</strong> ${((h.currentValue / total) * 100).toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
    `
  }
}
