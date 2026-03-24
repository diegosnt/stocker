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
      await this._updateMarketPrices(data.tickers)
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

  async _updateMarketPrices(tickers) {
    this._resolvedPrices = {}
    // ✅ Corregido anti-pattern forEach async
    await Promise.all(tickers.map(async ticker => {
      let price = null
      try {
        const data = await apiRequest('GET', `/api/quote/${encodeURIComponent(ticker)}`)
        price = data?.price ?? null
      } catch {}
      this._resolvedPrices[ticker] = price
      this._updatePriceCells(ticker, price)
    }))
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
      <div class="dash-charts-row">
        <div class="card dash-chart-card" style="min-height: 360px; display: flex; flex-direction: column;">
          <div class="chart-panel-title" style="margin-bottom:1rem">Composición de Cartera por Tipo</div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            ${this._renderPieChart(typeItems, totalInvested)}
          </div>
        </div>

        <div class="card" style="display: flex; flex-direction: column; min-height: 360px;">
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Mapa de Calor (Peso vs P&L %)</div>
          <div id="dash-heatmap" class="heatmap-container" style="flex: 1; min-height: 220px">
            <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.85rem">
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
        </div><!-- dash-table-body -->
      </div>`

    this._bindSortHeaders()
    this._bindTableToggle()
    this._refreshHeatmap()
  },

  _renderPieChart(items, total) {
    const colors = [
      '#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]
    const cx = 150, cy = 150, R = 120, hole = 68
    const midR = (R + hole) / 2
    const MIN_LABEL = 0.05

    const label = (x, y, line1, line2) => `
      <text x="${x.toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle"
            font-size="12" font-weight="800" fill="white"
            stroke="rgba(0,0,0,0.45)" stroke-width="3" paint-order="stroke">${line1}</text>
      <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle"
            font-size="11" fill="rgba(255,255,255,0.95)"
            stroke="rgba(0,0,0,0.45)" stroke-width="2.5" paint-order="stroke">${line2}</text>`

    if (items.length === 1) {
      return `<svg viewBox="0 0 300 300" style="max-height: 280px; width: auto; display: block; margin: 0 auto;">
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="${colors[0]}" stroke="var(--bg-card)" stroke-width="2"/>
        <circle cx="${cx}" cy="${cy}" r="${hole}" fill="var(--bg-card)"/>
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

      const x1 = cx + R    * Math.cos(angle), y1 = cy + R    * Math.sin(angle)
      const x2 = cx + R    * Math.cos(end),   y2 = cy + R    * Math.sin(end)
      const x3 = cx + hole * Math.cos(end),   y3 = cy + hole * Math.sin(end)
      const x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)

      const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${large} 0 ${x4} ${y4}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="2">
        <title>${h.ticker}: ${(pct * 100).toFixed(1)}%</title></path>`)

      if (pct >= MIN_LABEL) {
        const lx = cx + midR * Math.cos(mid)
        const ly = cy + midR * Math.sin(mid)
        labels.push(label(lx, ly, h.ticker, `${(pct * 100).toFixed(0)}%`))
      }
      angle = end
    })

    return `<svg viewBox="0 0 300 300" style="max-height: 280px; width: auto; display: block; margin: 0 auto;">
      ${sectors.join('')}${labels.join('')}
    </svg>`
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
    // ✅ Corregido: Variable total muerta eliminada
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
