import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { apiRequest } from '../api-client.js'

export const HoldingsAnalysisPage = {
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
        <h2>Análisis de Tenencia</h2>
        ${badgeEnabled ? `<span id="market-status-badge" class="market-badge ${open ? 'market-open' : 'market-closed'}">${open ? '● Mercado abierto' : '● Mercado cerrado'}</span>` : ''}
      </div>
      
      <div id="holdings-kpis" class="kpi-grid">
        <div class="kpi-card loading-skeleton"></div>
        <div class="kpi-card loading-skeleton"></div>
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
      this._updateMarketPrices(data.tickers) // sin await — actualiza celdas al llegar
      if (badgeEnabled) this._marketInterval = setInterval(() => this._updateMarketBadge(), 60_000)
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

  _updateMarketPrices(tickers) {
    this._resolvedPrices = {}
    tickers.forEach(async ticker => {
      let price = null
      try {
        const data = await apiRequest('GET', `/api/quote/${encodeURIComponent(ticker)}`)
        price = data?.price ?? null
      } catch {}
      this._resolvedPrices[ticker] = price
      this._updatePriceCells(ticker, price)
    })
  },

  _renderAlycBody(alyc, alycIdx) {
    let bodyHtml = ''
    for (const [curr, items] of Object.entries(alyc.currencies)) {
      const totalVal = items.reduce((acc, h) => acc + h.currentValue, 0)
      items.sort((a, b) => b.currentValue - a.currentValue)

      const chartId = `pnl-chart-${alycIdx}-${curr}`
      this._pnlChartItems[chartId] = items.map(h => ({
        ticker: h.ticker, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice
      }))

      bodyHtml += `
        <div class="currency-group" style="margin-bottom: 2rem">


          <div class="charts-row">
            <div class="chart-panel">
              <div class="chart-panel-title">Distribución de Tenencia</div>
              ${this._renderPieChart(items, totalVal)}
            </div>
            <div class="chart-panel">
              <div class="chart-panel-title">Por Tipo de Instrumento</div>
              ${this._renderTypeChart(items)}
            </div>
            <div class="chart-panel">
              <div class="chart-panel-title">Rendimiento Individual (P&amp;L $)</div>
              <div id="${chartId}" class="pnl-chart-container">
                <div style="display:flex; gap:0.5rem; align-items:center; color:var(--text-muted); font-size:0.85rem">
                  <span class="spinner"></span> Esperando precios...
                </div>
              </div>
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
                    <td class="amount">${h.avgBuyPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td class="amount"><strong>${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
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
                  <div style="color: var(--text-muted)">Valor Invertido:</div>
                  <div style="text-align: right; font-weight: 700; color: var(--color-primary)">${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
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
    const fmt  = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
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
      el.innerHTML = `<span style="color:${color};font-weight:600">${sign(pct)}${pct.toFixed(2)}%</span>`
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

    const fmt      = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const sign     = v => v > 0 ? '+' : ''
    const color    = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-main)'
    const dash     = '<span style="color:var(--text-muted)">—</span>'
    const pending  = resolvedARS + resolvedUSD < totalTickers
    const subLabel = pending
      ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resolvedARS + resolvedUSD}/${totalTickers} tickers</span>`
      : ''

    const arsEl    = document.getElementById('kpi-pnl-ars-value')
    const arsSub   = document.getElementById('kpi-pnl-ars-sub')
    const usdEl    = document.getElementById('kpi-pnl-usd-value')
    const usdSub   = document.getElementById('kpi-pnl-usd-sub')
    if (!arsEl) return

    if (totalARS === 0) {
      arsEl.innerHTML = dash
    } else if (resolvedARS > 0) {
      arsEl.innerHTML = `<span style="color:${color(pnlARS)};font-weight:700">${sign(pnlARS)}${fmt(pnlARS)}</span>`
      if (arsSub) arsSub.innerHTML = pending ? `<span style="font-size:0.7rem;color:var(--text-muted)">${resolvedARS}/${totalARS} tickers</span>` : ''
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
    const fmt  = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const sign = v => v > 0 ? '+' : ''

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
    const maxAbs = Math.max(...itemsWithPnl.map(h => Math.abs(h.pnl)), 1)

    el.innerHTML = `
      <div class="pnl-bar-chart">
        ${itemsWithPnl.map(h => {
          const pct   = (Math.abs(h.pnl) / maxAbs) * 47
          const isPos = h.pnl >= 0
          const color = isPos ? '#10b981' : '#ef4444'
          const barStyle = isPos
            ? `left:50%; width:${pct}%;`
            : `left:calc(50% - ${pct}%); width:${pct}%;`
          return `
            <div class="pnl-bar-row">
              <span class="pnl-bar-label">${h.ticker}</span>
              <div class="pnl-bar-track">
                <div class="pnl-bar-axis"></div>
                <div class="pnl-bar-fill" style="background:${color}; ${barStyle}"></div>
              </div>
              <span class="pnl-bar-value" style="color:${color}">${sign(h.pnl)}${fmt(h.pnl)}</span>
            </div>`
        }).join('')}
      </div>`
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

    const fmt    = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const hasUSD = Object.values(data.holdingsSummary).some(h => h.currency === 'USD')
    const skeleton = `<span class="cell-skeleton" style="width:80px;height:1.25rem;display:inline-block"></span>`

    // Render KPIs
    kpiContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Total Estimado ARS</div>
        <div class="kpi-value">${fmt(data.totalARS)}</div>
      </div>
      ${hasUSD ? `
      <div class="kpi-card">
        <div class="kpi-label">Total Estimado USD</div>
        <div class="kpi-value">${fmt(data.totalUSD)}</div>
      </div>` : ''}
      <div class="kpi-card">
        <div class="kpi-label">ALyCs Activas</div>
        <div class="kpi-value">${data.alycs.length}</div>
      </div>
      <div class="kpi-card" id="kpi-pnl-ars">
        <div class="kpi-label">P&amp;L Total ARS</div>
        <div class="kpi-value" id="kpi-pnl-ars-value">${skeleton}</div>
        <div class="kpi-sub" id="kpi-pnl-ars-sub"></div>
      </div>
      ${hasUSD ? `
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

    this._pendingAlycs      = {}
    this._pnlChartItems     = {}
    this._holdingsSortCol   = ''
    this._holdingsSortAsc   = true

    let html = ''
    for (const [idx, alyc] of data.alycs.entries()) {
      const collapsed = idx > 0 ? ' collapsed' : ''
      const innerHtml = idx === 0 ? this._renderAlycBody(alyc, idx) : ''

      if (idx > 0) this._pendingAlycs[idx] = alyc

      const alycTotals = Object.entries(alyc.currencies).map(([curr, items]) => {
        const t = items.reduce((acc, h) => acc + h.currentValue, 0)
        return `<span class="alyc-header-total"><span class="badge badge-${curr.toLowerCase()}">${curr}</span>${t.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>`
      }).join('')

      html += `
        <div class="card alyc-card${collapsed}" data-alyc-index="${idx}">
          <div class="alyc-card-header">
            <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem">
              <span style="color:var(--color-primary)">🏦</span> ${alyc.name}
            </h3>
            <div class="alyc-header-right">
              <div class="alyc-header-totals">${alycTotals}</div>
              <span class="alyc-chevron">▾</span>
            </div>
          </div>
          <div class="alyc-card-body">
            <div class="alyc-card-inner">${innerHtml}</div>
          </div>
        </div>`
    }

    contentContainer.innerHTML = html

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

  _renderTypeChart(items) {
    // Agrupa el valor invertido por tipo de instrumento
    const byType = {}
    for (const h of items) {
      const type = h.instrumentType || 'Sin tipo'
      byType[type] = (byType[type] || 0) + h.currentValue
    }
    const typeItems = Object.entries(byType)
      .map(([ticker, currentValue]) => ({ ticker, currentValue }))
      .sort((a, b) => b.currentValue - a.currentValue)
    const total = typeItems.reduce((acc, t) => acc + t.currentValue, 0)
    return this._renderSolidPieChart(typeItems, total)
  },

  _renderSolidPieChart(items, total) {
    const colors = [
      '#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]
    const cx = 150, cy = 150, R = 120
    const MIN_LABEL = 0.06

    const label = (x, y, line1, line2) => `
      <text x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
            font-size="13" font-weight="800" fill="white"
            stroke="rgba(0,0,0,0.5)" stroke-width="3" paint-order="stroke">${line1}</text>
      <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle"
            font-size="12" fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.45)" stroke-width="2.5" paint-order="stroke">${line2}</text>`

    if (items.length === 1) {
      return `<svg viewBox="0 0 300 300" class="pie-svg">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="${colors[0]}" stroke="var(--bg-card)" stroke-width="2"/>
        ${label(cx, cy, items[0].ticker, '100%')}
      </svg>`
    }

    let angle = -Math.PI / 2
    const sectors = []
    const labels  = []

    items.forEach((h, i) => {
      const pct   = h.currentValue / total
      const sweep = pct * 2 * Math.PI
      const end   = angle + sweep
      const large = sweep > Math.PI ? 1 : 0
      const color = colors[i % colors.length]
      const mid   = angle + sweep / 2

      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
      const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end)

      const d = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="2" class="pie-sector">
        <title>${h.ticker}: ${(pct * 100).toFixed(1)}%</title></path>`)

      if (pct >= MIN_LABEL) {
        const lx = cx + (R * 0.65) * Math.cos(mid)
        const ly = cy + (R * 0.65) * Math.sin(mid)
        labels.push(label(lx, ly, h.ticker, `${(pct * 100).toFixed(0)}%`))
      }

      angle = end
    })

    return `<svg viewBox="0 0 300 300" class="pie-svg">
      ${sectors.join('')}${labels.join('')}
    </svg>`
  },

  _renderPieChart(items, total) {
    const colors = [
      '#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]
    const cx = 150, cy = 150, R = 120, hole = 68
    const midR = (R + hole) / 2   // radio medio donde van las etiquetas
    const MIN_LABEL = 0.06         // sectores < 6% no tienen etiqueta interior

    // texto con contorno para legibilidad sobre cualquier color
    const label = (x, y, line1, line2, color) => `
      <text x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
            font-size="13" font-weight="800" fill="white"
            stroke="rgba(0,0,0,0.45)" stroke-width="3" paint-order="stroke">${line1}</text>
      <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle"
            font-size="12" fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.45)" stroke-width="2.5" paint-order="stroke">${line2}</text>`

    // Caso especial: único instrumento → círculo completo
    if (items.length === 1) {
      return `<svg viewBox="0 0 300 300" class="pie-svg">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="${colors[0]}" stroke="var(--bg-card)" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="${hole}" fill="var(--bg-card)"/>
        ${label(cx, cy, items[0].ticker, '100%', colors[0])}
      </svg>`
    }

    let angle = -Math.PI / 2
    const sectors = []
    const labels  = []

    items.forEach((h, i) => {
      const pct   = h.currentValue / total
      const sweep = pct * 2 * Math.PI
      const end   = angle + sweep
      const large = sweep > Math.PI ? 1 : 0
      const color = colors[i % colors.length]
      const mid   = angle + sweep / 2

      const x1 = cx + R    * Math.cos(angle), y1 = cy + R    * Math.sin(angle)
      const x2 = cx + R    * Math.cos(end),   y2 = cy + R    * Math.sin(end)
      const x3 = cx + hole * Math.cos(end),   y3 = cy + hole * Math.sin(end)
      const x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)

      const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${large} 0 ${x4} ${y4}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="2" class="pie-sector">
        <title>${h.ticker}: ${(pct * 100).toFixed(1)}%</title></path>`)

      if (pct >= MIN_LABEL) {
        const lx = cx + midR * Math.cos(mid)
        const ly = cy + midR * Math.sin(mid)
        labels.push(label(lx, ly, h.ticker, `${(pct * 100).toFixed(0)}%`, color))
      }

      angle = end
    })

    return `<svg viewBox="0 0 300 300" class="pie-svg">
      ${sectors.join('')}${labels.join('')}
    </svg>`
  }
}
