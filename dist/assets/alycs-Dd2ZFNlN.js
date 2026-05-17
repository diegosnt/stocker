import{r as e,t}from"./api-client-C3zM3bBJ.js";import{c as n,d as r,o as i,r as a,s as o,t as s}from"./index-CuYXsGOv.js";var c=[],l=`name`,u=!0,d={async render(){let e=document.getElementById(`page-content`);e.innerHTML=`
      <div class="page-header">
        <h2>ALyCs / Brokers</h2>
      </div>

      <div class="card">
        <h3 id="alyc-form-title">Nueva ALyC</h3>
        <form id="form-alyc" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="alyc-name">Nombre *</label>
              <input type="text" id="alyc-name" placeholder="Ej: IOL, Bull Market, Comafi..." required>
            </div>
            <div class="form-group">
              <label for="alyc-cuit">CUIT</label>
              <input type="text" id="alyc-cuit" placeholder="Ej: 30-12345678-9">
            </div>
            <div class="form-group">
              <label for="alyc-website">Sitio web</label>
              <input type="url" id="alyc-website" placeholder="https://...">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-alyc-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="btn-alyc-cancel-edit" style="display:none">Cancelar edición</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="table-card-header">
          <h3>ALyCs registradas</h3>
          <input type="search" id="alyc-search" class="search-input" placeholder="Buscar por nombre, CUIT o sitio web...">
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="sortable" data-col="name">Nombre</th>
                <th class="sortable" data-col="cuit">CUIT</th>
                <th>Sitio web</th>
                <th class="sortable" data-col="created_at">Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="alyc-tbody">
              <tr><td colspan="5" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
      </div>`,await this._loadList(),this._bindForm(),this._bindSearch(),this._bindSortHeaders()},async _loadList(){let t=document.getElementById(`alyc-tbody`);if(!t)return;let{data:n,error:r}=await e.from(`alycs`).select(`*`).order(`name`);if(r){t.innerHTML=`<tr><td colspan="5" class="table-empty">Error al cargar.</td></tr>`;return}c=n,this._renderRows(this._sorted(n))},_renderRows(e){let t=document.getElementById(`alyc-tbody`);if(t){if(!e.length){t.innerHTML=`<tr><td colspan="5" class="table-empty">No hay ALyCs registradas. Agregá una arriba.</td></tr>`;return}t.innerHTML=e.map(e=>`
      <tr>
        <td><strong>${o(e.name)}</strong></td>
        <td>${e.cuit?o(e.cuit):`<span style="color:var(--color-muted)">—</span>`}</td>
        <td>${e.website?`<a href="${o(e.website)}" target="_blank" rel="noopener">${o(e.website)}</a>`:`<span style="color:var(--color-muted)">—</span>`}</td>
        <td>${n(e.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${e.id}" data-name="${o(e.name)}"
            data-cuit="${o(e.cuit||``)}" data-website="${o(e.website||``)}">
            Editar
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}" data-name="${o(e.name)}">
            Eliminar
          </button>
        </td>
      </tr>`).join(``),t.querySelectorAll(`.btn-edit`).forEach(e=>{e.addEventListener(`click`,()=>this._startEdit({id:e.dataset.id,name:e.dataset.name,cuit:e.dataset.cuit,website:e.dataset.website}))}),t.querySelectorAll(`.btn-delete`).forEach(e=>{e.addEventListener(`click`,()=>this._delete(e.dataset.id,e.dataset.name))})}},_bindSearch(){let e=document.getElementById(`alyc-search`);e&&e.addEventListener(`input`,()=>{let t=e.value.trim().toLowerCase(),n=t?c.filter(e=>e.name.toLowerCase().includes(t)||(e.cuit||``).toLowerCase().includes(t)||(e.website||``).toLowerCase().includes(t)):c;this._renderRows(this._sorted(n))})},_sorted(e){return[...e].sort((e,t)=>{let n,r;if(l===`name`)n=e.name||``,r=t.name||``;else if(l===`cuit`)n=e.cuit||``,r=t.cuit||``;else if(l===`created_at`)n=e.created_at,r=t.created_at;else return 0;let i=typeof n==`string`?n.localeCompare(r):n-r;return u?i:-i})},_bindSortHeaders(){document.querySelectorAll(`th[data-col]`).forEach(e=>{e.closest(`table`)?.querySelector(`#alyc-tbody`)&&e.addEventListener(`click`,()=>{let t=e.dataset.col;l===t?u=!u:(l=t,u=t!==`created_at`),this._updateSortHeaders();let n=document.getElementById(`alyc-search`)?.value.trim().toLowerCase()||``,r=n?c.filter(e=>e.name.toLowerCase().includes(n)||(e.cuit||``).toLowerCase().includes(n)||(e.website||``).toLowerCase().includes(n)):c;this._renderRows(this._sorted(r))})}),this._updateSortHeaders()},_updateSortHeaders(){document.querySelectorAll(`th[data-col]`).forEach(e=>{e.closest(`table`)?.querySelector(`#alyc-tbody`)&&(e.classList.remove(`sort-asc`,`sort-desc`),e.dataset.col===l&&e.classList.add(u?`sort-asc`:`sort-desc`))})},_bindForm(){let e=document.getElementById(`form-alyc`);e&&(document.getElementById(`btn-alyc-cancel-edit`).addEventListener(`click`,()=>this._cancelEdit()),e.addEventListener(`submit`,async n=>{n.preventDefault();let i=document.getElementById(`alyc-name`).value.trim(),o=document.getElementById(`alyc-cuit`).value.trim(),c=document.getElementById(`alyc-website`).value.trim(),l=e.dataset.editId;if(!i){r(`alyc-name`,`El nombre es obligatorio`);return}let u=document.getElementById(`btn-alyc-submit`);u.disabled=!0;try{l?(await t(`PATCH`,`/api/alycs/${l}`,{name:i,cuit:o||null,website:c||null}),s(`ALyC "${i}" actualizada.`,`success`),this._cancelEdit(!0)):(await t(`POST`,`/api/alycs`,{name:i,cuit:o||null,website:c||null}),s(`ALyC "${i}" agregada.`,`success`),e.reset()),a(`alycs`),await this._loadList()}catch(e){s(e.code===`23505`?`La ALyC "${i}" ya existe.`:`Error al guardar.`,`error`)}finally{u.disabled=!1}}))},_startEdit(e){let t=document.getElementById(`form-alyc`);document.getElementById(`alyc-form-title`).textContent=`Editar ALyC`,document.getElementById(`alyc-name`).value=e.name,document.getElementById(`alyc-cuit`).value=e.cuit||``,document.getElementById(`alyc-website`).value=e.website||``,document.getElementById(`btn-alyc-submit`).textContent=`Guardar cambios`,document.getElementById(`btn-alyc-cancel-edit`).style.display=``,t.dataset.editId=e.id,t.dataset.originalName=e.name,t.dataset.originalCuit=e.cuit||``,t.dataset.originalWebsite=e.website||``,document.getElementById(`alyc-name`).focus(),t.scrollIntoView({behavior:`smooth`})},_cancelEdit(e=!1){if(!e){let e=document.getElementById(`form-alyc`);if((document.getElementById(`alyc-name`).value.trim()!==(e.dataset.originalName||``)||document.getElementById(`alyc-cuit`).value.trim()!==(e.dataset.originalCuit||``)||document.getElementById(`alyc-website`).value.trim()!==(e.dataset.originalWebsite||``))&&!confirm(`Tenés cambios sin guardar. ¿Descartarlos?`))return}document.getElementById(`alyc-form-title`).textContent=`Nueva ALyC`,document.getElementById(`form-alyc`).reset(),document.getElementById(`btn-alyc-submit`).textContent=`+ Agregar`,document.getElementById(`btn-alyc-cancel-edit`).style.display=`none`,delete document.getElementById(`form-alyc`).dataset.editId},async _delete(e,n){if(await i({title:`Eliminar "${n}"`,message:`Esta acción no se puede deshacer. No se puede eliminar si tiene operaciones registradas.`}))try{await t(`DELETE`,`/api/alycs/${e}`),a(`alycs`),s(`ALyC "${n}" eliminada.`,`success`),await this._loadList()}catch(e){s(e.code===`23503`?`No se puede eliminar: tiene operaciones asociadas.`:`Error al eliminar.`,`error`)}},cleanup(){c=[],l=`name`,u=!0}};export{d as AlycsPage};
//# sourceMappingURL=alycs-Dd2ZFNlN.js.map