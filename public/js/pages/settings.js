import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { apiRequest } from '../api-client.js'

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
      </div>`

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
