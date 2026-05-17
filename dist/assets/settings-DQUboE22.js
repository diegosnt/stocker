import{r as e,t}from"./api-client-Bj11K_ey.js";import{t as n}from"./index-Do264cmd.js";var r={async render(){let e=document.getElementById(`page-content`);e.innerHTML=`
      <div class="page-header">
        <h2>Configuración</h2>
      </div>

      <div class="settings-grid">
        <div class="card">
          <h3>Acceso</h3>
          <div id="settings-loading" class="settings-loading">
            <span class="spinner"></span> Cargando...
          </div>
          <div id="settings-content" style="display:none">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Registro de cuentas nuevas</div>
                <div class="setting-desc" id="settings-desc"></div>
                <div class="setting-meta" id="settings-meta"></div>
              </div>
              <button class="btn" id="btn-toggle-reg">—</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Interfaz</h3>
          <div id="badge-loading" class="settings-loading">
            <span class="spinner"></span> Cargando...
          </div>
          <div id="badge-content" style="display:none">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Indicador de mercado abierto/cerrado</div>
                <div class="setting-desc" id="badge-desc"></div>
                <div class="setting-meta" id="badge-meta"></div>
              </div>
              <button class="btn" id="btn-toggle-badge">—</button>
            </div>
          </div>
        </div>
      </div>`,await Promise.all([this._load(),this._loadMarketBadge()])},async _load(){let{data:t,error:n}=await e.from(`app_settings`).select(`*`).eq(`key`,`registration_enabled`).single();document.getElementById(`settings-loading`).style.display=`none`;let r=document.getElementById(`settings-content`);if(r.style.display=``,n||!t){r.innerHTML=`<p style="color:var(--color-danger)">Error al cargar la configuración.</p>`;return}this._renderState(t)},_renderState(e){let t=e.value===`true`,n=document.getElementById(`settings-desc`);n.textContent=t?`Habilitado — los usuarios pueden crear cuentas nuevas.`:`Deshabilitado — el registro de nuevas cuentas está cerrado.`,n.style.color=t?`var(--color-success)`:`var(--color-danger)`,document.getElementById(`settings-meta`).textContent=i(e);let r=document.getElementById(`btn-toggle-reg`);r.textContent=t?`Deshabilitar`:`Habilitar`,r.className=`btn btn-sm ${t?`btn-danger`:`btn-primary`}`,r.onclick=()=>this._toggle(!t)},async _toggle(r){let i=document.getElementById(`btn-toggle-reg`);i.disabled=!0;let{data:{session:a}}=await e.auth.getSession();try{let e=await t(`PATCH`,`/api/settings/registration_enabled`,{value:r?`true`:`false`,updated_by:a?.user?.email??null});n(`Registro ${r?`habilitado`:`deshabilitado`} correctamente.`,`success`),this._renderState(e.data??e)}catch{n(`Error al actualizar la configuración.`,`error`)}finally{i.disabled=!1}},async _loadMarketBadge(){let{data:t,error:n}=await e.from(`app_settings`).select(`*`).eq(`key`,`market_badge_enabled`).single();document.getElementById(`badge-loading`).style.display=`none`;let r=document.getElementById(`badge-content`);if(r.style.display=``,n||!t){r.innerHTML=`<p style="color:var(--color-danger)">Error al cargar la configuración.</p>`;return}this._renderMarketBadgeState(t)},_renderMarketBadgeState(e){let t=e.value===`true`,n=document.getElementById(`badge-desc`);n.textContent=t?`Visible — se muestra el estado del mercado en el análisis de tenencia.`:`Oculto — el indicador no aparece en el análisis de tenencia.`,n.style.color=t?`var(--color-success)`:`var(--text-muted)`,document.getElementById(`badge-meta`).textContent=i(e);let r=document.getElementById(`btn-toggle-badge`);r.textContent=t?`Ocultar`:`Mostrar`,r.className=`btn btn-sm ${t?`btn-ghost`:`btn-primary`}`,r.onclick=()=>this._toggleMarketBadge(!t)},async _toggleMarketBadge(r){let i=document.getElementById(`btn-toggle-badge`);i.disabled=!0;let{data:{session:a}}=await e.auth.getSession();try{let e=await t(`PATCH`,`/api/settings/market_badge_enabled`,{value:r?`true`:`false`,updated_by:a?.user?.email??null});n(`Indicador de mercado ${r?`activado`:`desactivado`}.`,`success`),this._renderMarketBadgeState(e.data??e)}catch{n(`Error al actualizar la configuración.`,`error`)}finally{i.disabled=!1}},cleanup(){}};function i(e){return e.updated_at?`Última modificación: ${new Date(e.updated_at).toLocaleString(`es-AR`,{day:`2-digit`,month:`2-digit`,year:`numeric`,hour:`2-digit`,minute:`2-digit`})}${e.updated_by?` por `+e.updated_by:``}`:``}export{r as SettingsPage};
//# sourceMappingURL=settings-DQUboE22.js.map