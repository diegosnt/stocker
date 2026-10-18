import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { downloadFullBackup, downloadOperationsMarkdown } from './settings/backup.js'
import { esc } from '../utils.js'
import { getHiddenAlycSet, toggleAlycVisibility } from '../alyc-visibility.js'

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

        <div class="card" id="card-alycs-visibility">
          <h3>Visibilidad de ALyCs</h3>
          <p class="setting-desc" style="color:var(--text-muted); margin-bottom:1rem">
            Seleccioná qué ALyCs querés ver u ocultar. Las ALyCs ocultas se excluyen de todos los totales, gráficos y cálculos del Dashboard, y dejan de estar disponibles en los selectores. No se eliminan datos ni operaciones.
          </p>
          <div id="alycs-vis-loading" class="setting-row">
            <div class="setting-info">
              <div class="skeleton" style="height:14px; width:180px; margin-bottom:0.4rem"></div>
              <div class="skeleton" style="height:12px; width:260px"></div>
            </div>
            <div class="skeleton" style="height:32px; width:90px; flex-shrink:0"></div>
          </div>
          <div id="alycs-vis-content" style="display:none; flex-direction:column; gap:0.75rem"></div>
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

        <div class="card">
          <h3>Dólar MEP histórico</h3>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Completar MEP en operaciones anteriores</div>
              <div class="setting-desc">
                Guarda en cada operación en pesos que todavía no lo tenga el dólar MEP del día en que se hizo,
                para calcular el rendimiento real en dólares. Las operaciones anteriores a octubre de 2018 no tienen
                cotización disponible: podés cargarla a mano editando la operación.
              </div>
            </div>
            <button class="btn btn-sm" id="btn-backfill-mep">Completar MEP</button>
          </div>
        </div>
      </div>`

    document.getElementById('btn-download-backup').addEventListener('click', (e) => {
      downloadFullBackup(e.currentTarget)
    })
    document.getElementById('btn-download-md').addEventListener('click', (e) => {
      downloadOperationsMarkdown(e.currentTarget)
    })

    document.getElementById('btn-backfill-mep').addEventListener('click', (e) => {
      this._backfillMep(e.currentTarget)
    })

    await Promise.all([this._load(), this._loadMarketBadge(), this._loadAlycsVisibility()])
  },

  async _backfillMep(btn) {
    const label = btn.textContent
    btn.disabled = true
    btn.textContent = 'Completando...'
    try {
      const { updated, missing } = await apiRequest('POST', '/api/operations/backfill-usd-rate')
      if (!updated && !missing) {
        showToast('Todas las operaciones en pesos ya tienen dólar MEP.', 'success')
      } else {
        const extra = missing ? ` ${missing} quedaron sin cotización (anteriores a la serie histórica).` : ''
        showToast(`Se completó el dólar MEP en ${updated} operaciones.${extra}`, missing ? 'warning' : 'success')
      }
    } catch {
      showToast('No se pudo completar el dólar MEP. Intentá de nuevo más tarde.', 'error')
    } finally {
      btn.disabled = false
      btn.textContent = label
    }
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

  // ── Visibilidad de ALyCs ─────────────────────────────────
  async _loadAlycsVisibility() {
    const loading = document.getElementById('alycs-vis-loading')
    const container = document.getElementById('alycs-vis-content')
    if (!loading || !container) return

    const { data: alycs, error } = await supabase
      .from('alycs')
      .select('id, name, cuit')
      .order('name')

    loading.style.display = 'none'
    container.style.display = 'flex'

    if (error) {
      container.innerHTML = '<p style="color:var(--color-danger)">Error al cargar las ALyCs.</p>'
      return
    }

    if (!alycs || alycs.length === 0) {
      container.innerHTML = '<p class="setting-desc" style="color:var(--text-muted)">No tenés ALyCs registradas. Podés agregar una en <a href="#alycs" style="color:var(--color-primary)">ALyCs / Brokers</a>.</p>'
      return
    }

    const hiddenSet = getHiddenAlycSet()

    container.innerHTML = alycs.map(a => {
      const isVisible = !hiddenSet.has(String(a.id))
      return `
        <div class="setting-row alyc-vis-item" data-alyc-id="${a.id}" style="padding-bottom:0.6rem; border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.06))">
          <div class="setting-info">
            <div class="setting-label">
              <strong>${esc(a.name)}</strong>
              ${a.cuit ? `<span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.4rem">(${esc(a.cuit)})</span>` : ''}
            </div>
            <div class="setting-desc" id="alyc-vis-desc-${a.id}" style="color:${isVisible ? 'var(--color-success)' : 'var(--text-muted)'}">
              ${isVisible ? 'Visible — incluida en cálculos del Dashboard y selectores.' : 'Oculta — excluida de totales, gráficos y selectores.'}
            </div>
          </div>
          <button class="btn btn-sm ${isVisible ? 'btn-ghost' : 'btn-primary'} btn-toggle-alyc-vis"
            data-id="${a.id}" data-name="${esc(a.name)}">
            ${isVisible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>`
    }).join('')

    container.querySelectorAll('.btn-toggle-alyc-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        const name = btn.dataset.name
        const nowVisible = toggleAlycVisibility(id)

        btn.textContent = nowVisible ? 'Ocultar' : 'Mostrar'
        btn.className = `btn btn-sm ${nowVisible ? 'btn-ghost' : 'btn-primary'} btn-toggle-alyc-vis`

        const desc = document.getElementById(`alyc-vis-desc-${id}`)
        if (desc) {
          desc.textContent = nowVisible
            ? 'Visible — incluida en cálculos del Dashboard y selectores.'
            : 'Oculta — excluida de totales, gráficos y selectores.'
          desc.style.color = nowVisible ? 'var(--color-success)' : 'var(--text-muted)'
        }

        showToast(`ALyC "${name}" ${nowVisible ? 'ahora es visible' : 'ocultada del dashboard'}.`, 'success')
      })
    })
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
