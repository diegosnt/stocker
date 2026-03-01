import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { apiRequest } from '../api-client.js'

let _tiposData = []

export const InstrumentTypesPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
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
            <button type="submit" class="btn btn-blue" id="btn-tipo-submit">Agregar</button>
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
      </div>`

    await this._loadList()
    this._bindForm()
    this._bindSearch()
  },

  async _loadList() {
    const tbody = document.getElementById('tipos-tbody')
    if (!tbody) return

    const { data, error } = await supabase
      .from('instrument_types')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Error al cargar datos.</td></tr>`
      return
    }

    _tiposData = data
    this._renderRows(data)
  },

  _renderRows(data) {
    const tbody = document.getElementById('tipos-tbody')
    if (!tbody) return

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No hay tipos registrados. Agregá uno arriba.</td></tr>`
      return
    }

    tbody.innerHTML = data.map(t => `
      <tr>
        <td><strong>${esc(t.name)}</strong></td>
        <td>${t.description ? esc(t.description) : '<span style="color:var(--color-muted)">—</span>'}</td>
        <td>${fmtDate(t.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${t.id}" data-name="${esc(t.name)}" data-desc="${esc(t.description || '')}">
            Editar
          </button>
          <button class="btn btn-sm btn-red btn-delete" data-id="${t.id}" data-name="${esc(t.name)}">
            Eliminar
          </button>
        </td>
      </tr>`).join('')

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => this._startEdit({
        id: btn.dataset.id, name: btn.dataset.name, description: btn.dataset.desc
      }))
    })
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.id, btn.dataset.name))
    })
  },

  _bindSearch() {
    const input = document.getElementById('tipos-search')
    if (!input) return
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase()
      const filtered = q
        ? _tiposData.filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q))
        : _tiposData
      this._renderRows(filtered)
    })
  },

  _bindForm() {
    const form = document.getElementById('form-tipo')
    if (!form) return

    document.getElementById('btn-tipo-cancel-edit').addEventListener('click', () => this._cancelEdit())

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const name   = document.getElementById('tipo-name').value.trim()
      const desc   = document.getElementById('tipo-desc').value.trim()
      const editId = form.dataset.editId

      if (!name) { showToast('El nombre es obligatorio.', 'error'); return }

      const btn = document.getElementById('btn-tipo-submit')
      btn.disabled = true

      try {
        if (editId) {
          await apiRequest('PATCH', `/api/instrument-types/${editId}`, { name, description: desc || null })
          showToast(`Tipo "${name}" actualizado.`, 'success')
          this._cancelEdit(true)
        } else {
          await apiRequest('POST', '/api/instrument-types', { name, description: desc || null })
          showToast(`Tipo "${name}" agregado.`, 'success')
          form.reset()
        }
        await this._loadList()
      } catch (err) {
        showToast(err.code === '23505' ? `El tipo "${name}" ya existe.` : 'Error al guardar.', 'error')
      } finally {
        btn.disabled = false
      }
    })
  },

  _startEdit(record) {
    const form = document.getElementById('form-tipo')
    document.getElementById('tipo-form-title').textContent        = 'Editar Tipo'
    document.getElementById('tipo-name').value                    = record.name
    document.getElementById('tipo-desc').value                    = record.description || ''
    document.getElementById('btn-tipo-submit').textContent        = 'Guardar cambios'
    document.getElementById('btn-tipo-cancel-edit').style.display = ''
    form.dataset.editId       = record.id
    form.dataset.originalName = record.name
    form.dataset.originalDesc = record.description || ''
    document.getElementById('tipo-name').focus()
    form.scrollIntoView({ behavior: 'smooth' })
  },

  _cancelEdit(confirmed = false) {
    if (!confirmed) {
      const form    = document.getElementById('form-tipo')
      const isDirty = document.getElementById('tipo-name').value.trim() !== (form.dataset.originalName || '') ||
                      document.getElementById('tipo-desc').value.trim() !== (form.dataset.originalDesc || '')
      if (isDirty && !confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return
    }
    document.getElementById('tipo-form-title').textContent        = 'Nuevo Tipo'
    document.getElementById('form-tipo').reset()
    document.getElementById('btn-tipo-submit').textContent        = 'Agregar'
    document.getElementById('btn-tipo-cancel-edit').style.display = 'none'
    delete document.getElementById('form-tipo').dataset.editId
  },

  async _delete(id, name) {
    if (!confirm(`¿Eliminar el tipo "${name}"?\nSi tiene instrumentos asociados no se podrá eliminar.`)) return

    try {
      await apiRequest('DELETE', `/api/instrument-types/${id}`)
      showToast(`Tipo "${name}" eliminado.`, 'success')
      await this._loadList()
    } catch (err) {
      showToast(err.code === '23503' ? 'No se puede eliminar: tiene instrumentos asociados.' : 'Error al eliminar.', 'error')
    }
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
