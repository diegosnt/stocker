import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'
import { renderIfChanged, clearRenderCache } from '../smart-render.js'
import { ChartManager } from '../chart-manager.js'
import { get as cacheGet, set as cacheSet } from '../cache.js'

const QUOTE_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 horas

export const DashboardPage = {
  _typeChart: null,
  _heatmapChart: null,
  _compChart: null,
  _resolvedPrices: {},
  _chartRendered: false,
  _chartsReady: false,

  cleanup() {
    this._heatmapChart = ChartManager.destroy(this._heatmapChart)
    this._typeChart = ChartManager.destroy(this._typeChart)
    this._compChart = ChartManager.destroy(this._compChart)
    this._chartRendered = false
    this._chartsReady = false
    
    if (this._marketInterval) {
      clearInterval(this._marketInterval)
      this._marketInterval = null
    }
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

      <div id="dash-content">
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
      </div>`

    renderIfChanged(content, skeletonHTML)

    try {
      const data = await this._loadHoldings()
      this._renderDashboard(data)
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

    const fmt     = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
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

    // ── Contenido Principal (Gráficos y Tabla) ───────────────
    mainEl.innerHTML = `
      <div id="dash-charts-wrapper" style="display:none">
        <div class="dash-charts-row">
          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:1rem">Composición de Cartera por Tipo</div>
            <div id="dash-type-chart" style="height: 300px; position: relative"></div>
          </div>

          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:0.75rem">Comparativa: Inversión vs Valor Actual ($)</div>
            <div id="dash-comparison-chart" style="height: 300px; position: relative"></div>
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
              <div class="dash-instrument-card" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}">
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
    
    requestAnimationFrame(() => {
      this._refreshHeatmap()
      this._refreshComparisonChart()
      this._renderPieChart(document.getElementById('dash-type-chart'), typeItems, totalInvested)
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

    const labels = Object.keys(grouped).sort()
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
    const fmt      = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
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
      el.innerHTML = `<span style="color:${pnlColor(pct)};font-weight:600">${sign(pct)}${pct.toFixed(2)}%</span>`
    })

    if (this._chartsReady) {
      this._refreshHeatmap()
      this._refreshComparisonChart()
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

    const fmt   = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
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

  _bindTableToggle() {
    const header  = document.getElementById('dash-table-header')
    const body    = document.getElementById('dash-table-body')
    const chevron = document.getElementById('dash-table-chevron')
    if (!header || !body) return
    header.addEventListener('click', () => {
      const collapsed = body.style.display === 'none'
      body.style.display    = collapsed ? '' : 'none'
      chevron.style.transform = collapsed ? '' : 'rotate(-90deg)'
    })
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
  }
}
