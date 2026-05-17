import{r as e,t}from"./api-client-CbVosK4b.js";import{i as n,n as r}from"./index-JWbKAAqH.js";import{n as i,r as a,t as o}from"./chart-manager-NkFeXNJp.js";var s=7200*1e3,c={_typeChart:null,_heatmapChart:null,_compChart:null,_resolvedPrices:{},_chartRendered:!1,_chartsReady:!1,cleanup(){this._heatmapChart=o.destroy(this._heatmapChart),this._typeChart=o.destroy(this._typeChart),this._compChart=o.destroy(this._compChart),this._chartRendered=!1,this._chartsReady=!1,i(document.getElementById(`page-content`))},async render(){this.cleanup(),this._resolvedPrices={};let e=document.getElementById(`page-content`);a(e,`
      <div class="page-header">
        <h2>Dashboard</h2>
      </div>
      
      <div id="dash-kpis" class="kpi-grid">
        ${[,,,,].fill(`
          <div class="kpi-card--modern">
            <div class="kpi-icon-circle skeleton"></div>
            <div class="kpi-content" style="flex:1">
              <div class="skeleton" style="height:10px; width:60%; margin-bottom:8px"></div>
              <div class="skeleton" style="height:20px; width:90%"></div>
            </div>
          </div>
        `).join(``)}
      </div>

      <div id="dash-content">
        <div class="dash-charts-row">
          <div class="card skeleton" style="height: 360px"></div>
          <div class="card skeleton" style="height: 360px"></div>
        </div>
        <div class="card">
          <div class="skeleton" style="height: 30px; width: 200px; margin-bottom: 1.5rem"></div>
          ${[,,,,,].fill(`
            <div class="skeleton" style="height: 40px; margin-bottom: 8px"></div>
          `).join(``)}
        </div>
      </div>`);try{let e=await this._loadHoldings();this._renderDashboard(e),await this._updateMarketPrices(e.tickers)}catch(t){console.error(t),e.innerHTML=`
        <div class="page-header"><h2>Dashboard</h2></div>
        <div class="card">
          <p class="table-empty">Error al cargar el dashboard. Por favor, intentá de nuevo.</p>
        </div>`}},async _loadHoldings(){let{data:t,error:n}=await e.rpc(`get_user_holdings_global`);if(n)throw n;let r=0,i=0,a=[],o={};for(let e of t){let t=parseFloat(e.total_quantity),n=parseFloat(e.avg_buy_price),s=t*n;e.currency===`ARS`?r+=s:i+=s,a.push({ticker:e.ticker,name:e.instrument_name,instrumentType:e.instrument_type_name,quantity:t,avgBuyPrice:n,currency:e.currency,invested:s}),o[e.ticker]={currency:e.currency,quantity:t,avgBuyPrice:n}}a.sort((e,t)=>t.invested-e.invested);let s=a.map(e=>e.ticker);return{items:a,totalARS:r,totalUSD:i,tickers:s,summary:o}},async _updateMarketPrices(e){if(!e||e.length===0)return;let i=[];for(let t of e){let e=r(`quote_${t}`,{persistent:!0});e===null?i.push(t):(this._resolvedPrices[t]=e,this._updatePriceCells(t,e))}if(i.length===0){console.log(`[Dashboard] Todos los precios recuperados de cache (2h)`);return}try{console.log(`[Dashboard] Solicitando precios faltantes: ${i.join(`, `)}`);let e=await t(`GET`,`/api/quotes?tickers=${encodeURIComponent(i.join(`,`))}`);for(let t of i){let r=e[t]?.price??null;this._resolvedPrices[t]=r,r!==null&&n(`quote_${t}`,r,{persistent:!0,ttlMs:s}),this._updatePriceCells(t,r)}}catch(e){console.error(`Error al actualizar precios masivos:`,e),i.forEach(e=>{this._resolvedPrices[e]=null,this._updatePriceCells(e,null)})}},_renderDashboard(e){let t=document.getElementById(`dash-kpis`),n=document.getElementById(`dash-content`);this._summary=e.summary,this._sortCol=``,this._sortAsc=!0;let r=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),i=e.items.some(e=>e.currency===`USD`),a=`<span class="cell-skeleton" style="width:80px;height:1.25rem;display:inline-block"></span>`,o=e.totalARS+e.totalUSD;if(t.innerHTML=`
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(16, 185, 129, 0.1); color: #10b981">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Total Invertido ARS</div>
          <div class="kpi-value">${r(e.totalARS)}</div>
        </div>
      </div>
      
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">P&amp;L Total ARS</div>
          <div class="kpi-value" id="dash-pnl-ars">${a}</div>
          <div class="kpi-sub"  id="dash-pnl-ars-sub"></div>
        </div>
      </div>

      ${i?`
      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(139, 92, 246, 0.1); color: #8b5cf6">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">Total Invertido USD</div>
          <div class="kpi-value">${r(e.totalUSD)}</div>
        </div>
      </div>

      <div class="kpi-card kpi-card--modern">
        <div class="kpi-icon-circle" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="kpi-content">
          <div class="kpi-label">P&amp;L Total USD</div>
          <div class="kpi-value" id="dash-pnl-usd">${a}</div>
          <div class="kpi-sub"  id="dash-pnl-usd-sub"></div>
        </div>
      </div>`:``}
    `,!e.items.length){n.innerHTML=`
        <div class="card">
          <p class="table-empty">No tenés operaciones registradas.</p>
        </div>`;return}let s={};e.items.forEach(e=>{let t=e.instrumentType||`Otros`;s[t]=(s[t]||0)+e.invested});let c=Object.entries(s).map(([e,t])=>({ticker:e,currentValue:t})).sort((e,t)=>t.currentValue-e.currentValue);n.innerHTML=`
      <div id="dash-charts-wrapper" style="display:none">
        <div class="dash-charts-row">
          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:1rem">Composición de Cartera por Tipo</div>
            <div id="dash-type-chart" style="height: 300px; position: relative"></div>
          </div>

          <div class="card dash-chart-card">
            <div class="chart-panel-title" style="margin-bottom:0.75rem">Comparativa: Inversión vs Valor Actual ($)</div>
            <div id="dash-comparison-chart" style="height: 300px; position: relative"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 1.5rem">
          <div class="chart-panel-title" style="margin-bottom:0.75rem">Mapa de Calor (Peso vs P&L %)</div>
          <div id="dash-heatmap" style="height: 240px; position: relative"></div>
        </div>
      </div>

      <div class="card" style="margin-top: 1.5rem">
        <div class="alyc-card-header" id="dash-table-header" style="cursor:pointer;margin-bottom:0">
          <h3 style="margin:0;font-size:1rem">Detalle de Instrumentos</h3>
          <span class="alyc-chevron" id="dash-table-chevron">▾</span>
        </div>
        <div id="dash-table-body" style="margin-top:1rem">
          <!-- Desktop table -->
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
                ${e.items.map(e=>{let t=e.invested/o*100;return`
                  <tr data-ticker="${e.ticker}" data-quantity="${e.quantity}"
                      data-avg-buy-price="${e.avgBuyPrice}" data-invested="${e.invested}">
                    <td><span class="ticker-chip" title="${e.name}">${e.ticker}</span></td>
                    <td style="font-size:0.8rem;color:var(--text-muted)">${e.instrumentType}</td>
                    <td class="amount">${e.quantity.toLocaleString(`es-AR`,{maximumFractionDigits:4})}</td>
                    <td class="amount">${r(e.avgBuyPrice)}</td>
                    <td class="amount"><strong>${r(e.invested)}</strong></td>
                    <td class="amount market-price-cell" data-ticker="${e.ticker}"><span class="cell-skeleton"></span></td>
                    <td class="amount market-value-cell" data-ticker="${e.ticker}" data-quantity="${e.quantity}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-amount-cell"   data-ticker="${e.ticker}" data-quantity="${e.quantity}" data-avg-buy-price="${e.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount pnl-pct-cell"      data-ticker="${e.ticker}" data-avg-buy-price="${e.avgBuyPrice}"><span class="cell-skeleton"></span></td>
                    <td class="amount">
                      <div class="weight-bar-container">
                        <div class="weight-bar" style="width: ${t}%"></div>
                        <span class="weight-label">${t.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>`}).join(``)}
              </tbody>
            </table>
          </div>
          <!-- Mobile cards -->
          <div class="mobile-only dash-instruments-cards">
            ${e.items.map(e=>{let t=e.invested/o*100,n=e.quantity.toLocaleString(`es-AR`);return`
              <div class="dash-instrument-card collapsed" data-ticker="${e.ticker}" data-quantity="${e.quantity}" data-avg-buy-price="${e.avgBuyPrice}">
                <div class="dash-instrument-card-header">
                  <span class="ticker-chip" title="${e.name}">${e.ticker}</span>
                  <span class="dash-instrument-meta">
                    <span class="meta-qty">${n}</span>
                    <span class="meta-weight">${t.toFixed(1)}%</span>
                    <span class="meta-type">${e.instrumentType}</span>
                  </span>
                </div>
                <div class="dash-instrument-card-body">
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Precio compra</span>
                    <span class="dash-instrument-value">${r(e.avgBuyPrice)}</span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Precio actual</span>
                    <span class="dash-instrument-value market-price-cell" data-ticker="${e.ticker}"><span class="cell-skeleton"></span></span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Invertido</span>
                    <span class="dash-instrument-value"><strong>${r(e.invested)}</strong></span>
                  </div>
                  <div class="dash-instrument-row">
                    <span class="dash-instrument-label">Valor actual</span>
                    <span class="dash-instrument-value market-value-cell" data-ticker="${e.ticker}" data-quantity="${e.quantity}"><span class="cell-skeleton"></span></span>
                  </div>
                  <div class="dash-instrument-row dash-instrument-pnl-row">
                    <span class="dash-instrument-label">P&amp;L <span class="pnl-pct-cell" data-ticker="${e.ticker}" data-avg-buy-price="${e.avgBuyPrice}" style="font-weight:400;font-size:0.6rem"></span></span>
                    <span class="dash-instrument-value pnl-amount-cell" data-ticker="${e.ticker}" data-quantity="${e.quantity}" data-avg-buy-price="${e.avgBuyPrice}"><span class="cell-skeleton"></span></span>
                  </div>
                </div>
              </div>`}).join(``)}
          </div>
        </div><!-- dash-table-body -->
      </div>`,this._bindSortHeaders(),this._bindTableToggle(),this._bindMobileAccordion(),requestAnimationFrame(()=>{this._refreshHeatmap(),this._refreshComparisonChart(),this._renderPieChart(document.getElementById(`dash-type-chart`),c,o),this._chartsReady=!0;let e=document.getElementById(`dash-charts-wrapper`);e&&(e.style.display=``)})},_refreshComparisonChart(){let e=document.getElementById(`dash-comparison-chart`);if(!e||!this._summary)return;let t={};Object.entries(this._summary).forEach(([e,n])=>{let r=this._resolvedPrices?.[e]??n.avgBuyPrice,i=n.quantity*n.avgBuyPrice,a=n.quantity*r,o=`${e} (${n.currency})`;t[o]||(t[o]={invested:0,current:0}),t[o].invested+=i,t[o].current+=a});let n=Object.keys(t).sort(),r=n.map(e=>t[e].invested),i=n.map(e=>t[e].current);if(!n.length)return;e.querySelector(`canvas`)||(e.innerHTML=`<canvas style="width:100%;height:100%"></canvas>`);let a=e.querySelector(`canvas`);this._compChart=o.renderComparisonChart(a,n,r,i,{instance:this._compChart})},_renderPieChart(e,t,n){if(!e||!t||t.length===0)return;e.querySelector(`canvas`)||(e.innerHTML=`<canvas style="width:100%;height:100%"></canvas>`);let r=e.querySelector(`canvas`);this._typeChart=o.renderPieChart(r,t,{instance:this._typeChart})},_updatePriceCells(e,t){let n=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),r=`<span style="color:var(--text-muted)">—</span>`,i=e=>e>0?`#10b981`:e<0?`#ef4444`:`var(--text-muted)`,a=e=>e>0?`+`:``;document.querySelectorAll(`.market-price-cell[data-ticker="${e}"]`).forEach(e=>{e.innerHTML=t===null?r:n(t)}),document.querySelectorAll(`.market-value-cell[data-ticker="${e}"]`).forEach(e=>{let i=parseFloat(e.dataset.quantity);e.innerHTML=t===null?r:`<strong>${n(i*t)}</strong>`}),document.querySelectorAll(`.pnl-amount-cell[data-ticker="${e}"]`).forEach(e=>{if(t===null){e.innerHTML=r;return}let o=parseFloat(e.dataset.quantity),s=(t-parseFloat(e.dataset.avgBuyPrice))*o;e.innerHTML=`<strong style="color:${i(s)}">${a(s)}${n(s)}</strong>`}),document.querySelectorAll(`.pnl-pct-cell[data-ticker="${e}"]`).forEach(e=>{if(t===null){e.innerHTML=r;return}let n=parseFloat(e.dataset.avgBuyPrice);if(!n){e.innerHTML=r;return}let o=(t/n-1)*100;e.innerHTML=`<span style="color:${i(o)};font-weight:600">${a(o)}${o.toFixed(1)}%</span>`}),this._chartsReady&&(this._refreshHeatmap(),this._refreshComparisonChart()),this._updatePnlKpis(),[`marketPrice`,`marketValue`,`pnl`,`pnlPct`].includes(this._sortCol)&&this._sortTable()},_updatePnlKpis(){if(!this._summary||!this._resolvedPrices)return;let e=this._resolvedPrices,t=Object.entries(this._summary),n=t.length,r=0,i=0,a=0,o=0,s=0,c=0;for(let[n,l]of t){l.currency===`ARS`?s++:c++;let t=e[n];t!==void 0&&(l.currency===`ARS`?(a++,t!==null&&(r+=(t-l.avgBuyPrice)*l.quantity)):(o++,t!==null&&(i+=(t-l.avgBuyPrice)*l.quantity)))}let l=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),u=e=>e>0?`+`:``,d=e=>e>0?`#10b981`:e<0?`#ef4444`:`var(--text-main)`,f=a+o<n,p=document.getElementById(`dash-pnl-ars`),m=document.getElementById(`dash-pnl-usd`);if(p){if(s>0&&a>0){p.innerHTML=`<span style="color:${d(r)};font-weight:700">${u(r)}${l(r)}</span>`;let e=document.getElementById(`dash-pnl-ars-sub`);e&&(e.innerHTML=f?`<span style="font-size:0.7rem;color:var(--text-muted)">${a}/${s} tickers</span>`:``)}if(m&&c>0&&o>0){m.innerHTML=`<span style="color:${d(i)};font-weight:700">${u(i)}${l(i)}</span>`;let e=document.getElementById(`dash-pnl-usd-sub`);e&&(e.innerHTML=f?`<span style="font-size:0.7rem;color:var(--text-muted)">${o}/${c} tickers</span>`:``)}}},_refreshHeatmap(){let e=document.getElementById(`dash-heatmap`);if(!e||!this._summary)return;let t=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),n=e=>e>0?e>10?`#065f46`:`#10b981`:e<0?e<-10?`#991b1b`:`#ef4444`:`#64748b`,r=Object.entries(this._summary).map(([e,t])=>{let r=this._resolvedPrices?.[e]??null,i=t.quantity*t.avgBuyPrice,a=r!==null&&t.avgBuyPrice>0?(r/t.avgBuyPrice-1)*100:0;return{ticker:e,value:i,pct:a,color:n(a)}}).filter(e=>e.value>0).sort((e,t)=>t.value-e.value);if(!r.length)return;e.querySelector(`canvas`)||(e.innerHTML=`<canvas style="width:100%;height:100%"></canvas>`);let i=e.querySelector(`canvas`);this._heatmapChart=o.renderTreemapChart(i,r,{instance:this._heatmapChart,formatter:e=>{let n=e.raw?._data||e.raw;return!n||!n.ticker?[]:[n.ticker,(n.pct==null?`0`:t(n.pct))+`%`]},chartOptions:{plugins:{tooltip:{callbacks:{label:e=>{let n=e.raw?._data;return n?` ${n.ticker}: $${t(n.value)} (${t(n.pct)}%)`:``}}}}}})},_bindTableToggle(){let e=document.getElementById(`dash-table-header`),t=document.getElementById(`dash-table-body`),n=document.getElementById(`dash-table-chevron`);!e||!t||e.addEventListener(`click`,()=>{let e=t.style.display===`none`;t.style.display=e?``:`none`,n.style.transform=e?``:`rotate(-90deg)`})},_bindSortHeaders(){document.querySelectorAll(`#dash-table th.sortable`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.col;this._sortCol===t?this._sortAsc=!this._sortAsc:(this._sortCol=t,this._sortAsc=t===`ticker`),this._updateSortHeaders(),this._sortTable()})})},_updateSortHeaders(){document.querySelectorAll(`#dash-table th.sortable`).forEach(e=>{e.classList.remove(`sort-asc`,`sort-desc`),e.dataset.col===this._sortCol&&e.classList.add(this._sortAsc?`sort-asc`:`sort-desc`)})},_sortTable(){let e=document.querySelector(`#dash-table tbody`);if(!e||!this._sortCol)return;let t=this._sortCol,n=this._sortAsc,r=[...e.querySelectorAll(`tr`)],i=n?1/0:-1/0;r.sort((e,r)=>{if(t===`ticker`){let t=(e.dataset.ticker||``).localeCompare(r.dataset.ticker||``);return n?t:-t}let a,o;if(t===`quantity`&&(a=parseFloat(e.dataset.quantity),o=parseFloat(r.dataset.quantity)),t===`avgBuyPrice`&&(a=parseFloat(e.dataset.avgBuyPrice),o=parseFloat(r.dataset.avgBuyPrice)),t===`invested`&&(a=parseFloat(e.dataset.invested),o=parseFloat(r.dataset.invested)),t===`marketPrice`||t===`marketValue`){let n=e=>this._resolvedPrices?.[e.dataset.ticker]??i;a=t===`marketPrice`?n(e):n(e)*parseFloat(e.dataset.quantity),o=t===`marketPrice`?n(r):n(r)*parseFloat(r.dataset.quantity)}if(t===`pnl`){let t=e=>{let t=this._resolvedPrices?.[e.dataset.ticker];return t==null?i:(t-parseFloat(e.dataset.avgBuyPrice))*parseFloat(e.dataset.quantity)};a=t(e),o=t(r)}if(t===`pnlPct`){let t=e=>{let t=this._resolvedPrices?.[e.dataset.ticker],n=parseFloat(e.dataset.avgBuyPrice);return t!=null&&n?(t/n-1)*100:i};a=t(e),o=t(r)}return n?a-o:o-a}),r.forEach(t=>e.appendChild(t))},_bindMobileAccordion(){document.querySelectorAll(`.dash-instrument-card-header`).forEach(e=>{e.addEventListener(`click`,e=>{let t=e.currentTarget.closest(`.dash-instrument-card`);t&&t.classList.toggle(`collapsed`)})})}};export{c as DashboardPage};
//# sourceMappingURL=dashboard-BL1O5IpP.js.map