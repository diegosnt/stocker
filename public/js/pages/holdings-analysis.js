import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { apiRequest } from '../api-client.js'

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
        ticker: h.ticker, quantity: h.quantity, lastPrice: h.lastPrice
      }))

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
            <table class="holdings-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="ticker">Ticker</th>
                  <th class="sortable" data-col="quantity" style="text-align:right">Cantidad</th>
                  <th class="sortable" data-col="lastPrice" style="text-align:right">Últ. Precio</th>
                  <th class="sortable" data-col="value" style="text-align:right">Valor Est.</th>
                  <th class="sortable" data-col="marketPrice" style="text-align:right">Precio Actual</th>
                  <th class="sortable" data-col="marketValue" style="text-align:right">Valor Actual</th>
                  <th class="sortable" data-col="pnl" style="text-align:right">P&amp;L $</th>
                  <th class="sortable" data-col="pnlPct" style="text-align:right">P&amp;L %</th>
                  <th style="text-align:right">%</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(h => `
                  <tr data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-last-price="${h.lastPrice}" data-value="${h.currentValue}">
                    <td><span class="ticker-chip" title="${h.name}">${h.ticker}</span></td>
                    <td class="amount">${h.quantity.toLocaleString('es-AR', { maximumFractionDigits: 4 })}</td>
                    <td class="amount">${h.lastPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td class="amount"><strong>${h.currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></td>
                    <td class="amount market-price-cell" data-ticker="${h.ticker}"><span class="cell-skeleton"></span></td>
                    <td class="amount market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-last-price="${h.lastPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-pct-cell" data-ticker="${h.ticker}" data-last-price="${h.lastPrice}"><span class="cell-skeleton"></span></td>
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
                  <div style="color: var(--text-muted)">Precio Actual:</div>
                  <div class="market-price-cell" data-ticker="${h.ticker}" style="text-align: right; font-weight: 500"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">Valor Actual:</div>
                  <div class="market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" style="text-align: right; font-weight: 700; color: var(--color-primary)"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">P&amp;L $:</div>
                  <div class="pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-last-price="${h.lastPrice}" style="text-align: right"><span class="cell-skeleton"></span></div>
                  <div style="color: var(--text-muted)">P&amp;L %:</div>
                  <div class="pnl-pct-cell" data-ticker="${h.ticker}" data-last-price="${h.lastPrice}" style="text-align: right"><span class="cell-skeleton"></span></div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 1.5rem">
            <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 0.75rem">Rendimiento Individual (P&amp;L $)</div>
            <div id="${chartId}" class="pnl-chart-container">
              <div style="display:flex; gap: 0.5rem; align-items:center; color:var(--text-muted); font-size:0.85rem">
                <span class="spinner"></span> Esperando precios...
              </div>
            </div>
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
      const quantity  = parseFloat(el.dataset.quantity)
      const lastPrice = parseFloat(el.dataset.lastPrice)
      const pnl       = (price - lastPrice) * quantity
      const color     = pnlColor(pnl)
      el.innerHTML    = `<strong style="color:${color}">${sign(pnl)}${fmt(pnl)}</strong>`
    })

    document.querySelectorAll(`.pnl-pct-cell[data-ticker="${ticker}"]`).forEach(el => {
      if (price === null) { el.innerHTML = dash; return }
      const lastPrice = parseFloat(el.dataset.lastPrice)
      if (lastPrice === 0) { el.innerHTML = dash; return }
      const pct   = ((price / lastPrice) - 1) * 100
      const color = pnlColor(pct)
      el.innerHTML = `<span style="color:${color};font-weight:600">${sign(pct)}${pct.toFixed(2)}%</span>`
    })

    this._refreshPnlCharts(ticker)
    this._updatePnlKpis()
    if (this._holdingsSortCol === 'marketPrice' || this._holdingsSortCol === 'marketValue' ||
        this._holdingsSortCol === 'pnl' || this._holdingsSortCol === 'pnlPct') {
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
        if (price !== null) pnlARS += (price - h.lastPrice) * h.totalQuantity
      } else {
        resolvedUSD++
        if (price !== null) pnlUSD += (price - h.lastPrice) * h.totalQuantity
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
          ? { ticker: h.ticker, pnl: (price - h.lastPrice) * h.quantity }
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
      const alycId    = h.alyc_id
      const quantity  = parseFloat(h.total_quantity)
      const lastPrice = parseFloat(h.last_price)
      const val       = quantity * lastPrice

      if (!alycMap[alycId]) alycMap[alycId] = { name: h.alyc_name, holdings: {} }

      if (h.currency === 'ARS') totalARS += val
      else totalUSD += val

      alycMap[alycId].holdings[h.ticker] = {
        ticker: h.ticker, name: h.instrument_name,
        quantity, lastPrice, currency: h.currency, currentValue: val
      }

      // Agregar al resumen global por ticker (puede haber el mismo ticker en varias ALyCs)
      if (!tickerSummary[h.ticker]) {
        tickerSummary[h.ticker] = { currency: h.currency, totalQuantity: 0, lastPrice }
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

      html += `
        <div class="card alyc-card${collapsed}" data-alyc-index="${idx}">
          <div class="alyc-card-header">
            <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem">
              <span style="color:var(--color-primary)">🏦</span> ${alyc.name}
            </h3>
            <span class="alyc-chevron">▾</span>
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
      if (col === 'quantity')  { va = parseFloat(a.dataset.quantity);  vb = parseFloat(b.dataset.quantity) }
      if (col === 'lastPrice') { va = parseFloat(a.dataset.lastPrice); vb = parseFloat(b.dataset.lastPrice) }
      if (col === 'value')     { va = parseFloat(a.dataset.value);     vb = parseFloat(b.dataset.value) }
      if (col === 'marketPrice' || col === 'marketValue') {
        const px = t => this._resolvedPrices?.[t.dataset.ticker] ?? nullEdge
        va = col === 'marketPrice' ? px(a) : px(a) * parseFloat(a.dataset.quantity)
        vb = col === 'marketPrice' ? px(b) : px(b) * parseFloat(b.dataset.quantity)
      }
      if (col === 'pnl') {
        const pnl = t => {
          const p = this._resolvedPrices?.[t.dataset.ticker]
          return p != null ? (p - parseFloat(t.dataset.lastPrice)) * parseFloat(t.dataset.quantity) : nullEdge
        }
        va = pnl(a); vb = pnl(b)
      }
      if (col === 'pnlPct') {
        const pct = t => {
          const p  = this._resolvedPrices?.[t.dataset.ticker]
          const lp = parseFloat(t.dataset.lastPrice)
          return p != null && lp ? (p / lp - 1) * 100 : nullEdge
        }
        va = pct(a); vb = pct(b)
      }
      return asc ? va - vb : vb - va
    })

    rows.forEach(row => tbody.appendChild(row))
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
