import{r as e,t}from"./api-client-Bj11K_ey.js";import{a as n,c as r,d as i,o as a,r as o,s,t as c}from"./index-Do264cmd.js";var l=10,u=[],d=`ticker`,f=!0,p=0,m=[],h={async render(){let e=document.getElementById(`page-content`);e.innerHTML=`
      <div class="page-header">
        <h2>Instrumentos</h2>
      </div>

      <div class="card">
        <h3 id="inst-form-title">Nuevo Instrumento</h3>
        <form id="form-instrumento" novalidate>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label for="inst-ticker">Ticker *</label>
              <input type="text" id="inst-ticker" placeholder="Ej: GGAL, AAPL, YPF" required style="text-transform:uppercase">
            </div>
            <div class="form-group">
              <label for="inst-name">Nombre *</label>
              <input type="text" id="inst-name" placeholder="Ej: Grupo Financiero Galicia" required>
            </div>
            <div class="form-group">
              <label for="inst-type">Tipo *</label>
              <select id="inst-type" required>
                <option value="">— Seleccioná un tipo —</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-inst-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="btn-inst-cancel-edit" style="display:none">Cancelar edición</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="table-card-header">
          <h3>Instrumentos registrados</h3>
          <input type="search" id="inst-search" class="search-input" placeholder="Buscar por ticker, nombre o tipo...">
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="sortable" data-col="ticker">Ticker</th>
                <th class="sortable" data-col="name">Nombre</th>
                <th class="sortable" data-col="type">Tipo</th>
                <th class="sortable" data-col="created_at">Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="inst-tbody">
              <tr><td colspan="5" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
        <div id="inst-pagination"></div>
      </div>`;try{await Promise.all([this._loadTypes(),this._loadList()])}catch{c(`Error al cargar los datos. Intentá recargar la página.`,`error`)}this._bindForm(),this._bindSearch(),this._bindSortHeaders()},async _loadTypes(t=null){let n=document.getElementById(`inst-type`);if(!n)return;let{data:r}=await e.from(`instrument_types`).select(`id, name`).order(`name`);if(!r?.length){n.innerHTML=`<option value="">— Sin tipos (creá uno primero) —</option>`;return}n.innerHTML=`<option value="">— Seleccioná un tipo —</option>`+r.map(e=>`<option value="${e.id}" ${e.id===t?`selected`:``}>${s(e.name)}</option>`).join(``)},async _loadList(){let t=document.getElementById(`inst-tbody`);if(!t)return;let{data:n,error:r}=await e.from(`instruments`).select(`*, instrument_types(name)`).order(`ticker`);if(r){t.innerHTML=`<tr><td colspan="5" class="table-empty">Error al cargar.</td></tr>`;return}u=n,p=0,m=this._sorted(n),this._renderRows()},_sorted(e){return[...e].sort((e,t)=>{let n,r;if(d===`ticker`)n=e.ticker,r=t.ticker;else if(d===`name`)n=e.name,r=t.name;else if(d===`type`)n=e.instrument_types?.name??``,r=t.instrument_types?.name??``;else if(d===`created_at`)n=e.created_at,r=t.created_at;else return 0;let i=typeof n==`string`?n.localeCompare(r):n-r;return f?i:-i})},_bindSortHeaders(){document.querySelectorAll(`#inst-tbody`).forEach(()=>{}),document.querySelectorAll(`th[data-col]`).forEach(e=>{e.closest(`table`)?.querySelector(`#inst-tbody`)&&e.addEventListener(`click`,()=>{let t=e.dataset.col;d===t?f=!f:(d=t,f=t!==`created_at`),this._updateSortHeaders();let n=document.getElementById(`inst-search`)?.value.trim().toLowerCase()||``,r=n?u.filter(e=>e.ticker.toLowerCase().includes(n)||e.name.toLowerCase().includes(n)||(e.instrument_types?.name||``).toLowerCase().includes(n)):u;p=0,m=this._sorted(r),this._renderRows()})}),this._updateSortHeaders()},_updateSortHeaders(){document.querySelectorAll(`th[data-col]`).forEach(e=>{e.closest(`table`)?.querySelector(`#inst-tbody`)&&(e.classList.remove(`sort-asc`,`sort-desc`),e.dataset.col===d&&e.classList.add(f?`sort-asc`:`sort-desc`))})},_renderRows(){let e=document.getElementById(`inst-tbody`);if(!e)return;if(!m.length){e.innerHTML=`<tr><td colspan="5" class="table-empty">No hay instrumentos. Agregá uno arriba.</td></tr>`,this._renderPagination();return}let t=p*l;e.innerHTML=m.slice(t,t+l).map(e=>`
      <tr>
        <td><span class="ticker-chip">${s(e.ticker)}</span></td>
        <td>${s(e.name)}</td>
        <td>${e.instrument_types?s(e.instrument_types.name):`—`}</td>
        <td>${r(e.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${e.id}" data-ticker="${s(e.ticker)}" data-name="${s(e.name)}"
            data-type-id="${e.instrument_type_id}">
            Editar
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}" data-name="${s(e.ticker)}">
            Eliminar
          </button>
        </td>
      </tr>`).join(``),e.querySelectorAll(`.btn-edit`).forEach(e=>{e.addEventListener(`click`,()=>this._startEdit({id:e.dataset.id,ticker:e.dataset.ticker,name:e.dataset.name,instrument_type_id:e.dataset.typeId}))}),e.querySelectorAll(`.btn-delete`).forEach(e=>{e.addEventListener(`click`,()=>this._delete(e.dataset.id,e.dataset.name))}),this._renderPagination()},_renderPagination(){let e=document.getElementById(`inst-pagination`);if(!e)return;let t=m.length,r=Math.ceil(t/l);if(r<=1){e.innerHTML=``;return}let i=p*l+1,a=Math.min((p+1)*l,t),o=n(p,r).map(e=>e===`...`?`<span class="pag-ellipsis">…</span>`:`<button class="btn btn-sm ${e===p?`btn-primary pag-active`:`btn-ghost`} pag-num" data-page="${e}">${e+1}</button>`).join(``);e.innerHTML=`
      <div class="pagination">
        <button class="btn btn-sm btn-ghost" id="btn-inst-prev" ${p===0?`disabled`:``}>←</button>
        <div class="pag-pages">${o}</div>
        <button class="btn btn-sm btn-ghost" id="btn-inst-next" ${p>=r-1?`disabled`:``}>→</button>
        <span class="pag-info">Mostrando ${i}–${a} de ${t}</span>
      </div>`,e.querySelectorAll(`.pag-num`).forEach(e=>{e.addEventListener(`click`,()=>{p=parseInt(e.dataset.page,10),this._renderRows()})}),p>0&&document.getElementById(`btn-inst-prev`).addEventListener(`click`,()=>{p--,this._renderRows()}),p<r-1&&document.getElementById(`btn-inst-next`).addEventListener(`click`,()=>{p++,this._renderRows()})},_bindSearch(){let e=document.getElementById(`inst-search`);e&&e.addEventListener(`input`,()=>{let t=e.value.trim().toLowerCase(),n=t?u.filter(e=>e.ticker.toLowerCase().includes(t)||e.name.toLowerCase().includes(t)||(e.instrument_types?.name||``).toLowerCase().includes(t)):u;p=0,m=this._sorted(n),this._renderRows()})},_bindForm(){let e=document.getElementById(`form-instrumento`);if(!e)return;let n=document.getElementById(`inst-ticker`);n.addEventListener(`input`,()=>{n.value=n.value.toUpperCase()}),document.getElementById(`btn-inst-cancel-edit`).addEventListener(`click`,()=>this._cancelEdit()),e.addEventListener(`submit`,async n=>{if(n.preventDefault(),e.dataset.loading===`true`)return;let r=document.getElementById(`inst-ticker`).value.trim().toUpperCase(),a=document.getElementById(`inst-name`).value.trim(),s=document.getElementById(`inst-type`).value,l=e.dataset.editId,u=!1;if(r||(i(`inst-ticker`,`Ingresá un ticker`),u=!0),a||(i(`inst-name`,`Ingresá un nombre`),u=!0),s||(i(`inst-type`,`Seleccioná un tipo`),u=!0),u)return;let d=document.getElementById(`btn-inst-submit`),f=d.textContent;d.disabled=!0,d.textContent=l?`Guardando...`:`Agregando...`,e.dataset.loading=`true`;try{l?(await t(`PATCH`,`/api/instruments/${l}`,{ticker:r,name:a,instrument_type_id:s}),c(`Instrumento "${r}" actualizado.`,`success`),this._cancelEdit(!0)):(await t(`POST`,`/api/instruments`,{ticker:r,name:a,instrument_type_id:s}),c(`Instrumento "${r}" agregado.`,`success`),e.reset()),o(`instruments`),await this._loadList()}catch(e){e.status!==409&&c(e.code===`23505`||e.status===409?`El ticker "${r}" ya existe.`:`Error al guardar.`,`error`)}finally{d.disabled=!1,d.textContent=f,e.dataset.loading=`false`}})},async _startEdit(e){await this._loadTypes(e.instrument_type_id);let t=document.getElementById(`form-instrumento`);document.getElementById(`inst-form-title`).textContent=`Editar Instrumento`,document.getElementById(`inst-ticker`).value=e.ticker,document.getElementById(`inst-name`).value=e.name,document.getElementById(`btn-inst-submit`).textContent=`Guardar cambios`,document.getElementById(`btn-inst-cancel-edit`).style.display=``,t.dataset.editId=e.id,t.dataset.originalTicker=e.ticker,t.dataset.originalName=e.name,t.dataset.originalTypeId=e.instrument_type_id,document.getElementById(`inst-ticker`).focus(),t.scrollIntoView({behavior:`smooth`})},_cancelEdit(e=!1){if(!e){let e=document.getElementById(`form-instrumento`);if((document.getElementById(`inst-ticker`).value.trim()!==(e.dataset.originalTicker||``)||document.getElementById(`inst-name`).value.trim()!==(e.dataset.originalName||``)||document.getElementById(`inst-type`).value!==(e.dataset.originalTypeId||``))&&!confirm(`Tenés cambios sin guardar. ¿Descartarlos?`))return}document.getElementById(`inst-form-title`).textContent=`Nuevo Instrumento`,document.getElementById(`form-instrumento`).reset(),document.getElementById(`btn-inst-submit`).textContent=`+ Agregar`,document.getElementById(`btn-inst-cancel-edit`).style.display=`none`,delete document.getElementById(`form-instrumento`).dataset.editId,this._loadTypes()},async _delete(e,n){if(await a({title:`Eliminar "${n}"`,message:`Esta acción no se puede deshacer. No se puede eliminar si tiene operaciones registradas.`}))try{await t(`DELETE`,`/api/instruments/${e}`),o(`instruments`),c(`Instrumento "${n}" eliminado.`,`success`),await this._loadList()}catch(e){c(e.code===`23503`?`No se puede eliminar: tiene operaciones asociadas.`:`Error al eliminar.`,`error`)}},cleanup(){u=[],m=[],p=0,d=`ticker`,f=!0}};export{h as InstrumentsPage};
//# sourceMappingURL=instruments-DRo0dVfH.js.map