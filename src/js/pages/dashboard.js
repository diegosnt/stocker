import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'
import { renderIfChanged, clearRenderCache } from '../smart-render.js'
import { ChartManager, CHART_COLORS } from '../chart-manager.js'
import { get as cacheGet, set as cacheSet } from '../cache.js'
import { getConcentrationAlert, renderRiskAlerts, esc, bindCollapsibleSection, bindCardAccordion } from '../utils.js'
import { computeEquitySeries, groupOperationsByCurrency } from './dashboard/equity-curve.js'

const QUOTE_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 horas
const HISTORY_CACHE_TTL = 12 * 60 * 60 * 1000 // 12 horas

export const DashboardPage = {
  _typeChart: null,
  _heatmapChart: null,
  _compChart: null,
  _alycChart: null,
  _alycPerfChart: null,
  _assetChart: null,
  _alycHoldingChart: null,
  _equityCharts: {},
  _equityRange: '1mo',
  _resolvedPrices: {},
  _chartRendered: false,
  _chartsReady: false,
  _alycRows: null,

  cleanup() {
    this._heatmapChart = ChartManager.destroy(this._heatmapChart)
    this._typeChart = ChartManager.destroy(this._typeChart)
    this._compChart = ChartManager.destroy(this._compChart)
    this._alycChart = ChartManager.destroy(this._alycChart)
    this._alycPerfChart = ChartManager.destroy(this._alycPerfChart)
    this._assetChart = ChartManager.destroy(this._assetChart)
    this._alycHoldingChart = ChartManager.destroy(this._alycHoldingChart)
    Object.keys(this._equityCharts).forEach(curr => { this._equityCharts[curr] = ChartManager.destroy(this._equityCharts[curr]) })
    this._equityCharts = {}
    this._equityRange = '1mo'
    this._chartRendered = false
    this._chartsReady = false
    this._alycRows = null

    clearRenderCache(document.getElementById('page-content'))
  },

  async render() {
    this.cleanup()
    this._resolvedPrices = {} // Reset al entrar

    const content = document.getElementById('page-content')
    const skeletonHTML = `
      <div class="page-header">
        <h2>Dashboard</h2>
      </div>
      
      <div id="dash-kpis" class="kpi-grid">
        ${Array(4).fill(`
          <div class="kpi-card--modern">
            <div class="kpi-icon-circle skeleton"></div>
            <div class="kpi-content" style="flex:1">
              <div class="skeleton" style="height:10px; width:60%; margin-bottom:8px"></div>
              <div class="skeleton" style="height:20px; width:90%"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div id="dash-risk-alerts"></div>

      <div class="card" id="dash-equity-section">
        <div class="chart-panel-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem">
          <span>Evolución del Patrimonio</span>
          <div id="dash-equity-range" style="display:flex; gap:0.5rem; flex-wrap:wrap">
            <button class="btn-alyc dash-equity-range-btn" data-range="5d">1S</button>
            <button class="btn-alyc dash-equity-range-btn btn-primary" data-range="1mo">1M</button>
            <button class="btn-alyc dash-equity-range-btn" data-range="6mo">6M</button>
          </div>
        </div>
        <div id="dash-equity-charts">
          <div class="skeleton" style="height:280px"></div>
        </div>
      </div>

      <div id="dash-content">
        <div class="dash-charts-row">
          <div class="card skeleton" style="height: 360px"></div>
          <div class="card skeleton" style="height: 360px"></div>
        </div>
        <div class="dash-charts-row">
          <div class="card skeleton" style="height: 360px"></div>
          <div class="card skeleton" style="height: 360px"></div>
        </div>
        <div class="card">
          <div class="skeleton" style="height: 30px; width: 200px; margin-bottom: 1.5rem"></div>
          ${Array(5).fill(`
            <div class="skeleton" style="height: 40px; margin-bottom: 8px"></div>
          `).join('')}
        </div>
      </div>

      <div id="dash-alyc-section">
        <div class="dash-alyc-row">
          <div class="card skeleton" style="height: 280px"></div>
          <div class="card skeleton" style="height: 280px"></div>
        </div>
      </div>

      <div id="dash-realized-pnl-section"></div>`

    renderIfChanged(content, skeletonHTML)
    this._bindEquityRangeButtons()
    this._loadEquityCurve(this._equityRange) // no bloqueante: puede tardar varios segundos (historial por ticker)

    try {
      const [data, alycRows, realizedPnl] = await Promise.all([
        this._loadHoldings(),
        this._loadHoldingsByAlyc(),
        this._loadRealizedPnl()
      ])
      this._alycRows = alycRows
      this._renderDashboard(data)
      this._renderAlycSection(alycRows)
      this._renderRealizedPnlSection(realizedPnl)
      await this._updateMarketPrices(data.tickers)
    } catch (err) {
      console.error(err)
      // Forzar re-render en error (no usar cache)
      content.innerHTML = `
        <div class="page-header"><h2>Dashboard</h2></div>
        <div class="card">
          <p class="table-empty">Error al cargar el dashboard. Por favor, intentá de nuevo.</p>
        </div>`
    }
  },

  async _loadHoldings() {
    const { data: holdings, error } = await supabase.rpc('get_user_holdings_global')
    if (error) throw error

    let totalARS = 0, totalUSD = 0
    const items = []
    const summary = {}

    for (const h of holdings) {
      const quantity    = parseFloat(h.total_quantity)
      const avgBuyPrice = parseFloat(h.avg_buy_price)
      const invested    = quantity * avgBuyPrice

      if (h.currency === 'ARS') totalARS += invested
      else                      totalUSD += invested

      items.push({
        ticker: h.ticker, name: h.instrument_name,
        instrumentType: h.instrument_type_name,
        quantity, avgBuyPrice, currency: h.currency, invested
      })

      summary[h.ticker] = { currency: h.currency, quantity, avgBuyPrice }
    }

    items.sort((a, b) => b.invested - a.invested)
    const tickers = items.map(h => h.ticker)
    return { items, totalARS, totalUSD, tickers, summary }
  },

  async _loadRealizedPnl() {
    const { data, error } = await supabase.rpc('get_user_realized_pnl')
    if (error) {
      console.error('[Dashboard] get_user_realized_pnl no disponible:', error)
      return []
    }
    return data || []
  },

  _bindEquityRangeButtons() {
    document.querySelectorAll('.dash-equity-range-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.range === this._equityRange) return
        document.querySelectorAll('.dash-equity-range-btn').forEach(b => b.classList.remove('btn-primary'))
        btn.classList.add('btn-primary')
        this._equityRange = btn.dataset.range
        this._loadEquityCurve(this._equityRange)
      }
    })
  },

  async _fetchHistoryForRange(ticker, range) {
    const cacheKey = `history_${ticker}_${range}`
    const cached = cacheGet(cacheKey, { persistent: true })
    if (cached) return cached
    try {
      const data = await apiRequest('GET', `/api/history/${encodeURIComponent(ticker)}?range=${range}`)
      cacheSet(cacheKey, data, { persistent: true, ttlMs: HISTORY_CACHE_TTL })
      return data
    } catch {
      return []
    }
  },

  async _loadEquityCurve(range) {
    const container = document.getElementById('dash-equity-charts')
    if (!container) return
    container.innerHTML = `<div class="skeleton" style="height:280px"></div>`

    try {
      const { data: operations, error } = await supabase
        .from('operations_search')
        .select('type, quantity, price, currency, operated_at, instrument_ticker')
        .order('operated_at', { ascending: true })
      if (error) throw error

      if (!operations || operations.length === 0) {
        container.innerHTML = `<p class="table-empty">No tenés operaciones registradas.</p>`
        return
      }

      const byCurrency = groupOperationsByCurrency(operations)
      const seriesByCurrency = {}

      for (const currency of Object.keys(byCurrency)) {
        const ops = byCurrency[currency]
        const tickers = [...new Set(ops.map(o => o.instrument_ticker))]
        const histories = {}
        await Promise.all(tickers.map(async ticker => {
          histories[ticker] = await this._fetchHistoryForRange(ticker, range)
        }))
        seriesByCurrency[currency] = computeEquitySeries(ops, histories)
      }

      this._renderEquityCurve(seriesByCurrency)
    } catch (err) {
      console.error('[Dashboard] Error al cargar evolución del patrimonio:', err)
      container.innerHTML = `<p class="table-empty">Error al cargar la evolución del patrimonio.</p>`
    }
  },

  _renderEquityCurve(seriesByCurrency) {
    const container = document.getElementById('dash-equity-charts')
    if (!container) return

    const currencies = Object.keys(seriesByCurrency).filter(c => seriesByCurrency[c].dates.length > 0)
    if (currencies.length === 0) {
      container.innerHTML = `<p class="table-empty">No hay suficientes datos de precios para reconstruir la evolución en este rango.</p>`
      return
    }

    container.innerHTML = `
      <div class="${currencies.length > 1 ? 'dash-alyc-row' : ''}">
        ${currencies.map(curr => `
          <div class="card" style="margin-bottom:0">
            <div style="height:260px; position:relative">
              <canvas id="dash-equity-canvas-${curr}" style="width:100%;height:100%"></canvas>
            </div>
          </div>
        `).join('')}
      </div>`

    requestAnimationFrame(() => {
      currencies.forEach(curr => {
        const { dates, portfolioValue } = seriesByCurrency[curr]
        const canvas = document.getElementById(`dash-equity-canvas-${curr}`)
        if (!canvas) return

        this._equityCharts[curr] = ChartManager.destroy(this._equityCharts[curr])
        this._equityCharts[curr] = ChartManager.renderEquityCurveChart(canvas, dates, [
          { label: `Valor de Cartera (${curr})`, data: portfolioValue, color: '#10b981', fill: true }
        ])
      })
    })
  },

  async _updateMarketPrices(tickers) {
    if (!tickers || tickers.length === 0) return

    const missingTickers = []
    
    // 1. Intentar recuperar de cache primero
    for (const ticker of tickers) {
      const cached = cacheGet(`quote_${ticker}`, { persistent: true })
      if (cached !== null) {
        this._resolvedPrices[ticker] = cached
        this._updatePriceCells(ticker, cached)
      } else {
        missingTickers.push(ticker)
      }
    }

    // 2. Si todo está en cache, no pedimos nada
    if (missingTickers.length === 0) {
      console.log('[Dashboard] Todos los precios recuperados de cache (2h)')
      return
    }

    try {
      // 3. Un solo request masivo para los faltantes
      console.log(`[Dashboard] Solicitando precios faltantes: ${missingTickers.join(', ')}`)
      const data = await apiRequest('GET', `/api/quotes?tickers=${encodeURIComponent(missingTickers.join(','))}`)
      
      for (const ticker of missingTickers) {
        const price = data[ticker]?.price ?? null
        this._resolvedPrices[ticker] = price
        
        // Guardar en cache por 2 horas
        if (price !== null) {
          cacheSet(`quote_${ticker}`, price, { persistent: true, ttlMs: QUOTE_CACHE_TTL })
        }
        
        this._updatePriceCells(ticker, price)
      }
    } catch (err) {
      console.error('Error al actualizar precios masivos:', err)
      // Fallback: marcar como nulo para quitar skeletons si falla
      missingTickers.forEach(t => {
        this._resolvedPrices[t] = null
        this._updatePriceCells(t, null)
      })
    }
  },

  _renderDashboard(data) {
    const kpiEl   = document.getElementById('dash-kpis')
    const mainEl  = document.getElementById('dash-content')
    this._summary = data.summary
    this._sortCol = ''
    this._sortAsc = true

    const fmt     = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const hasUSD  = data.items.some(h => h.currency === 'USD')
    const skeleton = `<span class="cell-skeleton" style="width:80px;height:1.25rem;display:inline-block"></span>`

    const totalInvested = data.totalARS + data.totalUSD

    // ── KPIs ──────────────────────────────────────────────────
    kpiEl.innerHTML = `
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(16, 185, 129, 0.1); color: #10b981">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Total Invertido ARS</div>
          <div class="kpi-value">${fmt(data.totalARS)}</div>
        </div>
      </div>
      
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">P&amp;L Total ARS</div>
          <div class="kpi-value" id="dash-pnl-ars">${skeleton}</div>
          <div class="kpi-sub"  id="dash-pnl-ars-sub"></div>
        </div>
      </div>

      ${hasUSD ? `
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Total Invertido USD</div>
          <div class="kpi-value">${fmt(data.totalUSD)}</div>
        </div>
      </div>

      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">P&amp;L Total USD</div>
          <div class="kpi-value" id="dash-pnl-usd">${skeleton}</div>
          <div class="kpi-sub"  id="dash-pnl-usd-sub"></div>
        </div>
      </div>` : ''}
    `

    if (!data.items.length) {
      document.getElementById('dash-risk-alerts').innerHTML = ''
      mainEl.innerHTML = `
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas.</p>
        </div>`
      return
    }

    const byType = {}
    data.items.forEach(h => {
      const type = h.instrumentType || 'Otros'
      byType[type] = (byType[type] || 0) + h.invested
    })
    const typeItems = Object.entries(byType)
      .map(([ticker, currentValue]) => ({ ticker, currentValue }))
      .sort((a, b) => b.currentValue - a.currentValue)

    const riskAlerts = [
      getConcentrationAlert(
        data.items.map(h => ({ label: h.ticker, weight: (h.invested / totalInvested) * 100 })),
        { subject: 'tu cartera', thresholdWarning: 25, thresholdDanger: 40 }
      )
    ].filter(Boolean)
    document.getElementById('dash-risk-alerts').innerHTML = riskAlerts.length
      ? `<div class="risk-alerts">${renderRiskAlerts(riskAlerts)}</div>`
      : ''

    // ── Contenido Principal (Gráficos y Tabla) ───────────────
    mainEl.innerHTML = `
      <div id="dash-charts-wrapper" style="display:none">
        <div class="card dash-chart-card" style="width:100%">
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Comparativa: Inversión vs Valor Actual ($)</div>
          <div id="dash-comparison-chart" style="height: 300px; position: relative"></div>
        </div>

        <div class="dash-charts-row">
          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:1rem">Tenencia por Activo (Mayor a Menor)</div>
            <div id="dash-asset-chart" style="height: 300px; position: relative"></div>
          </div>

          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:1rem">Tenencia por ALyC (Mayor a Menor)</div>
            <div id="dash-alyc-holding-chart" style="height: 300px; position: relative"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 1.5rem">
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Mapa de Calor (Peso vs P&L %)</div>
          <div id="dash-heatmap" style="height: 240px; position: relative"></div>
        </div>
      </div>

      <div class="card" style="margin-top: 1.5rem">
        <div class="alyc-card-header" id="dash-table-header" style="cursor:pointer;margin-bottom:0">
          <h3 style="margin:0;font-size:1rem">Detalle de Instrumentos</h3>
          <span class="alyc-chevron" id="dash-table-chevron">▾</span>
        </div>
        <div id="dash-table-body" style="margin-top:1rem">
          <!-- Desktop table -->
          <div class="table-wrapper desktop-only">
            <table class="holdings-table" id="dash-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="ticker">Ticker</th>
                  <th style="text-align:right">Tipo</th>
                  <th class="sortable" data-col="quantity"    style="text-align:right">Cantidad</th>
                  <th class="sortable" data-col="avgBuyPrice" style="text-align:right">Promedio Compra</th>
                  <th class="sortable" data-col="invested"    style="text-align:right">Valor Invertido</th>
                  <th class="sortable" data-col="marketPrice" style="text-align:right">Precio Actual</th>
                  <th class="sortable" data-col="marketValue" style="text-align:right">Valor Actual</th>
                  <th class="sortable" data-col="pnl"         style="text-align:right">P&amp;L $</th>
                  <th class="sortable" data-col="pnlPct"      style="text-align:right">P&amp;L %</th>
                  <th style="text-align:right; width: 150px">Peso</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(h => {
                  const weight = (h.invested / totalInvested) * 100
                  return `
                  <tr data-ticker="${h.ticker}" data-quantity="${h.quantity}"
                      data-avg-buy-price="${h.avgBuyPrice}" data-invested="${h.invested}">
                    <td><span class="ticker-chip" title="${h.name}">${h.ticker}</span></td>
                    <td style="font-size:0.8rem;color:var(--text-muted)">${h.instrumentType}</td>
                    <td class="amount">${h.quantity.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                    <td class="amount">${fmt(h.avgBuyPrice)}</td>
                    <td class="amount"><strong>${fmt(h.invested)}</strong></td>
                    <td class="amount market-price-cell" data-ticker="${h.ticker}"><span class="cell-skeleton"></span></td>
                    <td class="amount market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-amount-cell"   data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-pct-cell"      data-ticker="${h.ticker}" data-avg-buy-price="${h.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount">
                      <div class="weight-bar-container">
                        <div class="weight-bar" style="width: ${weight}%"></div>
                        <span class="weight-label">${weight.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>`}).join('')}
              </tbody>
            </table>
          </div>
          <!-- Mobile cards -->
          <div class="mobile-only dash-instruments-cards">
            ${data.items.map(h => {
              const weight = (h.invested / totalInvested) * 100
              const qtyStr = h.quantity.toLocaleString('es-AR')
              return `
              <div class="dash-instrument-card collapsed" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}">
                <div class="dash-instrument-card-header">
                  <span class="ticker-chip" title="${h.name}">${h.ticker}</span>
                  <span class="dash-instrument-meta">
                    <span class="meta-qty">${qtyStr}</span>
                    <span class="meta-weight">${weight.toFixed(1)}%</span>
                    <span class="meta-type">${h.instrumentType}</span>
                  </span>
                </div>
                <div class="dash-instrument-card-body">
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Precio compra</span>
                    <span class="dash-instrument-value">${fmt(h.avgBuyPrice)}</span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Precio actual</span>
                    <span class="dash-instrument-value market-price-cell" data-ticker="${h.ticker}"><span class="cell-skeleton"></span></span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Invertido</span>
                    <span class="dash-instrument-value"><strong>${fmt(h.invested)}</strong></span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Valor actual</span>
                    <span class="dash-instrument-value market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}"><span class="cell-skeleton"></span></span>
                  </div>
                  <div class="dash-instrument-row dash-instrument-pnl-row">
                    <span class="dash-instrument-label">P&amp;L <span class="pnl-pct-cell" data-ticker="${h.ticker}" data-avg-buy-price="${h.avgBuyPrice}" style="font-weight:400;font-size:0.6rem"></span></span>
                    <span class="dash-instrument-value pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}"><span class="cell-skeleton"></span></span>
                  </div>
                </div>
              </div>`
            }).join('')}
          </div>
        </div><!-- dash-table-body -->
      </div>`

    this._bindSortHeaders()
    this._bindTableToggle()
    this._bindMobileAccordion()
    
    requestAnimationFrame(() => {
      this._refreshHeatmap()
      this._refreshComparisonChart()
      this._refreshAssetChart()
      this._refreshAlycHoldingChart()
      this._chartsReady = true
      const wrapper = document.getElementById('dash-charts-wrapper')
      if (wrapper) wrapper.style.display = ''
    })
  },

  _refreshComparisonChart() {
    const el = document.getElementById('dash-comparison-chart')
    if (!el || !this._summary) return

    const grouped = {}
    Object.entries(this._summary).forEach(([ticker, h]) => {
      const price = this._resolvedPrices?.[ticker] ?? h.avgBuyPrice
      const invested = h.quantity * h.avgBuyPrice
      const current = h.quantity * price
      const label = `${ticker} (${h.currency})`
      
      if (!grouped[label]) {
        grouped[label] = { invested: 0, current: 0 }
      }
      grouped[label].invested += invested
      grouped[label].current += current
    })

    const labels = Object.keys(grouped).sort((a, b) => grouped[b].current - grouped[a].current)
    const investedData = labels.map(l => grouped[l].invested)
    const currentData = labels.map(l => grouped[l].current)

    if (!labels.length) return

    if (!el.querySelector('canvas')) {
      el.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = el.querySelector('canvas')

    this._compChart = ChartManager.renderComparisonChart(canvas, labels, investedData, currentData, {
      instance: this._compChart
    })
  },

  _refreshAssetChart() {
    const el = document.getElementById('dash-asset-chart')
    if (!el || !this._summary) return

    const items = Object.entries(this._summary).map(([ticker, h]) => {
      const price = this._resolvedPrices?.[ticker] ?? h.avgBuyPrice
      const value = h.quantity * price
      return {
        ticker,
        label: `${ticker} (${h.currency})`,
        value
      }
    }).filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)

    if (!items.length) return

    if (!el.querySelector('canvas')) {
      el.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = el.querySelector('canvas')

    const total = items.reduce((sum, item) => sum + item.value, 0)

    this._assetChart = ChartManager.renderVerticalBarChart(canvas, items, {
      instance: this._assetChart,
      total,
      isPercentage: false
    })
  },

  _refreshAlycHoldingChart() {
    const el = document.getElementById('dash-alyc-holding-chart')
    if (!el || !this._alycRows) return

    const alycTotals = {}
    for (const row of this._alycRows) {
      const qty = parseFloat(row.total_quantity) || 0
      if (qty <= 0) continue

      const ticker = row.ticker
      const price = this._resolvedPrices?.[ticker] ?? null
      
      let currentValue = 0
      if (price !== null) {
        currentValue = qty * price
      } else {
        currentValue = parseFloat(row.invested) || 0
      }

      alycTotals[row.alyc_name] = (alycTotals[row.alyc_name] || 0) + currentValue
    }

    const items = Object.entries(alycTotals).map(([alycName, value]) => ({
      label: alycName,
      value
    })).filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)

    if (!items.length) return

    if (!el.querySelector('canvas')) {
      el.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = el.querySelector('canvas')

    const total = items.reduce((sum, item) => sum + item.value, 0)

    this._alycHoldingChart = ChartManager.renderVerticalBarChart(canvas, items, {
      instance: this._alycHoldingChart,
      total,
      isPercentage: false
    })
  },

  _renderPieChart(container, items, total) {
    if (!container || !items || items.length === 0) return
    
    if (!container.querySelector('canvas')) {
      container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = container.querySelector('canvas')
    
    this._typeChart = ChartManager.renderPieChart(canvas, items, {
      instance: this._typeChart
    })
  },

  _updatePriceCells(ticker, price) {
    const fmt      = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const dash     = '<span style="color:var(--text-muted)">—</span>'
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'
    const sign     = v => v > 0 ? '+' : ''

    document.querySelectorAll(`.market-price-cell[data-ticker="${ticker}"]`).forEach(el => {
      el.innerHTML = price !== null ? fmt(price) : dash
    })

    document.querySelectorAll(`.market-value-cell[data-ticker="${ticker}"]`).forEach(el => {
      const qty = parseFloat(el.dataset.quantity)
      el.innerHTML = price !== null ? `<strong>${fmt(qty * price)}</strong>` : dash
    })

    document.querySelectorAll(`.pnl-amount-cell[data-ticker="${ticker}"]`).forEach(el => {
      if (price === null) { el.innerHTML = dash; return }
      const qty = parseFloat(el.dataset.quantity)
      const abp = parseFloat(el.dataset.avgBuyPrice)
      const pnl = (price - abp) * qty
      el.innerHTML = `<strong style="color:${pnlColor(pnl)}">${sign(pnl)}${fmt(pnl)}</strong>`
    })

    document.querySelectorAll(`.pnl-pct-cell[data-ticker="${ticker}"]`).forEach(el => {
      if (price === null) { el.innerHTML = dash; return }
      const abp = parseFloat(el.dataset.avgBuyPrice)
      if (!abp) { el.innerHTML = dash; return }
      const pct = (price / abp - 1) * 100
      el.innerHTML = `<span style="color:${pnlColor(pct)};font-weight:600">${sign(pct)}${pct.toFixed(1)}%</span>`
    })

    if (this._chartsReady) {
      this._refreshHeatmap()
      this._refreshComparisonChart()
      this._refreshAssetChart()
      this._refreshAlycHoldingChart()
      this._refreshAlycPerformance()
    }
    this._updatePnlKpis()
    if (['marketPrice', 'marketValue', 'pnl', 'pnlPct'].includes(this._sortCol)) {
      this._sortTable()
    }
  },

  _updatePnlKpis() {
    if (!this._summary || !this._resolvedPrices) return
    const prices = this._resolvedPrices
    const entries = Object.entries(this._summary)
    const total = entries.length

    let pnlARS = 0, pnlUSD = 0, resARS = 0, resUSD = 0, totARS = 0, totUSD = 0

    for (const [ticker, h] of entries) {
      if (h.currency === 'ARS') totARS++; else totUSD++
      const price = prices[ticker]
      if (price === undefined) continue
      if (h.currency === 'ARS') { resARS++; if (price !== null) pnlARS += (price - h.avgBuyPrice) * h.quantity }
      else                      { resUSD++; if (price !== null) pnlUSD += (price - h.avgBuyPrice) * h.quantity }
    }

    const fmt   = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const sign  = v => v > 0 ? '+' : ''
    const color = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-main)'
    const pending = resARS + resUSD < total

    const arsEl = document.getElementById('dash-pnl-ars')
    const usdEl = document.getElementById('dash-pnl-usd')
    if (!arsEl) return

    if (totARS > 0 && resARS > 0) {
      arsEl.innerHTML = `<span style="color:${color(pnlARS)};font-weight:700">${sign(pnlARS)}${fmt(pnlARS)}</span>`
      const sub = document.getElementById('dash-pnl-ars-sub')
      if (sub) sub.innerHTML = pending ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resARS}/${totARS} tickers</span>` : ''
    }
    if (usdEl && totUSD > 0 && resUSD > 0) {
      usdEl.innerHTML = `<span style="color:${color(pnlUSD)};font-weight:700">${sign(pnlUSD)}${fmt(pnlUSD)}</span>`
      const sub = document.getElementById('dash-pnl-usd-sub')
      if (sub) sub.innerHTML = pending ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resUSD}/${totUSD} tickers</span>` : ''
    }
  },

  _refreshHeatmap() {
    const el = document.getElementById('dash-heatmap')
    if (!el || !this._summary) return

    const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const getColor = (p) => {
      if (p > 0) return p > 10 ? '#065f46' : '#10b981'
      if (p < 0) return p < -10 ? '#991b1b' : '#ef4444'
      return '#64748b'
    }

    const data = Object.entries(this._summary).map(([ticker, h]) => {
      const price = this._resolvedPrices?.[ticker] ?? null
      const invested = h.quantity * h.avgBuyPrice
      const pct = price !== null && h.avgBuyPrice > 0 ? (price / h.avgBuyPrice - 1) * 100 : 0
      return { ticker, value: invested, pct, color: getColor(pct) }
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

    if (!data.length) return

    if (!el.querySelector('canvas')) {
      el.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = el.querySelector('canvas')

    this._heatmapChart = ChartManager.renderTreemapChart(canvas, data, {
      instance: this._heatmapChart,
      formatter: (ctx) => {
        const d = ctx.raw?._data || ctx.raw
        if (!d || !d.ticker) return []
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
  },

  async _loadHoldingsByAlyc() {
    const { data, error } = await supabase.rpc('get_user_holdings_by_alyc')
    if (error) throw error
    return data || []
  },

  _buildAlycData(rows) {
    const alycSet = new Set()
    const tickerMap = {}

    for (const row of rows) {
      alycSet.add(row.alyc_name)
      if (!tickerMap[row.ticker]) {
        tickerMap[row.ticker] = { total: 0, byAlyc: {} }
      }
      const invested = parseFloat(row.invested) || 0
      tickerMap[row.ticker].total += invested
      // Si ya hay una entrada para este (ticker, alyc) en otra moneda, sumamos
      if (!tickerMap[row.ticker].byAlyc[row.alyc_name]) {
        tickerMap[row.ticker].byAlyc[row.alyc_name] = { quantity: 0, currency: row.currency, invested: 0 }
      }
      tickerMap[row.ticker].byAlyc[row.alyc_name].quantity += parseFloat(row.total_quantity)
      tickerMap[row.ticker].byAlyc[row.alyc_name].invested += invested
    }

    const alycNames = [...alycSet].sort()
    const tickers = Object.keys(tickerMap).sort((a, b) => tickerMap[b].total - tickerMap[a].total)

    return { alycNames, tickers, tickerMap }
  },

  _renderAlycSection(rows) {
    const el = document.getElementById('dash-alyc-section')
    if (!el) return

    if (!rows || rows.length === 0) {
      el.innerHTML = ''
      return
    }

    const { alycNames, tickers, tickerMap } = this._buildAlycData(rows)
    const fmtQty = v => v.toLocaleString('es-AR', { maximumFractionDigits: 4 })

    const datasets = alycNames.map((alyc, i) => ({
      label: alyc,
      data: tickers.map(t => tickerMap[t].byAlyc[alyc]?.invested || 0),
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
      borderRadius: 4,
      barThickness: 26
    }))

    const chartHeight = Math.max(220, tickers.length * 46 + 60)

    const matrixRows = tickers.map(ticker => {
      const cells = alycNames.map(alyc => {
        const entry = tickerMap[ticker].byAlyc[alyc]
        if (!entry) return `<td class="amount" style="color:var(--text-muted)">—</td>`
        return `<td class="amount">${fmtQty(entry.quantity)} <span style="font-size:0.7rem;color:var(--text-muted)">${entry.currency}</span></td>`
      }).join('')
      return `<tr><td><span class="ticker-chip">${ticker}</span></td>${cells}</tr>`
    }).join('')

    const alycCurrencyCount = new Set(rows.map(r => `${r.alyc_name}|${r.currency}`)).size
    const perfChartHeight = Math.max(160, alycCurrencyCount * 44 + 60)

    el.innerHTML = `
      <div class="dash-alyc-row">
        <div class="card" style="min-height:${chartHeight}px">
          <div class="chart-panel-title" style="margin-bottom:1rem">Distribución por ALyC</div>
          <div style="height:${chartHeight}px; position:relative">
            <canvas id="dash-alyc-dist-canvas" style="width:100%;height:100%"></canvas>
          </div>
        </div>

        <div class="card" style="overflow:hidden">
          <div class="chart-panel-title" style="margin-bottom:1rem">Posiciones por ALyC</div>
          <div style="overflow-x:auto; overflow-y:auto; max-height:${chartHeight}px">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th>Instrumento</th>
                  ${alycNames.map(a => `<th style="text-align:right">${a}</th>`).join('')}
                </tr>
              </thead>
              <tbody>${matrixRows}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 1rem; display:flex; flex-direction:column; gap:1rem">
        <div class="chart-panel-title" style="margin-bottom:0">Rendimiento por ALyC</div>
        <div style="height:${perfChartHeight}px; position:relative">
          <canvas id="dash-alyc-perf-canvas" style="width:100%;height:100%"></canvas>
        </div>
        <div style="overflow-x:auto">
          <table class="holdings-table">
            <thead>
              <tr>
                <th>ALyC</th>
                <th style="text-align:right">Invertido</th>
                <th style="text-align:right">Valor Actual</th>
                <th style="text-align:right">P&amp;L $</th>
                <th style="text-align:right">P&amp;L %</th>
              </tr>
            </thead>
            <tbody id="dash-alyc-perf-tbody"></tbody>
          </table>
        </div>
      </div>`

    requestAnimationFrame(() => {
      const canvas = document.getElementById('dash-alyc-dist-canvas')
      if (!canvas) return
      this._alycChart = ChartManager.renderStackedBarChart(
        canvas,
        tickers,
        datasets,
        { instance: this._alycChart }
      )
      this._refreshAlycPerformance()
    })
  },

  _computeAlycPerformance(rows) {
    const groups = {}
    for (const row of rows) {
      const key = `${row.alyc_name}|${row.currency}`
      if (!groups[key]) groups[key] = { alyc: row.alyc_name, currency: row.currency, invested: 0, market: 0 }
      const qty      = parseFloat(row.total_quantity) || 0
      const avgPrice = parseFloat(row.avg_buy_price) || 0
      const price    = this._resolvedPrices?.[row.ticker] ?? avgPrice
      groups[key].invested += qty * avgPrice
      groups[key].market   += qty * price
    }
    return Object.values(groups)
      .map(g => ({ ...g, pnl: g.market - g.invested, pnlPct: g.invested > 0 ? (g.market / g.invested - 1) * 100 : 0 }))
      .sort((a, b) => b.invested - a.invested)
  },

  _refreshAlycPerformance() {
    if (!this._alycRows) return
    const canvas = document.getElementById('dash-alyc-perf-canvas')
    const tbody  = document.getElementById('dash-alyc-perf-tbody')
    if (!canvas || !tbody) return

    const perf   = this._computeAlycPerformance(this._alycRows)
    const fmt    = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const sign   = v => v > 0 ? '+' : ''
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'

    const items = perf.map(p => ({
      label: `${p.alyc} (${p.currency})`,
      value: p.pnlPct
    }))
    this._alycPerfChart = ChartManager.renderBarChart(canvas, items, {
      instance: this._alycPerfChart,
      tooltipFormatter: v => ` P&L: ${sign(v)}${v.toFixed(1)}%`
    })

    tbody.innerHTML = perf.map(p => `
      <tr>
        <td><strong>${esc(p.alyc)}</strong> <span style="font-size:0.7rem;color:var(--text-muted)">${p.currency}</span></td>
        <td class="amount">${fmt(p.invested)}</td>
        <td class="amount">${fmt(p.market)}</td>
        <td class="amount" style="color:${pnlColor(p.pnl)}">${sign(p.pnl)}${fmt(p.pnl)}</td>
        <td class="amount" style="color:${pnlColor(p.pnlPct)}">${sign(p.pnlPct)}${p.pnlPct.toFixed(1)}%</td>
      </tr>`).join('')
  },

  _renderRealizedPnlSection(rows) {
    const el = document.getElementById('dash-realized-pnl-section')
    if (!el) return

    if (!rows || rows.length === 0) {
      el.innerHTML = ''
      return
    }

    const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'
    const sign = v => v > 0 ? '+' : ''

    const items = rows.map(r => ({
      ticker: r.ticker,
      name: r.instrument_name,
      currency: r.currency,
      soldQty: parseFloat(r.total_sold_qty),
      sellCount: Number(r.sell_count),
      pnl: parseFloat(r.realized_pnl)
    })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

    const totalsByCurrency = {}
    items.forEach(it => { totalsByCurrency[it.currency] = (totalsByCurrency[it.currency] || 0) + it.pnl })

    const desktopRows = items.map(it => `
      <tr>
        <td><span class="ticker-chip" title="${it.name}">${it.ticker}</span></td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${it.currency}</td>
        <td class="amount">${it.soldQty.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
        <td class="amount">${it.sellCount}</td>
        <td class="amount" style="color:${pnlColor(it.pnl)};font-weight:bold">${sign(it.pnl)}${fmt(it.pnl)}</td>
      </tr>`).join('')

    const totalRows = Object.entries(totalsByCurrency).map(([curr, total]) => `
      <tr style="background-color: var(--bg-main); font-weight: 800">
        <td colspan="4">TOTAL ${curr}</td>
        <td class="amount" style="color:${pnlColor(total)}">${sign(total)}${fmt(total)}</td>
      </tr>`).join('')

    const mobileCards = items.map(it => `
      <div class="dash-instrument-card collapsed">
        <div class="dash-instrument-card-header">
          <span class="ticker-chip" title="${it.name}">${it.ticker}</span>
          <span class="dash-instrument-meta">
            <span class="meta-qty">${it.soldQty.toLocaleString('es-AR')}</span>
            <span class="meta-type">${it.currency}</span>
          </span>
        </div>
        <div class="dash-instrument-card-body">
          <div class="dash-instrument-row">
            <span class="dash-instrument-label">Ventas</span>
            <span class="dash-instrument-value">${it.sellCount}</span>
          </div>
          <div class="dash-instrument-row">
            <span class="dash-instrument-label">P&amp;L Realizado</span>
            <span class="dash-instrument-value" style="color:${pnlColor(it.pnl)};font-weight:bold">${sign(it.pnl)}${fmt(it.pnl)}</span>
          </div>
        </div>
      </div>`).join('')

    el.innerHTML = `
      <div class="card" style="margin-top: 1.5rem">
        <div class="alyc-card-header" id="dash-realized-pnl-header" style="cursor:pointer;margin-bottom:0">
          <h3 style="margin:0;font-size:1rem">Ganancias Realizadas</h3>
          <span class="alyc-chevron" id="dash-realized-pnl-chevron">▾</span>
        </div>
        <div id="dash-realized-pnl-body" style="margin-top:1rem">
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
            P&amp;L de ventas ya concretadas, con costo promedio ponderado (no incluye tenencia actual).
          </p>
          <div class="table-wrapper desktop-only">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Moneda</th>
                  <th style="text-align:right">Cant. Vendida</th>
                  <th style="text-align:right">Ventas</th>
                  <th style="text-align:right">P&amp;L Realizado</th>
                </tr>
              </thead>
              <tbody>${desktopRows}</tbody>
              <tfoot>${totalRows}</tfoot>
            </table>
          </div>
          <div class="mobile-only dash-instruments-cards">${mobileCards}</div>
        </div>
      </div>`

    bindCollapsibleSection({ headerId: 'dash-realized-pnl-header', bodyId: 'dash-realized-pnl-body', chevronId: 'dash-realized-pnl-chevron' })
    bindCardAccordion(el)
  },

  _bindTableToggle() {
    bindCollapsibleSection({ headerId: 'dash-table-header', bodyId: 'dash-table-body', chevronId: 'dash-table-chevron' })
  },

  _bindSortHeaders() {
    document.querySelectorAll('#dash-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col
        if (this._sortCol === col) this._sortAsc = !this._sortAsc
        else { this._sortCol = col; this._sortAsc = col === 'ticker' }
        this._updateSortHeaders()
        this._sortTable()
      })
    })
  },

  _updateSortHeaders() {
    document.querySelectorAll('#dash-table th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === this._sortCol)
        th.classList.add(this._sortAsc ? 'sort-asc' : 'sort-desc')
    })
  },

  _sortTable() {
    const tbody = document.querySelector('#dash-table tbody')
    if (!tbody || !this._sortCol) return
    const col  = this._sortCol
    const asc  = this._sortAsc
    const rows = [...tbody.querySelectorAll('tr')]
    const edge = asc ? Infinity : -Infinity

    rows.sort((a, b) => {
      if (col === 'ticker') {
        const cmp = (a.dataset.ticker || '').localeCompare(b.dataset.ticker || '')
        return asc ? cmp : -cmp
      }
      let va, vb
      if (col === 'quantity')    { va = parseFloat(a.dataset.quantity);    vb = parseFloat(b.dataset.quantity) }
      if (col === 'avgBuyPrice') { va = parseFloat(a.dataset.avgBuyPrice); vb = parseFloat(b.dataset.avgBuyPrice) }
      if (col === 'invested')    { va = parseFloat(a.dataset.invested);    vb = parseFloat(b.dataset.invested) }
      if (col === 'marketPrice' || col === 'marketValue') {
        const px = t => this._resolvedPrices?.[t.dataset.ticker] ?? edge
        va = col === 'marketPrice' ? px(a) : px(a) * parseFloat(a.dataset.quantity)
        vb = col === 'marketPrice' ? px(b) : px(b) * parseFloat(b.dataset.quantity)
      }
      if (col === 'pnl') {
        const pnl = t => {
          const p = this._resolvedPrices?.[t.dataset.ticker]
          return p != null ? (p - parseFloat(t.dataset.avgBuyPrice)) * parseFloat(t.dataset.quantity) : edge
        }
        va = pnl(a); vb = pnl(b)
      }
      if (col === 'pnlPct') {
        const pct = t => {
          const p   = this._resolvedPrices?.[t.dataset.ticker]
          const abp = parseFloat(t.dataset.avgBuyPrice)
          return p != null && abp ? (p / abp - 1) * 100 : edge
        }
        va = pct(a); vb = pct(b)
      }
      return asc ? va - vb : vb - va
    })

    rows.forEach(row => tbody.appendChild(row))
  },

  _bindMobileAccordion() {
    bindCardAccordion()
  }
}
