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
    // Llamada a la función RPC que hace todo el cálculo en el servidor
    const { data: holdings, error } = await supabase.rpc('get_user_holdings')

    if (error) throw error

    const alycMap = {}
    let totalARS = 0
    let totalUSD = 0

    for (const h of holdings) {
      const alycId = h.alyc_id
      if (!alycMap[alycId]) {
        alycMap[alycId] = { name: h.alyc_name, holdings: {} }
      }

      const val = parseFloat(h.total_quantity) * parseFloat(h.last_price)
      if (h.currency === 'ARS') totalARS += val
      else totalUSD += val

      const hMap = alycMap[alycId].holdings
      hMap[h.ticker] = {
        ticker: h.ticker,
        name: h.instrument_name,
        quantity: parseFloat(h.total_quantity),
        lastPrice: parseFloat(h.last_price),
        currency: h.currency,
        currentValue: val
      }
    }

    const result = []
    for (const alycId in alycMap) {
      const alyc = alycMap[alycId]
      const items = Object.values(alyc.holdings)
      
      const byCurrency = {}
      items.forEach(item => {
        if (!byCurrency[item.currency]) byCurrency[item.currency] = []
        byCurrency[item.currency].push(item)
      })
      result.push({ name: alyc.name, currencies: byCurrency })
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
    for (const [idx, alyc] of data.alycs.entries()) {
      const collapsed = idx > 0 ? ' collapsed' : ''
      let bodyHtml = ''

      for (const [curr, items] of Object.entries(alyc.currencies)) {
        const totalVal = items.reduce((acc, h) => acc + h.currentValue, 0)
        items.sort((a, b) => b.currentValue - a.currentValue)

        bodyHtml += `
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
                      <td><span class="ticker-chip" title="${h.name}">${h.ticker}</span></td>
                      <td class="amount">${h.quantity.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                      <td class="amount">${h.lastPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td class="amount"><strong>${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                      <td class="amount" style="color: var(--text-muted); font-weight: 600">${((h.currentValue / totalVal) * 100).toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

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
          </div>`
      }

      html += `
        <div class="card alyc-card${collapsed}">
          <div class="alyc-card-header">
            <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem">
              <span style="color:var(--color-primary)">🏦</span> ${alyc.name}
            </h3>
            <span class="alyc-chevron">▾</span>
          </div>
          <div class="alyc-card-body">
            <div class="alyc-card-inner">${bodyHtml}</div>
          </div>
        </div>`
    }

    contentContainer.innerHTML = html

    contentContainer.querySelectorAll('.alyc-card-header').forEach(header => {
      header.addEventListener('click', () => {
        header.closest('.alyc-card').classList.toggle('collapsed')
      })
    })
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
