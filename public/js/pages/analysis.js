import { supabase } from '../supabase-client.js'
import { apiRequest } from '../api-client.js'
import { showToast } from '../app.js'

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
        </div>
      </div>

      <div id="analysis-results" style="display: none">
        <!-- SECCIÓN 1: KPIs (IZQ 320px) y Frontera Eficiente (DER 1fr) -->
        <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <!-- Tarjeta de Métricas Compacta -->
          <div class="card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.25rem; color: var(--text-muted)">Riesgo y Retorno</h3>
            <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.4rem">
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

          <!-- Tarjeta de Gráfico Compacta -->
          <div class="card" style="padding: 1.25rem; height: 100%; margin-bottom: 0">
            <h3 style="font-size: 1rem; margin-bottom: 1rem">Frontera Eficiente (Markowitz)</h3>
            <div style="height: 350px; position: relative">
              <canvas id="markowitz-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: Monte Carlo (IZQ 50%) y Backtesting (DER 50%) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <!-- Monte Carlo -->
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Simulación Monte Carlo (1 año)</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              Proyección de 50 escenarios posibles para la cartera óptima.
            </p>
            <div style="height: 250px; position: relative">
              <canvas id="montecarlo-chart"></canvas>
            </div>
          </div>

          <!-- Backtesting -->
          <div class="card" style="margin-bottom: 0">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem">
              <div>
                <h3 style="font-size: 0.95rem; margin-bottom: 0.15rem">Backtesting</h3>
                <p style="font-size: 0.7rem; color: var(--text-muted)">
                  Rendimiento histórico vs Benchmark.
                </p>
              </div>
              <div id="backtesting-result" style="text-align: right; font-weight: 700; font-size: 0.85rem"></div>
            </div>
            <div style="height: 220px; position: relative">
              <canvas id="backtesting-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: Composición, Riesgo y Crisis (30% / 40% / 30%) -->
        <div style="display: grid; grid-template-columns: 3fr 4fr 3fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <!-- 1. Redistribución (30%) -->
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem">Redistribución</h3>
            <div id="redistribution-table" style="font-size: 0.8rem"></div>
          </div>

          <!-- 2. Contribución al Riesgo (40%) -->
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">¿Quién aporta el riesgo?</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 1rem">Distribución de la volatilidad por activo.</p>
            <div style="height: 250px; position: relative">
              <canvas id="risk-contribution-chart"></canvas>
            </div>
          </div>

          <!-- 3. Stress Testing (30%) -->
          <div class="card" style="margin-bottom: 0; padding: 1rem">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem">Stress Test</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 1rem">Estimación de caídas en crisis.</p>
            <div id="stress-test-results" style="display: flex; flex-direction: column; gap: 0.5rem">
              <!-- Se llena como mini-KPIs -->
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: Drawdown (IZQ 50%) y Correlación (DER 50%) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; align-items: stretch">
          <!-- Historial de Caídas -->
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Historial de Caídas (Drawdown)</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              Profundidad de caídas históricas desde picos máximos.
            </p>
            <div style="height: 220px; position: relative">
              <canvas id="drawdown-chart"></canvas>
            </div>
          </div>

          <!-- Matriz de Correlación -->
          <div class="card" style="margin-bottom: 0">
            <h3 style="font-size: 0.95rem; margin-bottom: 0.25rem">Matriz de Correlación</h3>
            <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">
              Interdependencia entre los activos de la cartera.
            </p>
            <div id="correlation-matrix" style="overflow-x: auto; font-size: 0.75rem"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 1.5rem; padding: 1rem">
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

      // Agrupar por ALyC para el select
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
  },

  async _runAnalysis() {
    const alycId = document.getElementById('analysis-alyc-select').value
    if (!alycId) return

    const resultsDiv = document.getElementById('analysis-results')
    const loadingDiv = document.getElementById('analysis-loading')
    
    resultsDiv.style.display = 'none'
    loadingDiv.style.display = 'block'

    try {
      // 1. Obtener tenencia de la ALyC
      const { data: holdings, error } = await supabase.rpc('get_user_holdings')
      if (error) throw error
      
      const alycHoldings = holdings.filter(h => h.alyc_id === alycId)
      if (alycHoldings.length < 2) {
        throw new Error('Se necesitan al menos 2 activos en la ALyC para realizar un análisis de cartera.')
      }

      // 2. Obtener precios históricos + Benchmark
      const benchmarkTicker = document.getElementById('analysis-benchmark').value || 'SPY'
      const historyPromises = [
        ...alycHoldings.map(h => apiRequest('GET', `/api/history/${encodeURIComponent(h.ticker)}`)),
        apiRequest('GET', `/api/history/${encodeURIComponent(benchmarkTicker)}`)
      ]
      
      const results = await Promise.allSettled(historyPromises)

      // Procesar resultados de activos
      const assetResults = results.slice(0, alycHoldings.length)
      const benchmarkResult = results[results.length - 1]

      const validHistories = []
      const validTickers = []
      const validHoldings = []

      assetResults.forEach((res, i) => {
        const h = alycHoldings[i]
        if (res.status === 'fulfilled' && res.value?.length > 10) {
          validHistories.push(res.value)
          validTickers.push(h.ticker)
          validHoldings.push(h)
          console.log(`[Analysis Debug] Ticker ${h.ticker} OK (${res.value.length} precios)`)
        } else {
          const reason = res.status === 'rejected' ? (res.reason?.message || 'Petición fallida') : 'pocos datos'
          const length = res.value?.length || 0
          console.warn(`[Analysis Debug] Ticker ${h.ticker} DESCARTADO. Razón: ${reason}. Longitud: ${length}`)
        }
      })

      if (validTickers.length < 2) throw new Error('No hay suficientes activos con datos históricos.')
      if (benchmarkResult.status === 'rejected') throw new Error('No se pudo cargar el historial del Benchmark.')

      // 3. Procesar retornos alineados por el calendario del Benchmark
      const benchmarkData = benchmarkResult.value
      console.log('[Analysis Debug] Calendario Maestro (Benchmark) puntos:', benchmarkData.length)
      
      const returnsMatrix = this._calculateReturns(validHistories, benchmarkData)
      const benchmarkReturns = this._calculateReturns([benchmarkData], benchmarkData)[0]

      console.log('[Analysis Debug] Matriz de retornos generada para:', validTickers.join(', '))

      // 4. Cálculos Markowitz y CAPM
      const analysis = this._performMarkowitz(validTickers, returnsMatrix, validHoldings)
      
      // 5. Renderizar (Primero cargar Chart.js para evitar errores de constructor)
      await this._loadChartJS()
      
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
      
      document.getElementById('analysis-summary').innerHTML = `
        El modelo analizó <strong>${validTickers.join(', ')}</strong> comparándolos contra <strong>${benchmarkTicker}</strong>. 
        Basándose en los últimos 6 meses, calculamos la eficiencia (Markowitz), la proyección (Monte Carlo) 
        y la sensibilidad al mercado (CAPM).`

      loadingDiv.style.display = 'none'
      resultsDiv.style.display = 'block'
    } catch (e) {
      console.error(e)
      showToast(e.message, 'error')
      loadingDiv.style.display = 'none'
    }
  },

  _renderCorrelationHeatmap(tickers, returnsMatrix) {
    const container = document.getElementById('correlation-matrix')
    const numAssets = tickers.length
    const numDays   = returnsMatrix[0].length

    // 1. Calcular promedios y desviaciones estándar
    const stats = returnsMatrix.map(r => {
      const avg = r.reduce((a, b) => a + b, 0) / r.length
      const std = Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length)
      return { avg, std }
    })

    // 2. Armar la tabla HTML
    let html = `<table class="correlation-table" style="width:100%; border-collapse: separate; border-spacing: 2px; font-size: 0.8rem">`
    
    // Header
    html += `<tr><th></th>`
    tickers.forEach(t => html += `<th style="text-align:center; padding: 4px">${t}</th>`)
    html += `</tr>`

    // Filas
    for (let i = 0; i < numAssets; i++) {
      html += `<tr><td style="font-weight:bold; padding: 4px">${tickers[i]}</td>`
      for (let j = 0; j < numAssets; j++) {
        // Calcular correlación Pearson
        let cov = 0
        for (let d = 0; d < numDays; d++) {
          cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
        }
        cov /= numDays
        
        const corr = (stats[i].std * stats[j].std === 0) ? 0 : cov / (stats[i].std * stats[j].std)
        
        // Determinar color de fondo
        // Escala: 1 (verde) -> 0 (blanco/gris) -> -1 (rojo)
        let bg = 'rgba(200, 200, 200, 0.1)' // Neutral
        if (corr > 0.5) bg = `rgba(16, 185, 129, ${corr})`   // Verde
        else if (corr < -0.2) bg = `rgba(239, 68, 68, ${Math.abs(corr)})` // Rojo
        
        html += `<td style="background-color: ${bg}; text-align:center; padding: 8px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05)">
          ${corr.toFixed(2)}
        </td>`
      }
      html += `</tr>`
    }
    html += `</table>`
    container.innerHTML = html
  },

  async _loadChartJS() {
    if (!window.Chart) {
      const mod = await import('https://cdn.jsdelivr.net/npm/chart.js/+esm')
      window.Chart = mod.Chart || mod.default || mod
    }
  },

  _renderDrawdownChart(analysis, returnsMatrix) {
    const ctx = document.getElementById('drawdown-chart').getContext('2d')
    const numDays = returnsMatrix[0].length
    
    // 1. Calcular Retorno Acumulado de la cartera actual
    let cumulativeReturn = 1
    const series = [0] // Empezamos en 0%
    const drawdowns = [0]
    let peak = 1
    let maxDrawdown = 0

    for (let d = 0; d < numDays; d++) {
      let dayReturn = 0
      analysis.current.weights.forEach((w, assetIdx) => {
        dayReturn += w * returnsMatrix[assetIdx][d]
      })
      
      cumulativeReturn *= (1 + dayReturn)
      if (cumulativeReturn > peak) peak = cumulativeReturn
      
      const dd = (cumulativeReturn - peak) / peak
      drawdowns.push(dd * 100)
      if (dd < maxDrawdown) maxDrawdown = dd
    }

    // Actualizar KPI
    document.getElementById('analysis-mdd').textContent = (maxDrawdown * 100).toFixed(2) + '%'

    if (this._ddChart) this._ddChart.destroy()

    this._ddChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: drawdowns.length }, (_, i) => `Día ${i}`),
        datasets: [{
          label: 'Drawdown (%)',
          data: drawdowns,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { 
            title: { display: true, text: 'Caída desde el pico (%)' },
            grid: { color: 'rgba(200, 200, 200, 0.1)' },
            max: 0 // El drawdown siempre es <= 0
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Caída: ${ctx.raw.toFixed(2)}%`
            }
          }
        }
      }
    })
  },

  async _renderMonteCarlo(analysis) {
    const ctx = document.getElementById('montecarlo-chart').getContext('2d')
    const days = 252
    const sims = 50
    const startPrice = 100 // Valor base 100%
    
    // Retorno diario (des-anualizar) y volatilidad diaria
    const dailyReturn = analysis.optimal.return / 252
    const dailyVol    = analysis.optimal.std / Math.sqrt(252)

    const datasets = []
    
    // Helper para generar número aleatorio con distribución normal (Box-Muller)
    function randn_bm() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    for (let s = 0; s < sims; s++) {
      const data = [startPrice]
      let current = startPrice
      for (let d = 1; d <= days; d++) {
        // Movimiento Browniano Geométrico
        const change = dailyReturn + dailyVol * randn_bm()
        current = current * (1 + change)
        data.push(current)
      }
      
      datasets.push({
        data,
        borderColor: s === 0 ? '#10b981' : 'rgba(150, 150, 150, 0.2)',
        borderWidth: s === 0 ? 3 : 1,
        pointRadius: 0,
        fill: false,
        label: s === 0 ? 'Trayectoria mediana' : null
      })
    }

    if (this._mcChart) this._mcChart.destroy()

    this._mcChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: days + 1 }, (_, i) => `Día ${i}`),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false }, // Ocultar días para no saturar
          y: { 
            title: { display: true, text: 'Valor Cartera (Base 100)' },
            grid: { color: 'rgba(200, 200, 200, 0.1)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false } // Desactivar tooltips para no laggear con tantas líneas
        }
      }
    })
  },

  _renderBacktestingChart(analysis, returnsMatrix, benchmarkReturns, benchmarkTicker) {
    const ctx = document.getElementById('backtesting-chart').getContext('2d')
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length)
    
    // 1. Calcular Equity Curves
    let portfolioEquity = 100
    let benchmarkEquity = 100
    const pSeries = [100]
    const bSeries = [100]

    for (let d = 0; d < numDays; d++) {
      let dayReturn = 0
      analysis.current.weights.forEach((w, assetIdx) => {
        dayReturn += w * returnsMatrix[assetIdx][d]
      })
      
      portfolioEquity *= (1 + dayReturn)
      benchmarkEquity *= (1 + benchmarkReturns[d])
      
      pSeries.push(portfolioEquity)
      bSeries.push(benchmarkEquity)
    }

    const pFinalReturn = ((portfolioEquity - 100)).toFixed(1)
    const bFinalReturn = ((benchmarkEquity - 100)).toFixed(1)
    const diff = (portfolioEquity - benchmarkEquity).toFixed(1)
    
    const resultEl = document.getElementById('backtesting-result')
    resultEl.innerHTML = `
      <span style="color: #4f46e6">Portfolio: ${pFinalReturn}%</span> | 
      <span style="color: var(--text-muted)">${benchmarkTicker}: ${bFinalReturn}%</span>
      <div style="font-size: 0.75rem; color: ${diff >= 0 ? '#10b981' : '#ef4444'}">
        ${diff >= 0 ? 'Excedente: +' : 'Debajo: '}${diff}%
      </div>`

    if (this._btChart) this._btChart.destroy()

    this._btChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: pSeries.length }, (_, i) => `Día ${i}`),
        datasets: [
          {
            label: 'Mi Portfolio',
            data: pSeries,
            borderColor: '#4f46e6',
            backgroundColor: 'rgba(79, 70, 230, 0.1)',
            fill: true,
            pointRadius: 0,
            borderWidth: 3,
            tension: 0.1
          },
          {
            label: benchmarkTicker,
            data: bSeries,
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { 
            title: { display: true, text: 'Valor Acumulado (Base 100)' },
            grid: { color: 'rgba(200, 200, 200, 0.1)' }
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)}`
            }
          }
        }
      }
    })
  },

  _renderRiskContribution(analysis, returnsMatrix) {
    const ctx = document.getElementById('risk-contribution-chart').getContext('2d')
    const tickers = analysis.tickers
    const weights = analysis.current.weights

    // Calcular volatilidad individual (desviación estándar)
    const stdDevs = returnsMatrix.map(r => {
      const avg = r.reduce((a, b) => a + b, 0) / r.length
      return Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length)
    })

    // Contribución al riesgo simplificada: peso * volatilidad
    const rawContributions = weights.map((w, i) => w * stdDevs[i])
    const totalRawRisk = rawContributions.reduce((a, b) => a + b, 0)
    const percentageContributions = rawContributions.map(c => (c / totalRawRisk) * 100)

    if (this._rcChart) this._rcChart.destroy()

    this._rcChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: tickers,
        datasets: [{
          label: '% del Riesgo Total',
          data: percentageContributions,
          backgroundColor: '#4f46e6',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            max: 100,
            ticks: { callback: v => v + '%' },
            grid: { display: false }
          },
          y: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Aporta el ${ctx.raw.toFixed(1)}% del riesgo`
            }
          }
        }
      }
    })
  },

  _performCAPM(analysis, returnsMatrix, benchmarkReturns) {
    const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length)
    
    // Calcular retornos diarios de la cartera actual
    const portfolioDailyReturns = []
    for (let d = 0; d < numDays; d++) {
      let dayReturn = 0
      analysis.current.weights.forEach((w, assetIdx) => {
        dayReturn += w * returnsMatrix[assetIdx][d]
      })
      portfolioDailyReturns.push(dayReturn)
    }

    // Benchmark alineado
    const mktReturns = benchmarkReturns.slice(0, numDays)
    const mktAvg = mktReturns.reduce((a, b) => a + b, 0) / numDays
    const pAvg   = portfolioDailyReturns.reduce((a, b) => a + b, 0) / numDays

    // Covarianza y Varianza del Mercado
    let cov = 0
    let varMkt = 0
    for (let i = 0; i < numDays; i++) {
      cov += (portfolioDailyReturns[i] - pAvg) * (mktReturns[i] - mktAvg)
      varMkt += Math.pow(mktReturns[i] - mktAvg, 2)
    }
    
    const beta = varMkt === 0 ? 0 : cov / varMkt
    const r2 = varMkt === 0 ? 0 : Math.pow(cov, 2) / (varMkt * portfolioDailyReturns.reduce((acc, r) => acc + Math.pow(r - pAvg, 2), 0))
    
    // Alpha Anualizado (Jensen's Alpha)
    const mktAvgAnn = mktAvg * 252
    const pAvgAnn   = pAvg * 252
    const alpha = pAvgAnn - (beta * mktAvgAnn)

    // Cálculo de VaR (95% confianza)
    const sortedReturns = [...portfolioDailyReturns].sort((a, b) => a - b)
    const varIdx = Math.floor(sortedReturns.length * 0.05)
    const varValue = sortedReturns[varIdx] || 0

    // Actualizar UI
    document.getElementById('capm-beta').textContent = beta.toFixed(2)
    document.getElementById('capm-r2').textContent = (r2 * 100).toFixed(0) + '%'
    document.getElementById('capm-alpha').textContent = (alpha > 0 ? '+' : '') + (alpha * 100).toFixed(1) + '%'
    document.getElementById('capm-alpha').style.color = alpha >= 0 ? '#10b981' : '#ef4444'
    document.getElementById('analysis-var').textContent = (varValue * 100).toFixed(2) + '%'

    const betaDesc = document.getElementById('capm-beta-desc')
    if (beta > 1.2) {
      betaDesc.textContent = 'Agresivo (Más volátil que el mercado)'
      betaDesc.style.color = '#ef4444'
    } else if (beta < 0.8) {
      betaDesc.textContent = 'Defensivo (Menos volátil que el mercado)'
      betaDesc.style.color = '#3b82f6'
    } else {
      betaDesc.textContent = 'Neutral (Sigue al mercado)'
      betaDesc.style.color = 'var(--text-muted)'
    }

    return { beta, alpha, r2 }
  },

  _renderStressTest(beta) {
    const container = document.getElementById('stress-test-results')
    
    const scenarios = [
      { name: 'Crash COVID', mktDrop: -34, desc: 'Pánico global repentino' },
      { name: 'Crisis 2008', mktDrop: -50, desc: 'Recesión prolongada' },
      { name: 'Shock Tech', mktDrop: -15, desc: 'Ajuste de valuaciones' },
      { name: 'Cisne Negro', mktDrop: -10, desc: 'Evento inesperado' }
    ]

    container.innerHTML = scenarios.map(s => {
      const portfolioImpact = (beta * s.mktDrop).toFixed(1)
      return `
        <div style="padding: 0.6rem 0.8rem; border-radius: var(--radius); background: var(--bg-main); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem">
          <div style="flex: 1">
            <div style="font-size: 0.75rem; font-weight: 700; line-height: 1.1">${s.name}</div>
            <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 0.1rem">${s.desc}</div>
            <div style="font-size: 0.55rem; font-weight: 600; color: var(--text-muted); margin-top: 0.2rem">Mercado: ${s.mktDrop}%</div>
          </div>
          <div style="text-align: right">
            <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.1rem">Tu Impacto</div>
            <div style="font-size: 1rem; font-weight: 800; color: #ef4444; white-space: nowrap">
              ${portfolioImpact}%
            </div>
          </div>
        </div>`
    }).join('')
  },

  _calculateReturns(histories, masterCalendar) {
    if (!masterCalendar || masterCalendar.length === 0) return []
    
    // Helper para normalizar timestamp Unix a string YYYY-MM-DD
    const toDateStr = (ts) => new Date(ts * 1000).toISOString().split('T')[0]
    
    const masterDateStrings = masterCalendar.map(h => toDateStr(h.date))
    
    return histories.map(history => {
      // Crear un mapa de fecha (string) -> precio
      const priceMap = {}
      history.forEach(h => {
        priceMap[toDateStr(h.date)] = h.price
      })

      const alignedPrices = []
      let lastValidPrice = null

      masterDateStrings.forEach(dateStr => {
        const currentPrice = priceMap[dateStr]
        if (currentPrice !== undefined && currentPrice !== null) {
          alignedPrices.push(currentPrice)
          lastValidPrice = currentPrice
        } else if (lastValidPrice !== null) {
          // Gaps (feriados locales): Usamos el último precio conocido
          alignedPrices.push(lastValidPrice)
        } else {
          // Inicio de serie: Buscamos el primer precio real
          const firstItem = history.find(h => h.price !== null)
          const firstPrice = firstItem ? firstItem.price : 0
          alignedPrices.push(firstPrice)
          lastValidPrice = firstPrice
        }
      })

      const returns = []
      for (let i = 1; i < alignedPrices.length; i++) {
        const prev = alignedPrices[i - 1]
        const curr = alignedPrices[i]
        const ret = prev === 0 ? 0 : (curr - prev) / prev
        returns.push(isNaN(ret) ? 0 : ret)
      }
      return returns
    })
  },

  _performMarkowitz(tickers, returnsMatrix, holdings) {
    const numAssets = tickers.length
    const numPortfolios = 1000
    
    // Calcular retornos promedio y desviaciones estándar diarios
    const avgReturnsDaily = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length)
    const stdDevsDaily   = returnsMatrix.map((r, i) => {
      const avg = avgReturnsDaily[i]
      const squareDiffs = r.map(v => Math.pow(v - avg, 2))
      return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / r.length)
    })

    // ANUALIZACIÓN (Asumiendo 252 días hábiles)
    const avgReturns = avgReturnsDaily.map(r => r * 252)
    const stdDevs    = stdDevsDaily.map(s => s * Math.sqrt(252))
    
    const portfolios = []
    let maxSharpeIdx = 0
    let maxSharpe = -Infinity

    for (let i = 0; i < numPortfolios; i++) {
      let weights = Array.from({ length: numAssets }, () => Math.random())
      const sumWeights = weights.reduce((a, b) => a + b, 0)
      weights = weights.map(w => w / sumWeights)

      const pReturn = weights.reduce((acc, w, idx) => acc + w * avgReturns[idx], 0)
      const pStd = weights.reduce((acc, w, idx) => acc + w * stdDevs[idx], 0)
      const sharpe = pStd === 0 ? 0 : pReturn / pStd

      portfolios.push({ weights, return: pReturn, std: pStd, sharpe })

      if (sharpe > maxSharpe) {
        maxSharpe = sharpe
        maxSharpeIdx = i
      }
    }

    // Cartera actual (anualizada)
    const totalValue = holdings.reduce((acc, h) => acc + (h.total_quantity * h.avg_buy_price), 0)
    const currentWeights = holdings.map(h => (h.total_quantity * h.avg_buy_price) / totalValue)
    const currentReturn = currentWeights.reduce((acc, w, idx) => acc + w * avgReturns[idx], 0)
    const currentStd = currentWeights.reduce((acc, w, idx) => acc + w * stdDevs[idx], 0)

    console.log('Markowitz Results (Annualized):', {
      tickers,
      optimal: portfolios[maxSharpeIdx],
      current: { return: currentReturn, std: currentStd }
    })

    return {
      portfolios,
      tickers,
      optimal: portfolios[maxSharpeIdx],
      current: { weights: currentWeights, return: currentReturn, std: currentStd }
    }
  },

  async _renderChart(analysis) {
    const canvas = document.getElementById('markowitz-chart')
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    if (this._chart) this._chart.destroy()

    const scatterData = analysis.portfolios.map(p => ({ x: p.std, y: p.return }))

    this._chart = new window.Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Carteras Aleatorias',
            data: scatterData,
            backgroundColor: 'rgba(150, 150, 150, 0.4)',
            pointRadius: 2
          },
          {
            label: 'Óptima (Max Sharpe)',
            data: [{ x: analysis.optimal.std, y: analysis.optimal.return }],
            backgroundColor: '#10b981',
            pointRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          {
            label: 'Cartera Actual',
            data: [{ x: analysis.current.std, y: analysis.current.return }],
            backgroundColor: '#3b82f6',
            pointRadius: 8,
            pointStyle: 'rectRot',
            borderColor: '#fff',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            title: { display: true, text: 'Riesgo Anualizado (Volatilidad %)' },
            ticks: { callback: v => (v * 100).toFixed(0) + '%' }
          },
          y: { 
            title: { display: true, text: 'Retorno Anual Esperado (%)' },
            ticks: { callback: v => (v * 100).toFixed(0) + '%' }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || ''
                const x = (ctx.raw.x * 100).toFixed(1)
                const y = (ctx.raw.y * 100).toFixed(1)
                return `${label}: Retorno ${y}%, Riesgo ${x}%`
              }
            }
          }
        }
      }
    })
  },

  _renderRedistribution(analysis, holdings) {
    const container = document.getElementById('redistribution-table')
    const tickers = analysis.tickers
    const currentWeights = analysis.current.weights
    const optimalWeights = analysis.optimal.weights

    let html = `
      <table class="table">
        <thead>
          <tr>
            <th>Activo</th>
            <th>Actual</th>
            <th>Sugerido</th>
            <th>Dif.</th>
          </tr>
        </thead>
        <tbody>`

    tickers.forEach((ticker, i) => {
      const diff = (optimalWeights[i] - currentWeights[i]) * 100
      const diffClass = diff > 0 ? 'text-success' : 'text-danger'
      html += `
        <tr>
          <td><strong>${ticker}</strong></td>
          <td>${(currentWeights[i] * 100).toFixed(1)}%</td>
          <td style="font-weight: 600">${(optimalWeights[i] * 100).toFixed(1)}%</td>
          <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</td>
        </tr>`
    })

    html += `</tbody></table>`
    container.innerHTML = html
  }
}
