import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'

export const HoldingsAnalysisPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Análisis de Tenencia</h2>
      </div>
      
      <div id="holdings-kpis" class="kpi-grid">
        <div class="kpi-card loading-skeleton"></div>
        <div class="kpi-card loading-skeleton"></div>
        <div class="kpi-card loading-skeleton"></div>
      </div>

      <div id="holdings-content" class="holdings-sections">
        <div class="card">
          <p class="table-empty"><span class="spinner"></span> Cargando análisis detallado...</p>
        </div>
      </div>`

    try {
      const data = await this._calculateHoldingsByAlyc()
      this._renderHoldings(data)
    } catch (error) {
      console.error(error)
      content.innerHTML = `
        <div class="page-header">
          <h2>Análisis de Tenencia</h2>
        </div>
        <div class="card">
          <p class="table-empty">Error al cargar el análisis. Por favor, intente de nuevo.</p>
        </div>`
    }
  },

  async _calculateHoldingsByAlyc() {
    const { data: operations, error: opError } = await supabase
      .from('operations')
      .select('*, instruments(ticker, name), alycs(name)')
      .order('operated_at', { ascending: true })

    if (opError) throw opError

    const alycMap = {}
    let totalARS = 0
    let totalUSD = 0

    for (const op of operations) {
      const inst = op.instruments
      const alyc = op.alycs
      if (!inst || !alyc) continue

      const alycId = op.alyc_id
      if (!alycMap[alycId]) {
        alycMap[alycId] = { name: alyc.name, holdings: {} }
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

      if (op.type === 'compra') h.quantity += qty
      else h.quantity -= qty
      
      h.lastPrice = price
      h.currency = op.currency
    }

    const result = []
    for (const alycId in alycMap) {
      const alyc = alycMap[alycId]
      const items = Object.values(alyc.holdings)
        .filter(h => h.quantity > 0.000001)
        .map(h => {
          const val = h.quantity * h.lastPrice
          if (h.currency === 'ARS') totalARS += val
          else totalUSD += val
          return { ...h, currentValue: val }
        })

      if (items.length > 0) {
        const byCurrency = {}
        items.forEach(h => {
          if (!byCurrency[h.currency]) byCurrency[h.currency] = []
          byCurrency[h.currency].push(h)
        })
        result.push({ name: alyc.name, currencies: byCurrency })
      }
    }

    result.sort((a, b) => a.name.localeCompare(b.name))
    return { alycs: result, totalARS, totalUSD }
  },

  _renderHoldings(data) {
    const kpiContainer = document.getElementById('holdings-kpis')
    const contentContainer = document.getElementById('holdings-content')

    // Render KPIs
    kpiContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Total Estimado ARS</div>
        <div class="kpi-value">${data.totalARS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Estimado USD</div>
        <div class="kpi-value">${data.totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ALyCs Activas</div>
        <div class="kpi-value">${data.alycs.length}</div>
      </div>
    `

    if (!data.alycs.length) {
      contentContainer.innerHTML = `
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas para analizar.</p>
        </div>`
      return
    }

    let html = ''
    for (const alyc of data.alycs) {
      html += `
        <div class="card">
          <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem">
            <span style="color: var(--color-primary)">🏦</span> ${alyc.name}
          </h3>
      `

      for (const [curr, items] of Object.entries(alyc.currencies)) {
        const totalVal = items.reduce((acc, h) => acc + h.currentValue, 0)
        items.sort((a, b) => b.currentValue - a.currentValue)

        html += `
          <div class="currency-group" style="margin-bottom: 2rem">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem">
              <span class="badge badge-${curr.toLowerCase()}">${curr}</span>
              <div style="text-align: right">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase">Subtotal</div>
                <div style="font-size: 1.25rem; font-weight: 700">${totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            
            <div class="chart-container" style="margin-bottom: 1.5rem">
              ${this._renderBarChart(items, totalVal)}
            </div>

            <div class="table-wrapper desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th style="text-align:right">Cantidad</th>
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
                      <td class="amount" style="color: var(--text-muted); font-weight: 600">${((h.currentValue / totalVal) * 100).toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Mobile View (SKILL.md) -->
            <div class="mobile-only" style="display: none">
              ${items.map(h => `
                <div class="mobile-card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
                    <span class="ticker-chip">${h.ticker}</span>
                    <span style="font-weight: 700">${((h.currentValue / totalVal) * 100).toFixed(1)}%</span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem">
                    <div style="color: var(--text-muted)">Cantidad:</div>
                    <div style="text-align: right; font-weight: 500">${h.quantity.toLocaleString('es-AR')}</div>
                    <div style="color: var(--text-muted)">Valor Est.:</div>
                    <div style="text-align: right; font-weight: 700; color: var(--color-primary)">${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `
      }
      html += `</div>`
    }

    contentContainer.innerHTML = html
  },

  _renderBarChart(items, total) {
    const colors = [
      '#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]

    return `
      <div style="display: flex; height: 12px; width: 100%; border-radius: 6px; overflow: hidden; background: var(--bg-main)">
        ${items.map((h, i) => {
          const pct = (h.currentValue / total) * 100
          if (pct < 0.5) return '' 
          return `<div style="width: ${pct}%; background-color: ${colors[i % colors.length]};" title="${h.ticker}: ${pct.toFixed(2)}%"></div>`
        }).join('')}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; justify-content: start">
        ${items.map((h, i) => `
          <div style="display: flex; align-items: center; font-size: 0.75rem">
            <div style="width: 8px; height: 8px; background-color: ${colors[i % colors.length]}; border-radius: 2px; margin-right: 6px"></div>
            <span style="color: var(--text-main); font-weight: 500">${h.ticker}</span>
            <span style="color: var(--text-muted); margin-left: 4px">${((h.currentValue / total) * 100).toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
    `
  }
}
