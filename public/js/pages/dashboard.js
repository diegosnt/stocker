import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'

export const DashboardPage = {

  async render() {
    if (this._marketInterval) {
      clearInterval(this._marketInterval)
      this._marketInterval = null
    }

    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Dashboard</h2>
      </div>
      <div id="dash-kpis" class="kpi-grid">
        <div class="kpi-card loading-skeleton"></div>
        <div class="kpi-card loading-skeleton"></div>
      </div>
      <div id="dash-content">
        <div class="card">
          <p class="table-empty"><span class="spinner"></span> Cargando dashboard...</p>
        </div>
      </div>`

    try {
      const data = await this._loadHoldings()
      this._renderDashboard(data)
      this._updateMarketPrices(data.tickers)
    } catch (err) {
      console.error(err)
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

  _renderDashboard(data) {
    const kpiEl   = document.getElementById('dash-kpis')
    const mainEl  = document.getElementById('dash-content')
    this._summary = data.summary
    this._sortCol = ''
    this._sortAsc = true

    const fmt     = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const hasUSD  = data.items.some(h => h.currency === 'USD')
    const skeleton = `<span class="cell-skeleton" style="width:80px;height:1.25rem;display:inline-block"></span>`

    // ── KPIs ──────────────────────────────────────────────────
    kpiEl.innerHTML = `
      ${hasUSD ? `
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">Total Invertido USD</div>
        <div class="kpi-value">${fmt(data.totalUSD)}</div>
      </div>
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">P&amp;L Total USD</div>
        <div class="kpi-value" id="dash-pnl-usd">${skeleton}</div>
        <div class="kpi-sub"  id="dash-pnl-usd-sub"></div>
      </div>` : ''}`

    if (!data.items.length) {
      mainEl.innerHTML = `
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas.</p>
        </div>`
      return
    }

    const totalInvested = data.totalARS + data.totalUSD

    // ── Contenido Principal (Heatmap y Tabla) ────────────────
    mainEl.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem">
        <div style="margin-bottom:0.5rem">
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Mapa de Calor de Cartera (Peso vs Rendimiento %)</div>
          <div id="dash-heatmap" class="heatmap-container">
            <div style="display:flex;gap:0.5rem;align-items:center;color:var(--text-muted);font-size:0.85rem">
              <span class="spinner"></span> Generando mapa de calor...
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="alyc-card-header" id="dash-table-header" style="cursor:pointer;margin-bottom:0">
          <h3 style="margin:0;font-size:1rem">Detalle de Instrumentos</h3>
          <span class="alyc-chevron" id="dash-table-chevron">▾</span>
        </div>
        <div id="dash-table-body" style="margin-top:1rem">
        <div class="table-wrapper desktop-only">
          <table class="holdings-table" id="dash-table">
            <thead>
              <tr>
                <th class="sortable" data-col="ticker">Ticker</th>
                <th style="text-align:right">Tipo</th>
                <th class="sortable" data-col="quantity"    style="text-align:right">Cantidad</th>
                <th class="sortable" data-col="avgBuyPrice" style="text-align:right">Precio Prom. Compra</th>
                <th class="sortable" data-col="invested"    style="text-align:right">Valor Invertido</th>
                <th class="sortable" data-col="marketPrice" style="text-align:right">Precio Actual</th>
                <th class="sortable" data-col="marketValue" style="text-align:right">Valor Actual</th>
                <th class="sortable" data-col="pnl"         style="text-align:right">P&amp;L $</th>
                <th class="sortable" data-col="pnlPct"      style="text-align:right">P&amp;L %</th>
                <th style="text-align:right">%</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map(h => `
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
                  <td class="amount" style="color:var(--text-muted);font-weight:600">${((h.invested / totalInvested) * 100).toFixed(1)}%</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="mobile-only" style="display:none">
          ${data.items.map(h => `
            <div class="mobile-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                <span class="ticker-chip">${h.ticker}</span>
                <span style="font-size:0.75rem;color:var(--text-muted)">${h.instrumentType}</span>
                <span style="font-weight:700">${((h.invested / totalInvested) * 100).toFixed(1)}%</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.875rem">
                <div style="color:var(--text-muted)">Cantidad:</div>
                <div style="text-align:right;font-weight:500">${h.quantity.toLocaleString('es-AR')}</div>
                <div style="color:var(--text-muted)">Valor Invertido:</div>
                <div style="text-align:right;font-weight:700;color:var(--color-primary)">${fmt(h.invested)}</div>
                <div style="color:var(--text-muted)">Precio Actual:</div>
                <div class="market-price-cell" data-ticker="${h.ticker}" style="text-align:right;font-weight:500"><span class="cell-skeleton"></span></div>
                <div style="color:var(--text-muted)">Valor Actual:</div>
                <div class="market-value-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" style="text-align:right;font-weight:700;color:var(--color-primary)"><span class="cell-skeleton"></span></div>
                <div style="color:var(--text-muted)">P&amp;L $:</div>
                <div class="pnl-amount-cell" data-ticker="${h.ticker}" data-quantity="${h.quantity}" data-avg-buy-price="${h.avgBuyPrice}" style="text-align:right"><span class="cell-skeleton"></span></div>
                <div style="color:var(--text-muted)">P&amp;L %:</div>
                <div class="pnl-pct-cell" data-ticker="${h.ticker}" data-avg-buy-price="${h.avgBuyPrice}" style="text-align:right"><span class="cell-skeleton"></span></div>
              </div>
            </div>`).join('')}
        </div>
        </div><!-- dash-table-body -->
      </div>`

    this._bindSortHeaders()
    this._bindTableToggle()
  },

  // ── Precios de mercado ─────────────────────────────────────
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

    this._refreshHeatmap()
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

    const data = Object.entries(this._summary).map(([ticker, h]) => {
      const price = this._resolvedPrices?.[ticker] ?? null
      const invested = h.quantity * h.avgBuyPrice
      const pct = price !== null && h.avgBuyPrice > 0 ? (price / h.avgBuyPrice - 1) * 100 : 0
      return { ticker, value: invested, pct }
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

    if (!data.length) return

    const width = el.clientWidth || 800
    const height = 300
    const nodes = this._layoutTreemap(data, width, height)

    const getColor = (pct) => {
      if (pct > 5) return '#065f46'
      if (pct > 2) return '#10b981'
      if (pct > 0.5) return '#6ee7b7'
      if (pct > -0.5) return '#94a3b8'
      if (pct > -2) return '#fca5a5'
      if (pct > -5) return '#ef4444'
      return '#991b1b'
    }

    el.innerHTML = `
      <svg width="${width}" height="${height}" style="display:block; border-radius:var(--radius); overflow:hidden">
        ${nodes.map(n => `
          <g class="heatmap-rect" transform="translate(${n.x},${n.y})">
            <rect width="${n.dx}" height="${n.dy}" fill="${getColor(n.pct)}" stroke="var(--bg-card)" stroke-width="1.5">
              <title>${n.ticker}: ${n.pct.toFixed(2)}% (Peso: ${n.value.toLocaleString('es-AR')})</title>
            </rect>
            ${n.dx > 30 && n.dy > 20 ? `
              <text x="${n.dx/2}" y="${n.dy/2 + 4}" text-anchor="middle" fill="white" font-weight="700" font-size="${Math.min(n.dx/4, 14)}px" style="pointer-events:none; text-shadow: 0 1px 2px rgba(0,0,0,0.4)">
                ${n.ticker}
              </text>
            ` : ''}
          </g>
        `).join('')}
      </svg>`
  },

  _layoutTreemap(data, width, height) {
    const total = data.reduce((s, d) => s + d.value, 0)
    const nodes = []
    
    function squarify(items, x, y, dx, dy) {
      if (!items.length) return
      const isHorizontal = dx > dy
      const sum = items.reduce((s, i) => s + i.value, 0)
      let offset = 0
      items.forEach(item => {
        const itemRatio = item.value / sum
        if (isHorizontal) {
          const w = dx * itemRatio
          nodes.push({ ...item, x: x + offset, y, dx: w, dy })
          offset += w
        } else {
          const h = dy * itemRatio
          nodes.push({ ...item, x, y: y + offset, dx, dy: h })
          offset += h
        }
      })
    }

    if (data.length > 4) {
      const mid = Math.ceil(data.length / 2)
      const sum1 = data.slice(0, mid).reduce((s, d) => s + d.value, 0)
      const sum2 = data.slice(mid).reduce((s, d) => s + d.value, 0)
      const totalSum = sum1 + sum2
      if (width > height) {
        const w1 = width * (sum1 / totalSum)
        squarify(data.slice(0, mid), 0, 0, w1, height)
        squarify(data.slice(mid), w1, 0, width - w1, height)
      } else {
        const h1 = height * (sum1 / totalSum)
        squarify(data.slice(0, mid), 0, 0, width, h1)
        squarify(data.slice(mid), 0, h1, width, height - h1)
      }
    } else {
      squarify(data, 0, 0, width, height)
    }
    return nodes
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
