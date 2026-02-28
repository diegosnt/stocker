import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'

async function postInstrumentType(name, description) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/instrument-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ name, description })
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Error al guardar'), { code: json.error?.[0]?.code })
  return json.data
}

async function patchInstrumentType(id, name, description) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/instrument-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ name, description })
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Error al actualizar'), { code: json.error?.[0]?.code })
  return json.data
}

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
        <h3>Tipos registrados</h3>
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
          await patchInstrumentType(editId, name, desc || null)
          showToast(`Tipo "${name}" actualizado.`, 'success')
          this._cancelEdit()
        } else {
          await postInstrumentType(name, desc || null)
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
    document.getElementById('tipo-form-title').textContent      = 'Editar Tipo'
    document.getElementById('tipo-name').value                  = record.name
    document.getElementById('tipo-desc').value                  = record.description || ''
    document.getElementById('btn-tipo-submit').textContent      = 'Guardar cambios'
    document.getElementById('btn-tipo-cancel-edit').style.display = ''
    document.getElementById('form-tipo').dataset.editId         = record.id
    document.getElementById('tipo-name').focus()
    document.getElementById('form-tipo').scrollIntoView({ behavior: 'smooth' })
  },

  _cancelEdit() {
    document.getElementById('tipo-form-title').textContent        = 'Nuevo Tipo'
    document.getElementById('form-tipo').reset()
    document.getElementById('btn-tipo-submit').textContent        = 'Agregar'
    document.getElementById('btn-tipo-cancel-edit').style.display = 'none'
    delete document.getElementById('form-tipo').dataset.editId
  },

  async _delete(id, name) {
    if (!confirm(`¿Eliminar el tipo "${name}"?\nSi tiene instrumentos asociados no se podrá eliminar.`)) return

    const { error } = await supabase.from('instrument_types').delete().eq('id', id)

    if (error) {
      showToast(error.code === '23503' ? 'No se puede eliminar: tiene instrumentos asociados.' : 'Error al eliminar.', 'error')
      return
    }

    showToast(`Tipo "${name}" eliminado.`, 'success')
    await this._loadList()
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
