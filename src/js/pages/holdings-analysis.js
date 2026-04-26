import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { ChartManager } from '../chart-manager.js'

export const HoldingsAnalysisPage = {
  _marketInterval: null,
  _charts: {}, // Almacén para instancias de Chart.js

  cleanup() {
    // Destruir todos los gráficos antes de limpiar
    Object.values(this._charts).forEach(c => ChartManager.destroy(c))
    this._charts = {}

    if (this._marketInterval) {
      clearInterval(this._marketInterval)
      this._marketInterval = null
    }
  },

  _isMarketOpen() {
    const now = new Date()
    // ART = UTC-3, sin horario de verano
    const artMs = now.getTime() + (-3 * 60 * 60 * 1000)
    const art   = new Date(artMs)
    const day   = art.getUTCDay() // 0=Dom, 6=Sáb
    if (day === 0 || day === 6) return false
    const minutes = art.getUTCHours() * 60 + art.getUTCMinutes()
    return minutes >= 11 * 60 && minutes < 17 * 60
  },

  _updateMarketBadge() {
    const el = document.getElementById('market-status-badge')
    if (!el) return
    const open = this._isMarketOpen()
    el.className   = `market-badge ${open ? 'market-open' : 'market-closed'}`
    el.textContent = open ? '● Mercado abierto' : '● Mercado cerrado'
  },

  async render() {
    if (this._marketInterval) {
      clearInterval(this._marketInterval)
      this._marketInterval = null
    }

    const { data: badgeSetting } = await supabase
      .from('app_settings').select('value').eq('key', 'market_badge_enabled').single()
    const badgeEnabled = badgeSetting?.value !== 'false'

    const open = this._isMarketOpen()
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Tenencia</h2>
        ${badgeEnabled ? `<span id="market-status-badge" class="market-badge ${open ? 'market-open' : 'market-closed'}">${open ? '● Mercado abierto' : '● Mercado cerrado'}</span>` : ''}
      </div>
      
      <div id="holdings-kpis" class="kpi-grid">
        ${Array(2).fill(`
          <div class="kpi-card">
            <div class="skeleton" style="height:10px; width:60%; margin-bottom:8px"></div>
            <div class="skeleton" style="height:20px; width:90%"></div>
          </div>
        `).join('')}
      </div>

      <div id="holdings-content" class="holdings-sections">
        ${Array(2).fill(`
          <div class="card skeleton" style="height: 100px; margin-bottom: 1.5rem; border:none"></div>
        `).join('')}
      </div>`

    try {
      const data = await this._calculateHoldingsByAlyc()
      this._renderHoldings(data)
      this._updateMarketPrices(data.tickers) // sin await — actualiza celdas al llegar
      if (badgeEnabled) this._marketInterval = setInterval(() => this._updateMarketBadge(), 60_000)
    } catch (error) {
      console.error(error)
      content.innerHTML = `
        <div class="page-header">
          <h2>Tenencia</h2>
        </div>
        <div class="card">
          <p class="table-empty">Error al cargar el análisis. Por favor, intente de nuevo.</p>
        </div>`
    }
  },

  async _updateMarketPrices(tickers) {
    this._resolvedPrices = {}
    if (!tickers || tickers.length === 0) return

    try {
      const data = await apiRequest('GET', `/api/quotes?tickers=${encodeURIComponent(tickers.join(','))}`)
      for (const ticker of tickers) {
        const price = data[ticker]?.price ?? null
        this._resolvedPrices[ticker] = price
        this._updatePriceCells(ticker, price)
      }
    } catch (err) {
      console.error('Error al actualizar precios masivos:', err)
      tickers.forEach(t => {
        this._resolvedPrices[t] = null
        this._updatePriceCells(t, null)
      })
    }
  },

  _renderAlycBody(alyc, alycIdx) {
    let bodyHtml = ''
    for (const [curr, items] of Object.entries(alyc.currencies)) {
      const totalInv = items.reduce((acc, h) => acc + h.currentValue, 0)
      const totalVal = totalInv // para compatibilidad con el resto del código
      items.sort((a, b) => b.currentValue - a.currentValue)

      const chartId = `pnl-chart-${alycIdx}-${curr}`
      this._pnlChartItems[chartId] = items.map(h => ({
        ticker: h.ticker, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice
      }))

      const skeleton = `<span class="cell-skeleton" style="width:100px; height:1.5rem; display:inline-block"></span>`
      
      bodyHtml += `
        <div class="currency-group" style="margin-bottom: 2rem">
          <div class="alyc-summary-row" style="margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 1rem">
            <div class="kpi-card kpi-card--compact" style="flex: 1; min-width: 150px">
              <div class="kpi-label">Total Invertido (${curr})</div>
              <div class="kpi-value">${totalInv.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="kpi-card kpi-card--compact" style="flex: 1; min-width: 150px">
              <div class="kpi-label">Valor Actual (${curr})</div>
              <div class="kpi-value alyc-current-value-kpi" data-alyc-idx="${alycIdx}" data-currency="${curr}">${skeleton}</div>
            </div>
            <div class="kpi-card kpi-card--compact" style="flex: 1; min-width: 150px">
              <div class="kpi-label">Diferencia / P&amp;L</div>
              <div class="kpi-value alyc-pnl-value-kpi" data-alyc-idx="${alycIdx}" data-currency="${curr}">${skeleton}</div>
              <div class="kpi-sub alyc-pnl-pct-kpi" data-alyc-idx="${alycIdx}" data-currency="${curr}"></div>
            </div>
          </div>


          <div class="charts-row">
            <div class="chart-panel">
              <div class="chart-panel-title">Distribución de Tenencia</div>
              <div style="height:280px; position:relative"><canvas id="chart-pie-${alycIdx}-${curr}"></canvas></div>
            </div>
            <div class="chart-panel">
              <div class="chart-panel-title">Por Tipo de Instrumento</div>
              <div style="height:280px; position:relative"><canvas id="chart-type-${alycIdx}-${curr}"></canvas></div>
            </div>
          </div>

          <div class="table-wrapper desktop-only">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="ticker">Ticker</th>
                  <th class="sortable" data-col="quantity" style="text-align:right">Cantidad</th>
                  <th class="sortable" data-col="avgBuyPrice" style="text-align:right">Precio Prom. Compra</th>
                  <th class="sortable" data-col="value" style="text-align:right">Valor Invertido</th>
                  <th class="sortable" data-col="marketPrice" style="text-align:right">Precio Actual</th>
                  <th class="sortable" data-col="marketValue" style="text-align:right">Valor Actual</th>
                  <th class="sortable" data-col="pnl" style="text-align:right">P&amp;L $</th>
                  <th class="sortable" data-col="pnlPct" style="text-align:right">P&amp;L %</th>
                  <th style="text-align:right">%</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(h => `
                  <tr data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}" data-value="${h.currentValue}">
                    <td><span class="ticker-chip" title="${h.name}">${h.ticker}</span></td>
                    <td class="amount">${h.quantity.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                    <td class="amount">${h.avgBuyPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="amount"><strong>${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                    <td class="amount market-price-cell" data-ticker="${h.ticker}"><span class="cell-skeleton"></span></td>
                    <td class="amount market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-pct-cell" data-ticker="${h.ticker}" data-avg-buy-price="${h.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount" style="color: var(--text-muted); font-weight: 600">${((h.currentValue / totalVal) * 100).toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="mobile-only">
            ${items.map(h => `
              <div class="mobile-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
                  <span class="ticker-chip">${h.ticker}</span>
                  <span style="font-weight: 700">${((h.currentValue / totalVal) * 100).toFixed(1)}%</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.875rem">
                  <div style="color: var(--text-muted)">Cantidad:</div>
                  <div style="text-align: right; font-weight: 500">${h.quantity.toLocaleString('es-AR')}</div>
                  <div style="color: var(--text-muted)">Valor Invertido:</div>
                  <div style="text-align: right; font-weight: 700; color: var(--color-primary)">${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style="color: var(--text-muted)">Precio Actual:</div>
                  <div class="market-price-cell" data-ticker="${h.ticker}" style="text-align: right; font-weight: 500"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">Valor Actual:</div>
                  <div class="market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" style="text-align: right; font-weight: 700; color: var(--color-primary)"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">P&amp;L $:</div>
                  <div class="pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}" style="text-align: right"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">P&amp;L %:</div>
                  <div class="pnl-pct-cell" data-ticker="${h.ticker}" data-avg-buy-price="${h.avgBuyPrice}" style="text-align: right"><span class="cell-skeleton"></span></div>
                </div>
              </div>
            `).join('')}
          </div>

        </div>`
    }
    return bodyHtml
  },

  _updatePriceCells(ticker, price) {
    const fmt  = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const dash = '<span style="color:var(--text-muted)">—</span>'
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'
    const sign     = v => v > 0 ? '+' : ''

    document.querySelectorAll(`.market-price-cell[data-ticker="${ticker}"]`).forEach(el => {
      el.innerHTML = price !== null ? fmt(price) : dash
    })

    document.querySelectorAll(`.market-value-cell[data-ticker="${ticker}"]`).forEach(el => {
      const quantity = parseFloat(el.dataset.quantity)
      const value    = price !== null ? quantity * price : null
      el.innerHTML   = value !== null ? `<strong>${fmt(value)}</strong>` : dash
    })

    document.querySelectorAll(`.pnl-amount-cell[data-ticker="${ticker}"]`).forEach(el => {
      if (price === null) { el.innerHTML = dash; return }
      const quantity    = parseFloat(el.dataset.quantity)
      const avgBuyPrice = parseFloat(el.dataset.avgBuyPrice)
      const pnl         = (price - avgBuyPrice) * quantity
      const color       = pnlColor(pnl)
      el.innerHTML      = `<strong style="color:${color}">${sign(pnl)}${fmt(pnl)}</strong>`
    })

    document.querySelectorAll(`.pnl-pct-cell[data-ticker="${ticker}"]`).forEach(el => {
      if (price === null) { el.innerHTML = dash; return }
      const avgBuyPrice = parseFloat(el.dataset.avgBuyPrice)
      if (avgBuyPrice === 0) { el.innerHTML = dash; return }
      const pct   = ((price / avgBuyPrice) - 1) * 100
      const color = pnlColor(pct)
      el.innerHTML = `<span style="color:${color};font-weight:600">${sign(pct)}${pct.toFixed(1)}%</span>`
    })

    this._refreshPnlCharts(ticker)
    this._updatePnlKpis()
    if (['marketPrice', 'marketValue', 'pnl', 'pnlPct'].includes(this._holdingsSortCol)) {
      this._sortAllHoldingsTables()
    }
  },

  _updatePnlKpis() {
    if (!this._holdingsSummary || !this._resolvedPrices) return

    const summary   = this._holdingsSummary
    const prices    = this._resolvedPrices
    const totalTickers = Object.keys(summary).length

    const fmt      = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const sign     = v => v > 0 ? '+' : ''
    const color    = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-main)'
    const dash     = '<span style="color:var(--text-muted)">—</span>'

    let pnlARS = 0, pnlUSD = 0
    let resolvedARS = 0, totalARS = 0
    let resolvedUSD = 0, totalUSD = 0

    for (const [ticker, h] of Object.entries(summary)) {
      if (h.currency === 'ARS') totalARS++
      else totalUSD++

      const price = prices[ticker]
      if (price === undefined) continue  // aún no llegó

      if (h.currency === 'ARS') {
        resolvedARS++
        if (price !== null) pnlARS += (price - h.avgBuyPrice) * h.totalQuantity
      } else {
        resolvedUSD++
        if (price !== null) pnlUSD += (price - h.avgBuyPrice) * h.totalQuantity
      }
    }

    const pending  = resolvedARS + resolvedUSD < totalTickers
    const subLabel = pending
      ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resolvedARS + resolvedUSD}/${totalTickers} tickers</span>`
      : ''

    const arsEl    = document.getElementById('kpi-pnl-ars-value')
    const arsSub   = document.getElementById('kpi-pnl-ars-sub')
    const usdEl    = document.getElementById('kpi-pnl-usd-value')
    const usdSub   = document.getElementById('kpi-pnl-usd-sub')

    // ── Actualización de KPIs por ALyC ──────────────────────
    document.querySelectorAll('.alyc-card').forEach(card => {
      const idx = parseInt(card.dataset.alycIndex)
      const alyc = this._currentAlycData?.[idx]
      if (!alyc) return

      for (const curr in alyc.currencies) {
        const items = alyc.currencies[curr]
        let currentVal = 0, investedVal = 0, resolved = 0
        
        for (const h of items) {
          investedVal += h.currentValue
          const price = prices[h.ticker]
          if (price !== undefined && price !== null) {
            currentVal += price * h.quantity
            resolved++
          }
        }

        const valEl = card.querySelector(`.alyc-current-value-kpi[data-currency="${curr}"]`)
        const pnlEl = card.querySelector(`.alyc-pnl-value-kpi[data-currency="${curr}"]`)
        const pctEl = card.querySelector(`.alyc-pnl-pct-kpi[data-currency="${curr}"]`)
        
        if (valEl && resolved > 0) {
          valEl.innerHTML = `<strong>${fmt(currentVal)}</strong>`
          const diff = currentVal - investedVal
          if (pnlEl) pnlEl.innerHTML = `<span style="color:${color(diff)}; font-weight:700">${sign(diff)}${fmt(diff)}</span>`
          if (pctEl && investedVal > 0) {
            const pct = (currentVal / investedVal - 1) * 100
            pctEl.innerHTML = `<span style="color:${color(pct)}; font-weight:600; font-size:0.85rem">${sign(pct)}${pct.toFixed(1)}%</span>`
          }
        }
      }
    })

    // ── Actualización de KPIs Globales (Opcionales) ─────────
    if (arsEl) {
      if (totalARS === 0) {
        arsEl.innerHTML = dash
      } else if (resolvedARS > 0) {
        arsEl.innerHTML = `<span style="color:${color(pnlARS)};font-weight:700">${sign(pnlARS)}${fmt(pnlARS)}</span>`
        if (arsSub) arsSub.innerHTML = pending ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resolvedARS}/${totalARS} tickers</span>` : ''
      }
    }

    if (usdEl) {
      if (totalUSD === 0) {
        usdEl.innerHTML = dash
      } else if (resolvedUSD > 0) {
        usdEl.innerHTML = `<span style="color:${color(pnlUSD)};font-weight:700">${sign(pnlUSD)}${fmt(pnlUSD)}</span>`
        if (usdSub) usdSub.innerHTML = pending ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resolvedUSD}/${totalUSD} tickers</span>` : ''
      }
    }
  },

  _refreshPnlCharts(ticker) {
    if (!this._pnlChartItems) return
    for (const [chartId, items] of Object.entries(this._pnlChartItems)) {
      if (!items.some(h => h.ticker === ticker)) continue
      const el = document.getElementById(chartId)
      if (el) this._renderPnlChartInto(el, items)
    }
  },

  _renderPnlChartInto(el, items) {
    const chartId = el.id
    
    const itemsWithPnl = items
      .map(h => {
        const price = this._resolvedPrices?.[h.ticker] ?? null
        return price !== null
          ? { ticker: h.ticker, pnl: (price - h.avgBuyPrice) * h.quantity }
          : null
      })
      .filter(Boolean)

    if (!itemsWithPnl.length) return

    itemsWithPnl.sort((a, b) => b.pnl - a.pnl)

    // Solo creamos el contenedor y canvas la primera vez
    if (!el.querySelector('canvas')) {
      el.innerHTML = `<div style="height:${itemsWithPnl.length * 32 + 20}px; position:relative"><canvas></canvas></div>`
    }
    
    const canvas = el.querySelector('canvas')
    this._charts[chartId] = ChartManager.renderBarChart(canvas, itemsWithPnl, {
      instance: this._charts[chartId],
      isCurrency: true,
      barThickness: 18,
      chartOptions: {
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.raw.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
            }
          }
        }
      }
    })
  },

  async _calculateHoldingsByAlyc() {
    // Llamada a la función RPC que hace todo el cálculo en el servidor
    const { data: holdings, error } = await supabase.rpc('get_user_holdings')

    if (error) throw error

    const alycMap      = {}
    const tickerSummary = {}
    let totalARS = 0
    let totalUSD = 0

    for (const h of holdings) {
      const alycId      = h.alyc_id
      const quantity    = parseFloat(h.total_quantity)
      const avgBuyPrice = parseFloat(h.avg_buy_price)
      const val         = quantity * avgBuyPrice

      if (!alycMap[alycId]) alycMap[alycId] = { name: h.alyc_name, holdings: {} }

      if (h.currency === 'ARS') totalARS += val
      else totalUSD += val

      alycMap[alycId].holdings[h.ticker] = {
        ticker: h.ticker, name: h.instrument_name, instrumentType: h.instrument_type_name,
        quantity, avgBuyPrice, currency: h.currency, currentValue: val
      }

      // Agregar al resumen global por ticker (puede haber el mismo ticker en varias ALyCs)
      if (!tickerSummary[h.ticker]) {
        tickerSummary[h.ticker] = { currency: h.currency, totalQuantity: 0, avgBuyPrice }
      }
      tickerSummary[h.ticker].totalQuantity += quantity
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
    const tickers = [...new Set(holdings.map(h => h.ticker))]
    return { alycs: result, totalARS, totalUSD, tickers, holdingsSummary: tickerSummary }
  },

  _renderHoldings(data) {
    const kpiContainer = document.getElementById('holdings-kpis')
    const contentContainer = document.getElementById('holdings-content')

    this._holdingsSummary = data.holdingsSummary

    const fmt    = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const hasUSD = Object.values(data.holdingsSummary).some(h => h.currency === 'USD')
    const skeleton = `<span class="cell-skeleton" style="width:80px;height:1.25rem;display:inline-block"></span>`

    // Render KPIs
    kpiContainer.innerHTML = `
      ${hasUSD ? `
      <div class="kpi-card">
        <div class="kpi-label">Total Estimado USD</div>
        <div class="kpi-value">${fmt(data.totalUSD)}</div>
      </div>
      <div class="kpi-card" id="kpi-pnl-usd">
        <div class="kpi-label">P&amp;L Total USD</div>
        <div class="kpi-value" id="kpi-pnl-usd-value">${skeleton}</div>
        <div class="kpi-sub" id="kpi-pnl-usd-sub"></div>
      </div>` : ''}
    `

    if (!data.alycs.length) {
      contentContainer.innerHTML = `
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas para analizar.</p>
        </div>`
      return
    }

    this._currentAlycData   = data.alycs
    this._pendingAlycs      = {}
    this._pnlChartItems     = {}
    this._holdingsSortCol   = ''
    this._holdingsSortAsc   = true

    let html = ''
    for (const [idx, alyc] of data.alycs.entries()) {
      const collapsed = idx > 0 ? ' collapsed' : ''
      const innerHtml = idx === 0 ? this._renderAlycBody(alyc, idx) : ''

      if (idx > 0) this._pendingAlycs[idx] = alyc

      html += `
        <div class="card alyc-card${collapsed}" data-alyc-index="${idx}">
          <div class="alyc-card-header">
            <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem">
              <span style="color:var(--color-primary)">🏦</span> ${alyc.name}
            </h3>
            <div class="alyc-header-right">
              <span class="alyc-chevron">▾</span>
            </div>
          </div>
          <div class="alyc-card-body">
            <div class="alyc-card-inner">${innerHtml}</div>
          </div>
        </div>`
    }

    contentContainer.innerHTML = html

    // Inicializar gráficos de la primera ALyC (que ya está expandida)
    this._initChartsForAlyc(0)

    // Bind sort en la primera ALyC (ya renderizada)
    this._bindHoldingsSortHeaders(contentContainer)

    contentContainer.querySelectorAll('.alyc-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card  = header.closest('.alyc-card')
        const inner = card.querySelector('.alyc-card-inner')
        const idx   = parseInt(card.dataset.alycIndex)

        if (inner.innerHTML === '' && this._pendingAlycs[idx]) {
          inner.innerHTML = this._renderAlycBody(this._pendingAlycs[idx], idx)
          delete this._pendingAlycs[idx]
          // Inicializar gráficos para esta ALyC
          this._initChartsForAlyc(idx)
          // bind sort en la nueva sección
          this._bindHoldingsSortHeaders(inner)
          // aplicar precios ya disponibles
          if (this._resolvedPrices) {
            for (const [ticker, price] of Object.entries(this._resolvedPrices)) {
              this._updatePriceCells(ticker, price)
            }
          }
          // aplicar sort activo si hay uno
          this._sortAllHoldingsTables()
        }

        card.classList.toggle('collapsed')
      })
    })
  },

  _bindHoldingsSortHeaders(container) {
    container.querySelectorAll('.holdings-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col
        if (this._holdingsSortCol === col) {
          this._holdingsSortAsc = !this._holdingsSortAsc
        } else {
          this._holdingsSortCol = col
          // columnas numéricas: desc por defecto; ticker: asc
          this._holdingsSortAsc = (col === 'ticker')
        }
        this._updateHoldingsSortHeaders()
        this._sortAllHoldingsTables()
      })
    })
    this._updateHoldingsSortHeaders()
  },

  _updateHoldingsSortHeaders() {
    document.querySelectorAll('.holdings-table th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === this._holdingsSortCol) {
        th.classList.add(this._holdingsSortAsc ? 'sort-asc' : 'sort-desc')
      }
    })
  },

  _sortAllHoldingsTables() {
    if (!this._holdingsSortCol) return
    document.querySelectorAll('.holdings-table tbody').forEach(tbody => {
      this._sortHoldingsTbody(tbody)
    })
  },

  _sortHoldingsTbody(tbody) {
    const col  = this._holdingsSortCol
    const asc  = this._holdingsSortAsc
    const rows = [...tbody.querySelectorAll('tr')]
    const nullEdge = asc ? Infinity : -Infinity

    rows.sort((a, b) => {
      if (col === 'ticker') {
        const cmp = (a.dataset.ticker || '').localeCompare(b.dataset.ticker || '')
        return asc ? cmp : -cmp
      }
      let va, vb
      if (col === 'quantity')     { va = parseFloat(a.dataset.quantity);    vb = parseFloat(b.dataset.quantity) }
      if (col === 'avgBuyPrice')  { va = parseFloat(a.dataset.avgBuyPrice); vb = parseFloat(b.dataset.avgBuyPrice) }
      if (col === 'value')        { va = parseFloat(a.dataset.value);       vb = parseFloat(b.dataset.value) }
      if (col === 'marketPrice' || col === 'marketValue') {
        const px = t => this._resolvedPrices?.[t.dataset.ticker] ?? nullEdge
        va = col === 'marketPrice' ? px(a) : px(a) * parseFloat(a.dataset.quantity)
        vb = col === 'marketPrice' ? px(b) : px(b) * parseFloat(b.dataset.quantity)
      }
      if (col === 'pnl') {
        const pnl = t => {
          const p = this._resolvedPrices?.[t.dataset.ticker]
          return p != null ? (p - parseFloat(t.dataset.avgBuyPrice)) * parseFloat(t.dataset.quantity) : nullEdge
        }
        va = pnl(a); vb = pnl(b)
      }
      if (col === 'pnlPct') {
        const pct = t => {
          const p   = this._resolvedPrices?.[t.dataset.ticker]
          const abp = parseFloat(t.dataset.avgBuyPrice)
          return p != null && abp ? (p / abp - 1) * 100 : nullEdge
        }
        va = pct(a); vb = pct(b)
      }
      return asc ? va - vb : vb - va
    })

    rows.forEach(row => tbody.appendChild(row))
  },

  _initChartsForAlyc(alycIdx) {
    const alyc = this._currentAlycData[alycIdx]
    if (!alyc) return

    for (const curr in alyc.currencies) {
      const items = alyc.currencies[curr]
      
      const pieCanvas = document.getElementById(`chart-pie-${alycIdx}-${curr}`)
      if (pieCanvas) {
        const chartKey = `pie-${alycIdx}-${curr}`
        this._charts[chartKey] = ChartManager.renderPieChart(pieCanvas, items, {
          instance: this._charts[chartKey]
        })
      }

      const typeCanvas = document.getElementById(`chart-type-${alycIdx}-${curr}`)
      if (typeCanvas) {
        // Agrupa el valor invertido por tipo de instrumento
        const byType = {}
        for (const h of items) {
          const type = h.instrumentType || 'Sin tipo'
          byType[type] = (byType[type] || 0) + h.currentValue
        }
        const typeItems = Object.entries(byType)
          .map(([ticker, currentValue]) => ({ ticker, currentValue }))
          .sort((a, b) => b.currentValue - a.currentValue)

        const chartKey = `type-${alycIdx}-${curr}`
        this._charts[chartKey] = ChartManager.renderPieChart(typeCanvas, typeItems, { 
          type: 'pie',
          instance: this._charts[chartKey] 
        })
      }

      // También inicializar el gráfico de P&L si ya hay precios
      const pnlEl = document.getElementById(`pnl-chart-${alycIdx}-${curr}`)
      if (pnlEl) {
        const pnlItems = this._pnlChartItems[`pnl-chart-${alycIdx}-${curr}`]
        if (pnlItems) this._renderPnlChartInto(pnlEl, pnlItems)
      }
    }
  }
}
