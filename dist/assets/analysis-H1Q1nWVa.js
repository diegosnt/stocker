const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jspdf.es.min-Bx9juSLp.js","assets/chunk-CilyBKbf.js","assets/preload-helper-D4M6sveU.js","assets/typeof-B5P0Path.js","assets/html2canvas-C2eG7RaX.js"])))=>i.map(i=>d[i]);
import{r as e}from"./chunk-CilyBKbf.js";import{r as t,t as n}from"./api-client-CZ7NvV8n.js";import{t as r}from"./preload-helper-D4M6sveU.js";import{i,n as a,t as o,u as s}from"./index-CErj7a_L.js";import{n as c,t as l}from"./chart-manager-NkFeXNJp.js";function u(e,t){let n=document.getElementById(`correlation-matrix`);if(!n)return;let r=window.innerWidth<=768,i=e.length,a=t[0].length,o=t.map(e=>{let t=e.reduce((e,t)=>e+t,0)/e.length;return{avg:t,std:Math.sqrt(e.reduce((e,n)=>e+(n-t)**2,0)/e.length)}}),s=r?`0.5rem`:`0.6rem`,c=`2px 1px`,l=e=>e.length>4?e.slice(0,4):e,u=`padding:${c}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:0`,d=`<table style="width:100%; table-layout:fixed; font-size:${s}; border-collapse:collapse"><tr><th style="${u}"></th>`;e.forEach(e=>d+=`<th style="${u}">${l(e)}</th>`);for(let n=0;n<i;n++){d+=`<tr><td style="font-weight:bold; ${u}">${l(e[n])}</td>`;for(let e=0;e<i;e++){let r=0;for(let i=0;i<a;i++)r+=(t[n][i]-o[n].avg)*(t[e][i]-o[e].avg);let i=o[n].std*o[e].std===0?0:r/a/(o[n].std*o[e].std),s=i>.5?`rgba(16, 185, 129, ${i})`:i<-.2?`rgba(239, 68, 68, ${Math.abs(i)})`:`transparent`;d+=`<td style="background:${s}; text-align:center; padding:${c}">${i.toFixed(2)}</td>`}d+=`</tr>`}n.innerHTML=d+`</table>`}function d(e,t,n){if(!e||!t||t.length===0)return n;l.destroy(n),e.innerHTML=`<canvas style="width:100%;height:100%"></canvas>`;let r=e.querySelector(`canvas`),i=e=>e>5?`#065f46`:e>0?`#10b981`:e<-5?`#991b1b`:e<0?`#ef4444`:`#64748b`,a=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),o=t.map(e=>({ticker:e.ticker,value:e.currentValue,pct:e.pnlPct??0,color:i(e.pnlPct??0)})).filter(e=>e.value>0);return l.renderTreemapChart(r,o,{instance:null,formatter:e=>{let t=e.raw?._data||e.raw;return!t||!t.ticker?[]:(e.element?.width*e.element?.height||1e3)<2500?[t.ticker]:[t.ticker,(t.pct==null?`0`:a(t.pct))+`%`]},chartOptions:{plugins:{tooltip:{callbacks:{label:e=>{let t=e.raw?._data;return t?` ${t.ticker}: $${a(t.value)} (${a(t.pct)}%)`:``}}}}}})}var f={_chart:null,_mcChart:null,_btChart:null,_rcChart:null,_ddChart:null,_treemapChart:null,_assetChart:null,_typeChart:null,_compChart:null,_activityChart:null,_resolvedPrices:{},_activeAlycName:null,_activeAlycId:null,_activeBenchmark:`SPY`,_lastValidHoldings:[],_validHistories:[],_validTickers:[],_holdingsSortCol:`marketValue`,_holdingsSortAsc:!1,cleanup(){[this._chart,this._mcChart,this._btChart,this._rcChart,this._ddChart,this._treemapChart,this._assetChart,this._typeChart,this._compChart,this._activityChart].forEach(e=>{e&&e.destroy()}),this._chart=null,this._mcChart=null,this._btChart=null,this._rcChart=null,this._ddChart=null,this._treemapChart=null,this._assetChart=null,this._typeChart=null,this._compChart=null,this._activityChart=null,this._validHistories=[],this._validTickers=[],c(document.getElementById(`page-content`))},async render(){this.cleanup();let e=document.getElementById(`page-content`);e.innerHTML=`
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
          <div class="card analysis-chart-top" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Activo</h3>
            <div id="current-holdings-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
          </div>
          <div id="type-distribution-card" class="card analysis-chart-bottom" style="margin-bottom: 0; padding: 1.25rem; display: flex; flex-direction: column">
            <h3 style="font-size: 0.9rem; margin-bottom: 1rem; color: var(--text-muted)">Distribución por Tipo</h3>
            <div id="current-type-chart" style="flex: 1; display: flex; align-items: center; justify-content: center"></div>
          </div>
        </div>

        <!-- SECCIÓN 0.2: Actividad de Operaciones -->
        <div class="card" style="margin-bottom: 1.5rem; padding: 1.25rem">
          <h3 style="font-size: 0.95rem; margin-bottom: 0.2rem">Actividad de Operaciones</h3>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem">Frecuencia de compras y ventas por mes.</p>
          <div id="activity-chart-container" style="height: 200px; position: relative">
            <div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding-top:2rem">Cargando actividad...</div>
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
      </div>`,this._setupEvents(),document.querySelector(`.btn-benchmark-quick[data-ticker="SPY"]`)?.classList.add(`btn-primary`),await this._loadAlycs()},async _loadAlycs(){let e=document.getElementById(`analysis-alyc-buttons`);try{let n=a(`user_holdings`);if(!n){let e=await t.rpc(`get_user_holdings`,{p_limit:500,p_offset:0});if(e.error)throw e.error;n=e.data,n&&i(`user_holdings`,n)}let r=[...new Set(n.map(e=>JSON.stringify({id:e.alyc_id,name:e.alyc_name})))].map(e=>JSON.parse(e));if(r.length===0){e.innerHTML=`<span style="color: var(--text-muted); font-size: 0.85rem">No tenés tenencias registradas</span>`;return}e.innerHTML=``,r.forEach(t=>{let n=document.createElement(`button`);n.className=`btn-alyc`,n.style.border=`1px solid var(--border)`,n.textContent=t.name,n.onclick=()=>{this._activeAlycName=t.name,this._runAnalysis(t.id,n)},e.appendChild(n)})}catch(t){console.error(t),e.innerHTML=`<span style="color: #ef4444; font-size: 0.85rem">Error al cargar ALyCs</span>`}},_toggleConfigCard(e){let t=document.getElementById(`analysis-control-card`),n=document.getElementById(`analysis-config-title`);n.textContent=t.classList.toggle(`collapsed`)&&e?`Configuración — ${e}`:`Configuración de Análisis`},_setupEvents(){document.getElementById(`btn-generate-pdf`).addEventListener(`click`,()=>this._generatePDF()),document.getElementById(`analysis-config-header`).addEventListener(`click`,()=>{this._toggleConfigCard(this._activeAlycName||null)});let e=document.getElementById(`btn-refresh-comp`);e&&(e.onclick=async()=>{e.style.transform=`rotate(360deg)`;let t=(this._lastValidHoldings||[]).map(e=>e.ticker);t.length>0&&(await this._updateMarketPrices(t),this._renderComparisonChart(this._lastValidHoldings)),setTimeout(()=>{e.style.transform=`none`},400)}),document.querySelectorAll(`.btn-benchmark-quick`).forEach(e=>{e.onclick=()=>{if(this._activeBenchmark=e.dataset.ticker,document.querySelectorAll(`.btn-benchmark-quick`).forEach(e=>e.classList.remove(`btn-primary`)),e.classList.add(`btn-primary`),this._activeAlycId){let e=Array.from(document.querySelectorAll(`#analysis-alyc-buttons button`)).find(e=>e.textContent===this._activeAlycName);this._runAnalysis(this._activeAlycId,e)}}})},async _fetchHistory(e){let t=`history_${e}`,r=a(t,{persistent:!0});if(r)return r;let o=new AbortController,s=setTimeout(()=>o.abort(),1e4);try{let r=await n(`GET`,`/api/history/${encodeURIComponent(e)}`,null,{signal:o.signal});return clearTimeout(s),r&&r.length>0&&i(t,r,{persistent:!0,ttlMs:864e5}),r}catch(t){throw clearTimeout(s),t.name===`AbortError`?(console.warn(`[Analysis] Timeout cargando historial para ${e}`),Error(`La API de historial no respondió para ${e} (Timeout 10s)`)):t}},async _runAnalysis(e,n){if(!e)return;this._activeAlycId=e,document.querySelectorAll(`#analysis-alyc-buttons button`).forEach(e=>{e.classList.remove(`btn-primary`)}),n&&n.classList.add(`btn-primary`);let r=document.getElementById(`analysis-results`),c=document.getElementById(`analysis-loading`),d=document.getElementById(`btn-generate-pdf`);r.style.display=`none`,d.disabled=!0,d.style.opacity=`0.5`,d.style.cursor=`not-allowed`,c.style.display=`block`;try{let n=a(`user_holdings`);if(!n){let e=await t.rpc(`get_user_holdings`,{p_limit:500,p_offset:0});if(e.error)throw e.error;n=e.data,n&&i(`user_holdings`,n)}let f=n.filter(t=>t.alyc_id===e);if(f.length<2)throw Error(`Se necesitan al menos 2 activos.`);let p=this._activeBenchmark||`SPY`,m=[...f.map(e=>this._fetchHistory(e.ticker)),this._fetchHistory(p)],h=await Promise.allSettled(m),g=h.slice(0,f.length),_=h[h.length-1],v=[],y=[],b=[],x=[];if(this._resolvedPrices={},g.forEach((e,t)=>{let n=f[t];if(e.status===`fulfilled`&&e.value?.length>10){v.push(e.value),y.push(n.ticker),b.push(n);let t=e.value[e.value.length-1];t&&(this._resolvedPrices[n.ticker]=t.price)}else x.push(n.ticker)}),x.length>0&&console.warn(`[Analysis] Failed to load history for: ${x.join(`, `)}`),y.length<2)throw Error(`No hay suficientes datos históricos.`);if(_.status===`rejected`)throw Error(`No se pudo cargar el Benchmark.`);let S=_.value,C=this._calculateReturns(v,S),w=this._calculateReturns([S],S)[0];this._validHistories=v,this._validTickers=y;let{markowitz:T,hrp:E,michaud:D,monteCarlo:O,metrics:k}=await new Promise((e,t)=>{let n=new Worker(new URL(`/assets/analysis-worker-CbAU2Pu9.js`,``+import.meta.url),{type:`module`});n.postMessage({tickers:y,returnsMatrix:C,holdings:b,benchmarkReturns:w}),n.onmessage=r=>{r.data.status===`success`?e(r.data.data):t(Error(r.data.error)),n.terminate()},n.onerror=e=>{t(e),n.terminate()}}),A={...T,hrp:E,michaud:D,...k};this._updateMetricsUI(A,p);try{this._renderBacktestingChart(A,C,w,p)}catch(e){console.error(`Error Backtesting:`,e)}try{this._renderStressTest(A.beta)}catch(e){console.error(`Error Stress:`,e)}try{await this._renderChart(A)}catch(e){console.error(`Error Markowitz:`,e)}try{this._renderRedistribution(A,b)}catch(e){console.error(`Error Redist:`,e)}let j=document.getElementById(`montecarlo-chart`);if(j)try{this._mcChart=l.renderMonteCarloChart(j,O,{instance:this._mcChart})}catch(e){console.error(`Error MonteCarlo:`,e)}try{u(y,C)}catch(e){console.error(`Error Correlación:`,e)}await this._updateMarketPrices(y),this._lastValidHoldings=b,this._renderCurrentHoldings(b,A),this._renderComparisonChart(b),this._renderActivityChart(e),document.getElementById(`analysis-summary`).innerHTML=`Análisis multi-algoritmo completado contra ${s(p)}.`,x.length>0&&o(`Algunos datos no estarán completos: ${x.join(`, `)}`,`warning`),c.style.display=`none`,r.style.display=`block`,d.disabled=!1,d.style.opacity=`1`,d.style.cursor=`pointer`}catch(e){console.error(e),o(e.message,`error`),c.style.display=`none`,d.disabled=!0,d.style.opacity=`0.5`,d.style.cursor=`not-allowed`}},async _updateMarketPrices(e){if(this._resolvedPrices={},!e||e.length===0)return;let t=new AbortController,r=setTimeout(()=>t.abort(),1e4);try{let i=await n(`GET`,`/api/quotes?tickers=${encodeURIComponent(e.join(`,`))}`,null,{signal:t.signal});clearTimeout(r);for(let t of e)this._resolvedPrices[t]=i[t]?.price??null}catch(e){clearTimeout(r),e.name===`AbortError`?console.warn(`[Analysis] Timeout en consulta de precios de mercado (10s)`):console.error(`Error precios:`,e)}},_renderCurrentHoldings(e,t=null){let n=document.getElementById(`current-holdings-table`),r=document.getElementById(`current-holdings-chart`),i=document.getElementById(`current-type-chart`),a={};e.forEach(e=>{a[e.currency]||(a[e.currency]=[]),a[e.currency].push(e)});let o=``,s=0,c=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),l=e=>e>0?`#10b981`:e<0?`#ef4444`:`var(--text-muted)`,u=e=>e>0?`+`:``,f={},p=[];for(let[e,t]of Object.entries(a)){let n=t.reduce((e,t)=>e+t.total_quantity*t.avg_buy_price,0),r=t.reduce((e,t)=>e+t.total_quantity*(this._resolvedPrices?.[t.ticker]??t.avg_buy_price),0);s+=r,o+=`
        <div class="currency-group" style="margin-bottom: 1.5rem">
          <h4 style="font-size: 0.9rem; color: var(--color-primary); margin-bottom: 0.75rem">Tenencia en ${e}</h4>
          
          <!-- Desktop table -->
          <div class="desktop-only table-wrapper">
            <table class="holdings-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="ticker">Ticker</th>
                  <th class="sortable" data-col="quantity" style="text-align:right">Cant.</th>
                  <th class="sortable" data-col="avg_buy_price" style="text-align:right">Costo</th>
                  <th class="sortable" data-col="invested" style="text-align:right">Invertido</th>
                  <th class="sortable" data-col="price" style="text-align:right">Precio</th>
                  <th class="sortable" data-col="marketValue" style="text-align:right">Valor</th>
                  <th class="sortable" data-col="pnl" style="text-align:right">P&L $</th>
                  <th class="sortable" data-col="pnlPct" style="text-align:right">P&L %</th>
                  <th class="sortable" data-col="weight" style="text-align:right">%</th>
                </tr>
              </thead>
              <tbody>`,t.sort((e,t)=>{let n=e.total_quantity*(this._resolvedPrices?.[e.ticker]??e.avg_buy_price);return t.total_quantity*(this._resolvedPrices?.[t.ticker]??t.avg_buy_price)-n});let i=``,a=``;t.forEach(e=>{let t=this._resolvedPrices?.[e.ticker]??null,n=t?e.total_quantity*t:e.total_quantity*e.avg_buy_price,o=e.total_quantity*e.avg_buy_price,s=t?(t-e.avg_buy_price)*e.total_quantity:0,d=e.avg_buy_price>0&&t?(t/e.avg_buy_price-1)*100:0,m=n/r*100,h=e.instrument_type_name||`Sin tipo`;p.push({ticker:e.ticker,currentValue:n,cost:o,pnlPct:d}),f[h]=(f[h]||0)+n,i+=`
          <tr data-ticker="${e.ticker}" data-quantity="${e.total_quantity}" data-avg_buy_price="${e.avg_buy_price}" 
              data-invested="${o}" data-price="${t??0}" data-marketValue="${n}" 
              data-pnl="${s}" data-pnlPct="${d}" data-weight="${m}">
            <td><span class="ticker-chip">${e.ticker}</span></td>
            <td class="amount">${e.total_quantity.toLocaleString(`es-AR`)}</td>
            <td class="amount">${c(e.avg_buy_price)}</td>
            <td class="amount">${c(o)}</td>
            <td class="amount"><strong>${t?c(t):`--`}</strong></td>
            <td class="amount"><strong>${c(n)}</strong></td>
            <td class="amount" style="color: ${l(s)}; font-weight: bold">${u(s)}${c(s)}</td>
            <td class="amount" style="color: ${l(d)}; font-weight: bold">${u(d)}${d.toFixed(1)}%</td>
            <td class="amount" style="color: var(--text-muted); font-weight: 600">${m.toFixed(1)}%</td>
          </tr>`,a+=`
          <div class="dash-instrument-card collapsed">
            <div class="dash-instrument-card-header">
              <span class="ticker-chip">${e.ticker}</span>
              <span class="dash-instrument-meta">
                <span class="meta-qty">${e.total_quantity.toLocaleString(`es-AR`)}</span>
                <span class="meta-weight">${m.toFixed(1)}%</span>
                <span class="meta-type">${h}</span>
              </span>
            </div>
            <div class="dash-instrument-card-body">
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Precio compra</span>
                <span class="dash-instrument-value">${c(e.avg_buy_price)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Precio actual</span>
                <span class="dash-instrument-value"><strong>${t?c(t):`--`}</strong></span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Invertido</span>
                <span class="dash-instrument-value">${c(o)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">Valor mercado</span>
                <span class="dash-instrument-value"><strong>${c(n)}</strong></span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">P&L $</span>
                <span class="dash-instrument-value" style="color: ${l(s)}; font-weight: bold">${u(s)}${c(s)}</span>
              </div>
              <div class="dash-instrument-row">
                <span class="dash-instrument-label">P&L %</span>
                <span class="dash-instrument-value" style="color: ${l(d)}; font-weight: bold">${u(d)}${d.toFixed(1)}%</span>
              </div>
            </div>
          </div>`}),o+=i,o+=`</tbody><tfoot><tr style="background-color: var(--bg-main); font-weight: 800"><td colspan="3">TOTAL ${e}</td><td class="amount">${c(n)}</td><td></td><td class="amount">${c(r)}</td><td class="amount" style="color: ${l(r-n)}">${u(r-n)}${c(r-n)}</td><td class="amount" style="color: ${l(r-n)}">${((r/n-1)*100).toFixed(1)}%</td><td class="amount">100.0%</td></tr></tfoot></table></div>`,o+=`
        <div class="mobile-only dash-instruments-cards">
          ${a}
          <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-main); border-radius: var(--radius); border: 1px solid var(--border)">
            <div class="dash-instrument-row" style="font-weight: 700">
              <span>TOTAL ${e}</span>
              <span>${c(r)}</span>
            </div>
            <div class="dash-instrument-row" style="font-size: 0.75rem; color: ${l(r-n)}">
              <span>P&L Total</span>
              <span>${u(r-n)}${c(r-n)} (${((r/n-1)*100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>`}n.innerHTML=o||`<div class="table-empty">No hay tenencias registradas.</div>`,this._bindHoldingsSortHeaders(n),this._bindMobileAccordion();let m=p.length,h=Object.keys(f).length,g=document.getElementById(`analysis-section-0`),_=document.getElementById(`type-distribution-card`),v=r.parentElement;if(m>0){if(_.style.display=h>1?`flex`:`none`,m>1||h>1){v.style.display=`flex`,g.style.gridTemplateColumns=``;let e=p.sort((e,t)=>t.currentValue-e.currentValue);this._renderDonutChart(r,e,s,`_assetChart`)}else v.style.display=`none`,_.style.display=`none`,g.style.gridTemplateColumns=`1fr`;if(h>1){let e=Object.entries(f).map(([e,t])=>({ticker:e,currentValue:t})).sort((e,t)=>t.currentValue-e.currentValue);this._renderDonutChart(i,e,s,`_typeChart`)}this._treemapChart=d(document.getElementById(`analysis-heatmap`),p.slice().sort((e,t)=>t.currentValue-e.currentValue),this._treemapChart)}else v.style.display=`none`,_.style.display=`none`,g.style.gridTemplateColumns=`1fr`,this._treemapChart&&=(this._treemapChart.destroy(),null),document.getElementById(`analysis-heatmap`).innerHTML=`<div style="color:var(--text-muted); font-size:0.8rem">Sin datos</div>`},async _renderActivityChart(e){let n=document.getElementById(`activity-chart-container`);if(n)try{let r=t.from(`operations_search`).select(`operated_at, type`).order(`operated_at`,{ascending:!0});e&&(r=r.eq(`alyc_id`,e));let{data:i,error:a}=await r;if(a)throw a;if(!i||i.length===0){n.innerHTML=`<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding-top:2rem">Sin operaciones registradas</div>`;return}let o={};i.forEach(e=>{let t=(e.operated_at||``).slice(0,7);t&&(o[t]||(o[t]={compra:0,venta:0}),e.type===`compra`?o[t].compra++:e.type===`venta`&&o[t].venta++)});let s=Object.keys(o).sort(),c=[`Ene`,`Feb`,`Mar`,`Abr`,`May`,`Jun`,`Jul`,`Ago`,`Sep`,`Oct`,`Nov`,`Dic`],l=s.map(e=>{let[t,n]=e.split(`-`);return`${c[parseInt(n,10)-1]} ${t.slice(2)}`}),u=s.map(e=>o[e].compra),d=s.map(e=>o[e].venta);n.innerHTML=`<canvas></canvas>`;let f=n.querySelector(`canvas`);this._activityChart&&=(this._activityChart.destroy(),null),this._activityChart=new window.Chart(f,{type:`bar`,data:{labels:l,datasets:[{label:`Compras`,data:u,backgroundColor:`#10b981`,borderRadius:3},{label:`Ventas`,data:d,backgroundColor:`#f59e0b`,borderRadius:3}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:`top`,labels:{font:{size:11},boxWidth:12}},tooltip:{mode:`index`,intersect:!1}},scales:{x:{grid:{display:!1},ticks:{font:{size:10}}},y:{grid:{color:`rgba(100,116,139,0.12)`},ticks:{precision:0,font:{size:10}},beginAtZero:!0}}}})}catch(e){console.error(`[ActivityChart]`,e),n.innerHTML=`<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding-top:2rem">Error al cargar actividad</div>`}},_renderDonutChart(e,t,n,r){if(!e||!t||t.length===0)return;this[r]=l.destroy(this[r]),e.innerHTML=`<canvas style="width:100%;height:100%"></canvas>`;let i=e.querySelector(`canvas`);this[r]=l.renderPieChart(i,t)},async _loadPdfLibraries(){if(window.jspdf&&window.jspdf.jsPDF&&window.html2canvas)return{jsPDF:window.jspdf.jsPDF,html2canvas:window.html2canvas};try{let[{jsPDF:t},n]=await Promise.all([r(()=>import(`./jspdf.es.min-Bx9juSLp.js`),__vite__mapDeps([0,1,2,3])),r(()=>import(`./html2canvas-C2eG7RaX.js`).then(t=>e(t.default)),__vite__mapDeps([4,1]))]);return window.jspdf={jsPDF:t},window.html2canvas=n.default||n,{jsPDF:t,html2canvas:window.html2canvas}}catch(e){throw console.error(`[Analysis] Error cargando librerías PDF:`,e),Error(`Error al cargar generador de PDF`)}},async _generatePDF(){let e=document.getElementById(`analysis-results`);if(!e)return;let t=this._activeAlycName||`Cartera`,n=document.getElementById(`btn-generate-pdf`),r=n.textContent;n.textContent=`Generando...`,n.disabled=!0;let i=e=>{n.textContent=e};try{i(`Cargando librerías...`);let{html2canvas:n,jsPDF:r}=await this._loadPdfLibraries();i(`Capturando análisis...`);let a=await new Promise(t=>{let r=()=>{n(e,{scale:2,useCORS:!0,logging:!1,backgroundColor:`#f1f5f9`,allowTaint:!0,onclone:e=>{e.querySelectorAll(`.no-print, button, [role="button"]`).forEach(e=>e.style.display=`none`)}}).then(t).catch(r=>{setTimeout(()=>n(e,{scale:2,useCORS:!0,logging:!1,backgroundColor:`#f1f5f9`}).then(t).catch(reject),100)})};`requestIdleCallback`in window?requestIdleCallback(r,{timeout:5e3}):setTimeout(r,0)});i(`Generando PDF...`),await new Promise(e=>setTimeout(e,50));let s=a.toDataURL(`image/jpeg`,.95),c=a.width/2,l=a.height/2,u=c*.264583,d=l*.264583,f=new r({orientation:u>d?`l`:`p`,unit:`mm`,format:[u+20,d+35],compress:!0});f.setFont(`helvetica`,`bold`).setFontSize(16).setTextColor(79,70,230),f.text(`REPORTE DE ANÁLISIS ESTRATÉGICO - ${t.toUpperCase()}`,10,15),f.setFontSize(8).setTextColor(148,163,184).text(`Generado el ${new Date().toLocaleString()} | Stocker Intelligence`,10,20),f.addImage(s,`PNG`,10,25,u,d),f.save(`Stocker_Analisis_${t.replace(/\s+/g,`_`)}_${new Date().toISOString().split(`T`)[0]}.pdf`),o(`Captura generada con éxito`,`success`)}catch(e){console.error(e),o(`Error PDF`,`error`)}finally{n.textContent=r,n.disabled=!1}},_calculateReturns(e,t){let n=e=>new Date(e*1e3).toISOString().split(`T`)[0],r=t.map(e=>n(e.date));return e.map(e=>{let t={};e.forEach(e=>t[n(e.date)]=e.price);let i=[],a=null;r.forEach(n=>{if(t[n]!=null)i.push(t[n]),a=t[n];else if(a!==null)i.push(a);else{let t=e.find(e=>e.price!=null)?.price||0;i.push(t),a=t}});let o=[];for(let e=1;e<i.length;e++){let t=i[e-1],n=i[e],r=t===0?0:(n-t)/t;o.push(isNaN(r)?0:r)}return o})},async _renderChart(e){let t=document.getElementById(`markowitz-chart`);t&&(this._chart=l.renderMarkowitzChart(t,e,{instance:this._chart}))},_renderRedistribution(e,t){let n=document.getElementById(`redistribution-table`),r=e.tickers||[],i=Array.isArray(e.current.weights)?r.reduce((t,n,r)=>(t[n]=e.current.weights[r]||0,t),{}):e.current.weights||{},a=Array.isArray(e.optimal?.weights)?r.reduce((t,n,r)=>(t[n]=e.optimal.weights[r]||0,t),{}):e.optimal?.weights||{},o=Array.isArray(e.michaud?.weights)?r.reduce((t,n,r)=>(t[n]=e.michaud.weights[r]||0,t),{}):e.michaud?.weights||{},s=Array.isArray(e.hrp?.weights)?r.reduce((t,n,r)=>(t[n]=e.hrp.weights[r]||0,t),{}):e.hrp?.weights||{},c=``,l=``;if(r.forEach(e=>{let t=i[e]||0,n=a[e]||0,r=o[e]||0,u=s[e]||0,d=(n-t)*100,f=(r-t)*100,p=(u-t)*100,m=(n+r+u)/3,h=(m-t)*100;c+=`<tr>
        <td><strong>${e}</strong></td>
        <td>${(t*100).toFixed(1)}%</td>
        <td style="color: var(--text-muted)">${(n*100).toFixed(1)}%</td>
        <td style="color: var(--text-muted); font-size: 0.65rem">${d>0?`+`:``}${d.toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 600">${(r*100).toFixed(1)}%</td>
        <td style="color: #10b981; font-weight: 800">${f>0?`+`:``}${f.toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 700">${(u*100).toFixed(1)}%</td>
        <td style="color: #4f46e6; font-weight: 800">${p>0?`+`:``}${p.toFixed(1)}%</td>
        <td style="background: var(--bg-main); font-weight: 700">${(m*100).toFixed(1)}%</td>
        <td style="background: var(--bg-main); color: ${h>=0?`#10b981`:`#ef4444`}; font-weight: 900">${h>0?`+`:``}${h.toFixed(1)}%</td>
      </tr>`,l+=`
        <div class="dash-instrument-card collapsed" style="margin-bottom: 0.4rem; border-radius: 6px; border-color: var(--border); overflow: hidden">
          <div class="dash-instrument-card-header" style="padding: 0.4rem 0.6rem; display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center">
            <span class="ticker-chip" style="font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.3rem">${e}</span>
            <div style="display: flex; gap: 0.2rem; margin-left: auto; flex-wrap: wrap; justify-content: flex-end">
              <span style="background: var(--bg-main); color: var(--text-main); padding: 0.1rem 0.3rem; border-radius: 3px; font-weight: 700; font-size: 0.6rem; white-space: nowrap">P: ${(m*100).toFixed(1)}%</span>
              <span style="background: ${h>=0?`rgba(16,185,129,0.1)`:`rgba(239,68,68,0.1)`}; color: ${h>=0?`#10b981`:`#ef4444`}; font-weight: 900; font-size: 0.6rem; padding: 0.1rem 0.3rem; border-radius: 3px; white-space: nowrap">
                ${h>0?`+`:``}${h.toFixed(1)}%
              </span>
            </div>
          </div>
          <div class="dash-instrument-card-body" style="padding: 0.4rem 0.6rem; gap: 0.2rem">
            <div class="dash-instrument-row" style="margin-bottom: 0.3rem; border-bottom: 1px solid var(--border); padding-bottom: 0.2rem; font-size: 0.65rem">
              <span class="dash-instrument-label">Actual</span>
              <span class="dash-instrument-value" style="font-weight: 700">${(t*100).toFixed(1)}%</span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label">Sharpe</span>
              <span class="dash-instrument-value">${(n*100).toFixed(1)}% <small style="color: var(--text-muted); font-size: 0.55rem">(${d>0?`+`:``}${d.toFixed(1)}%)</small></span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label" style="color: #10b981">Michaud</span>
              <span class="dash-instrument-value" style="color: #10b981; font-weight: 600">${(r*100).toFixed(1)}% <small style="font-weight: 800; font-size: 0.55rem">(${f>0?`+`:``}${f.toFixed(1)}%)</small></span>
            </div>

            <div class="dash-instrument-row" style="font-size: 0.65rem">
              <span class="dash-instrument-label" style="color: #4f46e6">HRP</span>
              <span class="dash-instrument-value" style="color: #4f46e6; font-weight: 700">${(u*100).toFixed(1)}% <small style="font-weight: 800; font-size: 0.55rem">(${p>0?`+`:``}${p.toFixed(1)}%)</small></span>
            </div>
          </div>
        </div>`}),n.innerHTML=`
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
            ${c}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-only dash-instruments-cards" style="padding: 0.4rem; box-sizing: border-box; width: 100%">
        ${l}
      </div>`,window.innerWidth<=768){let e=n.closest(`.card`);e&&(e.style.paddingLeft=`0.4rem`,e.style.paddingRight=`0.4rem`)}},_updateMetricsUI(e,t){let{beta:n,alpha:r,r2:i,vR:a,es:o,maxDrawdown:s}=e;document.getElementById(`capm-beta`).textContent=n.toFixed(2),document.getElementById(`capm-r2`).textContent=(i*100).toFixed(1)+`%`,document.getElementById(`capm-alpha`).textContent=(r>0?`+`:``)+(r*100).toFixed(1)+`%`,document.getElementById(`capm-alpha`).style.color=r>=0?`#10b981`:`#ef4444`,document.getElementById(`analysis-var`).textContent=(a*100).toFixed(1)+`%`,document.getElementById(`analysis-es`).textContent=(o*100).toFixed(1)+`%`,document.getElementById(`analysis-mdd`).textContent=(s*100).toFixed(1)+`%`;let c=document.getElementById(`capm-beta-desc`);c&&(c.textContent=n>1.2?`Agresivo`:n<.8?`Defensivo`:`Neutral`,c.style.color=n>1.2?`#ef4444`:n<.8?`#3b82f6`:`var(--text-muted)`)},_renderBacktestingChart(e,t,n,r){let i=document.getElementById(`backtesting-chart`);if(!i)return;let a=Math.min(t[0].length,n.length),o=Array.isArray(e.current.weights)?e.current.weights:Object.values(e.current.weights),c=1,u=1,d=[0],f=[0];for(let e=0;e<a;e++){let r=0;o.forEach((n,i)=>r+=n*t[i][e]),c*=1+r,u*=1+n[e],d.push((c-1)*100),f.push((u-1)*100)}let p=((c-u)*100).toFixed(1),m=document.getElementById(`backtesting-result`);m&&(m.innerHTML=`
        <span style="color:#4f46e6">Mío: ${((c-1)*100).toFixed(1)}%</span> | 
        <span style="color:var(--text-muted)">${s(r)}: ${((u-1)*100).toFixed(1)}%</span> 
        <div style="font-size:0.75rem; color:${p>=0?`#10b981`:`#ef4444`}; font-weight:800">
          ${p>=0?`+`:``}${p}%
        </div>`),this._btChart=l.renderBacktestingChart(i,d,f,r,{instance:this._btChart})},_renderStressTest(e){let t=[{name:`Crisis 2008`,drop:-50},{name:`Burbuja Dotcom`,drop:-49},{name:`Crash COVID`,drop:-34},{name:`Lunes Negro 1987`,drop:-22.6}];document.getElementById(`stress-test-results`).innerHTML=t.map(t=>`
      <div style="padding: 0.5rem; border-radius: var(--radius); background: var(--bg-main); text-align: center; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.2rem">
        <h4 style="color: var(--text-muted); font-size: 0.6rem; text-transform: uppercase; margin: 0">${t.name}</h4>
        <div style="font-size: 1.1rem; font-weight: 700; color: #ef4444; line-height: 1">${(e*t.drop).toFixed(1)}%</div>
        <p style="font-size: 0.65rem; margin: 0; color: var(--text-muted)">Mkt: ${t.drop}%</p>
      </div>`).join(``)},_renderComparisonChart(e){let t=document.getElementById(`comparison-chart`);if(!t)return;let n={};e.forEach(e=>{let t=this._resolvedPrices?.[e.ticker]||e.avg_buy_price,r=parseFloat(e.total_quantity||0),i=r*parseFloat(e.avg_buy_price||0),a=r*parseFloat(t),o=`${e.ticker} (${e.currency})`;n[o]||(n[o]={invested:0,current:0,currency:e.currency}),n[o].invested+=i,n[o].current+=a});let r=Object.keys(n).sort(),i=r.map(e=>n[e].invested),a=r.map(e=>n[e].current);this._compChart=l.renderComparisonChart(t,r,i,a,{instance:this._compChart})},_bindHoldingsSortHeaders(e){e.querySelectorAll(`.holdings-table th.sortable`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.col;this._holdingsSortCol===t?this._holdingsSortAsc=!this._holdingsSortAsc:(this._holdingsSortCol=t,this._holdingsSortAsc=t===`ticker`),this._updateHoldingsSortHeaders(),this._sortAllHoldingsTables()})}),this._updateHoldingsSortHeaders()},_updateHoldingsSortHeaders(){document.querySelectorAll(`.holdings-table th.sortable`).forEach(e=>{e.classList.remove(`sort-asc`,`sort-desc`),e.dataset.col===this._holdingsSortCol&&e.classList.add(this._holdingsSortAsc?`sort-asc`:`sort-desc`)})},_sortAllHoldingsTables(){this._holdingsSortCol&&document.querySelectorAll(`.holdings-table tbody`).forEach(e=>{this._sortHoldingsTbody(e)})},_sortHoldingsTbody(e){let t=this._holdingsSortCol,n=this._holdingsSortAsc,r=[...e.querySelectorAll(`tr`)];r.sort((e,r)=>{if(t===`ticker`){let t=(e.dataset.ticker||``).localeCompare(r.dataset.ticker||``);return n?t:-t}let i=parseFloat(e.getAttribute(`data-${t}`))||0,a=parseFloat(r.getAttribute(`data-${t}`))||0;return n?i-a:a-i}),r.forEach(t=>e.appendChild(t))},_bindMobileAccordion(){document.querySelectorAll(`.dash-instrument-card-header`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.closest(`.dash-instrument-card`);t&&t.classList.toggle(`collapsed`)})})}};export{f as AnalysisPage};
//# sourceMappingURL=analysis-H1Q1nWVa.js.map