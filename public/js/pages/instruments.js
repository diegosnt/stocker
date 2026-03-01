import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { apiRequest } from '../api-client.js'

let _instrData = []

export const InstrumentsPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Instrumentos</h2>
      </div>

      <div class="card">
        <h3 id="inst-form-title">Nuevo Instrumento</h3>
        <form id="form-instrumento" novalidate>
          <div class="form-row">
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
            <button type="submit" class="btn btn-blue" id="btn-inst-submit">Agregar</button>
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
                <th>Ticker</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="inst-tbody">
              <tr><td colspan="5" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
      </div>`

    try {
      await Promise.all([this._loadTypes(), this._loadList()])
    } catch {
      showToast('Error al cargar los datos. Intentá recargar la página.', 'error')
    }
    this._bindForm()
    this._bindSearch()
  },

  async _loadTypes(selectedId = null) {
    const sel = document.getElementById('inst-type')
    if (!sel) return

    const { data } = await supabase.from('instrument_types').select('id, name').order('name')

    if (!data?.length) {
      sel.innerHTML = '<option value="">— Sin tipos (creá uno primero) —</option>'
      return
    }

    sel.innerHTML = '<option value="">— Seleccioná un tipo —</option>' +
      data.map(t => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')
  },

  async _loadList() {
    const tbody = document.getElementById('inst-tbody')
    if (!tbody) return

    const { data, error } = await supabase
      .from('instruments')
      .select('*, instrument_types(name)')
      .order('ticker')

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar.</td></tr>`
      return
    }

    _instrData = data
    this._renderRows(data)
  },

  _renderRows(data) {
    const tbody = document.getElementById('inst-tbody')
    if (!tbody) return

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No hay instrumentos. Agregá uno arriba.</td></tr>`
      return
    }

    tbody.innerHTML = data.map(i => `
      <tr>
        <td><span class="ticker-chip">${esc(i.ticker)}</span></td>
        <td>${esc(i.name)}</td>
        <td>${i.instrument_types ? esc(i.instrument_types.name) : '—'}</td>
        <td>${fmtDate(i.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${i.id}" data-ticker="${esc(i.ticker)}" data-name="${esc(i.name)}"
            data-type-id="${i.instrument_type_id}">
            Editar
          </button>
          <button class="btn btn-sm btn-red btn-delete" data-id="${i.id}" data-name="${esc(i.ticker)}">
            Eliminar
          </button>
        </td>
      </tr>`).join('')

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => this._startEdit({
        id: btn.dataset.id, ticker: btn.dataset.ticker,
        name: btn.dataset.name, instrument_type_id: btn.dataset.typeId
      }))
    })
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.id, btn.dataset.name))
    })
  },

  _bindSearch() {
    const input = document.getElementById('inst-search')
    if (!input) return
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase()
      const filtered = q
        ? _instrData.filter(i =>
            i.ticker.toLowerCase().includes(q) ||
            i.name.toLowerCase().includes(q) ||
            (i.instrument_types?.name || '').toLowerCase().includes(q))
        : _instrData
      this._renderRows(filtered)
    })
  },

  _bindForm() {
    const form = document.getElementById('form-instrumento')
    if (!form) return

    const tickerInput = document.getElementById('inst-ticker')
    tickerInput.addEventListener('input', () => { tickerInput.value = tickerInput.value.toUpperCase() })

    document.getElementById('btn-inst-cancel-edit').addEventListener('click', () => this._cancelEdit())

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const ticker = document.getElementById('inst-ticker').value.trim().toUpperCase()
      const name   = document.getElementById('inst-name').value.trim()
      const typeId = document.getElementById('inst-type').value
      const editId = form.dataset.editId

      if (!ticker || !name || !typeId) { showToast('Ticker, nombre y tipo son obligatorios.', 'error'); return }

      const btn = document.getElementById('btn-inst-submit')
      btn.disabled = true

      try {
        if (editId) {
          await apiRequest('PATCH', `/api/instruments/${editId}`, { ticker, name, instrument_type_id: typeId })
          showToast(`Instrumento "${ticker}" actualizado.`, 'success')
          this._cancelEdit(true)
        } else {
          await apiRequest('POST', '/api/instruments', { ticker, name, instrument_type_id: typeId })
          showToast(`Instrumento "${ticker}" agregado.`, 'success')
          form.reset()
        }
        await this._loadList()
      } catch (err) {
        showToast(err.code === '23505' ? `El ticker "${ticker}" ya existe.` : 'Error al guardar.', 'error')
      } finally {
        btn.disabled = false
      }
    })
  },

  async _startEdit(record) {
    await this._loadTypes(record.instrument_type_id)
    const form = document.getElementById('form-instrumento')
    document.getElementById('inst-form-title').textContent        = 'Editar Instrumento'
    document.getElementById('inst-ticker').value                  = record.ticker
    document.getElementById('inst-name').value                    = record.name
    document.getElementById('btn-inst-submit').textContent        = 'Guardar cambios'
    document.getElementById('btn-inst-cancel-edit').style.display = ''
    form.dataset.editId         = record.id
    form.dataset.originalTicker = record.ticker
    form.dataset.originalName   = record.name
    form.dataset.originalTypeId = record.instrument_type_id
    document.getElementById('inst-ticker').focus()
    form.scrollIntoView({ behavior: 'smooth' })
  },

  _cancelEdit(confirmed = false) {
    if (!confirmed) {
      const form    = document.getElementById('form-instrumento')
      const isDirty = document.getElementById('inst-ticker').value.trim() !== (form.dataset.originalTicker || '') ||
                      document.getElementById('inst-name').value.trim()   !== (form.dataset.originalName   || '') ||
                      document.getElementById('inst-type').value          !== (form.dataset.originalTypeId || '')
      if (isDirty && !confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return
    }
    document.getElementById('inst-form-title').textContent          = 'Nuevo Instrumento'
    document.getElementById('form-instrumento').reset()
    document.getElementById('btn-inst-submit').textContent          = 'Agregar'
    document.getElementById('btn-inst-cancel-edit').style.display   = 'none'
    delete document.getElementById('form-instrumento').dataset.editId
    this._loadTypes()
  },

  async _delete(id, ticker) {
    if (!confirm(`¿Eliminar "${ticker}"?\nNo se puede eliminar si tiene operaciones registradas.`)) return

    try {
      await apiRequest('DELETE', `/api/instruments/${id}`)
      showToast(`Instrumento "${ticker}" eliminado.`, 'success')
      await this._loadList()
    } catch (err) {
      showToast(err.code === '23503' ? 'No se puede eliminar: tiene operaciones asociadas.' : 'Error al eliminar.', 'error')
    }
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
