import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { downloadFullBackup, downloadOperationsMarkdown } from './settings/backup.js'

export const SettingsPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Configuración</h2>
      </div>

      <div class="settings-grid">
        <div class="card">
          <h3>Acceso</h3>
          <div id="settings-loading" class="setting-row">
            <div class="setting-info">
              <div class="skeleton" style="height:14px; width:180px; margin-bottom:0.4rem"></div>
              <div class="skeleton" style="height:12px; width:260px"></div>
            </div>
            <div class="skeleton" style="height:32px; width:100px; flex-shrink:0"></div>
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
          <div id="badge-loading" class="setting-row">
            <div class="setting-info">
              <div class="skeleton" style="height:14px; width:220px; margin-bottom:0.4rem"></div>
              <div class="skeleton" style="height:12px; width:260px"></div>
            </div>
            <div class="skeleton" style="height:32px; width:100px; flex-shrink:0"></div>
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

        <div class="card">
          <h3>Copia de seguridad</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Backup completo de tus datos</div>
              <div class="setting-desc">
                Descarga un archivo JSON con todas tus operaciones, instrumentos, tipos de instrumento y ALyCs.
                Guardalo en un lugar seguro para poder recargar tus operaciones si perdés el acceso o se borran los datos.
              </div>
            </div>
            <button class="btn btn-sm" id="btn-download-backup">Descargar backup</button>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Operaciones en tabla (Markdown)</div>
              <div class="setting-desc">
                Descarga todas tus operaciones como una tabla Markdown, para revisar o compartir un resumen legible.
              </div>
            </div>
            <button class="btn btn-sm" id="btn-download-md">Descargar Markdown</button>
          </div>
        </div>
      </div>`

    document.getElementById('btn-download-backup').addEventListener('click', (e) => {
      downloadFullBackup(e.currentTarget)
    })
    document.getElementById('btn-download-md').addEventListener('click', (e) => {
      downloadOperationsMarkdown(e.currentTarget)
    })

    await Promise.all([this._load(), this._loadMarketBadge()])
  },

  // ── Registro ──────────────────────────────────────────────
  async _load() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'registration_enabled')
      .single()

    document.getElementById('settings-loading').style.display = 'none'
    const settingsContent = document.getElementById('settings-content')
    settingsContent.style.display = ''

    if (error || !data) {
      settingsContent.innerHTML = '<p style="color:var(--color-danger)">Error al cargar la configuración.</p>'
      return
    }

    this._renderState(data)
  },

  _renderState(data) {
    const enabled = data.value === 'true'

    const desc = document.getElementById('settings-desc')
    desc.textContent = enabled
      ? 'Habilitado — los usuarios pueden crear cuentas nuevas.'
      : 'Deshabilitado — el registro de nuevas cuentas está cerrado.'
    desc.style.color = enabled ? 'var(--color-success)' : 'var(--color-danger)'

    document.getElementById('settings-meta').textContent = _fmtMeta(data)

    const btn = document.getElementById('btn-toggle-reg')
    btn.textContent = enabled ? 'Deshabilitar' : 'Habilitar'
    btn.className   = `btn btn-sm ${enabled ? 'btn-danger' : 'btn-primary'}`
    btn.onclick     = () => this._toggle(!enabled)
  },

  async _toggle(newEnabled) {
    const btn = document.getElementById('btn-toggle-reg')
    btn.disabled = true

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const result = await apiRequest('PATCH', '/api/settings/registration_enabled', {
        value:      newEnabled ? 'true' : 'false',
        updated_by: session?.user?.email ?? null
      })
      showToast(`Registro ${newEnabled ? 'habilitado' : 'deshabilitado'} correctamente.`, 'success')
      this._renderState(result.data ?? result)
    } catch {
      showToast('Error al actualizar la configuración.', 'error')
    } finally {
      btn.disabled = false
    }
  },

  // ── Indicador de mercado ──────────────────────────────────
  async _loadMarketBadge() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'market_badge_enabled')
      .single()

    document.getElementById('badge-loading').style.display = 'none'
    const badgeContent = document.getElementById('badge-content')
    badgeContent.style.display = ''

    if (error || !data) {
      badgeContent.innerHTML = '<p style="color:var(--color-danger)">Error al cargar la configuración.</p>'
      return
    }

    this._renderMarketBadgeState(data)
  },

  _renderMarketBadgeState(data) {
    const enabled = data.value === 'true'

    const desc = document.getElementById('badge-desc')
    desc.textContent = enabled
      ? 'Visible — se muestra el estado del mercado en el análisis de tenencia.'
      : 'Oculto — el indicador no aparece en el análisis de tenencia.'
    desc.style.color = enabled ? 'var(--color-success)' : 'var(--text-muted)'

    document.getElementById('badge-meta').textContent = _fmtMeta(data)

    const btn = document.getElementById('btn-toggle-badge')
    btn.textContent = enabled ? 'Ocultar' : 'Mostrar'
    btn.className   = `btn btn-sm ${enabled ? 'btn-ghost' : 'btn-primary'}`
    btn.onclick     = () => this._toggleMarketBadge(!enabled)
  },

  async _toggleMarketBadge(newEnabled) {
    const btn = document.getElementById('btn-toggle-badge')
    btn.disabled = true

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const result = await apiRequest('PATCH', '/api/settings/market_badge_enabled', {
        value:      newEnabled ? 'true' : 'false',
        updated_by: session?.user?.email ?? null
      })
      showToast(`Indicador de mercado ${newEnabled ? 'activado' : 'desactivado'}.`, 'success')
      this._renderMarketBadgeState(result.data ?? result)
    } catch {
      showToast('Error al actualizar la configuración.', 'error')
    } finally {
      btn.disabled = false
    }
  },

  cleanup() {
  }
}

function _fmtMeta(data) {
  if (!data.updated_at) return ''
  const when = new Date(data.updated_at).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  return `Última modificación: ${when}${data.updated_by ? ' por ' + data.updated_by : ''}`
}
