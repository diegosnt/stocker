import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'

export const SettingsPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Configuración</h2>
      </div>

      <div class="card" style="max-width:520px">
        <h3>Registro de nuevos usuarios</h3>
        <div id="settings-loading" style="color:var(--color-muted);font-size:.9rem">
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
      </div>`

    await this._load()
  },

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

    document.getElementById('settings-desc').textContent = enabled
      ? 'Habilitado — los usuarios pueden crear cuentas nuevas.'
      : 'Deshabilitado — el registro de nuevas cuentas está cerrado.'
    document.getElementById('settings-desc').style.color = enabled
      ? 'var(--color-success)'
      : 'var(--color-danger)'

    if (data.updated_at) {
      const when = new Date(data.updated_at).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
      document.getElementById('settings-meta').textContent =
        `Última modificación: ${when}${data.updated_by ? ' por ' + data.updated_by : ''}`
    } else {
      document.getElementById('settings-meta').textContent = ''
    }

    const btn = document.getElementById('btn-toggle-reg')
    btn.textContent = enabled ? 'Deshabilitar registro' : 'Habilitar registro'
    btn.className   = `btn ${enabled ? 'btn-danger' : 'btn-primary'}`
    btn.onclick     = () => this._toggle(!enabled)
  },

  async _toggle(newEnabled) {
    const btn = document.getElementById('btn-toggle-reg')
    btn.disabled = true

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/settings/registration_enabled', {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`
      },
      body: JSON.stringify({
        value:      newEnabled ? 'true' : 'false',
        updated_by: session?.user?.email ?? null
      })
    })

    if (!res.ok) {
      showToast('Error al actualizar la configuración.', 'error')
      btn.disabled = false
      return
    }

    const json = await res.json()
    showToast(
      `Registro ${newEnabled ? 'habilitado' : 'deshabilitado'} correctamente.`,
      'success'
    )
    this._renderState(json.data)
    btn.disabled = false
  }
}
