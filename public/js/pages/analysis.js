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
  _compChart: null,
  _resolvedPrices: {},
  _activeAlycName: null,
  _activeAlycId: null,
  _activeBenchmark: 'SPY',
  _lastValidHoldings: [],
  _validHistories: [],
  _validTickers: [],

  cleanup() {
    const charts = [
      this._chart, this._mcChart, this._btChart, 
      this._rcChart, this._ddChart, this._treemapChart,
      this._assetChart, this._typeChart, this._compChart
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
    this._compChart = null
    this._validHistories = []
    this._validTickers = []
    clearRenderCache(document.getElementById('page-content'))
  },

  async render() {
    this.cleanup()
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Análisis de Cartera</h2>
      </div>

      <div class="card" id="analysis-control-card" style="margin-bottom: 2rem">
        <div class="analysis-config-header" id="analysis-config-header">
          <h3 id="analysis-config-title">Configuración de Análisis</h3>
          <button class="analysis-config-toggle" title="Expandir / Contraer">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <div class="analysis-config-body">
        <div class="analysis-control-panel">

          <!-- Sector ALyCs (Alineado a la izquierda, altura estirada) -->
          <div class="analysis-control-alycs">
            <div style="text-align: center">
            <label style="font-weight: 700; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem">Analizar Cartera por ALyC</label>
            <div id="analysis-alyc-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; align-items: center">
               <span style="color: var(--text-muted); font-size: 0.85rem">Cargando ALyCs...</span>
             </div>
             </div>
            </div>

            <!-- Sector Benchmark (Tarjeta Independiente y Centrada) -->
            <div class="analysis-control-benchmark">
             <div class="form-group" style="margin:0; width: 240px; text-align: center">
               <label style="font-weight: 700; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem">Benchmark Base</label>
               <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; justify-content: center">
                 <button class="btn-alyc btn-benchmark-quick" data-ticker="SPY">SPY</button>
                 <button class="btn-alyc btn-benchmark-quick" data-ticker="QQQ">QQQ</button>
                 <button class="btn-alyc btn-benchmark-quick" data-ticker="DIA">DIA</button>
                 <button class="btn-alyc btn-benchmark-quick" data-ticker="IWM">IWM</button>
               </div>
             </div>
            </div>
          <!-- Contenedor fijo para el botón PDF (Altura igualada a las tarjetas, siempre visible) -->
          <div class="analysis-control-pdf">
            <button id="btn-generate-pdf" class="btn btn-primary" disabled style="display: flex; width: 100%; height: 100%; min-height: 0; font-size: 0.85rem; font-weight: 700; flex-direction: column; gap: 0.35rem; justify-content: center; align-items: center; line-height: 1.2; box-shadow: var(--shadow-sm); border-radius: var(--radius); opacity: 0.5; cursor: not-allowed; padding: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>Generar Reporte PDF</span>
            </button>
          </div>
        </div>
        </div><!-- analysis-config-body -->
      </div>

      <div id="analysis-results" style="display: none">
        <!-- SECCIÓN 0: Tenencia Actual -->
        <div id="analysis-section-0" class="analysis-grid-top">
          <div class="card" style="margin-bottom: 0; padding: 1.25rem">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Detalle de Tenencia Actual</h3>
            <div id="current-holdings-table" style="overflow-x: auto"></div>
          </div>
          <div class="charts-column">
            <div class="card" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column; flex: 1">
              <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Activo</h3>
              <div id="current-holdings-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
            </div>
            <div id="type-distribution-card" class="card" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column; flex: 1">
              <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Tipo</h3>
              <div id="current-type-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 0.5: Comparativa y Mapa de Calor -->
        <div class="analysis-grid-two">
          <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem">
              <h3 style="font-size: 0.95rem; margin: 0">Comparativa: Inversión vs Valor Actual ($)</h3>
              <button id="btn-refresh-comp" class="btn btn-sm btn-ghost btn-icon-only" title="Actualizar precios y gráfico" style="padding: 0; width: 24px; height: 24px; min-width: 24px; min-height: 24px; opacity: 0.8; background: none; border: none; cursor: pointer; color: var(--text-muted); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              </button>
            </div>
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

        <!-- SECCIÓN 1: KPIs y Eficiencia -->
        <div class="analysis-grid-mixed">
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
        <div class="analysis-grid-two">
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
         <div class="analysis-grid-bottom">
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.75rem; margin: 1rem 1.25rem 0.5rem">Optimización: Sharpe vs Michaud vs HRP</h3>
            <div id="redistribution-table" style="font-size: 0.65rem"></div>
          </div>
          <div id="correlation-card" class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem">Matriz de Correlación</h3>
            <div id="correlation-matrix"></div>
          </div>
         </div>        <div class="card" style="padding: 1rem">
          <p id="analysis-summary" style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4"></p>
        </div>
      </div>

      <div id="analysis-loading" class="card" style="display: none; text-align: center; padding: 3rem">
        <span class="spinner" style="width: 40px; height: 40px; border-width: 4px"></span>
        <p style="margin-top: 1rem">Ejecutando algoritmos de optimización avanzada (Michaud & HRP)...</p>
      </div>`

    this._setupEvents()
    // Marcar SPY como benchmark activo por defecto
    document.querySelector('.btn-benchmark-quick[data-ticker="SPY"]')?.classList.add('btn-primary')
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
        btn.className = 'btn-alyc'
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

  _toggleConfigCard(alycName) {
    const card  = document.getElementById('analysis-control-card')
    const title = document.getElementById('analysis-config-title')
    const isCollapsed = card.classList.toggle('collapsed')
    title.textContent = isCollapsed && alycName
      ? `Configuración — ${alycName}`
      : 'Configuración de Análisis'
  },

  _setupEvents() {
    document.getElementById('btn-generate-pdf').addEventListener('click', () => this._generatePDF())

    document.getElementById('analysis-config-header').addEventListener('click', () => {
      this._toggleConfigCard(this._activeAlycName || null)
    })
    
    // Refresh individual Comparison Chart
    const btnRefreshComp = document.getElementById('btn-refresh-comp')
    if (btnRefreshComp) {
      btnRefreshComp.onclick = async () => {
        btnRefreshComp.style.transform = 'rotate(360deg)'
        const tickers = (this._lastValidHoldings || []).map(h => h.ticker)
        if (tickers.length > 0) {
          await this._updateMarketPrices(tickers)
          this._renderComparisonChart(this._lastValidHoldings)
        }
        setTimeout(() => { btnRefreshComp.style.transform = 'none' }, 400)
      }
    }

    // Quick Benchmarks
    document.querySelectorAll('.btn-benchmark-quick').forEach(btn => {
      btn.onclick = () => {
        this._activeBenchmark = btn.dataset.ticker
        document.querySelectorAll('.btn-benchmark-quick').forEach(b => b.classList.remove('btn-primary'))
        btn.classList.add('btn-primary')
        
        if (this._activeAlycId) {
          const activeBtn = Array.from(document.querySelectorAll('#analysis-alyc-buttons button'))
            .find(b => b.textContent === this._activeAlycName)
          this._runAnalysis(this._activeAlycId, activeBtn)
        }
      }
    })
  },

  async _fetchHistory(ticker) {
    const cacheKey = `history_${ticker}`
    const cached = cacheGet(cacheKey, { persistent: true })
    if (cached) {
      return cached
    }

    // Timeout de 10 segundos para requests de historial
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const data = await apiRequest('GET', `/api/history/${encodeURIComponent(ticker)}`, null, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (data && data.length > 0) {
        // 24 horas = 86400000 ms
        cacheSet(cacheKey, data, { persistent: true, ttlMs: 86400000 })
      }
      return data
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        console.warn(`[Analysis] Timeout cargando historial para ${ticker}`)
        throw new Error(`La API de historial no respondió para ${ticker} (Timeout 10s)`)
      }
      throw err
    }
  },

  async _runAnalysis(alycId, activeBtn) {
    if (!alycId) return
    this._activeAlycId = alycId

    // Update active button state
    document.querySelectorAll('#analysis-alyc-buttons button').forEach(b => {
      b.classList.remove('btn-primary')
    })
    if (activeBtn) {
      activeBtn.classList.add('btn-primary')
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

      const benchmarkTicker = this._activeBenchmark || 'SPY'
      const historyPromises = [
        ...alycHoldings.map(h => this._fetchHistory(h.ticker)),
        this._fetchHistory(benchmarkTicker)
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

      this._validHistories = validHistories
      this._validTickers = validTickers

      // --- CÁLCULOS PESADOS VÍA WEB WORKER ---
      const workerResults = await new Promise((resolve, reject) => {
        const worker = new Worker('/js/analysis-worker.js')
        worker.postMessage({
          tickers: validTickers,
          returnsMatrix,
          holdings: validHoldings,
          benchmarkReturns
        })
        worker.onmessage = (e) => {
          if (e.data.status === 'success') resolve(e.data.data)
          else reject(new Error(e.data.error))
          worker.terminate()
        }
        worker.onerror = (err) => {
          reject(err)
          worker.terminate()
        }
      })

      const { markowitz, hrp, michaud, monteCarlo, metrics } = workerResults
      const analysis = { ...markowitz, hrp, michaud, ...metrics }

      // Actualizar métricas CAPM en UI (las que devolvió el worker)
      this._updateMetricsUI(analysis, benchmarkTicker)

      // Intentar renderizar gráficos avanzados, pero no dejar que uno solo bloquee el resto
      try { this._renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker) } catch(e) { console.error('Error Backtesting:', e) }
      try { this._renderStressTest(analysis.beta) } catch(e) { console.error('Error Stress:', e) }
      try { await this._renderChart(analysis) } catch(e) { console.error('Error Markowitz:', e) }
      try { this._renderRedistribution(analysis, validHoldings) } catch(e) { console.error('Error Redist:', e) }

      // Renderizar Monte Carlo con los datos del worker
      const mcCanvas = document.getElementById('montecarlo-chart')
      if (mcCanvas) {
        try {
          this._mcChart = ChartManager.renderMonteCarloChart(mcCanvas, monteCarlo, { instance: this._mcChart })
        } catch(e) { console.error('Error MonteCarlo:', e) }
      }

      try { this._renderCorrelationHeatmap(validTickers, returnsMatrix) } catch(e) { console.error('Error Correlación:', e) }
      
      await this._updateMarketPrices(validTickers)
      this._lastValidHoldings = validHoldings
      this._renderCurrentHoldings(validHoldings, analysis)
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
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const data = await apiRequest('GET', `/api/quotes?tickers=${encodeURIComponent(tickers.join(','))}`, null, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      for (const ticker of tickers) {
        this._resolvedPrices[ticker] = data[ticker]?.price ?? null
      }
    } catch (err) { 
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        console.warn('[Analysis] Timeout en consulta de precios de mercado (10s)')
      } else {
        console.error('Error precios:', err) 
      }
    }
  },

  _renderCurrentHoldings(holdings, analysis = null) {
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
          
          <!-- Desktop table -->
          <div class="desktop-only table-wrapper">
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
                  <th style="text-align:center">Señal</th>
                </tr>
              </thead>
              <tbody>`
      
      items.sort((a, b) => (b.total_quantity * (this._resolvedPrices?.[b.ticker] ?? b.avg_buy_price)) - (a.total_quantity * (this._resolvedPrices?.[a.ticker] ?? a.avg_buy_price)))
      
      let desktopRows = ''
      let mobileCards = ''

      items.forEach(h => {
        const price = this._resolvedPrices?.[h.ticker] ?? null
        const currentVal = price ? h.total_quantity * price : (h.total_quantity * h.avg_buy_price)
        const invested = h.total_quantity * h.avg_buy_price
        const pnl = price ? (price - h.avg_buy_price) * h.total_quantity : 0
        const pnlPct = (h.avg_buy_price > 0 && price) ? ((price / h.avg_buy_price) - 1) * 100 : 0
        const weight = (currentVal / totalMarket) * 100
        const type = h.instrument_type_name || 'Sin tipo'

        // Datos para gráficos
        assetData.push({ ticker: h.ticker, currentValue: currentVal, cost: invested, pnlPct })
        typeGroups[type] = (typeGroups[type] || 0) + currentVal

        // Signal: Technical zone (52w) + Markowitz rebalance
        const buyZone = this._calcBuyZone(h.ticker)
        const optW = analysis?.optimal?.weights?.[h.ticker] ?? null
        const wDiff = optW !== null ? (optW - weight / 100) : null
        let mrkLabel, mrkColor
        if (wDiff === null)       { mrkLabel = '--';          mrkColor = 'var(--text-muted)' }
        else if (wDiff > 0.05)   { mrkLabel = '↑ Comprar'; mrkColor = '#3b82f6' }
        else if (wDiff < -0.05)  { mrkLabel = '↓ Vender';     mrkColor = '#f59e0b' }
        else                      { mrkLabel = '✓ OK';          mrkColor = '#64748b' }

        const techBadge = buyZone
          ? `<span title="52s: $${buyZone.low52w.toFixed(2)} – $${buyZone.high52w.toFixed(2)} | MA50: $${buyZone.ma50.toFixed(2)}${buyZone.ma200 ? ' | MA200: $' + buyZone.ma200.toFixed(2) : ''} | Percentil: ${buyZone.percentile.toFixed(0)}%" style="display:inline-block;font-size:0.6rem;padding:0.15rem 0.35rem;border-radius:3px;background:${buyZone.color}20;color:${buyZone.color};border:1px solid ${buyZone.color}40;cursor:help;white-space:nowrap">${buyZone.label}</span>`
          : ''
        const mrkBadge = `<span style="display:inline-block;font-size:0.6rem;padding:0.15rem 0.35rem;border-radius:3px;background:${mrkColor}20;color:${mrkColor};border:1px solid ${mrkColor}40;white-space:nowrap">${mrkLabel}</span>`

        // Desktop row
        desktopRows += `
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
            <td style="text-align:center"><div style="display:flex;flex-direction:row;gap:0.2rem;align-items:center;justify-content:center;flex-wrap:wrap">${techBadge}${mrkBadge}</div></td>
          </tr>`

        // Mobile card (using same classes as dashboard)
        mobileCards += `
          <div class="dash-instrument-card collapsed">
            <div class="dash-instrument-card-header">
              <span class="ticker-chip">${h.ticker}</span>
              <span class="dash-instrument-meta">
                <span class="meta-qty">${h.total_quantity.toLocaleString('es-AR')}</span>
                <span class="meta-weight">${weight.toFixed(1)}%</span>
                <span class="meta-type">${type}</span>
              </span>
            </div>
            <div class="dash-instrument-card-body">
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Precio compra</span>
                <span class="dash-instrument-value">${fmt(h.avg_buy_price)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Precio actual</span>
                <span class="dash-instrument-value"><strong>${price ? fmt(price) : '--'}</strong></span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Invertido</span>
                <span class="dash-instrument-value">${fmt(invested)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Valor mercado</span>
                <span class="dash-instrument-value"><strong>${fmt(currentVal)}</strong></span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">P&L $</span>
                <span class="dash-instrument-value" style="color: ${pnlColor(pnl)}; font-weight: bold">${sign(pnl)}${fmt(pnl)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">P&L %</span>
                <span class="dash-instrument-value" style="color: ${pnlColor(pnlPct)}; font-weight: bold">${sign(pnlPct)}${pnlPct.toFixed(2)}%</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Señal</span>
                <span class="dash-instrument-value" style="display:flex;gap:0.25rem;flex-wrap:wrap">${techBadge}${mrkBadge}</span>
              </div>
            </div>
          </div>`
      })

      html += desktopRows
      html += `</tbody><tfoot><tr style="background-color: var(--bg-main); font-weight: 800"><td colspan="3">TOTAL ${curr}</td><td class="amount">${fmt(totalInv)}</td><td></td><td class="amount">${fmt(totalMarket)}</td><td class="amount" style="color: ${pnlColor(totalMarket - totalInv)}">${sign(totalMarket - totalInv)}${fmt(totalMarket - totalInv)}</td><td class="amount" style="color: ${pnlColor(totalMarket - totalInv)}">${((totalMarket / totalInv - 1) * 100).toFixed(2)}%</td><td class="amount">100%</td><td></td></tr></tfoot></table></div>`
      
      // Mobile cards section
      html += `
        <div class="mobile-only dash-instruments-cards">
          ${mobileCards}
          <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-main); border-radius: var(--radius); border: 1px solid var(--border)">
            <div class="dash-instrument-row" style="font-weight: 700">
              <span>TOTAL ${curr}</span>
              <span>${fmt(totalMarket)}</span>
            </div>
            <div class="dash-instrument-row" style="font-size: 0.75rem; color: ${pnlColor(totalMarket - totalInv)}">
              <span>P&L Total</span>
              <span>${sign(totalMarket - totalInv)}${fmt(totalMarket - totalInv)} (${((totalMarket / totalInv - 1) * 100).toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>`
    }
    tableContainer.innerHTML = html || '<div class="table-empty">No hay tenencias registradas.</div>'
    this._bindMobileAccordion()

    // Renderizar gráficos si hay datos
    const numAssets = assetData.length
    const numTypes = Object.keys(typeGroups).length
    const section0 = document.getElementById('analysis-section-0')
    const typeCard = document.getElementById('type-distribution-card')
    const assetCard = assetChartContainer.parentElement

    if (numAssets > 0) {
      // Caso 1: Solo 1 tipo -> Ocultar gráfico de tipo y ensanchar tabla/otros
      const isDesktop = window.innerWidth > 768
      if (numTypes <= 1) {
        typeCard.style.display = 'none'
        if (isDesktop) section0.style.gridTemplateColumns = '7fr 3fr'
        else section0.style.gridTemplateColumns = ''
      } else {
        typeCard.style.display = 'flex'
        if (isDesktop) section0.style.gridTemplateColumns = '6fr 2fr 2fr'
        else section0.style.gridTemplateColumns = ''
      }

      // Renderizar gráfico de activos (siempre que haya más de 1, o si es el único gráfico visible)
      if (numAssets > 1 || numTypes > 1) {
        assetCard.style.display = 'flex'
        const sortedAssets = assetData.sort((a, b) => b.currentValue - a.currentValue)
        this._renderDonutChart(assetChartContainer, sortedAssets, totalMarketValueAll, '_assetChart')
      } else {
        // Si solo hay 1 activo y 1 tipo, ocultamos ambos gráficos y dejamos la tabla sola
        assetCard.style.display = 'none'
        if (isDesktop) section0.style.gridTemplateColumns = '1fr'
        else section0.style.gridTemplateColumns = ''
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

  _calcBuyZone(ticker) {
    if (!this._validHistories?.length || !this._validTickers?.length) return null
    const idx = this._validTickers.indexOf(ticker)
    if (idx === -1) return null
    const history = this._validHistories[idx]
    if (!history || history.length < 10) return null

    const prices = history.map(p => p.price)
    const last252 = prices.slice(-252)
    const high52w = Math.max(...last252)
    const low52w = Math.min(...last252)
    const currentPrice = prices[prices.length - 1]
    const range = high52w - low52w
    const percentile = range > 0 ? ((currentPrice - low52w) / range) * 100 : 50

    const ma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / Math.min(prices.length, 50)
    const ma200Slice = prices.slice(-200)
    const ma200 = ma200Slice.length >= 100 ? ma200Slice.reduce((a, b) => a + b, 0) / ma200Slice.length : null

    let label, color
    if (percentile < 30) { label = '↓ Bajo';    color = '#10b981' }
    else if (percentile > 70) { label = '↑ Alto'; color = '#f59e0b' }
    else                      { label = '→ Neutro';         color = '#64748b' }

    return { percentile, high52w, low52w, ma50, ma200, label, color }
  },

  _renderTreemap(container, items) {
    if (!container || !items || items.length === 0) return
    
    // Destruir instancia previa si existe antes de limpiar el contenedor
    this._treemapChart = ChartManager.destroy(this._treemapChart)
    
    container.innerHTML = '<canvas style="width:100%;height:100%"></canvas>'
    const canvas = container.querySelector('canvas')
    
    const getColor = (p) => {
      if (p > 5) return '#065f46' 
      if (p > 0) return '#10b981'
      if (p < -5) return '#991b1b'
      if (p < 0) return '#ef4444'
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
        const d = ctx.raw?._data || ctx.raw
        if (!d || !d.ticker) return []
        // Si el cuadro es muy chico, solo mostrar ticker
        const area = ctx.element?.width * ctx.element?.height || 1000
        if (area < 2500) return [d.ticker]
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
    
    let desktopRows = ''
    let mobileCards = ''

    tickers.forEach(ticker => {
      const currentW = currentWeights[ticker] || 0
      const sharpeW = optimalWeights[ticker] || 0
      const michW = michaudWeights[ticker] || 0
      const hrpW = hrpWeights[ticker] || 0

      const sharpeDiff = (sharpeW - currentW) * 100
      const michaudDiff = (michW - currentW) * 100
      const hrpDiff = (hrpW - currentW) * 100

      const avgW = (sharpeW + michW + hrpW) / 3
      const avgDiff = (avgW - currentW) * 100

      // Desktop row
      desktopRows += `<tr>
        <td><strong>${ticker}</strong></td>
        <td>${(currentW * 100).toFixed(1)}%</td>
        <td style="color: var(--text-muted)">${(sharpeW * 100).toFixed(1)}%</td>
        <td style="color: var(--text-muted); font-size: 0.65rem">${sharpeDiff > 0 ? '+' : ''}${sharpeDiff.toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 600">${(michW * 100).toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 800">${michaudDiff > 0 ? '+' : ''}${michaudDiff.toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 700">${(hrpW * 100).toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 800">${hrpDiff > 0 ? '+' : ''}${hrpDiff.toFixed(1)}%</td>
        <td style="background: var(--bg-main); font-weight: 700">${(avgW * 100).toFixed(1)}%</td>
        <td style="background: var(--bg-main); color: ${avgDiff >= 0 ? '#10b981' : '#ef4444'}; font-weight: 900">${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(1)}%</td>
      </tr>`

      // Mobile card
      mobileCards += `
        <div class="dash-instrument-card collapsed" style="margin-bottom: 0.4rem; border-radius: 6px; border-color: var(--border); overflow: hidden">
          <div class="dash-instrument-card-header" style="padding: 0.4rem 0.6rem; display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center">
            <span class="ticker-chip" style="font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.3rem">${ticker}</span>
            <div style="display: flex; gap: 0.2rem; margin-left: auto; flex-wrap: wrap; justify-content: flex-end">
              <span style="background: var(--bg-main); color: var(--text-main); padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 700; font-size: 0.6rem; white-space: nowrap">P: ${(avgW * 100).toFixed(1)}%</span>
              <span style="background: ${avgDiff >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color: ${avgDiff >= 0 ? '#10b981' : '#ef4444'}; font-weight: 900; font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 3px; white-space: nowrap">
                ${avgDiff > 0 ? '+' : ''}${avgDiff.toFixed(1)}%
              </span>
            </div>
          </div>
          <div class="dash-instrument-card-body" style="padding: 0.4rem 0.6rem; gap: 0.2rem">
            <div class="dash-instrument-row" style="margin-bottom: 0.3rem; border-bottom: 1px solid var(--border); padding-bottom: 0.2rem; font-size: 0.65rem">
              <span class="dash-instrument-label">Actual</span>
              <span class="dash-instrument-value" style="font-weight: 700">${(currentW * 100).toFixed(1)}%</span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label">Sharpe</span>
              <span class="dash-instrument-value">${(sharpeW * 100).toFixed(1)}% <small style="color: var(--text-muted); font-size: 0.55rem">(${sharpeDiff > 0 ? '+' : ''}${sharpeDiff.toFixed(1)}%)</small></span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label" style="color: #10b981">Michaud</span>
              <span class="dash-instrument-value" style="color: #10b981; font-weight: 600">${(michW * 100).toFixed(1)}% <small style="font-weight: 800; font-size: 0.55rem">(${michaudDiff > 0 ? '+' : ''}${michaudDiff.toFixed(1)}%)</small></span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label" style="color: #4f46e6">HRP</span>
              <span class="dash-instrument-value" style="color: #4f46e6; font-weight: 700">${(hrpW * 100).toFixed(1)}% <small style="font-weight: 800; font-size: 0.55rem">(${hrpDiff > 0 ? '+' : ''}${hrpDiff.toFixed(1)}%)</small></span>
            </div>
          </div>
        </div>`
      })

      let html = `
      <!-- Desktop Table -->
      <div class="desktop-only table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Actual</th>
              <th>Sharpe</th>
              <th style="color: var(--text-muted)">Dif S</th>
              <th>Michaud</th>
              <th style="color: #10b981">Dif M</th>
              <th>HRP</th>
              <th style="color: #4f46e6">Dif HRP</th>
              <th style="background: var(--bg-main)">Promedio</th>
              <th style="background: var(--bg-main)">Diff</th>
            </tr>
          </thead>
          <tbody>
            ${desktopRows}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-only dash-instruments-cards" style="padding: 0.4rem; box-sizing: border-box; width: 100%">
        ${mobileCards}
      </div>`

      container.innerHTML = html

      // Aplicar ajuste de padding a la tarjeta contenedora en mobile
      if (window.innerWidth <= 768) {
      const parentCard = container.closest('.card')
      if (parentCard) {
        parentCard.style.paddingLeft = '0.4rem'
        parentCard.style.paddingRight = '0.4rem'
      }
      }
      },  _updateMetricsUI(analysis, benchmarkTicker) {
    const { beta, alpha, r2, vR, es, maxDrawdown } = analysis
    document.getElementById('capm-beta').textContent = beta.toFixed(2)
    document.getElementById('capm-r2').textContent = (r2 * 100).toFixed(0) + '%'
    document.getElementById('capm-alpha').textContent = (alpha > 0 ? '+' : '') + (alpha * 100).toFixed(1) + '%'
    document.getElementById('capm-alpha').style.color = alpha >= 0 ? '#10b981' : '#ef4444'
    document.getElementById('analysis-var').textContent = (vR * 100).toFixed(2) + '%'
    document.getElementById('analysis-es').textContent = (es * 100).toFixed(2) + '%'
    document.getElementById('analysis-mdd').textContent = (maxDrawdown * 100).toFixed(2) + '%'
    const bD = document.getElementById('capm-beta-desc')
    if (bD) {
      bD.textContent = beta > 1.2 ? 'Agresivo' : (beta < 0.8 ? 'Defensivo' : 'Neutral')
      bD.style.color = beta > 1.2 ? '#ef4444' : (beta < 0.8 ? '#3b82f6' : 'var(--text-muted)')
    }
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
    const isMobile = window.innerWidth <= 768
    const n = tickers.length, numDays = returnsMatrix[0].length
    const stats = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return { avg, std: Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) } })
    const fontSize = isMobile ? '0.5rem' : '0.6rem'
    const cellPad = '2px 1px'
    const shortTicker = t => t.length > 4 ? t.slice(0, 4) : t
    const labelStyle = `padding:${cellPad}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:0`
    let html = `<table style="width:100%; table-layout:fixed; font-size:${fontSize}; border-collapse:collapse"><tr><th style="${labelStyle}"></th>`
    tickers.forEach(t => html += `<th style="${labelStyle}">${shortTicker(t)}</th>`)
    for (let i = 0; i < n; i++) {
      html += `<tr><td style="font-weight:bold; ${labelStyle}">${shortTicker(tickers[i])}</td>`
      for (let j = 0; j < n; j++) {
        let cov = 0; for (let d = 0; d < numDays; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
        const corr = (stats[i].std * stats[j].std === 0) ? 0 : (cov / numDays) / (stats[i].std * stats[j].std)
        const bg = corr > 0.5 ? `rgba(16, 185, 129, ${corr})` : (corr < -0.2 ? `rgba(239, 68, 68, ${Math.abs(corr)})` : 'transparent')
        html += `<td style="background:${bg}; text-align:center; padding:${cellPad}">${corr.toFixed(2)}</td>`
      }
      html += `</tr>`
    }
    container.innerHTML = html + `</table>`
  },

  _bindMobileAccordion() {
    document.querySelectorAll('.dash-instrument-card-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const card = e.currentTarget.closest('.dash-instrument-card');
        if (card) {
          card.classList.toggle('collapsed');
        }
      });
    });
  }
}
