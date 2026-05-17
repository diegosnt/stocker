import{r as e,t}from"./api-client-CZ7NvV8n.js";import{a as n,d as r,i,l as a,n as o,o as s,r as c,s as l,t as u}from"./index-CErj7a_L.js";async function d(e){return new Promise(t=>{let n=document.createElement(`div`);n.className=`modal-overlay`;let r=e.map(e=>`
      <tr>
        <td>${e.row||`—`}</td>
        <td>${e.operated_at?a(e.operated_at):`—`}</td>
        <td><span class="ticker-chip">${l(e._raw?.ticker||`—`)}</span></td>
        <td>${l(e._raw?.alyc||`—`)}</td>
        <td style="color: var(--color-danger)">${l(e.error)}</td>
      </tr>
    `).join(``);n.innerHTML=`
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <h3 style="margin:0">Registros no importados</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-failed-close">✕</button>
        </div>
        <div style="padding: 1rem; border-bottom: 1px solid var(--border); background: #fff5f5; color: #c53030; font-size: 0.9rem">
          Los siguientes <strong>${e.length}</strong> registros no pudieron cargarse porque los datos son incompletos o las entidades no existen. 
          Por favor, verificá que los instrumentos y ALyCs estén creados en el sistema.
        </div>
        <div class="table-wrapper" style="max-height: 400px; overflow-y: auto">
          <table class="ops-table">
            <thead>
              <tr>
                <th style="width:50px">Fila</th>
                <th>Fecha</th>
                <th>Ticker</th>
                <th>ALyC</th>
                <th>Motivo del error</th>
              </tr>
            </thead>
            <tbody>
              ${r}
            </tbody>
          </table>
        </div>
        <div class="form-actions" style="margin-top:0; padding:1.5rem">
          <button class="btn btn-primary" id="btn-failed-ok">Entendido</button>
        </div>
      </div>`,document.body.appendChild(n);let i=()=>{n.remove(),t()};n.querySelector(`#btn-failed-close`).addEventListener(`click`,i),n.querySelector(`#btn-failed-ok`).addEventListener(`click`,i)})}async function f(e,t=0){return new Promise(n=>{let r=document.createElement(`div`);r.className=`modal-overlay`;let i=e.map((e,t)=>`
      <tr>
        <td style="text-align:center"><input type="checkbox" class="dup-check" data-idx="${t}"></td>
        <td>${a(e.operated_at)}</td>
        <td><span class="ticker-chip">${l(e._raw?.ticker||`—`)}</span></td>
        <td>${l(e._raw?.alyc||`—`)}</td>
        <td>${e.type.toUpperCase()}</td>
        <td style="text-align:right">${e.quantity.toLocaleString(`es-AR`)}</td>
        <td style="text-align:right">${e.price.toLocaleString(`es-AR`,{minimumFractionDigits:2})}</td>
        <td>${e.currency}</td>
      </tr>
    `).join(``);r.innerHTML=`
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <h3 style="margin:0">Duplicados detectados</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-dup-close">✕</button>
        </div>
        <div style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--bg-main); font-size: 0.9rem">
          ${t>0?`<div style="margin-bottom:0.5rem; color:var(--color-primary)"><strong>Hay ${t} registros nuevos listos para importar.</strong></div>`:``}
          Se encontraron <strong>${e.length}</strong> operaciones que ya existen. 
          Marcá las que quieras volver a importar, o dejá todo desmarcado para importar solo los registros nuevos.
        </div>
        <div class="table-wrapper" style="max-height: 400px; overflow-y: auto">
          <table class="ops-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center"><input type="checkbox" id="dup-check-all"></th>
                <th>Fecha</th>
                <th>Ticker</th>
                <th>ALyC</th>
                <th>Tipo</th>
                <th style="text-align:right">Cant.</th>
                <th style="text-align:right">Precio</th>
                <th>Mon.</th>
              </tr>
            </thead>
            <tbody>
              ${i}
            </tbody>
          </table>
        </div>
        <div class="form-actions" style="margin-top:0; padding:1.5rem">
          <button class="btn btn-primary" id="btn-dup-confirm">Confirmar y continuar</button>
          <button class="btn btn-ghost" id="btn-dup-cancel">Abortar toda la importación</button>
        </div>
      </div>`,document.body.appendChild(r);let o=e=>{r.remove(),n(e)};r.querySelector(`#btn-dup-close`).addEventListener(`click`,()=>o(`CANCEL_ALL`)),r.querySelector(`#btn-dup-cancel`).addEventListener(`click`,()=>o(`CANCEL_ALL`));let s=r.querySelector(`#dup-check-all`),c=r.querySelectorAll(`.dup-check`);s.addEventListener(`change`,()=>{c.forEach(e=>e.checked=s.checked)}),r.querySelector(`#btn-dup-confirm`).addEventListener(`click`,()=>{let t=[];c.forEach(n=>{n.checked&&t.push(e[parseInt(n.dataset.idx)])}),o(t)})})}async function p(e,n){let r=(await e.text()).split(/\r?\n/).filter(e=>e.trim());if(r.length<2){u(`Archivo vacío o sin datos.`,`error`);return}let i=r[0].split(`;`).map(e=>e.trim().toLowerCase()),a=r.slice(1).map(e=>{let t=e.split(`;`).map(e=>e.trim());if(t.length<7)return null;let n={};i.forEach((e,r)=>n[e]=t[r]);let r=n.operacion?.toLowerCase()===`compra`?`compra`:`venta`,a=n.alyc,o=n.especie,s=``,c=n[`fecha operacion`]?.split(`/`);if(c?.length===3){let[e,t,n]=c;s=`${n.length===2?`20${n}`:n}-${t.padStart(2,`0`)}-${e.padStart(2,`0`)}`}let l=e=>{if(!e)return 0;let t=e.trim(),n=t.includes(`,`),r=t.includes(`.`);return n&&r?t.lastIndexOf(`,`)>t.lastIndexOf(`.`)?parseFloat(t.replace(/\./g,``).replace(`,`,`.`)):parseFloat(t.replace(/,/g,``)):n?parseFloat(t.replace(`,`,`.`)):r?parseFloat(t.replace(/,/g,``)):parseFloat(t)||0},u=l(n.precio),d=l(n.cantidad),f=n.moneda?.toUpperCase();return f===`ARG`&&(f=`ARS`),{type:r,alyc:a,ticker:o,operated_at:s,price:u,quantity:d,currency:f}}).filter(e=>e!==null);if(a.length===0){u(`No se encontraron registros válidos.`,`error`);return}try{u(`Procesando ${a.length} registros...`,`info`);let e,r=[];try{e=await t(`POST`,`/api/operations/bulk`,{operations:a}),e.failed_entities&&(r=e.failed_entities)}catch(n){if(n.status===409){let{duplicates:i,clean_ops:a,failed_entities:o}=n.response;o&&(r=o);let s=await f(i,a.length);if(s===`CANCEL_ALL`){r.length>0&&await d(r),u(`Importación cancelada.`,`info`);return}let c=Array.isArray(s)?s:[],l=[...a,...c];if(l.length===0){r.length>0&&await d(r),u(`No se seleccionaron operaciones para importar.`,`info`);return}e=await t(`POST`,`/api/operations/bulk`,{operations:l,skip_duplicate_check:!0})}else throw n}let{imported:i,skipped:o}=e;e.failed_entities&&r.length===0&&(r=e.failed_entities),u(`Importación finalizada: ${i} importados, ${o} omitidos/duplicados.`,r.length>0?`warning`:`success`),i>0&&c(`user_holdings`),r.length>0&&await d(r),await n._loadList(0)}catch(e){console.error(`Error en importación masiva:`,e),u(`Error al procesar el archivo CSV.`,`error`)}}var m=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,h=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,g=`<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,_=10,v={editingOperation:null,pagination:{currentPage:0,pageSize:_,requestId:null},filters:{searchQuery:``,alycFilter:``,instrumentFilter:``,typeFilter:``,currencyFilter:``,dateFrom:``,dateTo:``},sorting:{column:`operated_at`,ascending:!1},searchTimer:null,abortController:null},y={async render(){await this._renderList()},async _renderList(){v.pagination.currentPage=0;let e=document.getElementById(`page-content`);e.innerHTML=`
      <div class="page-header">
        <h2>Operaciones</h2>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="btn-export-csv">↓ Exportar CSV</button>
          <button class="btn btn-ghost" id="btn-import-csv">↑ Importar CSV</button>
          <input type="file" id="input-csv" accept=".csv" style="display:none">
          <button class="btn btn-primary" id="btn-nueva-op">+ Nueva Operación</button>
        </div>
      </div>

      <div class="card ops-card">
        <div class="ops-filters-bar">
          <div class="ops-filters-title">
            <h3 style="margin:0">Registros</h3>
            <button class="btn btn-sm btn-ghost" id="btn-clear-filters" style="display:none">✕ Limpiar filtros</button>
          </div>
          <div class="ops-filters-row">
            <select id="ops-alyc-filter">
              <option value="">Todas las ALyCs</option>
            </select>
            <select id="ops-instrument-filter">
              <option value="">Todos los instrumentos</option>
            </select>
            <select id="ops-type-filter">
              <option value="">Todos los tipos</option>
              <option value="compra" ${v.filters.typeFilter===`compra`?`selected`:``}>Compra</option>
              <option value="venta" ${v.filters.typeFilter===`venta`?`selected`:``}>Venta</option>
            </select>
            <select id="ops-currency-filter">
              <option value="">Todas las monedas</option>
              <option value="ARS" ${v.filters.currencyFilter===`ARS`?`selected`:``}>ARS</option>
              <option value="USD" ${v.filters.currencyFilter===`USD`?`selected`:``}>USD</option>
            </select>
            <div class="ops-date-range">
              <input type="date" id="ops-date-from" title="Fecha desde" value="${v.filters.dateFrom}">
              <span>—</span>
              <input type="date" id="ops-date-to" title="Fecha hasta" value="${v.filters.dateTo}">
            </div>
            <input type="search" id="ops-search" class="search-input" placeholder="Buscar por ticker...">
          </div>
        </div>
        <div class="ops-table-container">
          <div class="table-wrapper ops-desktop-table">
            <table class="ops-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="operated_at">Fecha</th>
                  <th class="sortable" data-col="instrument_ticker">Ticker</th>
                  <th class="sortable" data-col="alyc_name">ALyC</th>
                  <th class="sortable" data-col="quantity" style="text-align:right">Can.</th>
                  <th class="sortable" data-col="price" style="text-align:right">Precio</th>
                  <th style="text-align:right">Total</th>
                  <th class="sortable currency-col" data-col="currency">Moneda</th>
                  <th class="actions-cell"></th>
                </tr>
              </thead>
              <tbody id="ops-tbody">
                ${Array(10).fill(`
                  <tr>
                    <td><div class="skeleton" style="height:14px; width:80px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:60px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:120px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:40px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:70px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:70px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:40px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:60px"></div></td>
                  </tr>
                `).join(``)}
              </tbody>
            </table>
          </div>
          <div id="ops-cards" class="ops-cards-grid">
            ${[,,,,,].fill(`
              <div class="op-card--modern skeleton" style="height: 160px; border: none"></div>
            `).join(``)}
          </div>
          <div id="ops-pagination"></div>
        </div>
      </div>
    </div>`,document.getElementById(`btn-export-csv`).addEventListener(`click`,()=>this._exportCSV()),document.getElementById(`btn-nueva-op`).addEventListener(`click`,()=>{v.editingOperation=null,this._showFormModal()});let t=document.getElementById(`input-csv`);document.getElementById(`btn-import-csv`).addEventListener(`click`,()=>t.click()),t.addEventListener(`change`,async e=>{let n=e.target.files[0];n&&(await p(n,this),t.value=``)}),this._bindSearch(),this._bindFilters(),this._bindSortHeaders(),await Promise.all([this._loadAlycFilter(),this._loadInstrumentFilter(),this._loadList(0)])},async _loadList(t=0){let n=document.getElementById(`ops-tbody`),r=document.getElementById(`ops-cards`);if(!n)return;v.abortController&&v.abortController.abort(),v.abortController=new AbortController,n.innerHTML=`<tr><td colspan="9" class="table-empty"><span class="spinner"></span></td></tr>`,r&&(r.innerHTML=`<div class="table-empty"><span class="spinner"></span></div>`);let i=t*_,o=i+_-1,s=v.pagination.requestId={},c=[],u=0,d=e.from(`operations_search`).select(`*`,{count:`exact`}).order(v.sorting.column,{ascending:v.sorting.ascending});if(v.filters.alycFilter&&(d=d.eq(`alyc_id`,v.filters.alycFilter)),v.filters.instrumentFilter&&(d=d.eq(`instrument_id`,v.filters.instrumentFilter)),v.filters.typeFilter&&(d=d.eq(`type`,v.filters.typeFilter)),v.filters.currencyFilter&&(d=d.eq(`currency`,v.filters.currencyFilter)),v.filters.dateFrom&&(d=d.gte(`operated_at`,v.filters.dateFrom)),v.filters.dateTo&&(d=d.lte(`operated_at`,v.filters.dateTo)),v.filters.searchQuery){let e=`%${v.filters.searchQuery}%`;d=d.ilike(`instrument_ticker`,e)}try{let e=await d.range(i,o);if(c=e.data,u=e.count,v.pagination.requestId!==s)return;if(e.error){console.error(`Error cargando operaciones:`,e.error),n.innerHTML=`<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`,this._renderPagination(0,0);return}if(!c.length){let e=v.filters.searchQuery||v.filters.alycFilter||v.filters.instrumentFilter||v.filters.typeFilter||v.filters.currencyFilter||v.filters.dateFrom||v.filters.dateTo?`No se encontraron resultados para los filtros aplicados.`:`No hay operaciones registradas.`;n.innerHTML=`<tr><td colspan="9" class="table-empty">${e}</td></tr>`,r&&(r.innerHTML=`<div class="table-empty">${e}</div>`),this._renderPagination(0,0);return}}catch(e){if(v.pagination.requestId!==s)return;console.error(`Error cargando operaciones:`,e),n.innerHTML=`<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`,this._renderPagination(0,0);return}let f=``,p=``;c.forEach(e=>{let t=parseFloat(e.quantity)*parseFloat(e.price),n=e=>e.toLocaleString(`es-AR`,{minimumFractionDigits:2,maximumFractionDigits:2}),r=e=>Math.round(parseFloat(e)||0).toLocaleString(`es-AR`),i=e.instrument_ticker??`—`,o=e.instrument_name??``,s=e.alyc_name??`—`,u=!!e.notes?.trim(),d=c.indexOf(e);f+=`
        <tr class="op-row ${u?`has-notes`:``}" data-id="${e.id}">
          <td class="date-col">${a(e.operated_at)}</td>
         
          <td>
            <span class="ticker-chip" title="${l(o)}">${l(i)}</span>
            <span class="ticker-name" style="color:var(--color-muted);font-size:.8rem;margin-left:.35rem">${l(o)}</span>
          </td>
          <td class="alyc-col"><div class="alyc-name-cell">${l(s)}</div></td>
          <td class="amount total-${e.type}"><strong>${r(e.quantity)}</strong></td>
          <td class="amount">${n(parseFloat(e.price))}</td>
          <td class="amount"><strong class="total-amount total-${e.type}">${n(t)}</strong></td>
          <td class="currency-col"><span class="badge badge-${(e.currency||``).toLowerCase()}">${e.currency||`—`}</span></td>
          <td class="actions-cell">
            <button class="btn btn-sm btn-ghost btn-icon-only btn-edit-op" data-op-idx="${d}" title="Editar" aria-label="Editar">${m}</button>
            <button class="btn btn-sm btn-ghost btn-icon-only btn-clone-op" data-op-idx="${d}" title="Clonar" aria-label="Clonar">${g}</button>
            <button class="btn btn-sm btn-danger btn-icon-only btn-delete-op" data-id="${e.id}" title="Eliminar" aria-label="Eliminar">${h}</button>
          </td>
        </tr>
        <tr class="op-detail-row" id="detail-${e.id}">
          <td colspan="9">
            <div class="op-detail-content">
              <div class="op-detail-type"><strong>Tipo:</strong> <span class="badge badge-${(e.type||``).toLowerCase()}">${(e.type||`—`).toUpperCase()}</span></div>
              <div class="op-detail-instrument"><strong>Instrumento:</strong> ${l(o)} (${e.currency||`—`})</div>
              ${e.notes?`<div><strong>Notas:</strong> <span style="color:var(--text-muted)">${l(e.notes)}</span></div>`:``}
              <div class="op-detail-actions">
                <button class="btn btn-primary btn-edit-op" data-op-idx="${d}">${m} Editar</button>
                <button class="btn btn-ghost btn-clone-op" data-op-idx="${d}">${g} Clonar</button>
                <button class="btn btn-danger btn-delete-op" data-id="${e.id}">${h} Eliminar</button>
              </div>
            </div>
          </td>
        </tr>`,p+=`
        <div class="op-card--modern ${e.type} collapsed" data-id="${e.id}">
          <div class="op-card-header">
            <div class="op-card-ticker-badge">
              ${l(i)}
            </div>
            <div class="op-card-header-meta">
              <span class="op-card-header-date">${a(e.operated_at)}</span>
              <span class="op-card-qty-badge">${r(e.quantity)}</span>
              <span class="op-card-header-alyc">${l(s)}</span>
            </div>
          </div>

          <div class="op-card-body">
            <div class="op-card-instrument-full">
              ${l(o)}
            </div>
            <div class="op-card-stats-row">
              <div class="op-card-stat">
                <span class="op-card-stat-label">Precio</span>
                <span class="op-card-stat-value">${n(parseFloat(e.price))}</span>
              </div>
              <div class="op-card-stat" style="text-align: right">
                <span class="op-card-stat-label">Total (${e.currency})</span>
                <span class="op-card-stat-value" style="color: var(--total-${e.type})">${n(t)}</span>
              </div>
            </div>
          </div>
          
          ${u?`<div class="op-card-notes-modern">${l(e.notes)}</div>`:``}

          <div class="op-card-actions-modern">
            <button class="btn btn-sm btn-ghost btn-edit-op" data-op-idx="${d}">${m} Editar</button>
            <button class="btn btn-sm btn-ghost btn-clone-op" data-op-idx="${d}">${g} Clonar</button>
            <button class="btn btn-sm btn-ghost btn-delete-op" data-id="${e.id}" style="color: var(--color-danger)">${h} Borrar</button>
          </div>
        </div>`}),n.innerHTML=f,r&&(r.innerHTML=p,r.querySelectorAll(`.op-card-header`).forEach(e=>{e.addEventListener(`click`,()=>{e.parentElement.classList.toggle(`collapsed`)})})),n.querySelectorAll(`.op-row`).forEach(e=>{e.addEventListener(`click`,t=>{t.target.closest(`.actions-cell`)||e.classList.toggle(`expanded`)})});let y=e=>{v.editingOperation={...c[e.dataset.opIdx]},this._showFormModal()},b=e=>{let{id:t,created_at:n,...r}=c[e.dataset.opIdx];v.editingOperation={...r,_cloning:!0},this._showFormModal()},x=async e=>{await this._deleteOp(e.dataset.id)};n.querySelectorAll(`.btn-edit-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),y(e)})}),n.querySelectorAll(`.btn-clone-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),b(e)})}),n.querySelectorAll(`.btn-delete-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),x(e)})}),r&&(r.querySelectorAll(`.btn-edit-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),y(e)})}),r.querySelectorAll(`.btn-clone-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),b(e)})}),r.querySelectorAll(`.btn-delete-op`).forEach(e=>{e.addEventListener(`click`,t=>{t.stopPropagation(),x(e)})})),this._renderPagination(t,u),this._updateSortHeaders()},_renderPagination(e,t){let r=document.getElementById(`ops-pagination`);if(!r)return;let i=Math.ceil(t/_);if(i<=1){r.innerHTML=``;return}let a=e*_+1,o=Math.min((e+1)*_,t),s=n(e,i).map(t=>t===`...`?`<span class="pag-ellipsis">…</span>`:`<button class="btn btn-sm ${t===e?`btn-primary pag-active`:`btn-ghost`} pag-num" data-page="${t}">${t+1}</button>`).join(``);r.innerHTML=`
      <div class="pagination">
        <button class="btn btn-sm btn-ghost" id="btn-pag-prev" ${e===0?`disabled`:``}>←</button>
        <div class="pag-pages">${s}</div>
        <button class="btn btn-sm btn-ghost" id="btn-pag-next" ${e>=i-1?`disabled`:``}>→</button>
        <span class="pag-info">Mostrando ${a}–${o} de ${t}</span>
      </div>`,r.querySelectorAll(`.pag-num`).forEach(e=>{e.addEventListener(`click`,()=>{v.pagination.currentPage=parseInt(e.dataset.page,10),this._loadList(v.pagination.currentPage)})}),e>0&&document.getElementById(`btn-pag-prev`).addEventListener(`click`,()=>{v.pagination.currentPage=e-1,this._loadList(v.pagination.currentPage)}),e<i-1&&document.getElementById(`btn-pag-next`).addEventListener(`click`,()=>{v.pagination.currentPage=e+1,this._loadList(v.pagination.currentPage)})},async _exportCSV(){let t=document.getElementById(`btn-export-csv`),n=t.innerHTML;t.innerHTML=`Exportando...`,t.disabled=!0;try{let t=e.from(`operations_search`).select(`*`).order(`operated_at`,{ascending:!1});v.filters.alycFilter&&(t=t.eq(`alyc_id`,v.filters.alycFilter)),v.filters.instrumentFilter&&(t=t.eq(`instrument_id`,v.filters.instrumentFilter)),v.filters.typeFilter&&(t=t.eq(`type`,v.filters.typeFilter)),v.filters.currencyFilter&&(t=t.eq(`currency`,v.filters.currencyFilter)),v.filters.dateFrom&&(t=t.gte(`operated_at`,v.filters.dateFrom)),v.filters.dateTo&&(t=t.lte(`operated_at`,v.filters.dateTo)),v.filters.searchQuery&&(t=t.ilike(`instrument_ticker`,`%${v.filters.searchQuery}%`));let{data:n,error:r}=await t;if(r)throw r;if(!n||n.length===0){u(`No hay operaciones para exportar.`,`info`);return}let i=[`Fecha`,`Ticker`,`Nombre`,`ALyC`,`Tipo`,`Cantidad`,`Precio`,`Moneda`,`Notas`],a=n.map(e=>[(e.operated_at||``).split(`T`)[0]||`—`,e.instrument_ticker||`—`,`"${(e.instrument_name||``).replace(/"/g,`""`)}"`,`"${(e.alyc_name||``).replace(/"/g,`""`)}"`,e.type||`—`,e.quantity||0,e.price||0,e.currency||`—`,`"${(e.notes||``).replace(/"/g,`""`)}"`]),o=[i.join(`,`),...a.map(e=>e.join(`,`))].join(`
`),s=new Blob([o],{type:`text/csv;charset=utf-8;`}),c=URL.createObjectURL(s),l=document.createElement(`a`),d=new Date().toISOString().split(`T`)[0];l.setAttribute(`href`,c),l.setAttribute(`download`,`stocker_operaciones_${d}.csv`),l.style.visibility=`hidden`,document.body.appendChild(l),l.click(),document.body.removeChild(l),u(`Exportación completada.`,`success`)}catch(e){console.error(`Error exportando CSV:`,e),u(`Error al exportar. Intentá de nuevo.`,`error`)}finally{t.innerHTML=n,t.disabled=!1}},async _deleteOp(e){if(await s({title:`Eliminar operación`,message:`Esta acción no se puede deshacer.`}))try{await t(`DELETE`,`/api/operations/${e}`),u(`Operación eliminada.`,`success`),c(`user_holdings`),await this._loadList(v.pagination.currentPage)}catch{u(`Error al eliminar.`,`error`)}},async _loadAlycFilter(){let t=document.getElementById(`ops-alyc-filter`);if(!t)return;let n=o(`alycs`);n||({data:n}=await e.from(`alycs`).select(`id,name`).order(`name`),n&&i(`alycs`,n)),n?.length&&(t.innerHTML=`<option value="">Todas las ALyCs</option>`+n.map(e=>`<option value="${e.id}" ${e.id===v.filters.alycFilter?`selected`:``}>${l(e.name)}</option>`).join(``)),t.addEventListener(`change`,()=>{v.filters.alycFilter=t.value,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)})},async _loadInstrumentFilter(){let t=document.getElementById(`ops-instrument-filter`);if(!t)return;let n=o(`instruments`);n||({data:n}=await e.from(`instruments`).select(`id,ticker,name`).order(`ticker`),n&&i(`instruments`,n)),n?.length&&(t.innerHTML=`<option value="">Todos los instrumentos</option>`+n.map(e=>`<option value="${e.id}" ${e.id===v.filters.instrumentFilter?`selected`:``}>${l(e.ticker)} – ${l(e.name)}</option>`).join(``)),t.addEventListener(`change`,()=>{if(v.filters.instrumentFilter=t.value,v.filters.instrumentFilter){v.filters.searchQuery=``;let e=document.getElementById(`ops-search`);e&&(e.value=``)}v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)})},_bindFilters(){let e=document.getElementById(`ops-type-filter`),t=document.getElementById(`ops-currency-filter`),n=document.getElementById(`ops-date-from`),r=document.getElementById(`ops-date-to`),i=document.getElementById(`btn-clear-filters`);e?.addEventListener(`change`,()=>{v.filters.typeFilter=e.value,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)}),t?.addEventListener(`change`,()=>{v.filters.currencyFilter=t.value,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)}),n?.addEventListener(`change`,()=>{v.filters.dateFrom=n.value,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)}),r?.addEventListener(`change`,()=>{v.filters.dateTo=r.value,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)}),i?.addEventListener(`click`,()=>{v.filters.alycFilter=``,v.filters.instrumentFilter=``,v.filters.typeFilter=``,v.filters.currencyFilter=``,v.filters.dateFrom=``,v.filters.dateTo=``,v.filters.searchQuery=``,document.getElementById(`ops-alyc-filter`).value=``,document.getElementById(`ops-instrument-filter`).value=``,document.getElementById(`ops-type-filter`).value=``,document.getElementById(`ops-currency-filter`).value=``,document.getElementById(`ops-date-from`).value=``,document.getElementById(`ops-date-to`).value=``,document.getElementById(`ops-search`).value=``,v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)}),this._updateClearBtn()},_updateClearBtn(){let e=document.getElementById(`btn-clear-filters`);if(!e)return;let t=v.filters.alycFilter||v.filters.instrumentFilter||v.filters.typeFilter||v.filters.currencyFilter||v.filters.dateFrom||v.filters.dateTo||v.filters.searchQuery;e.style.display=t?``:`none`},_bindSearch(){let e=document.getElementById(`ops-search`);e&&(e.value=v.filters.searchQuery,e.addEventListener(`input`,()=>{clearTimeout(v.searchTimer),v.searchTimer=setTimeout(()=>{if(v.filters.searchQuery=e.value.trim(),v.filters.searchQuery){v.filters.instrumentFilter=``;let e=document.getElementById(`ops-instrument-filter`);e&&(e.value=``)}v.pagination.currentPage=0,this._updateClearBtn(),this._loadList(0)},300)}))},_bindSortHeaders(){document.querySelectorAll(`.ops-table th.sortable`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.col;v.sorting.column===t?v.sorting.ascending=!v.sorting.ascending:(v.sorting.column=t,v.sorting.ascending=t!==`operated_at`),v.pagination.currentPage=0,this._updateSortHeaders(),this._loadList(0)})}),this._updateSortHeaders()},_updateSortHeaders(){document.querySelectorAll(`.ops-table th.sortable`).forEach(e=>{e.classList.remove(`sort-asc`,`sort-desc`),e.dataset.col===v.sorting.column&&e.classList.add(v.sorting.ascending?`sort-asc`:`sort-desc`)})},async _showFormModal(){let e=v.editingOperation,t=document.createElement(`div`);t.className=`modal-overlay`,t.innerHTML=`
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <h3 style="margin:0">${e?._cloning?`Clonar Operación`:e?`Editar Operación`:`Nueva Operación`}</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-op-close">✕</button>
        </div>
        <form id="form-op" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="op-type">Tipo de operación *</label>
              <select id="op-type" required>
                <option value="">— Seleccioná —</option>
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
              </select>
            </div>
            <div class="form-group">
              <label for="op-date">Fecha *</label>
              <input type="date" id="op-date" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="op-instrument-search">Instrumento *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <div class="combobox" id="op-instrument-combobox" style="flex:1">
                  <input type="text" id="op-instrument-search" class="combobox-input" placeholder="Buscar por ticker o nombre..." autocomplete="off">
                  <input type="hidden" id="op-instrument">
                  <ul class="combobox-list" id="op-instrument-list" hidden></ul>
                </div>
                <button type="button" class="btn btn-sm btn-ghost btn-icon-only" id="btn-new-instrument" title="Crear nuevo instrumento" aria-label="Crear nuevo instrumento" style="flex-shrink:0">+</button>
              </div>
            </div>
            <div class="form-group">
              <label for="op-alyc">ALyC / Broker *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <select id="op-alyc" required style="flex:1"><option value="">Cargando...</option></select>
                <button type="button" class="btn btn-sm btn-ghost btn-icon-only" id="btn-new-alyc" title="Crear nueva ALyC" aria-label="Crear nueva ALyC" style="flex-shrink:0">+</button>
              </div>
            </div>
          </div>

          <div class="form-row form-row-3">
            <div class="form-group">
              <label for="op-qty">Cantidad *</label>
              <input type="number" id="op-qty" min="0.0001" step="any" placeholder="Ej: 100" required>
            </div>
            <div class="form-group">
              <label for="op-price">Precio unitario *</label>
              <input type="number" id="op-price" min="0.0001" step="any" placeholder="Ej: 1250.50" required>
            </div>
            <div class="form-group">
              <label for="op-currency">Moneda *</label>
              <select id="op-currency" required>
                <option value="ARS">ARS – Pesos</option>
                <option value="USD">USD – Dólares</option>
              </select>
            </div>
          </div>

          <div id="op-total-row" style="display:none;margin: 1rem 0;padding: 0.75rem 1rem;background:var(--bg-main);border-radius:var(--radius);font-size:1rem; border: 1px dashed var(--border)">
            Total estimado: <strong id="op-total-value" style="color: var(--color-primary)">—</strong>
          </div>

          <div class="form-group">
            <label for="op-notes">Notas</label>
            <textarea id="op-notes" placeholder="Observaciones opcionales..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-op-submit">
              ${e?._cloning?`Clonar operación`:e?`Guardar cambios`:`Registrar operación`}
            </button>
            <button type="button" class="btn btn-ghost" id="btn-op-cancel">Cancelar</button>
          </div>
        </form>
      </div>`,document.body.appendChild(t),document.getElementById(`op-date`).value=e?e.operated_at:new Date().toISOString().split(`T`)[0];let n=()=>{let n=document.getElementById(`op-type`).value,r=document.getElementById(`op-instrument`).value,i=document.getElementById(`op-alyc`).value,a=document.getElementById(`op-qty`).value,o=document.getElementById(`op-price`).value,s=document.getElementById(`op-date`).value,c=document.getElementById(`op-notes`).value.trim();(e?n!==e.type||r!==e.instrument_id||i!==e.alyc_id||a!==String(e.quantity)||o!==String(e.price)||s!==e.operated_at||c!==(e.notes||``):n!==``||r!==``||i!==``||a!==``||o!==``||c!==``)&&!confirm(`Tenés cambios sin guardar. ¿Descartarlos?`)||(v.editingOperation=null,t.remove())};document.getElementById(`btn-op-close`).addEventListener(`click`,n),document.getElementById(`btn-op-cancel`).addEventListener(`click`,n),document.getElementById(`btn-new-instrument`).addEventListener(`click`,()=>this._showInstrumentModal()),document.getElementById(`btn-new-alyc`).addEventListener(`click`,()=>this._showAlycModal());try{await Promise.all([this._loadInstrumentsSelect(e?.instrument_id),this._loadAlycsSelect(e?.alyc_id)])}catch{u(`Error al cargar los datos del formulario. Intentá recargar la página.`,`error`)}e&&(document.getElementById(`op-type`).value=e.type,document.getElementById(`op-qty`).value=e.quantity,document.getElementById(`op-price`).value=e.price,document.getElementById(`op-currency`).value=e.currency,document.getElementById(`op-notes`).value=e.notes||``),this._bindTotalCalc(),this._bindFormSubmit(t)},async _loadInstrumentsSelect(t=null){let n=document.getElementById(`op-instrument-search`),r=document.getElementById(`op-instrument`),a=document.getElementById(`op-instrument-list`);if(!n||!r||!a)return;let s=o(`instruments`);if(s||({data:s}=await e.from(`instruments`).select(`id, ticker, name, instrument_types(name)`).order(`ticker`),s&&i(`instruments`,s)),!s?.length){n.placeholder=`Sin instrumentos — creá uno primero`,n.disabled=!0;return}let c=e=>`[${e.ticker}] ${e.name}${e.instrument_types?.name?` (${e.instrument_types.name})`:``}`;if(t){let e=s.find(e=>e.id===t);e&&(r.value=e.id,n.value=c(e))}let u=e=>{let t=e.trim().toLowerCase(),i=t?s.filter(e=>e.ticker.toLowerCase().includes(t)||e.name.toLowerCase().includes(t)):s;i.length?(a.innerHTML=i.map(e=>`<li class="combobox-option" data-id="${e.id}" data-label="${l(c(e))}"><span class="combobox-ticker">${l(e.ticker)}</span><span class="combobox-name">${l(e.name)}</span></li>`).join(``),a.querySelectorAll(`.combobox-option`).forEach(e=>{e.addEventListener(`mousedown`,t=>{t.preventDefault(),r.value=e.dataset.id,n.value=e.dataset.label,a.hidden=!0,n.classList.remove(`field-error-input`);let i=n.closest(`.form-group`)?.querySelector(`.field-error-msg`);i&&i.remove()})})):a.innerHTML=`<li class="combobox-empty">Sin resultados para "${l(e)}"</li>`,a.hidden=!1};n.addEventListener(`input`,()=>{r.value=``,u(n.value)}),n.addEventListener(`focus`,()=>{u(n.value)}),n.addEventListener(`blur`,()=>{setTimeout(()=>{a.hidden=!0,r.value||(n.value=``)},150)}),n.addEventListener(`keydown`,e=>{if(a.hidden)return;let t=a.querySelectorAll(`.combobox-option`),i=a.querySelector(`.combobox-option.active`),o=[...t].indexOf(i);e.key===`ArrowDown`?(e.preventDefault(),o=(o+1)%t.length,t.forEach(e=>e.classList.remove(`active`)),t[o]?.classList.add(`active`),t[o]?.scrollIntoView({block:`nearest`})):e.key===`ArrowUp`?(e.preventDefault(),o=o<=0?t.length-1:o-1,t.forEach(e=>e.classList.remove(`active`)),t[o]?.classList.add(`active`),t[o]?.scrollIntoView({block:`nearest`})):e.key===`Enter`&&i?(e.preventDefault(),r.value=i.dataset.id,n.value=i.dataset.label,a.hidden=!0):e.key===`Escape`&&(a.hidden=!0,r.value||(n.value=``))})},async _loadAlycsSelect(t=null){let n=document.getElementById(`op-alyc`);if(!n)return;let r=o(`alycs`);if(r||({data:r}=await e.from(`alycs`).select(`id,name`).order(`name`),r&&i(`alycs`,r)),!r?.length){n.innerHTML=`<option value="">— Sin ALyCs (creá una primero) —</option>`;return}n.innerHTML=`<option value="">— Seleccioná una ALyC —</option>`+r.map(e=>`<option value="${e.id}" ${e.id===t?`selected`:``}>${l(e.name)}</option>`).join(``)},async _showInstrumentModal(){let n=o(`instrument_types`);if(n||({data:n}=await e.from(`instrument_types`).select(`id, name`).order(`name`),n&&i(`instrument_types`,n)),!n?.length){u(`Primero creá al menos un tipo de instrumento.`,`error`);return}let a=document.createElement(`div`);a.className=`modal-overlay`,a.innerHTML=`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="margin:0">Nuevo Instrumento</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="modal-close">✕</button>
        </div>
        <form id="modal-inst-form" novalidate>
          <div class="form-group">
            <label for="modal-ticker">Ticker *</label>
            <input type="text" id="modal-ticker" placeholder="Ej: GGAL, AAPL, YPF" required style="text-transform:uppercase">
          </div>
          <div class="form-group">
            <label for="modal-name">Nombre *</label>
            <input type="text" id="modal-name" placeholder="Ej: Grupo Financiero Galicia" required>
          </div>
          <div class="form-group">
            <label for="modal-type">Tipo *</label>
            <select id="modal-type" required>
              <option value="">— Seleccioná un tipo —</option>
              ${n.map(e=>`<option value="${e.id}">${l(e.name)}</option>`).join(``)}
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="modal-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="modal-cancel">Cancelar</button>
          </div>
        </form>
      </div>`,document.body.appendChild(a);let s=()=>a.remove();document.getElementById(`modal-close`).addEventListener(`click`,s),document.getElementById(`modal-cancel`).addEventListener(`click`,s),a.addEventListener(`click`,e=>{e.target===a&&s()});let d=document.getElementById(`modal-ticker`);d.addEventListener(`input`,()=>{d.value=d.value.toUpperCase()}),d.focus(),document.getElementById(`modal-inst-form`).addEventListener(`submit`,async e=>{e.preventDefault();let n=d.value.trim().toUpperCase(),i=document.getElementById(`modal-name`).value.trim(),a=document.getElementById(`modal-type`).value,o=!1;if(n||(r(`modal-ticker`,`Ingresá un ticker`),o=!0),i||(r(`modal-name`,`Ingresá un nombre`),o=!0),a||(r(`modal-type`,`Seleccioná un tipo`),o=!0),o)return;let l=document.getElementById(`modal-submit`);l.disabled=!0,l.textContent=`Guardando...`;try{let e=await t(`POST`,`/api/instruments`,{ticker:n,name:i,instrument_type_id:a}),r=Array.isArray(e)?e[0]?.id:e?.id;c(`instruments`),u(`Instrumento "${n}" creado.`,`success`),s(),await this._loadInstrumentsSelect(r)}catch(e){u(e.code===`23505`?`El ticker "${n}" ya existe.`:`Error al guardar.`,`error`),l.disabled=!1,l.textContent=`+ Agregar`}})},async _showAlycModal(){let e=document.createElement(`div`);e.className=`modal-overlay`,e.innerHTML=`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="margin:0">Nueva ALyC</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="modal-alyc-close">✕</button>
        </div>
        <form id="modal-alyc-form" novalidate>
          <div class="form-group">
            <label for="modal-alyc-name">Nombre *</label>
            <input type="text" id="modal-alyc-name" placeholder="Ej: IOL invertironline" required>
          </div>
          <div class="form-group">
            <label for="modal-alyc-cuit">CUIT</label>
            <input type="text" id="modal-alyc-cuit" placeholder="Ej: 30-12345678-9">
          </div>
          <div class="form-group">
            <label for="modal-alyc-website">Sitio web</label>
            <input type="url" id="modal-alyc-website" placeholder="Ej: https://www.iol.com.ar">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="modal-alyc-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="modal-alyc-cancel">Cancelar</button>
          </div>
        </form>
      </div>`,document.body.appendChild(e);let n=()=>e.remove();document.getElementById(`modal-alyc-close`).addEventListener(`click`,n),document.getElementById(`modal-alyc-cancel`).addEventListener(`click`,n),e.addEventListener(`click`,t=>{t.target===e&&n()});let i=document.getElementById(`modal-alyc-name`);i.focus(),document.getElementById(`modal-alyc-form`).addEventListener(`submit`,async e=>{e.preventDefault();let a=i.value.trim(),o=document.getElementById(`modal-alyc-cuit`).value.trim(),s=document.getElementById(`modal-alyc-website`).value.trim();if(!a){r(`modal-alyc-name`,`El nombre es obligatorio`);return}let l=document.getElementById(`modal-alyc-submit`);l.disabled=!0,l.textContent=`Guardando...`;try{let e=await t(`POST`,`/api/alycs`,{name:a,cuit:o||null,website:s||null}),r=Array.isArray(e)?e[0]?.id:e?.id;c(`alycs`),u(`ALyC "${a}" creada.`,`success`),n(),await this._loadAlycsSelect(r)}catch(e){u(e.code===`23505`?`La ALyC "${a}" ya existe.`:`Error al guardar.`,`error`),l.disabled=!1,l.textContent=`+ Agregar`}})},_bindTotalCalc(){let e=document.getElementById(`op-qty`),t=document.getElementById(`op-price`),n=document.getElementById(`op-total-row`),r=document.getElementById(`op-total-value`),i=document.getElementById(`op-currency`);function a(){let a=parseFloat(e.value),o=parseFloat(t.value);a>0&&o>0?(n.style.display=`block`,r.textContent=`${(a*o).toLocaleString(`es-AR`,{minimumFractionDigits:2})} ${i.value}`):n.style.display=`none`}e.addEventListener(`input`,a),t.addEventListener(`input`,a),i.addEventListener(`change`,a),a()},_bindFormSubmit(e){let n=document.getElementById(`form-op`),i=v.editingOperation;n&&n.addEventListener(`submit`,async n=>{n.preventDefault();let a=document.getElementById(`op-type`).value,o=document.getElementById(`op-instrument`).value,s=document.getElementById(`op-alyc`).value,l=document.getElementById(`op-qty`).value,d=document.getElementById(`op-price`).value,f=document.getElementById(`op-currency`).value,p=document.getElementById(`op-date`).value,m=document.getElementById(`op-notes`).value.trim(),h=!1;if(a||(r(`op-type`,`Seleccioná un tipo de operación`),h=!0),p||(r(`op-date`,`Ingresá una fecha`),h=!0),o||(r(`op-instrument-search`,`Seleccioná un instrumento`),h=!0),s||(r(`op-alyc`,`Seleccioná una ALyC`),h=!0),(!l||parseFloat(l)<=0)&&(r(`op-qty`,`Ingresá una cantidad mayor a 0`),h=!0),(!d||parseFloat(d)<=0)&&(r(`op-price`,`Ingresá un precio mayor a 0`),h=!0),h)return;let g=document.getElementById(`btn-op-submit`);g.disabled=!0,g.textContent=`Guardando...`;let _={type:a,instrument_id:o,alyc_id:s,quantity:parseFloat(l),price:parseFloat(d),currency:f,operated_at:p,notes:m||null};try{i&&!i._cloning?(await t(`PATCH`,`/api/operations/${i.id}`,_),u(`Operación actualizada correctamente.`,`success`)):(await t(`POST`,`/api/operations`,_),u(`Operación registrada correctamente.`,`success`)),c(`user_holdings`),v.editingOperation=null,e.remove(),await this._loadList(v.pagination.currentPage)}catch{u(`Error al guardar la operación.`,`error`),g.disabled=!1,g.textContent=i?._cloning?`Clonar operación`:i?`Guardar cambios`:`Registrar operación`}})},cleanup(){v.searchTimer&&=(clearTimeout(v.searchTimer),null),v.editingOperation=null,v.pagination.currentPage=0,v.pagination.requestId=null,Object.assign(v.filters,{searchQuery:``,alycFilter:``,instrumentFilter:``,typeFilter:``,currencyFilter:``,dateFrom:``,dateTo:``})}};export{y as OperationsPage};
//# sourceMappingURL=operations-DYpgdS6-.js.map