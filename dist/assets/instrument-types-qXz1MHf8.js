import{r as e,t}from"./api-client-Bj11K_ey.js";import{c as n,d as r,o as i,r as a,s as o,t as s}from"./index-Do264cmd.js";var c=[],l={async render(){let e=document.getElementById(`page-content`);e.innerHTML=`
      <div class="page-header">
        <h2>Tipos de Instrumento</h2>
      </div>

      <div class="card">
        <h3 id="tipo-form-title">Nuevo Tipo</h3>
        <form id="form-tipo" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="tipo-name">Nombre *</label>
              <input type="text" id="tipo-name" placeholder="Ej: Acción, CEDEAR, Bono..." required>
            </div>
            <div class="form-group">
              <label for="tipo-desc">Descripción</label>
              <input type="text" id="tipo-desc" placeholder="Descripción opcional">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-tipo-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="btn-tipo-cancel-edit" style="display:none">Cancelar edición</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="table-card-header">
          <h3>Tipos registrados</h3>
          <input type="search" id="tipos-search" class="search-input" placeholder="Buscar por nombre o descripción...">
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tipos-tbody">
              <tr><td colspan="4" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
      </div>`,await this._loadList(),this._bindForm(),this._bindSearch()},async _loadList(){let t=document.getElementById(`tipos-tbody`);if(!t)return;let{data:n,error:r}=await e.from(`instrument_types`).select(`*`).order(`created_at`,{ascending:!1});if(r){t.innerHTML=`<tr><td colspan="4" class="table-empty">Error al cargar datos.</td></tr>`;return}c=n,this._renderRows(n)},_renderRows(e){let t=document.getElementById(`tipos-tbody`);if(t){if(!e.length){t.innerHTML=`<tr><td colspan="4" class="table-empty">No hay tipos registrados. Agregá uno arriba.</td></tr>`;return}t.innerHTML=e.map(e=>`
      <tr>
        <td><strong>${o(e.name)}</strong></td>
        <td>${e.description?o(e.description):`<span style="color:var(--color-muted)">—</span>`}</td>
        <td>${n(e.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${e.id}" data-name="${o(e.name)}" data-desc="${o(e.description||``)}">
            Editar
          </button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${e.id}" data-name="${o(e.name)}">
            Eliminar
          </button>
        </td>
      </tr>`).join(``),t.querySelectorAll(`.btn-edit`).forEach(e=>{e.addEventListener(`click`,()=>this._startEdit({id:e.dataset.id,name:e.dataset.name,description:e.dataset.desc}))}),t.querySelectorAll(`.btn-delete`).forEach(e=>{e.addEventListener(`click`,()=>this._delete(e.dataset.id,e.dataset.name))})}},_bindSearch(){let e=document.getElementById(`tipos-search`);e&&e.addEventListener(`input`,()=>{let t=e.value.trim().toLowerCase(),n=t?c.filter(e=>e.name.toLowerCase().includes(t)||(e.description||``).toLowerCase().includes(t)):c;this._renderRows(n)})},_bindForm(){let e=document.getElementById(`form-tipo`);e&&(document.getElementById(`btn-tipo-cancel-edit`).addEventListener(`click`,()=>this._cancelEdit()),e.addEventListener(`submit`,async n=>{n.preventDefault();let i=document.getElementById(`tipo-name`).value.trim(),o=document.getElementById(`tipo-desc`).value.trim(),c=e.dataset.editId;if(!i){r(`tipo-name`,`El nombre es obligatorio`);return}let l=document.getElementById(`btn-tipo-submit`);l.disabled=!0;try{c?(await t(`PATCH`,`/api/instrument-types/${c}`,{name:i,description:o||null}),s(`Tipo "${i}" actualizado.`,`success`),this._cancelEdit(!0)):(await t(`POST`,`/api/instrument-types`,{name:i,description:o||null}),s(`Tipo "${i}" agregado.`,`success`),e.reset()),a(`instrument_types`),await this._loadList()}catch(e){s(e.code===`23505`?`El tipo "${i}" ya existe.`:`Error al guardar.`,`error`)}finally{l.disabled=!1}}))},_startEdit(e){let t=document.getElementById(`form-tipo`);document.getElementById(`tipo-form-title`).textContent=`Editar Tipo`,document.getElementById(`tipo-name`).value=e.name,document.getElementById(`tipo-desc`).value=e.description||``,document.getElementById(`btn-tipo-submit`).textContent=`Guardar cambios`,document.getElementById(`btn-tipo-cancel-edit`).style.display=``,t.dataset.editId=e.id,t.dataset.originalName=e.name,t.dataset.originalDesc=e.description||``,document.getElementById(`tipo-name`).focus(),t.scrollIntoView({behavior:`smooth`})},_cancelEdit(e=!1){if(!e){let e=document.getElementById(`form-tipo`);if((document.getElementById(`tipo-name`).value.trim()!==(e.dataset.originalName||``)||document.getElementById(`tipo-desc`).value.trim()!==(e.dataset.originalDesc||``))&&!confirm(`Tenés cambios sin guardar. ¿Descartarlos?`))return}document.getElementById(`tipo-form-title`).textContent=`Nuevo Tipo`,document.getElementById(`form-tipo`).reset(),document.getElementById(`btn-tipo-submit`).textContent=`+ Agregar`,document.getElementById(`btn-tipo-cancel-edit`).style.display=`none`,delete document.getElementById(`form-tipo`).dataset.editId},async _delete(e,n){if(await i({title:`Eliminar tipo "${n}"`,message:`Esta acción no se puede deshacer. Si tiene instrumentos asociados no se podrá eliminar.`}))try{await t(`DELETE`,`/api/instrument-types/${e}`),a(`instrument_types`),s(`Tipo "${n}" eliminado.`,`success`),await this._loadList()}catch(e){s(e.code===`23503`?`No se puede eliminar: tiene instrumentos asociados.`:`Error al eliminar.`,`error`)}},cleanup(){c=[]}};export{l as InstrumentTypesPage};
//# sourceMappingURL=instrument-types-qXz1MHf8.js.map