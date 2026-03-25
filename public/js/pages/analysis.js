import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'
import { showToast } from '../init.js'

export const AnalysisPage = {
  _chart: null,

  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Análisis de Cartera</h2>
      </div>

      <div class="card" style="margin-bottom: 2rem">
        <div style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap">
          <div class="form-group" style="margin:0; flex: 1; min-width: 200px">
            <label>Seleccionar ALyC</label>
            <select id="analysis-alyc-select" class="form-input">
              <option value="">Cargando ALyCs...</option>
            </select>
          </div>
          <div class="form-group" style="margin:0; width: 150px">
            <label>Benchmark</label>
            <input type="text" id="analysis-benchmark" class="form-input" value="SPY" placeholder="Ej: SPY, GGAL.BA">
          </div>
          <button id="btn-run-analysis" class="btn btn-primary" style="height: 38px">
            Ejecutar Análisis
          </button>
          <button id="btn-generate-pdf" class="btn btn-ghost" style="height: 38px; display: none">
            📥 Generar Reporte PDF
          </button>
        </div>
      </div>

      <div id="analysis-results" style="display: none">
        <!-- SECCIÓN 0: Tenencia Actual -->
        <div style="display: grid; grid-template-columns: 7fr 3fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0; padding: 1.25rem">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Detalle de Tenencia Actual</h3>
            <div id="current-holdings-table" style="overflow-x: auto"></div>
          </div>
          <div class="card" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Distribución</h3>
            <div id="current-holdings-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
          </div>
        </div>

        <!-- SECCIÓN 1: KPIs y Markowitz -->
        <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--text-muted)">Riesgo y Retorno</h3>
            <div id="analysis-kpis-container" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.4rem">
              <div style="padding: 0.4rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin-bottom: 0.1rem">Beta</h4>
                <div id="capm-beta" style="font-size: 1rem; font-weight: 700">--</div>
                <p id="capm-beta-desc" style="font-size: 0.55rem; margin-top: 0.05rem">Cargando...</p>
              </div>
              <div style="padding: 0.4rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin-bottom: 0.1rem">VaR (95%)</h4>
                <div id="analysis-var" style="font-size: 1rem; font-weight: 700; color: #ef4444">--</div>
                <p style="font-size: 0.55rem; margin-top: 0.05rem">Pérdida diaria prob.</p>
              </div>
              <div style="padding: 0.4rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin-bottom: 0.1rem">Max Drawdown</h4>
                <div id="analysis-mdd" style="font-size: 1rem; font-weight: 700; color: #ef4444">--</div>
                <p style="font-size: 0.55rem; margin-top: 0.05rem">Mayor caída hist.</p>
              </div>
              <div style="padding: 0.4rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin-bottom: 0.1rem">Alpha</h4>
                <div id="capm-alpha" style="font-size: 1rem; font-weight: 700; color: #10b981">--</div>
                <p style="font-size: 0.55rem; margin-top: 0.05rem">Excedente anual</p>
              </div>
              <div style="padding: 0.4rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin-bottom: 0.1rem">Corr. (R²)</h4>
                <div id="capm-r2" style="font-size: 1rem; font-weight: 700">--</div>
                <p style="font-size: 0.55rem; margin-top: 0.05rem">Vs Benchmark</p>
              </div>
            </div>
          </div>
          <div class="card" style="padding: 1.25rem; height: 100%; margin-bottom: 0">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Frontera Eficiente (Markowitz)</h3>
            <div style="height: 350px; position: relative"><canvas id="markowitz-chart"></canvas></div>
          </div>
        </div>

        <!-- SECCIÓN 2: Monte Carlo y Backtesting -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Simulación Monte Carlo (1 año)</h3>
            <div style="height: 250px; position: relative"><canvas id="montecarlo-chart"></canvas></div>
          </div>
          <div class="card" style="margin-bottom: 0">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
              <h3 style="font-size: 0.95rem">Backtesting</h3>
              <div id="backtesting-result" style="text-align: right; font-weight: 700; font-size: 0.85rem"></div>
            </div>
            <div style="height: 220px; position: relative"><canvas id="backtesting-chart"></canvas></div>
          </div>
        </div>

        <!-- SECCIÓN 3: Composición y Riesgo -->
        <div style="display: grid; grid-template-columns: 3fr 4fr 3fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem">Redistribución</h3>
            <div id="redistribution-table" style="font-size: 0.8rem"></div>
          </div>
          <!-- 2. Aporte al Riesgo (40%) -->
          <div class="card" style="margin-bottom: 0; padding: 1rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Aporte al Riesgo</h3>
            <div style="flex: 1; min-height: 250px; position: relative">
              <canvas id="risk-contribution-chart"></canvas>
            </div>
          </div>
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Stress Test</h3>
            <div id="stress-test-results" style="display: flex; flex-direction: column; gap: 0.5rem"></div>
          </div>
        </div>

        <!-- SECCIÓN 4: Drawdown y Correlación -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <!-- Historial de Caídas -->
          <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Historial de Caídas (Drawdown)</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              Profundidad de caídas históricas desde picos máximos.
            </p>
            <div style="flex: 1; min-height: 220px; position: relative">
              <canvas id="drawdown-chart"></canvas>
            </div>
          </div>

          <!-- Matriz de Correlación -->
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.95rem; margin-bottom: 1rem">Matriz de Correlación</h3>
            <div id="correlation-matrix" style="overflow-x: auto; font-size: 0.75rem"></div>
          </div>
        </div>

        <div class="card" style="padding: 1rem">
          <p id="analysis-summary" style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4"></p>
        </div>
      </div>

      <div id="analysis-loading" class="card" style="display: none; text-align: center; padding: 3rem">
        <span class="spinner" style="width: 40px; height: 40px; border-width: 4px"></span>
        <p style="margin-top: 1rem">Analizando datos históricos y calculando eficiencia...</p>
      </div>`

    this._setupEvents()
    await this._loadAlycs()
  },

  async _loadAlycs() {
    const select = document.getElementById('analysis-alyc-select')
    try {
      const { data, error } = await supabase.rpc('get_user_holdings')
      if (error) throw error
      const alycs = [...new Set(data.map(h => JSON.stringify({ id: h.alyc_id, name: h.alyc_name })))]
        .map(s => JSON.parse(s))
      if (alycs.length === 0) {
        select.innerHTML = '<option value="">No tenés tenencias registradas</option>'
        return
      }
      select.innerHTML = alycs.map(a => `<option value="${a.id}">${a.name}</option>`).join('')
    } catch (e) {
      console.error(e)
      select.innerHTML = '<option value="">Error al cargar ALyCs</option>'
    }
  },

  _setupEvents() {
    document.getElementById('btn-run-analysis').addEventListener('click', () => this._runAnalysis())
    document.getElementById('btn-generate-pdf').addEventListener('click', () => this._generatePDF())
  },

  async _runAnalysis() {
    const alycId = document.getElementById('analysis-alyc-select').value
    if (!alycId) return

    const resultsDiv = document.getElementById('analysis-results')
    const loadingDiv = document.getElementById('analysis-loading')
    const pdfBtn = document.getElementById('btn-generate-pdf')
    
    resultsDiv.style.display = 'none'
    pdfBtn.style.display = 'none'
    loadingDiv.style.display = 'block'

    try {
      const { data: holdings, error } = await supabase.rpc('get_user_holdings')
      if (error) throw error
      const alycHoldings = holdings.filter(h => h.alyc_id === alycId)
      if (alycHoldings.length < 2) throw new Error('Se necesitan al menos 2 activos.')

      const benchmarkTicker = document.getElementById('analysis-benchmark').value || 'SPY'
      const historyPromises = [
        ...alycHoldings.map(h => apiRequest('GET', `/api/history/${encodeURIComponent(h.ticker)}`)),
        apiRequest('GET', `/api/history/${encodeURIComponent(benchmarkTicker)}`)
      ]
      
      const results = await Promise.allSettled(historyPromises)
      const assetResults = results.slice(0, alycHoldings.length)
      const benchmarkResult = results[results.length - 1]

      const validHistories = []
      const validTickers = []
      const validHoldings = []
      this._resolvedPrices = {}

      assetResults.forEach((res, i) => {
        const h = alycHoldings[i]
        if (res.status === 'fulfilled' && res.value?.length > 10) {
          validHistories.push(res.value)
          validTickers.push(h.ticker)
          validHoldings.push(h)
          const lastPoint = res.value[res.value.length - 1]
          if (lastPoint) this._resolvedPrices[h.ticker] = lastPoint.price
        }
      })

      if (validTickers.length < 2) throw new Error('No hay suficientes datos históricos.')
      if (benchmarkResult.status === 'rejected') throw new Error('No se pudo cargar el Benchmark.')

      const benchmarkData = benchmarkResult.value
      const returnsMatrix = this._calculateReturns(validHistories, benchmarkData)
      const benchmarkReturns = this._calculateReturns([benchmarkData], benchmarkData)[0]

      const analysis = this._performMarkowitz(validTickers, returnsMatrix, validHoldings)
      
      const capm = this._performCAPM(analysis, returnsMatrix, benchmarkReturns)
      analysis.beta = capm.beta

      this._renderDrawdownChart(analysis, returnsMatrix)
      this._renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker)
      this._renderStressTest(analysis.beta)
      await this._renderChart(analysis)
      this._renderRedistribution(analysis, validHoldings)
      this._renderMonteCarlo(analysis)
      this._renderCorrelationHeatmap(validTickers, returnsMatrix)
      this._renderRiskContribution(analysis, returnsMatrix)

      // Sincronización con Precios de Mercado Reales
      await this._updateMarketPrices(validTickers)
      this._renderCurrentHoldings(validHoldings)

      document.getElementById('analysis-summary').innerHTML = `
Analizado contra ${benchmarkTicker}.`
      loadingDiv.style.display = 'none'
      resultsDiv.style.display = 'block'
      pdfBtn.style.display = 'inline-flex'
    } catch (e) {
      console.error(e)
      showToast(e.message, 'error')
      loadingDiv.style.display = 'none'
    }
  },

  async _updateMarketPrices(tickers) {
    this._resolvedPrices = {}
    if (!tickers || tickers.length === 0) return
    try {
      const data = await apiRequest('GET', `/api/quotes?tickers=${encodeURIComponent(tickers.join(','))}`)
      for (const ticker of tickers) {
        this._resolvedPrices[ticker] = data[ticker]?.price ?? null
      }
    } catch (err) { console.error('Error precios:', err) }
  },

  _renderCurrentHoldings(holdings) {
    const tableContainer = document.getElementById('current-holdings-table')
    const chartContainer = document.getElementById('current-holdings-chart')
    const byCurrency = {}
    holdings.forEach(h => { if (!byCurrency[h.currency]) byCurrency[h.currency] = []; byCurrency[h.currency].push(h) })

    let html = ''; let totalMarketValueAll = 0
    const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'
    const sign = v => v > 0 ? '+' : ''

    for (const [curr, items] of Object.entries(byCurrency)) {
      const totalInv = items.reduce((acc, h) => acc + (h.total_quantity * h.avg_buy_price), 0)
      const totalMarket = items.reduce((acc, h) => acc + (h.total_quantity * (this._resolvedPrices?.[h.ticker] ?? h.avg_buy_price)), 0)
      totalMarketValueAll += totalMarket

      html += `
        <div class="currency-group" style="margin-bottom: 1.5rem">
          <h4 style="font-size: 0.9rem; color: var(--color-primary); margin-bottom: 0.75rem">Tenencia en ${curr}</h4>
          <div class="table-wrapper">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th style="text-align:right">Cantidad</th>
                  <th style="text-align:right">Costo Prom.</th>
                  <th style="text-align:right">Invertido</th>
                  <th style="text-align:right">Precio Act.</th>
                  <th style="text-align:right">Valor Act.</th>
                  <th style="text-align:right">P&L $</th>
                  <th style="text-align:right">P&L %</th>
                  <th style="text-align:right">%</th>
                </tr>
              </thead>
              <tbody>`

      items.sort((a, b) => (b.total_quantity * (this._resolvedPrices?.[b.ticker] ?? b.avg_buy_price)) - (a.total_quantity * (this._resolvedPrices?.[a.ticker] ?? a.avg_buy_price)))

      items.forEach(h => {
        const price = this._resolvedPrices?.[h.ticker] ?? null
        const currentVal = price ? h.total_quantity * price : (h.total_quantity * h.avg_buy_price)
        const invested = h.total_quantity * h.avg_buy_price
        const pnl = price ? (price - h.avg_buy_price) * h.total_quantity : 0
        const pnlPct = (h.avg_buy_price > 0 && price) ? ((price / h.avg_buy_price) - 1) * 100 : 0
        const weight = (currentVal / totalMarket) * 100
        html += `
          <tr>
            <td><span class="ticker-chip">${h.ticker}</span></td>
            <td class="amount">${h.total_quantity.toLocaleString('es-AR')}</td>
            <td class="amount">${fmt(h.avg_buy_price)}</td>
            <td class="amount">${fmt(invested)}</td>
            <td class="amount"><strong>${price ? fmt(price) : '--'}</strong></td>
            <td class="amount"><strong>${fmt(currentVal)}</strong></td>
            <td class="amount" style="color: ${pnlColor(pnl)}; font-weight: bold">${sign(pnl)}${fmt(pnl)}</td>
            <td class="amount" style="color: ${pnlColor(pnlPct)}; font-weight: bold">${sign(pnlPct)}${pnlPct.toFixed(2)}%</td>
            <td class="amount" style="color: var(--text-muted); font-weight: 600">${weight.toFixed(1)}%</td>
          </tr>`
      })

      html += `
              </tbody>
              <tfoot style="background-color: var(--bg-main); font-weight: 800; border-top: 2px solid var(--border)">
                <tr>
                  <td colspan="3" style="background: transparent; color: var(--text-main)">TOTAL ${curr}</td>
                  <td class="amount" style="background: transparent; color: var(--text-main)">${fmt(totalInv)}</td>
                  <td style="background: transparent"></td>
                  <td class="amount" style="background: transparent; color: var(--text-main)">${fmt(totalMarket)}</td>
                  <td class="amount" style="background: transparent; color: ${pnlColor(totalMarket - totalInv)}">${sign(totalMarket - totalInv)}${fmt(totalMarket - totalInv)}</td>
                  <td class="amount" style="background: transparent; color: ${pnlColor(totalMarket - totalInv)}">${sign(totalMarket / totalInv - 1)}${((totalMarket / totalInv - 1) * 100).toFixed(2)}%</td>
                  <td class="amount" style="background: transparent; color: var(--text-muted)">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>`

    }
    tableContainer.innerHTML = html
    const chartData = holdings.map(h => ({ ticker: h.ticker, currentValue: h.total_quantity * (this._resolvedPrices?.[h.ticker] ?? h.avg_buy_price) }))
    chartContainer.innerHTML = this._renderDonutChart(chartData, totalMarketValueAll)
  },

  _renderDonutChart(items, total) {
    const colors = ['#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']
    const cx = 100, cy = 100, R = 85, hole = 55
    const midR = (R + hole) / 2
    let angle = -Math.PI / 2
    const sectors = []
    const labels = []
    items.forEach((h, i) => {
      const pct = h.currentValue / total
      const sweep = pct * 2 * Math.PI
      const end = angle + sweep
      const color = colors[i % colors.length]
      const mid = angle + sweep / 2
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
      const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end)
      const x3 = cx + hole * Math.cos(end), y3 = cy + hole * Math.sin(end)
      const x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)
      const d = `M${x1} ${y1} A${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${sweep > Math.PI ? 1 : 0} 0 ${x4} ${y4}Z`
      sectors.push(`<path d="${d}" fill="${color}" stroke="var(--bg-card)" stroke-width="1"></path>`)
      if (pct > 0.05) {
        const lx = cx + midR * Math.cos(mid), ly = cy + midR * Math.sin(mid)
        labels.push(`<text x="${lx}" y="${ly + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="white">${h.ticker}</text>`)
      }
      angle = end
    })
    return `<svg viewBox="0 0 200 200" style="width: 100%; max-width: 300px; height: auto">${sectors.join('')}${labels.join('')}</svg>`
  },

  async _generatePDF() {
    const resultsEl = document.getElementById('analysis-results')
    if (!resultsEl) return
    const alycSelect = document.getElementById('analysis-alyc-select')
    const alycName = alycSelect.options[alycSelect.selectedIndex]?.text || 'Cartera'
    const pdfBtn = document.getElementById('btn-generate-pdf')
    const originalText = pdfBtn.textContent
    pdfBtn.textContent = 'Generando...'
    pdfBtn.disabled = true
    try {
      const canvas = await window.html2canvas(resultsEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#f1f5f9' })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const imgW = canvas.width / 2, imgH = canvas.height / 2
      const mmW = imgW * 0.264583, mmH = imgH * 0.264583
      const { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW + 20, mmH + 35], compress: true })
      doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(79, 70, 230)
      doc.text(`REPORTE DE ANÁLISIS ESTRATÉGICO - ${alycName.toUpperCase()}`, 10, 15)
      doc.setFontSize(8).setTextColor(148, 163, 184)
      doc.text(`Generado el ${new Date().toLocaleString()} | Stocker Intelligence`, 10, 20)
      doc.addImage(imgData, 'PNG', 10, 25, mmW, mmH)
      doc.save(`Stocker_Analisis_${alycName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      showToast('Captura generada con éxito', 'success')
    } catch (err) {
      console.error(err)
      showToast('Error al generar PDF', 'error')
    } finally {
      pdfBtn.textContent = originalText
      pdfBtn.disabled = false
    }
  },

  _calculateReturns(histories, masterCalendar) {
    const toDateStr = (ts) => new Date(ts * 1000).toISOString().split('T')[0]
    const masterDateStrings = masterCalendar.map(h => toDateStr(h.date))
    return histories.map(history => {
      const priceMap = {}
      history.forEach(h => priceMap[toDateStr(h.date)] = h.price)
      const alignedPrices = []
      let lastValidPrice = null
      masterDateStrings.forEach(dateStr => {
        const currentPrice = priceMap[dateStr]
        if (currentPrice != null) { alignedPrices.push(currentPrice); lastValidPrice = currentPrice }
        else if (lastValidPrice !== null) alignedPrices.push(lastValidPrice)
        else { const first = history.find(h => h.price != null)?.price || 0; alignedPrices.push(first); lastValidPrice = first }
      })
      const returns = []
      for (let i = 1; i < alignedPrices.length; i++) {
        const prev = alignedPrices[i - 1], curr = alignedPrices[i]
        const ret = prev === 0 ? 0 : (curr - prev) / prev
        returns.push(isNaN(ret) ? 0 : ret)
      }
      return returns
    })
  },

  _performMarkowitz(tickers, returnsMatrix, holdings) {
    const numAssets = tickers.length, numPortfolios = 1000
    const avgReturnsDaily = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length)
    const stdDevsDaily = returnsMatrix.map((r, i) => Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avgReturnsDaily[i], 2), 0) / r.length))
    const avgReturns = avgReturnsDaily.map(r => r * 252), stdDevs = stdDevsDaily.map(s => s * Math.sqrt(252))
    const portfolios = [], minWeight = 0.05, totalMinWeight = numAssets * minWeight
    let maxSharpeIdx = 0, maxSharpe = -Infinity
    for (let i = 0; i < numPortfolios; i++) {
      let weights
      if (totalMinWeight < 1) {
        const raw = Array.from({ length: numAssets }, () => Math.random()), sumRaw = raw.reduce((a, b) => a + b, 0)
        weights = raw.map(rw => minWeight + (rw / sumRaw) * (1 - totalMinWeight))
      } else { weights = Array.from({ length: numAssets }, () => Math.random()); const s = weights.reduce((a, b) => a + b, 0); weights = weights.map(w => w / s) }
      const pR = weights.reduce((acc, w, idx) => acc + w * avgReturns[idx], 0), pS = weights.reduce((acc, w, idx) => acc + w * stdDevs[idx], 0), sharpe = pS === 0 ? 0 : pR / pS
      portfolios.push({ weights, return: pR, std: pS, sharpe })
      if (sharpe > maxSharpe) { maxSharpe = sharpe; maxSharpeIdx = i }
    }
    const totalValue = holdings.reduce((acc, h) => acc + (h.total_quantity * h.avg_buy_price), 0), currentWeights = holdings.map(h => (h.total_quantity * h.avg_buy_price) / totalValue)
    return { portfolios, tickers, optimal: portfolios[maxSharpeIdx], current: { weights: currentWeights, return: currentWeights.reduce((acc, w, idx) => acc + w * avgReturns[idx], 0), std: currentWeights.reduce((acc, w, idx) => acc + w * stdDevs[idx], 0) } }
  },

  async _renderChart(analysis) {
    const ctx = document.getElementById('markowitz-chart').getContext('2d')
    if (this._chart) this._chart.destroy()
    this._chart = new window.Chart(ctx, {
      type: 'scatter',
      data: { datasets: [{ label: 'Aleatorias', data: analysis.portfolios.map(p => ({ x: p.std, y: p.return })), backgroundColor: 'rgba(150, 150, 150, 0.4)', pointRadius: 2 }, { label: 'Óptima', data: [{ x: analysis.optimal.std, y: analysis.optimal.return }], backgroundColor: '#10b981', pointRadius: 8, borderColor: '#fff', borderWidth: 2 }, { label: 'Actual', data: [{ x: analysis.current.std, y: analysis.current.return }], backgroundColor: '#3b82f6', pointRadius: 8, pointStyle: 'rectRot', borderColor: '#fff', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Riesgo (Vol %)' }, ticks: { callback: v => (v * 100).toFixed(0) + '%' } }, y: { title: { display: true, text: 'Retorno (%)' }, ticks: { callback: v => (v * 100).toFixed(0) + '%' } } } }
    })
  },

  _renderDonutChart(items, total) {
    const colors = ['#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']
    const cx = 100, cy = 100, R = 85, hole = 55, midR = (R + hole) / 2
    let angle = -Math.PI / 2
    const sectors = [], labels = []
    items.forEach((h, i) => {
      const pct = h.currentValue / total, sweep = pct * 2 * Math.PI, end = angle + sweep, color = colors[i % colors.length]
      const mid = angle + sweep / 2, x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle), x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end), x3 = cx + hole * Math.cos(end), y3 = cy + hole * Math.sin(end), x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)
      sectors.push(`<path d="M${x1} ${y1} A${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${sweep > Math.PI ? 1 : 0} 0 ${x4} ${y4}Z" fill="${color}" stroke="var(--bg-card)" stroke-width="1"></path>`)
      if (pct > 0.05) labels.push(`<text x="${cx + midR * Math.cos(mid)}" y="${cy + midR * Math.sin(mid) + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="white">${h.ticker}</text>`)
      angle = end
    })
    return `<svg viewBox="0 0 200 200" style="width: 100%; max-width: 300px; height: auto">${sectors.join('')}${labels.join('')}</svg>`
  },

  _renderRedistribution(analysis, holdings) {
    const container = document.getElementById('redistribution-table')
    const tickers = analysis.tickers, currentWeights = analysis.current.weights, optimalWeights = analysis.optimal.weights
    let html = `<table class="table"><thead><tr><th>Activo</th><th>Actual</th><th>Sug.</th><th>Dif.</th></tr></thead><tbody>`
    tickers.forEach((ticker, i) => {
      const diff = (optimalWeights[i] - currentWeights[i]) * 100
      html += `<tr><td><strong>${ticker}</strong></td><td>${(currentWeights[i] * 100).toFixed(1)}%</td><td style="font-weight: 600">${(optimalWeights[i] * 100).toFixed(1)}%</td><td class="${diff > 0 ? 'text-success' : 'text-danger'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</td></tr>`
    })
    container.innerHTML = html + `</tbody></table>`
  },

  _renderMonteCarlo(analysis) {
    const ctx = document.getElementById('montecarlo-chart').getContext('2d')
    const dailyReturn = analysis.optimal.return / 252, dailyVol = analysis.optimal.std / Math.sqrt(252), datasets = []
    const randn_bm = () => { let u = 0, v = 0; while(u === 0) u = Math.random(); while(v === 0) v = Math.random(); return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); }
    for (let s = 0; s < 50; s++) {
      const data = [100]; let current = 100
      for (let d = 1; d <= 252; d++) { current *= (1 + (dailyReturn + dailyVol * randn_bm())); data.push(current) }
      datasets.push({ data, borderColor: s === 0 ? '#10b981' : 'rgba(150, 150, 150, 0.2)', borderWidth: s === 0 ? 3 : 1, pointRadius: 0, fill: false })
    }
    if (this._mcChart) this._mcChart.destroy()
    this._mcChart = new window.Chart(ctx, { type: 'line', data: { labels: Array.from({ length: 253 }, (_, i) => `D${i}`), datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { title: { display: true, text: 'Valor (Base 100)' } } }, plugins: { legend: { display: false } } } })
  },

  _renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker) {
    const ctx = document.getElementById('backtesting-chart').getContext('2d')
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length)
    let pE = 100, bE = 100; const pS = [100], bS = [100]
    for (let d = 0; d < numDays; d++) {
      let dR = 0; analysis.current.weights.forEach((w, i) => dR += w * returnsMatrix[i][d])
      pE *= (1 + dR); bE *= (1 + benchmarkReturns[d]); pS.push(pE); bS.push(bE)
    }
    const diff = (pE - bE).toFixed(1)
    document.getElementById('backtesting-result').innerHTML = `<span style="color:#4f46e6">Port: ${(pE-100).toFixed(1)}%</span> | <span style="color:#94a3b8">${benchmarkTicker}: ${(bE-100).toFixed(1)}%</span><div style="font-size:0.75rem;color:${diff >= 0 ? '#10b981' : '#ef4444'}">${diff >= 0 ? '+' : ''}${diff}%</div>`
    if (this._btChart) this._btChart.destroy()
    this._btChart = new window.Chart(ctx, { type: 'line', data: { labels: Array.from({ length: pS.length }, (_, i) => i), datasets: [{ label: 'Mio', data: pS, borderColor: '#4f46e6', backgroundColor: 'rgba(79, 70, 230, 0.1)', fill: true, pointRadius: 0, borderWidth: 3 }, { label: benchmarkTicker, data: bS, borderColor: '#94a3b8', borderDash: [5, 5], pointRadius: 0, borderWidth: 2, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { title: { display: true, text: 'Valor' } } }, plugins: { legend: { position: 'top' } } } })
  },

  _renderRiskContribution(analysis, returnsMatrix) {
    const ctx = document.getElementById('risk-contribution-chart').getContext('2d')
    const stdDevs = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) })
    const raw = analysis.current.weights.map((w, i) => w * stdDevs[i]), total = raw.reduce((a, b) => a + b, 0)
    if (this._rcChart) this._rcChart.destroy()
    this._rcChart = new window.Chart(ctx, { type: 'bar', data: { labels: analysis.tickers, datasets: [{ label: '% Riesgo', data: raw.map(c => (c / total) * 100), backgroundColor: '#4f46e6', borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { max: 100, ticks: { callback: v => v + '%' } } } }, plugins: { legend: { display: false } } })
  },

  _performCAPM(analysis, returnsMatrix, benchmarkReturns) {
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length), pDR = []
    for (let d = 0; d < numDays; d++) { let r = 0; analysis.current.weights.forEach((w, i) => r += w * returnsMatrix[i][d]); pDR.push(r) }
    const mR = benchmarkReturns.slice(0, numDays), mAvg = mR.reduce((a,b)=>a+b,0)/numDays, pAvg = pDR.reduce((a,b)=>a+b,0)/numDays
    let cov = 0, vM = 0; for (let i = 0; i < numDays; i++) { cov += (pDR[i] - pAvg) * (mR[i] - mAvg); vM += Math.pow(mR[i] - mAvg, 2) }
    const beta = vM === 0 ? 0 : cov / vM, r2 = vM === 0 ? 0 : Math.pow(cov, 2) / (vM * pDR.reduce((a, r) => a + Math.pow(r - pAvg, 2), 0))
    const alpha = (pAvg * 252) - (beta * (mAvg * 252)), sorted = [...pDR].sort((a,b)=>a-b), vR = sorted[Math.floor(sorted.length * 0.05)] || 0
    document.getElementById('capm-beta').textContent = beta.toFixed(2)
    document.getElementById('capm-r2').textContent = (r2 * 100).toFixed(0) + '%'
    document.getElementById('capm-alpha').textContent = (alpha > 0 ? '+' : '') + (alpha * 100).toFixed(1) + '%'
    document.getElementById('capm-alpha').style.color = alpha >= 0 ? '#10b981' : '#ef4444'
    document.getElementById('analysis-var').textContent = (vR * 100).toFixed(2) + '%'
    const bD = document.getElementById('capm-beta-desc')
    bD.textContent = beta > 1.2 ? 'Agresivo' : (beta < 0.8 ? 'Defensivo' : 'Neutral')
    bD.style.color = beta > 1.2 ? '#ef4444' : (beta < 0.8 ? '#3b82f6' : 'var(--text-muted)')
    return { beta, alpha, r2 }
  },

  _renderStressTest(beta) {
    const scenarios = [{ name: 'Crash COVID', drop: -34, d: 'Pánico global' }, { name: 'Crisis 2008', drop: -50, d: 'Recesión' }, { name: 'Shock Tech', drop: -15, d: 'Valuaciones' }, { name: 'Cisne Negro', drop: -10, d: 'Inesperado' }]
    document.getElementById('stress-test-results').innerHTML = scenarios.map(s => `
      <div style="padding: 0.6rem 0.8rem; border-radius: var(--radius); background: var(--bg-main); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center">
        <div><div style="font-size: 0.75rem; font-weight: 700">${s.name}</div><div style="font-size: 0.6rem; color: var(--text-muted)">Mkt: ${s.drop}%</div></div>
        <div style="text-align: right; font-size: 1rem; font-weight: 800; color: #ef4444">${(beta * s.drop).toFixed(1)}%</div>
      </div>`).join('')
  },

  _renderDrawdownChart(analysis, returnsMatrix) {
    const ctx = document.getElementById('drawdown-chart').getContext('2d')
    const numDays = returnsMatrix[0].length
    let cumulativeReturn = 1, drawdowns = [0], peak = 1, maxDrawdown = 0
    for (let d = 0; d < numDays; d++) {
      let dayReturn = 0
      analysis.current.weights.forEach((w, i) => dayReturn += w * returnsMatrix[i][d])
      cumulativeReturn *= (1 + dayReturn)
      if (cumulativeReturn > peak) peak = cumulativeReturn
      const dd = (cumulativeReturn - peak) / peak
      drawdowns.push(dd * 100)
      if (dd < maxDrawdown) maxDrawdown = dd
    }
    document.getElementById('analysis-mdd').textContent = (maxDrawdown * 100).toFixed(2) + '%'
    if (this._ddChart) this._ddChart.destroy()
    this._ddChart = new window.Chart(ctx, { type: 'line', data: { labels: Array.from({ length: drawdowns.length }, (_, i) => i), datasets: [{ label: 'Drawdown (%)', data: drawdowns, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { max: 0 } }, plugins: { legend: { display: false } } } })
  },

  _renderMonteCarlo(analysis) {
    const ctx = document.getElementById('montecarlo-chart').getContext('2d')
    const dailyReturn = analysis.optimal.return / 252, dailyVol = analysis.optimal.std / Math.sqrt(252), datasets = []
    const randn_bm = () => { let u = 0, v = 0; while(u === 0) u = Math.random(); while(v === 0) v = Math.random(); return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); }
    for (let s = 0; s < 50; s++) {
      const data = [100]; let current = 100
      for (let d = 1; d <= 252; d++) { current *= (1 + (dailyReturn + dailyVol * randn_bm())); data.push(current) }
      datasets.push({ data, borderColor: s === 0 ? '#10b981' : 'rgba(150, 150, 150, 0.2)', borderWidth: s === 0 ? 3 : 1, pointRadius: 0, fill: false })
    }
    if (this._mcChart) this._mcChart.destroy()
    this._mcChart = new window.Chart(ctx, { type: 'line', data: { labels: Array.from({ length: 253 }, (_, i) => `D${i}`), datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { title: { display: true, text: 'Valor (Base 100)' } } }, plugins: { legend: { display: false } } } })
  },

  _renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker) {
    const ctx = document.getElementById('backtesting-chart').getContext('2d')
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length)
    let pE = 100, bE = 100; const pS = [100], bS = [100]
    for (let d = 0; d < numDays; d++) {
      let dR = 0; analysis.current.weights.forEach((w, i) => dR += w * returnsMatrix[i][d])
      pE *= (1 + dR); bE *= (1 + benchmarkReturns[d]); pS.push(pE); bS.push(bE)
    }
    const diff = (pE - bE).toFixed(1)
    document.getElementById('backtesting-result').innerHTML = `<span style="color:#4f46e6">Mio: ${(pE-100).toFixed(1)}%</span> | <span style="color:#94a3b8">${benchmarkTicker}: ${(bE-100).toFixed(1)}%</span> <div style="font-size:0.75rem;color:${diff >= 0 ? '#10b981' : '#ef4444'}">${diff >= 0 ? '+' : ''}${diff}%</div>`
    if (this._btChart) this._btChart.destroy()
    this._btChart = new window.Chart(ctx, { type: 'line', data: { labels: Array.from({ length: pS.length }, (_, i) => i), datasets: [{ label: 'Portfolio', data: pS, borderColor: '#4f46e6', backgroundColor: 'rgba(79, 70, 230, 0.1)', fill: true, pointRadius: 0, borderWidth: 3 }, { label: benchmarkTicker, data: bS, borderColor: '#94a3b8', borderDash: [5, 5], pointRadius: 0, borderWidth: 2, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { display: false } }, plugins: { legend: { position: 'top' } } } })
  },

  _renderRiskContribution(analysis, returnsMatrix) {
    const ctx = document.getElementById('risk-contribution-chart').getContext('2d')
    const stdDevs = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) })
    const raw = analysis.current.weights.map((w, i) => w * stdDevs[i]), total = raw.reduce((a, b) => a + b, 0)
    if (this._rcChart) this._rcChart.destroy()
    this._rcChart = new window.Chart(ctx, { type: 'bar', data: { labels: analysis.tickers, datasets: [{ label: '% Riesgo', data: raw.map(c => (c / total) * 100), backgroundColor: '#4f46e6', borderRadius: 4 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { max: 100, ticks: { callback: v => v + '%' } } } }, plugins: { legend: { display: false } } })
  },

  _renderCorrelationHeatmap(tickers, returnsMatrix) {
    const container = document.getElementById('correlation-matrix')
    const numAssets = tickers.length, numDays = returnsMatrix[0].length
    const stats = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return { avg, std: Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) } })
    let html = `<table class="correlation-table" style="width:100%; border-spacing: 2px; font-size: 0.8rem"><tr><th></th>`
    tickers.forEach(t => html += `<th style="text-align:center; padding: 4px">${t}</th>`)
    for (let i = 0; i < numAssets; i++) {
      html += `<tr><td style="font-weight:bold; padding: 4px">${tickers[i]}</td>`
      for (let j = 0; j < numAssets; j++) {
        let cov = 0; for (let d = 0; d < numDays; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
        const corr = (stats[i].std * stats[j].std === 0) ? 0 : (cov / numDays) / (stats[i].std * stats[j].std)
        let bg = corr > 0.5 ? `rgba(16, 185, 129, ${corr})` : (corr < -0.2 ? `rgba(239, 68, 68, ${Math.abs(corr)})` : 'rgba(200, 200, 200, 0.1)')
        html += `<td style="background-color: ${bg}; text-align:center; padding: 8px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05)">${corr.toFixed(2)}</td>`
      }
      html += `</tr>`
    }
    container.innerHTML = html + `</table>`
  },

  async _generatePDF() {
    const resultsEl = document.getElementById('analysis-results')
    if (!resultsEl) return
    const alycSelect = document.getElementById('analysis-alyc-select')
    const alycName = alycSelect.options[alycSelect.selectedIndex]?.text || 'Cartera'
    const pdfBtn = document.getElementById('btn-generate-pdf'), originalText = pdfBtn.textContent
    pdfBtn.textContent = 'Generando...'; pdfBtn.disabled = true
    try {
      const canvas = await window.html2canvas(resultsEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#f1f5f9' })
      const imgData = canvas.toDataURL('image/jpeg', 0.95), imgW = canvas.width / 2, imgH = canvas.height / 2
      const mmW = imgW * 0.264583, mmH = imgH * 0.264583, { jsPDF } = window.jspdf
      const doc = new jsPDF({ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW + 20, mmH + 35], compress: true })
      doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(79, 70, 230)
      doc.text(`REPORTE DE ANÁLISIS ESTRATÉGICO - ${alycName.toUpperCase()}`, 10, 15)
      doc.setFontSize(8).setTextColor(148, 163, 184).text(`Generado el ${new Date().toLocaleString()} | Stocker Intelligence`, 10, 20)
      doc.addImage(imgData, 'PNG', 10, 25, mmW, mmH)
      doc.save(`Stocker_Analisis_${alycName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      showToast('Captura generada con éxito', 'success')
    } catch (err) { console.error(err); showToast('Error PDF', 'error') } finally { pdfBtn.textContent = originalText; pdfBtn.disabled = false }
  },

  _calculateReturns(histories, masterCalendar) {
    const toDateStr = (ts) => new Date(ts * 1000).toISOString().split('T')[0], masterDateStrings = masterCalendar.map(h => toDateStr(h.date))
    return histories.map(history => {
      const priceMap = {}; history.forEach(h => priceMap[toDateStr(h.date)] = h.price)
      const aligned = []; let last = null; masterDateStrings.forEach(d => { if (priceMap[d] != null) { aligned.push(priceMap[d]); last = priceMap[d] } else if (last !== null) aligned.push(last); else { const f = history.find(h => h.price != null)?.price || 0; aligned.push(f); last = f } })
      const returns = []; for (let i = 1; i < aligned.length; i++) { const p = aligned[i - 1], c = aligned[i], r = p === 0 ? 0 : (c - p) / p; returns.push(isNaN(r) ? 0 : r) }
      return returns
    })
  },

  _performMarkowitz(tickers, returnsMatrix, holdings) {
    const numAssets = tickers.length, numPortfolios = 1000
    const avgRD = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length), stdRD = returnsMatrix.map((r, i) => Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avgRD[i], 2), 0) / r.length))
    const avgR = avgRD.map(r => r * 252), stdR = stdRD.map(s => s * Math.sqrt(252)), portfolios = [], minWeight = 0.05, totalMin = numAssets * minWeight
    let maxSharpeIdx = 0, maxSharpe = -Infinity
    for (let i = 0; i < numPortfolios; i++) {
      let w; if (totalMin < 1) { const raw = Array.from({ length: numAssets }, () => Math.random()), sumR = raw.reduce((a, b) => a + b, 0); w = raw.map(rw => minWeight + (rw / sumR) * (1 - totalMin)) }
      else { w = Array.from({ length: numAssets }, () => Math.random()); const s = w.reduce((a, b) => a + b, 0); w = w.map(v => v / s) }
      const pR = w.reduce((a, v, idx) => a + v * avgR[idx], 0), pS = w.reduce((a, v, idx) => a + v * stdR[idx], 0), sh = pS === 0 ? 0 : pR / pS
      portfolios.push({ weights: w, return: pR, std: pS, sharpe: sh }); if (sh > maxSharpe) { maxSharpe = sh; maxSharpeIdx = i }
    }
    const totalV = holdings.reduce((a, h) => a + (h.total_quantity * h.avg_buy_price), 0), currW = holdings.map(h => (h.total_quantity * h.avg_buy_price) / totalV)
    return { portfolios, tickers, optimal: portfolios[maxSharpeIdx], current: { weights: currW, return: currW.reduce((a, v, i) => a + v * avgR[i], 0), std: currW.reduce((a, v, i) => a + v * stdR[i], 0) } }
  },

  async _renderChart(analysis) {
    const ctx = document.getElementById('markowitz-chart').getContext('2d')
    if (this._chart) this._chart.destroy()
    this._chart = new window.Chart(ctx, { type: 'scatter', data: { datasets: [{ label: 'Aleatorias', data: analysis.portfolios.map(p => ({ x: p.std, y: p.return })), backgroundColor: 'rgba(150, 150, 150, 0.4)', pointRadius: 2 }, { label: 'Óptima', data: [{ x: analysis.optimal.std, y: analysis.optimal.return }], backgroundColor: '#10b981', pointRadius: 8, borderColor: '#fff', borderWidth: 2 }, { label: 'Actual', data: [{ x: analysis.current.std, y: analysis.current.return }], backgroundColor: '#3b82f6', pointRadius: 8, pointStyle: 'rectRot', borderColor: '#fff', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Riesgo (Vol %)' }, ticks: { callback: v => (v * 100).toFixed(0) + '%' } }, y: { title: { display: true, text: 'Retorno (%)' }, ticks: { callback: v => (v * 100).toFixed(0) + '%' } } } } })
  },

  _renderDonutChart(items, total) {
    const colors = ['#4f46e6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']
    const cx = 100, cy = 100, R = 85, hole = 55, midR = (R + hole) / 2; let angle = -Math.PI / 2; const sectors = [], labels = []
    items.forEach((h, i) => {
      const pct = h.currentValue / total, sweep = pct * 2 * Math.PI, end = angle + sweep, color = colors[i % colors.length], mid = angle + sweep / 2, x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle), x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end), x3 = cx + hole * Math.cos(end), y3 = cy + hole * Math.sin(end), x4 = cx + hole * Math.cos(angle), y4 = cy + hole * Math.sin(angle)
      sectors.push(`<path d="M${x1} ${y1} A${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} L${x3} ${y3} A${hole} ${hole} 0 ${sweep > Math.PI ? 1 : 0} 0 ${x4} ${y4}Z" fill="${color}" stroke="var(--bg-card)" stroke-width="1"></path>`)
      if (pct > 0.05) labels.push(`<text x="${cx + midR * Math.cos(mid)}" y="${cy + midR * Math.sin(mid) + 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="white">${h.ticker}</text>`)
      angle = end
    })
    return `<svg viewBox="0 0 200 200" style="width: 100%; max-width: 300px; height: auto">${sectors.join('')}${labels.join('')}</svg>`
  },

  _renderRedistribution(analysis, holdings) {
    const container = document.getElementById('redistribution-table')
    let html = `<table class="table"><thead><tr><th>Activo</th><th>Actual</th><th>Sug.</th><th>Dif.</th></tr></thead><tbody>`
    analysis.tickers.forEach((ticker, i) => {
      const diff = (analysis.optimal.weights[i] - analysis.current.weights[i]) * 100
      html += `<tr><td><strong>${ticker}</strong></td><td>${(analysis.current.weights[i] * 100).toFixed(1)}%</td><td style="font-weight: 600">${(analysis.optimal.weights[i] * 100).toFixed(1)}%</td><td class="${diff > 0 ? 'text-success' : 'text-danger'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</td></tr>`
    })
    container.innerHTML = html + `</tbody></table>`
  }
}
