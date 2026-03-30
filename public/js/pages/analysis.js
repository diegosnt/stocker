import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'
import { showToast } from '../init.js'
import { get as cacheGet, set as cacheSet } from '../cache.js'
import { renderIfChanged, clearRenderCache } from '../smart-render.js'
import { ChartManager } from '../chart-manager.js'
import { sanitize, sanitizeAttr } from '../utils.js'

export const AnalysisPage = {
  _chart: null,
  _mcChart: null,
  _btChart: null,
  _rcChart: null,
  _ddChart: null,
  _treemapChart: null,
  _assetChart: null,
  _typeChart: null,
  _resolvedPrices: {},
  _activeAlycName: null,
  _activeAlycId: null,

  cleanup() {
    const charts = [
      this._chart, this._mcChart, this._btChart, 
      this._rcChart, this._ddChart, this._treemapChart,
      this._assetChart, this._typeChart
    ]
    charts.forEach(chart => {
      if (chart) {
        chart.destroy()
      }
    })
    this._chart = null
    this._mcChart = null
    this._btChart = null
    this._rcChart = null
    this._ddChart = null
    this._treemapChart = null
    this._assetChart = null
    this._typeChart = null
    clearRenderCache(document.getElementById('page-content'))
  },

  async render() {
    this.cleanup()
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Análisis de Cartera</h2>
      </div>

      <div class="card" style="margin-bottom: 2rem">
        <div style="display: flex; gap: 1.5rem; align-items: stretch; flex-wrap: wrap; justify-content: space-between">
          
          <!-- Sector ALyCs (Alineado a la izquierda, altura estirada) -->
          <div style="flex: 1; min-width: 300px; background: var(--bg-main); padding: 1rem 1.25rem; border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column">
            <label style="display: block; margin-bottom: 1rem; font-weight: 700; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; text-align: left">Analizar Cartera por ALyC</label>
            <div id="analysis-alyc-buttons" style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; flex: 1; align-items: center">
              <span style="color: var(--text-muted); font-size: 0.85rem">Cargando ALyCs...</span>
            </div>
          </div>

          <!-- Sector Benchmark (Tarjeta Independiente y Centrada) -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-main); padding: 1rem; border-radius: var(--radius); border: 1px solid var(--border); min-width: 250px">
            <div class="form-group" style="margin:0; width: 160px; text-align: center">
              <label style="font-weight: 700; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem">Benchmark Base</label>
              <div style="display: flex; gap: 0.25rem; margin-bottom: 0.5rem; justify-content: center">
                <button class="btn-benchmark-quick" data-ticker="SPY" style="padding: 2px 6px; font-size: 0.65rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text-muted); font-weight: 700">SPY</button>
                <button class="btn-benchmark-quick" data-ticker="QQQ" style="padding: 2px 6px; font-size: 0.65rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text-muted); font-weight: 700">QQQ</button>
                <button class="btn-benchmark-quick" data-ticker="DIA" style="padding: 2px 6px; font-size: 0.65rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text-muted); font-weight: 700">DIA</button>
                <button class="btn-benchmark-quick" data-ticker="IWM" style="padding: 2px 6px; font-size: 0.65rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text-muted); font-weight: 700">IWM</button>
              </div>
              <input type="text" id="analysis-benchmark" class="form-input" value="SPY" placeholder="Ej: SPY" style="font-weight: 700; height: 32px; text-align: center">
            </div>
          </div>

          <!-- Contenedor fijo para el botón PDF (Altura igualada a las tarjetas, siempre visible) -->
          <div style="width: 180px; display: flex; align-items: stretch; justify-content: center">
            <button id="btn-generate-pdf" class="btn btn-primary" disabled style="display: flex; width: 100%; height: 100%; font-size: 0.85rem; font-weight: 700; flex-direction: column; gap: 0.4rem; justify-content: center; align-items: center; line-height: 1.2; box-shadow: var(--shadow-sm); border-radius: var(--radius); opacity: 0.5; cursor: not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>Generar Reporte PDF</span>
            </button>
          </div>

        </div>
      </div>

      <div id="analysis-results" style="display: none">
        <!-- SECCIÓN 0: Tenencia Actual -->
        <div id="analysis-section-0" style="display: grid; grid-template-columns: 6fr 2fr 2fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0; padding: 1.25rem">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Detalle de Tenencia Actual</h3>
            <div id="current-holdings-table" style="overflow-x: auto"></div>
          </div>
          <div class="card" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Activo</h3>
            <div id="current-holdings-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
          </div>
          <div id="type-distribution-card" class="card" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Tipo</h3>
            <div id="current-type-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
          </div>
        </div>

        <!-- SECCIÓN 1: KPIs y Eficiencia -->
        <div style="display: grid; grid-template-columns: 300px 300px 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--text-muted)">Riesgo y Retorno</h3>
            <div id="analysis-kpis-container" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.4rem">
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">Beta</h4>
                <div id="capm-beta" style="font-size: 1.1rem; font-weight: 700; line-height: 1">--</div>
                <p id="capm-beta-desc" style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Cargando...</p>
              </div>
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">VaR (95%)</h4>
                <div id="analysis-var" style="font-size: 1.1rem; font-weight: 700; color: #ef4444; line-height: 1">--</div>
                <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Pérdida diaria prob.</p>
              </div>
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">Max Drawdown</h4>
                <div id="analysis-mdd" style="font-size: 1.1rem; font-weight: 700; color: #ef4444; line-height: 1">--</div>
                <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Mayor caída hist.</p>
              </div>
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">Alpha</h4>
                <div id="capm-alpha" style="font-size: 1.1rem; font-weight: 700; color: #10b981; line-height: 1">--</div>
                <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Excedente anual</p>
              </div>
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">Corr. (R²)</h4>
                <div id="capm-r2" style="font-size: 1.1rem; font-weight: 700; line-height: 1">--</div>
                <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Vs Benchmark</p>
              </div>
            </div>
          </div>

          <div class="card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--text-muted)">Stress Test</h3>
            <div id="stress-test-container" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.4rem">
              <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
                <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">Expected Shortfall (95%)</h4>
                <div id="analysis-es" style="font-size: 1.1rem; font-weight: 700; color: #ef4444; line-height: 1">--</div>
                <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Pérdida promedio en días de pánico</p>
              </div>
              <div id="stress-test-results" style="display: contents">
                <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem">Calculando escenarios...</div>
              </div>
            </div>
          </div>

          <div class="card" style="padding: 1.25rem; height: 100%; margin-bottom: 0">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Frontera Eficiente (Markowitz Pro)</h3>
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

         <!-- SECCIÓN 3: Riesgo y Correlación -->
        <div style="display: grid; grid-template-columns: 5fr 2.5fr 2.5fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem">Optimización: Sharpe vs Michaud vs HRP</h3>
            <div id="redistribution-table" style="font-size: 0.8rem"></div>
          </div>
          <div class="card" style="margin-bottom: 0; padding: 1rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Aporte al Riesgo</h3>
            <div style="flex: 1; min-height: 250px; position: relative">
              <canvas id="risk-contribution-chart"></canvas>
            </div>
          </div>
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem">Matriz de Correlación</h3>
            <div id="correlation-matrix" style="overflow-x: auto; font-size: 0.75rem"></div>
          </div>
        </div>

        <!-- SECCIÓN 4: Comparativa y Mapa de Calor -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Comparativa: Inversión vs Valor Actual ($)</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              Capital invertido frente a valoración de mercado actual por activo.
            </p>
            <div style="flex: 1; min-height: 220px; position: relative">
              <canvas id="comparison-chart"></canvas>
            </div>
          </div>
          <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Mapa de Calor (Peso vs P&L %)</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              El tamaño representa el peso en cartera y el color el rendimiento.
            </p>
            <div id="analysis-heatmap" style="flex: 1; min-height: 220px; position: relative">
              <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; width: 100%">Calculando mapa...</div>
            </div>
          </div>
        </div>

        <div class="card" style="padding: 1rem">
          <p id="analysis-summary" style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4"></p>
        </div>
      </div>

      <div id="analysis-loading" class="card" style="display: none; text-align: center; padding: 3rem">
        <span class="spinner" style="width: 40px; height: 40px; border-width: 4px"></span>
        <p style="margin-top: 1rem">Ejecutando algoritmos de optimización avanzada (Michaud & HRP)...</p>
      </div>`

    this._setupEvents()
    await this._loadAlycs()
  },

  async _loadAlycs() {
    const container = document.getElementById('analysis-alyc-buttons')
    try {
      let data = cacheGet('user_holdings')
      if (!data) {
        const result = await supabase.rpc('get_user_holdings', { p_limit: 500, p_offset: 0 })
        if (result.error) throw result.error
        data = result.data
        if (data) cacheSet('user_holdings', data)
      }
      const alycs = [...new Set(data.map(h => JSON.stringify({ id: h.alyc_id, name: h.alyc_name })))]
        .map(s => JSON.parse(s))
      
      if (alycs.length === 0) {
        container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem">No tenés tenencias registradas</span>'
        return
      }

      container.innerHTML = ''
      alycs.forEach(alyc => {
        const btn = document.createElement('button')
        btn.className = 'btn btn-ghost'
        btn.style.padding = '0.75rem 1.25rem'
        btn.style.minWidth = '160px'
        btn.style.height = '54px'
        btn.style.textAlign = 'center'
        btn.style.fontSize = '0.95rem'
        btn.style.fontWeight = '700'
        btn.style.border = '1px solid var(--border)'
        btn.textContent = alyc.name
        btn.onclick = () => {
          this._activeAlycName = alyc.name
          this._runAnalysis(alyc.id, btn)
        }
        container.appendChild(btn)
      })
    } catch (e) {
      console.error(e)
      container.innerHTML = '<span style="color: #ef4444; font-size: 0.85rem">Error al cargar ALyCs</span>'
    }
  },

  _setupEvents() {
    document.getElementById('btn-generate-pdf').addEventListener('click', () => this._generatePDF())
    
    // Quick Benchmarks
    document.querySelectorAll('.btn-benchmark-quick').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('analysis-benchmark').value = btn.dataset.ticker
        document.querySelectorAll('.btn-benchmark-quick').forEach(b => {
          b.style.background = 'var(--bg-main)'
          b.style.color = 'var(--text-muted)'
          b.style.borderColor = 'var(--border)'
        })
        btn.style.background = 'var(--color-primary)'
        btn.style.color = 'white'
        btn.style.borderColor = 'var(--color-primary)'
        
        if (this._activeAlycId) {
          const activeBtn = Array.from(document.querySelectorAll('#analysis-alyc-buttons button'))
            .find(b => b.textContent === this._activeAlycName)
          this._runAnalysis(this._activeAlycId, activeBtn)
        }
      }
    })
  },

  async _runAnalysis(alycId, activeBtn) {
    if (!alycId) return
    this._activeAlycId = alycId

    // Update active button state
    document.querySelectorAll('#analysis-alyc-buttons button').forEach(b => {
      b.classList.remove('btn-primary')
      b.classList.add('btn-ghost')
      b.style.borderColor = 'var(--border)'
    })
    if (activeBtn) {
      activeBtn.classList.remove('btn-ghost')
      activeBtn.classList.add('btn-primary')
      activeBtn.style.borderColor = 'var(--color-primary)'
    }

    const resultsDiv = document.getElementById('analysis-results')
    const loadingDiv = document.getElementById('analysis-loading')
    const pdfBtn = document.getElementById('btn-generate-pdf')

    resultsDiv.style.display = 'none'
    pdfBtn.disabled = true
    pdfBtn.style.opacity = '0.5'
    pdfBtn.style.cursor = 'not-allowed'
    loadingDiv.style.display = 'block'
    try {
      let holdings = cacheGet('user_holdings')
      if (!holdings) {
        const result = await supabase.rpc('get_user_holdings', { p_limit: 500, p_offset: 0 })
        if (result.error) throw result.error
        holdings = result.data
        if (holdings) cacheSet('user_holdings', holdings)
      }
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
      const failedTickers = []
      this._resolvedPrices = {}

      assetResults.forEach((res, i) => {
        const h = alycHoldings[i]
        if (res.status === 'fulfilled' && res.value?.length > 10) {
          validHistories.push(res.value)
          validTickers.push(h.ticker)
          validHoldings.push(h)
          const lastPoint = res.value[res.value.length - 1]
          if (lastPoint) this._resolvedPrices[h.ticker] = lastPoint.price
        } else {
          failedTickers.push(h.ticker)
        }
      })

      if (failedTickers.length > 0) {
        console.warn(`[Analysis] Failed to load history for: ${failedTickers.join(', ')}`)
      }

      if (validTickers.length < 2) throw new Error('No hay suficientes datos históricos.')
      if (benchmarkResult.status === 'rejected') throw new Error('No se pudo cargar el Benchmark.')

      const benchmarkData = benchmarkResult.value
      const returnsMatrix = this._calculateReturns(validHistories, benchmarkData)
      const benchmarkReturns = this._calculateReturns([benchmarkData], benchmarkData)[0]

      const analysis = this._performMarkowitz(validTickers, returnsMatrix, validHoldings)
      
      analysis.hrp = { weights: this._performHRP(validTickers, returnsMatrix) }
      analysis.michaud = { weights: this._performMichaud(validTickers, returnsMatrix) }

      const capm = this._performCAPM(analysis, returnsMatrix, benchmarkReturns)
      analysis.beta = capm.beta

      this._calculateMDD(analysis, returnsMatrix)
      this._renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker)
      this._renderStressTest(analysis.beta)
      await this._renderChart(analysis)
      this._renderRedistribution(analysis, validHoldings)
      this._renderMonteCarlo(analysis)
      this._renderCorrelationHeatmap(validTickers, returnsMatrix)
      this._renderRiskContribution(analysis, returnsMatrix)

      await this._updateMarketPrices(validTickers)
      this._renderCurrentHoldings(validHoldings)
      this._renderComparisonChart(validHoldings)

      document.getElementById('analysis-summary').innerHTML = `Análisis multi-algoritmo completado contra ${sanitize(benchmarkTicker)}.`
      
      if (failedTickers.length > 0) {
        showToast(`Algunos datos no estarán completos: ${failedTickers.join(', ')}`, 'warning')
      }
      
      loadingDiv.style.display = 'none'
      resultsDiv.style.display = 'block'
      pdfBtn.disabled = false
      pdfBtn.style.opacity = '1'
      pdfBtn.style.cursor = 'pointer'
    } catch (e) {
      console.error(e)
      showToast(e.message, 'error')
      loadingDiv.style.display = 'none'
      pdfBtn.disabled = true
      pdfBtn.style.opacity = '0.5'
      pdfBtn.style.cursor = 'not-allowed'
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
    const assetChartContainer = document.getElementById('current-holdings-chart')
    const typeChartContainer = document.getElementById('current-type-chart')
    const byCurrency = {}
    holdings.forEach(h => { if (!byCurrency[h.currency]) byCurrency[h.currency] = []; byCurrency[h.currency].push(h) })

    let html = ''; let totalMarketValueAll = 0
    const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2 })
    const pnlColor = v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : 'var(--text-muted)'
    const sign = v => v > 0 ? '+' : ''

    const typeGroups = {}
    const assetData = []

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
                  <th style="text-align:right">Cant.</th>
                  <th style="text-align:right">Costo</th>
                  <th style="text-align:right">Invertido</th>
                  <th style="text-align:right">Precio</th>
                  <th style="text-align:right">Valor</th>
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
        
        // Datos para gráficos
        assetData.push({ ticker: h.ticker, currentValue: currentVal, cost: invested, pnlPct })
        const type = h.instrument_type_name || 'Sin tipo'
        typeGroups[type] = (typeGroups[type] || 0) + currentVal

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
      html += `</tbody><tfoot><tr style="background-color: var(--bg-main); font-weight: 800"><td colspan="3">TOTAL ${curr}</td><td class="amount">${fmt(totalInv)}</td><td></td><td class="amount">${fmt(totalMarket)}</td><td class="amount" style="color: ${pnlColor(totalMarket - totalInv)}">${sign(totalMarket - totalInv)}${fmt(totalMarket - totalInv)}</td><td class="amount" style="color: ${pnlColor(totalMarket - totalInv)}">${((totalMarket / totalInv - 1) * 100).toFixed(2)}%</td><td class="amount">100%</td></tr></tfoot></table></div></div>`
    }
    tableContainer.innerHTML = html || '<div class="table-empty">No hay tenencias registradas.</div>'

    // Renderizar gráficos si hay datos
    const numAssets = assetData.length
    const numTypes = Object.keys(typeGroups).length
    const section0 = document.getElementById('analysis-section-0')
    const typeCard = document.getElementById('type-distribution-card')
    const assetCard = assetChartContainer.parentElement

    if (numAssets > 0) {
      // Caso 1: Solo 1 tipo -> Ocultar gráfico de tipo y ensanchar tabla/otros
      if (numTypes <= 1) {
        typeCard.style.display = 'none'
        section0.style.gridTemplateColumns = '7fr 3fr'
      } else {
        typeCard.style.display = 'flex'
        section0.style.gridTemplateColumns = '6fr 2fr 2fr'
      }

      // Renderizar gráfico de activos (siempre que haya más de 1, o si es el único gráfico visible)
      if (numAssets > 1 || numTypes > 1) {
        assetCard.style.display = 'flex'
        const sortedAssets = assetData.sort((a, b) => b.currentValue - a.currentValue)
        this._renderDonutChart(assetChartContainer, sortedAssets, totalMarketValueAll, '_assetChart')
      } else {
        // Si solo hay 1 activo y 1 tipo, ocultamos ambos gráficos y dejamos la tabla sola
        assetCard.style.display = 'none'
        section0.style.gridTemplateColumns = '1fr'
      }

      // Renderizar gráfico de tipos si hay más de 1
      if (numTypes > 1) {
        const typeItems = Object.entries(typeGroups)
          .map(([ticker, currentValue]) => ({ ticker, currentValue }))
          .sort((a, b) => b.currentValue - a.currentValue)
        this._renderDonutChart(typeChartContainer, typeItems, totalMarketValueAll, '_typeChart')
      }

      // Renderizar Treemap en Mapa de Calor
      this._renderTreemap(document.getElementById('analysis-heatmap'), assetData.slice().sort((a, b) => b.currentValue - a.currentValue))
    } else {
      assetCard.style.display = 'none'
      typeCard.style.display = 'none'
      section0.style.gridTemplateColumns = '1fr'
      if (this._treemapChart) { this._treemapChart.destroy(); this._treemapChart = null }
      document.getElementById('analysis-heatmap').innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem">Sin datos</div>'
    }
  },

  _renderHeatmap(holdings) {
    const container = document.getElementById('analysis-heatmap')
    if (!container) return

    const byCurrency = {}
    holdings.forEach(h => {
      if (!byCurrency[h.currency]) byCurrency[h.currency] = { total: 0, items: {} }
      const price = this._resolvedPrices?.[h.ticker] ?? h.avg_buy_price
      const val = h.total_quantity * price
      const pnl = ((price / h.avg_buy_price) - 1) * 100
      
      if (!byCurrency[h.currency].items[h.ticker]) {
        byCurrency[h.currency].items[h.ticker] = { ticker: h.ticker, value: 0, pnl: pnl }
      }
      byCurrency[h.currency].items[h.ticker].value += val
      byCurrency[h.currency].total += val
    })

    const getHeatColor = (pnl) => {
      if (pnl > 3) return '#059669' 
      if (pnl > 1) return '#10b981'
      if (pnl > 0.2) return '#6ee7b7'
      if (pnl < -3) return '#dc2626'
      if (pnl < -1) return '#ef4444'
      if (pnl < -0.2) return '#fca5a1'
      return 'var(--bg-main)'
    }

    // Limpiamos y preparamos el container principal para ocupar todo el alto
    container.style.flexDirection = 'column'
    container.style.alignItems = 'stretch'
    container.style.gap = '8px'

    let html = ''
    const currencies = Object.entries(byCurrency)
    
    for (const [curr, data] of currencies) {
      const items = Object.values(data.items).sort((a, b) => b.value - a.value)
      
      // Cada bloque de moneda ocupa una fracción del alto total
      html += `
        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0">
          <div style="font-size: 0.7rem; font-weight: 800; color: var(--color-primary); padding: 2px 0; border-bottom: 1px solid var(--border); margin-bottom: 4px; text-transform: uppercase">
            Cartera ${curr}
          </div>
          <div style="flex: 1; display: flex; gap: 2px; align-items: stretch">
            ${items.map(item => {
              const weight = (item.value / data.total) * 100
              const bg = getHeatColor(item.pnl)
              const color = Math.abs(item.pnl) > 1 ? 'white' : 'var(--text-main)'
              const isThin = weight < 12 // Si el cuadro es muy finito, achicamos/ocultamos cosas
              
              return `
                <div style="flex: ${weight} 0 0%; background: ${bg}; border-radius: 4px; border: 1px solid var(--bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 4px">
                  <div style="font-weight: 800; font-size: ${isThin ? '0.65rem' : '0.9rem'}; color: ${color}; text-shadow: 0 1px 2px rgba(0,0,0,0.2)">${item.ticker}</div>
                  ${!isThin ? `<div style="font-size: 0.75rem; font-weight: 700; color: ${color}; opacity: 0.95">${(item.pnl > 0 ? '+' : '')}${item.pnl.toFixed(1)}%</div>` : ''}
                  <div style="font-size: 0.55rem; color: ${color}; opacity: 0.8">${weight.toFixed(0)}%</div>
                </div>`
            }).join('')}
          </div>
        </div>`
    }
    container.innerHTML = html || '<div style="color:var(--text-muted); font-size:0.8rem; padding: 1rem; text-align: center">Sin datos</div>'
  },

  _renderTreemap(container, items) {
    if (!container || !items || items.length === 0) return
    
    if (!container.querySelector('canvas')) {
      container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    }
    const canvas = container.querySelector('canvas')
    
    const getColor = (p) => {
      if (p > 0) return p > 10 ? '#065f46' : '#10b981'
      if (p < 0) return p < -10 ? '#991b1b' : '#ef4444'
      return '#64748b'
    }
    const fmt = v => v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const data = items.map(item => ({
      ticker: item.ticker,
      value: item.currentValue,
      pct: item.pnlPct ?? 0,
      color: getColor(item.pnlPct ?? 0)
    })).filter(d => d.value > 0)

    this._treemapChart = ChartManager.renderTreemapChart(canvas, data, {
      instance: this._treemapChart,
      formatter: (ctx) => {
        const d = ctx.raw?._data
        if (!d) return []
        return [d.ticker, fmt(d.pct) + '%']
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

  _renderDonutChart(container, items, total, chartKey) {
    if (!container || !items || items.length === 0) return
    this[chartKey] = ChartManager.destroy(this[chartKey])

    container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    const canvas = container.querySelector('canvas')

    this[chartKey] = ChartManager.renderPieChart(canvas, items)
  },

  async _loadPdfLibraries() {    if (window.jspdf && window.jspdf.jsPDF && window.html2canvas) return { jsPDF: window.jspdf.jsPDF, html2canvas: window.html2canvas }
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = '/js/vendor/jspdf.js'
      s.onload = () => {
        const check = () => {
          if (window.jspdf && window.jspdf.jsPDF) resolve()
          else setTimeout(check, 10)
        }
        check()
      }
      s.onerror = reject
      document.head.appendChild(s)
    })
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = '/js/vendor/html2canvas.js'
      s.onload = resolve
      s.onerror = reject
      document.head.appendChild(s)
    })
    return { jsPDF: window.jspdf.jsPDF, html2canvas: window.html2canvas }
  },

  async _generatePDF() {
    const resultsEl = document.getElementById('analysis-results')
    if (!resultsEl) return
    const alycName = this._activeAlycName || 'Cartera'
    const pdfBtn = document.getElementById('btn-generate-pdf'), originalText = pdfBtn.textContent
    pdfBtn.textContent = 'Generando...'; pdfBtn.disabled = true
    
    const updateProgress = (msg) => { pdfBtn.textContent = msg }
    
    try {
      updateProgress('Cargando librerías...')
      const { html2canvas, jsPDF } = await this._loadPdfLibraries()
      
      updateProgress('Capturando análisis...')
      
      // Use requestIdleCallback to avoid blocking the main thread
      const captureCanvas = () => new Promise((resolve) => {
        const attempt = () => {
          html2canvas(resultsEl, { 
            scale: 2, 
            useCORS: true, 
            logging: false, 
            backgroundColor: '#f1f5f9',
            allowTaint: true,
            onclone: (clonedDoc) => {
              // Hide elements that shouldn't be in the PDF
              clonedDoc.querySelectorAll('.no-print, button, [role="button"]').forEach(el => el.style.display = 'none')
            }
          }).then(resolve).catch(err => {
            // Retry once on error
            setTimeout(() => html2canvas(resultsEl, { scale: 2, useCORS: true, logging: false, backgroundColor: '#f1f5f9' }).then(resolve).catch(reject), 100)
          })
        }
        
        if ('requestIdleCallback' in window) {
          requestIdleCallback(attempt, { timeout: 5000 })
        } else {
          setTimeout(attempt, 0)
        }
      })
      
      const canvas = await captureCanvas()
      
      updateProgress('Generando PDF...')
      
      // Yield to main thread before PDF generation
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95), imgW = canvas.width / 2, imgH = canvas.height / 2
      const mmW = imgW * 0.264583, mmH = imgH * 0.264583
      
      // Generate PDF in chunks
      const doc = new jsPDF({ orientation: mmW > mmH ? 'l' : 'p', unit: 'mm', format: [mmW + 20, mmH + 35], compress: true })
      doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(79, 70, 230)
      doc.text(`REPORTE DE ANÁLISIS ESTRATÉGICO - ${alycName.toUpperCase()}`, 10, 15)
      doc.setFontSize(8).setTextColor(148, 163, 184).text(`Generado el ${new Date().toLocaleString()} | Stocker Intelligence`, 10, 20)
      doc.addImage(imgData, 'PNG', 10, 25, mmW, mmH)
      doc.save(`Stocker_Analisis_${alycName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
      
      showToast('Captura generada con éxito', 'success')
    } catch (err) { 
      console.error(err); 
      showToast('Error PDF', 'error') 
    } finally { 
      pdfBtn.textContent = originalText; 
      pdfBtn.disabled = false 
    }
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
    const optimalW = portfolios[maxSharpeIdx].weights
    const weightsObj = tickers.reduce((acc, t, i) => { acc[t] = optimalW[i]; return acc }, {})
    const currentWeightsObj = tickers.reduce((acc, t, i) => { acc[t] = currW[i]; return acc }, {})
    return { portfolios, tickers, optimal: { weights: weightsObj, return: portfolios[maxSharpeIdx].return, std: portfolios[maxSharpeIdx].std }, current: { weights: currentWeightsObj, return: currW.reduce((a, v, i) => a + v * avgR[i], 0), std: currW.reduce((a, v, i) => a + v * stdR[i], 0) } }
  },

  async _renderChart(analysis) {
    const canvas = document.getElementById('markowitz-chart')
    if (!canvas) return
    this._chart = ChartManager.renderMarkowitzChart(canvas, analysis, {
      instance: this._chart
    })
  },

  _renderRedistribution(analysis, holdings) {
    const container = document.getElementById('redistribution-table')
    const tickers = analysis.tickers || []
    
    const currentWeights = Array.isArray(analysis.current.weights) 
      ? tickers.reduce((acc, t, i) => { acc[t] = analysis.current.weights[i] || 0; return acc }, {})
      : analysis.current.weights || {}
    
    const optimalWeights = Array.isArray(analysis.optimal?.weights)
      ? tickers.reduce((acc, t, i) => { acc[t] = analysis.optimal.weights[i] || 0; return acc }, {})
      : analysis.optimal?.weights || {}
    
    const michaudWeights = Array.isArray(analysis.michaud?.weights)
      ? tickers.reduce((acc, t, i) => { acc[t] = analysis.michaud.weights[i] || 0; return acc }, {})
      : analysis.michaud?.weights || {}
    
    const hrpWeights = Array.isArray(analysis.hrp?.weights)
      ? tickers.reduce((acc, t, i) => { acc[t] = analysis.hrp.weights[i] || 0; return acc }, {})
      : analysis.hrp?.weights || {}
    
    let html = `<table class="table"><thead><tr><th>Activo</th><th>Actual</th><th>Sharpe</th><th style="color: var(--text-muted)">Dif S</th><th>Michaud</th><th style="color: #10b981">Dif M</th><th>HRP</th><th style="color: #4f46e6">Dif HRP</th></tr></thead><tbody>`
    
    tickers.forEach(ticker => {
      const currentW = currentWeights[ticker] || 0
      const sharpeW = optimalWeights[ticker] || 0
      const michW = michaudWeights[ticker] || 0
      const hrpW = hrpWeights[ticker] || 0
      
      const sharpeDiff = (sharpeW - currentW) * 100
      const michaudDiff = (michW - currentW) * 100
      const hrpDiff = (hrpW - currentW) * 100
      
      html += `<tr>
        <td><strong>${ticker}</strong></td>
        <td>${(currentW * 100).toFixed(1)}%</td>
        <td style="color: var(--text-muted)">${(sharpeW * 100).toFixed(1)}%</td>
        <td style="color: var(--text-muted); font-size: 0.75rem">${sharpeDiff > 0 ? '+' : ''}${sharpeDiff.toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 600">${(michW * 100).toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 800">${michaudDiff > 0 ? '+' : ''}${michaudDiff.toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 700">${(hrpW * 100).toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 800">${hrpDiff > 0 ? '+' : ''}${hrpDiff.toFixed(1)}%</td>
      </tr>`
    })
    container.innerHTML = html + `</tbody></table>`
  },

  _renderMonteCarlo(analysis) {
    const canvas = document.getElementById('montecarlo-chart')
    if (!canvas) return
    
    const dailyReturn = (analysis.optimal.return / 252)
    const dailyVol = (analysis.optimal.std / Math.sqrt(252))
    const datasets = []
    const randn_bm = () => { 
      let u = 0, v = 0; 
      while(u === 0) u = Math.random(); 
      while(v === 0) v = Math.random(); 
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); 
    }

    for (let s = 0; s < 50; s++) {
      const data = [100]; 
      let current = 100
      for (let d = 1; d <= 252; d++) { 
        current *= (1 + (dailyReturn + dailyVol * randn_bm())); 
        data.push(current) 
      }
      datasets.push({ 
        label: s === 0 ? 'Mediana' : `Sim ${s}`, 
        data 
      })
    }

    this._mcChart = ChartManager.renderMonteCarloChart(canvas, datasets, {
      instance: this._mcChart
    })
  },

  _renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker) {
    const canvas = document.getElementById('backtesting-chart')
    if (!canvas) return
    
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length)
    const currentWeights = Array.isArray(analysis.current.weights) ? analysis.current.weights : Object.values(analysis.current.weights)
    
    let pE = 1, bE = 1
    const pS = [0], bS = [0] // Empezamos en 0% de rendimiento acumulado

    for (let d = 0; d < numDays; d++) {
      let dR = 0
      currentWeights.forEach((w, i) => dR += w * returnsMatrix[i][d])
      pE *= (1 + dR)
      bE *= (1 + benchmarkReturns[d])
      pS.push((pE - 1) * 100)
      bS.push((bE - 1) * 100)
    }

    const diff = ((pE - bE) * 100).toFixed(1)
    const resEl = document.getElementById('backtesting-result')
    if (resEl) {
      resEl.innerHTML = `
        <span style="color:#4f46e6">Mío: ${((pE-1)*100).toFixed(1)}%</span> | 
        <span style="color:var(--text-muted)">${sanitize(benchmarkTicker)}: ${((bE-1)*100).toFixed(1)}%</span> 
        <div style="font-size:0.75rem; color:${diff >= 0 ? '#10b981' : '#ef4444'}; font-weight:800">
          ${diff >= 0 ? '+' : ''}${diff}%
        </div>`
    }

    this._btChart = ChartManager.renderBacktestingChart(canvas, pS, bS, benchmarkTicker, {
      instance: this._btChart
    })
  },

  _renderRiskContribution(analysis, returnsMatrix) {
    const canvas = document.getElementById('risk-contribution-chart')
    if (!canvas) return

    const tickers = analysis.tickers || []
    const currentWeights = Array.isArray(analysis.current.weights) 
      ? analysis.current.weights 
      : Object.values(analysis.current.weights || {})
    
    const stdDevs = returnsMatrix.map(r => { 
      const avg = r.reduce((a, b) => a + b, 0) / r.length
      return Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) 
    })
    
    const raw = currentWeights.map((w, i) => w * stdDevs[i])
    const total = raw.reduce((a, b) => a + b, 0)
    
    const items = tickers.map((ticker, i) => ({
      ticker,
      value: total > 0 ? (raw[i] / total) * 100 : 0
    })).sort((a, b) => b.value - a.value) // Ordenar por mayor riesgo

    this._rcChart = ChartManager.renderRiskChart(canvas, items, {
      instance: this._rcChart
    })
  },

  _performCAPM(analysis, returnsMatrix, benchmarkReturns) {
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length), pDR = []
    const currentWeights = Array.isArray(analysis.current.weights) ? analysis.current.weights : Object.values(analysis.current.weights)
    for (let d = 0; d < numDays; d++) { let r = 0; currentWeights.forEach((w, i) => r += w * returnsMatrix[i][d]); pDR.push(r) }
    const mR = benchmarkReturns.slice(0, numDays), mAvg = mR.reduce((a,b)=>a+b,0)/numDays, pAvg = pDR.reduce((a,b)=>a+b,0)/numDays
    let cov = 0, vM = 0; for (let i = 0; i < numDays; i++) { cov += (pDR[i] - pAvg) * (mR[i] - mAvg); vM += Math.pow(mR[i] - mAvg, 2) }
    const beta = vM === 0 ? 0 : cov / vM, r2 = vM === 0 ? 0 : Math.pow(cov, 2) / (vM * pDR.reduce((a, r) => a + Math.pow(r - pAvg, 2), 0))
    const alpha = (pAvg * 252) - (beta * (mAvg * 252)), sorted = [...pDR].sort((a,b)=>a-b)
    const varIdx = Math.floor(sorted.length * 0.05)
    const vR = sorted[varIdx] || 0
    const es = sorted.slice(0, varIdx + 1).reduce((a, b) => a + b, 0) / (varIdx + 1)

    document.getElementById('capm-beta').textContent = beta.toFixed(2)
    document.getElementById('capm-r2').textContent = (r2 * 100).toFixed(0) + '%'
    document.getElementById('capm-alpha').textContent = (alpha > 0 ? '+' : '') + (alpha * 100).toFixed(1) + '%'
    document.getElementById('capm-alpha').style.color = alpha >= 0 ? '#10b981' : '#ef4444'
    document.getElementById('analysis-var').textContent = (vR * 100).toFixed(2) + '%'
    document.getElementById('analysis-es').textContent = (es * 100).toFixed(2) + '%'
    const bD = document.getElementById('capm-beta-desc')
    bD.textContent = beta > 1.2 ? 'Agresivo' : (beta < 0.8 ? 'Defensivo' : 'Neutral')
    bD.style.color = beta > 1.2 ? '#ef4444' : (beta < 0.8 ? '#3b82f6' : 'var(--text-muted)')
    return { beta, alpha, r2 }
  },

  _renderStressTest(beta) {
    const scenarios = [
      { name: 'Crisis 2008', drop: -50 },
      { name: 'Burbuja Dotcom', drop: -49 },
      { name: 'Crash COVID', drop: -34 },
      { name: 'Lunes Negro 1987', drop: -22.6 }
    ]
    document.getElementById('stress-test-results').innerHTML = scenarios.map(s => `
      <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
        <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">${s.name}</h4>
        <div style="font-size: 1.1rem; font-weight: 700; color: #ef4444; line-height: 1">${(beta * s.drop).toFixed(1)}%</div>
        <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Mkt: ${s.drop}%</p>
      </div>`).join('')
  },

  _calculateMDD(analysis, returnsMatrix) {
    const numDays = returnsMatrix[0].length
    const currentWeights = Array.isArray(analysis.current.weights) ? analysis.current.weights : Object.values(analysis.current.weights)
    let cumulativeReturn = 1, peak = 1, maxDrawdown = 0
    for (let d = 0; d < numDays; d++) {
      let dayReturn = 0
      currentWeights.forEach((w, i) => dayReturn += w * returnsMatrix[i][d])
      cumulativeReturn *= (1 + dayReturn)
      if (cumulativeReturn > peak) peak = cumulativeReturn
      const dd = (cumulativeReturn - peak) / peak
      if (dd < maxDrawdown) maxDrawdown = dd
    }
    document.getElementById('analysis-mdd').textContent = (maxDrawdown * 100).toFixed(2) + '%'
  },

  _renderComparisonChart(holdings) {
    const canvas = document.getElementById('comparison-chart')
    if (!canvas) return

    const grouped = {}
    holdings.forEach(h => {
      const price = this._resolvedPrices?.[h.ticker] || h.avg_buy_price
      const qty = parseFloat(h.total_quantity || 0)
      const avgPrice = parseFloat(h.avg_buy_price || 0)
      
      const invested = qty * avgPrice
      const current = qty * parseFloat(price)
      
      const label = `${h.ticker} (${h.currency})`
      if (!grouped[label]) {
        grouped[label] = { invested: 0, current: 0, currency: h.currency }
      }
      grouped[label].invested += invested
      grouped[label].current += current
    })

    const labels = Object.keys(grouped).sort()
    const investedData = labels.map(l => grouped[l].invested)
    const currentData = labels.map(l => grouped[l].current)

    this._compChart = ChartManager.renderComparisonChart(canvas, labels, investedData, currentData, {
      instance: this._compChart
    })
  },

  _renderCorrelationHeatmap(tickers, returnsMatrix) {
    const container = document.getElementById('correlation-matrix')
    if (!container) return
    const n = tickers.length, numDays = returnsMatrix[0].length
    const stats = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return { avg, std: Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) } })
    let html = `<table style="width:100%; font-size: 0.75rem; border-collapse: collapse"><tr><th></th>`
    tickers.forEach(t => html += `<th>${t}</th>`)
    for (let i = 0; i < n; i++) {
      html += `<tr><td style="font-weight:bold">${tickers[i]}</td>`
      for (let j = 0; j < n; j++) {
        let cov = 0; for (let d = 0; d < numDays; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
        const corr = (stats[i].std * stats[j].std === 0) ? 0 : (cov / numDays) / (stats[i].std * stats[j].std)
        const bg = corr > 0.5 ? `rgba(16, 185, 129, ${corr})` : (corr < -0.2 ? `rgba(239, 68, 68, ${Math.abs(corr)})` : 'transparent')
        html += `<td style="background:${bg}; text-align:center; padding: 4px">${corr.toFixed(2)}</td>`
      }
      html += `</tr>`
    }
    container.innerHTML = html + `</table>`
  },

  _performHRP(tickers, returnsMatrix) {
    const n = tickers.length
    const stats = returnsMatrix.map(r => {
      const avg = r.reduce((a, b) => a + b, 0) / r.length
      const v = r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length
      return { avg, var: v, std: Math.sqrt(v) }
    })
    const corr = Array.from({ length: n }, () => new Float64Array(n))
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let cov = 0; for (let d = 0; d < returnsMatrix[0].length; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
        const c = (stats[i].std * stats[j].std === 0) ? 0 : (cov / returnsMatrix[0].length) / (stats[i].std * stats[j].std)
        corr[i][j] = corr[j][i] = c
      }
    }
    const dist = Array.from({ length: n }, () => new Float64Array(n))
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { dist[i][j] = Math.sqrt(Math.max(0, 0.5 * (1 - corr[i][j]))) } }
    let order = Array.from({ length: n }, (_, i) => i)
    order.sort((a, b) => dist[a].reduce((acc, v) => acc + v, 0) - dist[b].reduce((acc, v) => acc + v, 0))
    const weights = new Float64Array(n).fill(1)
    const recursiveBisection = (items) => {
      if (items.length <= 1) return
      const mid = Math.floor(items.length / 2), left = items.slice(0, mid), right = items.slice(mid)
      const vL = left.reduce((acc, idx) => acc + stats[idx].var, 0) / left.length
      const vR = right.reduce((acc, idx) => acc + stats[idx].var, 0) / right.length
      const alpha = 1 - (vL / (vL + vR))
      left.forEach(idx => weights[idx] *= alpha); right.forEach(idx => weights[idx] *= (1 - alpha))
      recursiveBisection(left); recursiveBisection(right)
    }
    recursiveBisection(order)
    const totalW = weights.reduce((acc, v) => acc + v, 0)
    return Array.from(weights).map(w => w / totalW)
  },

  _performMichaud(tickers, returnsMatrix) {
    const n = tickers.length, iterations = 50, days = returnsMatrix[0].length
    const averagedWeights = new Float64Array(n).fill(0)
    for (let i = 0; i < iterations; i++) {
      const resampled = Array.from({ length: n }, () => new Float64Array(days))
      for (let d = 0; d < days; d++) {
        const randomDay = Math.floor(Math.random() * days)
        for (let a = 0; a < n; a++) { resampled[a][d] = returnsMatrix[a][randomDay] }
      }
      const scenario = this._performMarkowitz(tickers, resampled, Array(n).fill({ total_quantity: 0, avg_buy_price: 0 }))
      const optWeights = scenario.optimal?.weights || {}
      tickers.forEach((t, idx) => { averagedWeights[idx] += (optWeights[t] || 0) })
    }
    return Array.from(averagedWeights).map(w => w / iterations)
  }
}
