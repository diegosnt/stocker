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
        <div class="kpi-card loading-skeleton"></div>
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
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">Total Invertido ARS</div>
        <div class="kpi-value">${fmt(data.totalARS)}</div>
      </div>
      ${hasUSD ? `
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">Total Invertido USD</div>
        <div class="kpi-value">${fmt(data.totalUSD)}</div>
      </div>` : ''}
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">Instrumentos</div>
        <div class="kpi-value">${data.items.length}</div>
      </div>
      <div class="kpi-card kpi-card--compact">
        <div class="kpi-label">P&amp;L Total ARS</div>
        <div class="kpi-value" id="dash-pnl-ars">${skeleton}</div>
        <div class="kpi-sub"  id="dash-pnl-ars-sub"></div>
      </div>
      ${hasUSD ? `
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

    // ── Gráficos ──────────────────────────────────────────────
    const pnlChartId = 'dash-pnl-chart'
    this._pnlItems = data.items.map(h => ({
      ticker: h.ticker, quantity: h.quantity, avgBuyPrice: h.avgBuyPrice
    }))

    mainEl.innerHTML = `
      <div class="card" style="margin-bottom:1.5rem">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem">
          <div class="chart-panel">
            <div class="chart-panel-title">Distribución de Tenencia</div>
            ${this._renderDonutChart(data.items, totalInvested)}
          </div>
          <div class="chart-panel">
            <div class="chart-panel-title">Por Tipo de Instrumento</div>
            ${this._renderSolidPieChart(data.items)}
          </div>
        </div>
        <div>
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Rendimiento Individual (P&amp;L $)</div>
          <div id="${pnlChartId}" class="pnl-chart-container">
            <div style="display:flex;gap:0.5rem;align-items:center;color:var(--text-muted);font-size:0.85rem">
              <span class="spinner"></span> Esperando precios...
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

    this._refreshPnlChart()
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

  _refreshPnlChart() {
    const el = document.getElementById('dash-pnl-chart')
    if (!el || !this._pnlItems) return
    const fmt  = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const sign = v => v > 0 ? '+' : ''

    const withPnl = this._pnlItems
      .map(h => {
        const price = this._resolvedPrices?.[h.ticker] ?? null
        return price !== null ? { ticker: h.ticker, pnl: (price - h.avgBuyPrice) * h.quantity } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.pnl - a.pnl)

    if (!withPnl.length) return

    const maxAbs = Math.max(...withPnl.map(h => Math.abs(h.pnl)), 1)
    el.innerHTML = `
      <div class="pnl-bar-chart pnl-bar-chart--wide">
        ${withPnl.map(h => {
          const pct     = (Math.abs(h.pnl) / maxAbs) * 44
          const isPos   = h.pnl >= 0
          const color   = isPos ? '#10b981' : '#ef4444'
          const barStyle = isPos ? `left:50%;width:${pct}%` : `left:calc(50% - ${pct}%);width:${pct}%`
          return `
            <div class="pnl-bar-row">
              <span class="pnl-bar-label">${h.ticker}</span>
              <div class="pnl-bar-track">
                <div class="pnl-bar-axis"></div>
                <div class="pnl-bar-fill" style="background:${color};${barStyle}"></div>
              </div>
              <span class="pnl-bar-value" style="color:${color}">${sign(h.pnl)}${fmt(h.pnl)}</span>
            </div>`
        }).join('')}
      </div>`
  },

  // ── Gráfico donut (distribución por ticker) ────────────────
  _renderDonutChart(items, total) {
    const colors = [
      '#4f46e6','#10b981','#f59e0b','#ef4444','#8b5cf6',
      '#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'
    ]
    const cx = 150, cy = 150, R = 120, hole = 68
    const midR = (R + hole) / 2
    const MIN_LABEL = 0.06

    const lbl = (x, y, l1, l2) => `
      <text x="${x.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle"
            font-size="13" font-weight="800" fill="white"
            stroke="rgba(0,0,0,0.45)" stroke-width="3" paint-order="stroke">${l1}</text>
      <text x="${x.toFixed(1)}" y="${(y+11).toFixed(1)}" text-anchor="middle"
            font-size="12" fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.45)" stroke-width="2.5" paint-order="stroke">${l2}</text>`

    if (items.length === 1) return `<svg viewBox="0 0 300 300" class="pie-svg">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="${colors[0]}" stroke="var(--bg-card)" stroke-width="2"/>
      <circle cx="${cx}" cy="${cy}" r="${hole}" fill="var(--bg-card)"/>
      ${lbl(cx, cy, items[0].ticker, '100%')}
    </svg>`

    let angle = -Math.PI / 2
    const sectors = [], labels = []
    items.forEach((h, i) => {
      const pct = h.invested / total, sweep = pct * 2 * Math.PI
      const end = angle + sweep, large = sweep > Math.PI ? 1 : 0
      const color = colors[i % colors.length], mid = angle + sweep / 2
      const x1 = cx + R    * Math.cos(angle), y1 = cy + R    * Math.sin(angle)
      const x2 = cx + R    * Math.cos(end),   y2 = cy + R    * Math.sin(end)
      const x3 = cx + hole * Math.cos(end),   y3 = cy + hole * Math.sin(end)
      const x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)
      const d  = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${large} 0 ${x4} ${y4}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="2" class="pie-sector"><title>${h.ticker}: ${(pct*100).toFixed(1)}%</title></path>`)
      if (pct >= MIN_LABEL) {
        const lx = cx + midR * Math.cos(mid), ly = cy + midR * Math.sin(mid)
        labels.push(lbl(lx, ly, h.ticker, `${(pct*100).toFixed(0)}%`))
      }
      angle = end
    })
    return `<svg viewBox="0 0 300 300" class="pie-svg">${sectors.join('')}${labels.join('')}</svg>`
  },

  // ── Gráfico torta sólida (por tipo de instrumento) ─────────
  _renderSolidPieChart(items) {
    const byType = {}
    for (const h of items) {
      const t = h.instrumentType || 'Sin tipo'
      byType[t] = (byType[t] || 0) + h.invested
    }
    const typeItems = Object.entries(byType)
      .map(([name, val]) => ({ name, val }))
      .sort((a, b) => b.val - a.val)
    const total = typeItems.reduce((acc, t) => acc + t.val, 0)

    const colors = [
      '#4f46e6','#10b981','#f59e0b','#ef4444','#8b5cf6',
      '#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1'
    ]
    const cx = 150, cy = 150, R = 120, MIN_LABEL = 0.06

    const lbl = (x, y, l1, l2) => `
      <text x="${x.toFixed(1)}" y="${(y-5).toFixed(1)}" text-anchor="middle"
            font-size="13" font-weight="800" fill="white"
            stroke="rgba(0,0,0,0.5)" stroke-width="3" paint-order="stroke">${l1}</text>
      <text x="${x.toFixed(1)}" y="${(y+11).toFixed(1)}" text-anchor="middle"
            font-size="12" fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.45)" stroke-width="2.5" paint-order="stroke">${l2}</text>`

    if (typeItems.length === 1) return `<svg viewBox="0 0 300 300" class="pie-svg">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="${colors[0]}" stroke="var(--bg-card)" stroke-width="2"/>
      ${lbl(cx, cy, typeItems[0].name, '100%')}
    </svg>`

    let angle = -Math.PI / 2
    const sectors = [], labels = []
    typeItems.forEach((t, i) => {
      const pct = t.val / total, sweep = pct * 2 * Math.PI
      const end = angle + sweep, large = sweep > Math.PI ? 1 : 0
      const color = colors[i % colors.length], mid = angle + sweep / 2
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
      const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end)
      const d  = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="2" class="pie-sector"><title>${t.name}: ${(pct*100).toFixed(1)}%</title></path>`)
      if (pct >= MIN_LABEL) {
        const lx = cx + (R * 0.65) * Math.cos(mid), ly = cy + (R * 0.65) * Math.sin(mid)
        labels.push(lbl(lx, ly, t.name, `${(pct*100).toFixed(0)}%`))
      }
      angle = end
    })
    return `<svg viewBox="0 0 300 300" class="pie-svg">${sectors.join('')}${labels.join('')}</svg>`
  },

  // ── Toggle tabla ───────────────────────────────────────────
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

  // ── Ordenamiento de tabla ──────────────────────────────────
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
