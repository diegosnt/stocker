import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'

async function postAlyc(name, cuit, website) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/alycs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ name, cuit, website })
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Error al guardar'), { code: json.error?.[0]?.code })
  return json.data
}

async function patchAlyc(id, name, cuit, website) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/alycs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ name, cuit, website })
  })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error('Error al actualizar'), { code: json.error?.[0]?.code })
  return json.data
}

export const AlycsPage = {
  async render() {
    const content = document.getElementById('page-content')
    content.innerHTML = `
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
            <button type="submit" class="btn btn-blue" id="btn-alyc-submit">Agregar</button>
            <button type="button" class="btn btn-ghost" id="btn-alyc-cancel-edit" style="display:none">Cancelar edición</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h3>ALyCs registradas</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CUIT</th>
                <th>Sitio web</th>
                <th>Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="alyc-tbody">
              <tr><td colspan="5" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
      </div>`

    await this._loadList()
    this._bindForm()
  },

  async _loadList() {
    const tbody = document.getElementById('alyc-tbody')
    if (!tbody) return

    const { data, error } = await supabase.from('alycs').select('*').order('name')

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar.</td></tr>`
      return
    }

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No hay ALyCs registradas. Agregá una arriba.</td></tr>`
      return
    }

    tbody.innerHTML = data.map(a => `
      <tr>
        <td><strong>${esc(a.name)}</strong></td>
        <td>${a.cuit ? esc(a.cuit) : '<span style="color:var(--color-muted)">—</span>'}</td>
        <td>${a.website
          ? `<a href="${esc(a.website)}" target="_blank" rel="noopener">${esc(a.website)}</a>`
          : '<span style="color:var(--color-muted)">—</span>'}</td>
        <td>${fmtDate(a.created_at)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-ghost btn-edit"
            data-id="${a.id}" data-name="${esc(a.name)}"
            data-cuit="${esc(a.cuit || '')}" data-website="${esc(a.website || '')}">
            Editar
          </button>
          <button class="btn btn-sm btn-red btn-delete" data-id="${a.id}" data-name="${esc(a.name)}">
            Eliminar
          </button>
        </td>
      </tr>`).join('')

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => this._startEdit({
        id: btn.dataset.id, name: btn.dataset.name,
        cuit: btn.dataset.cuit, website: btn.dataset.website
      }))
    })
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.id, btn.dataset.name))
    })
  },

  _bindForm() {
    const form = document.getElementById('form-alyc')
    if (!form) return

    document.getElementById('btn-alyc-cancel-edit').addEventListener('click', () => this._cancelEdit())

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const name    = document.getElementById('alyc-name').value.trim()
      const cuit    = document.getElementById('alyc-cuit').value.trim()
      const website = document.getElementById('alyc-website').value.trim()
      const editId  = form.dataset.editId

      if (!name) { showToast('El nombre es obligatorio.', 'error'); return }

      const btn = document.getElementById('btn-alyc-submit')
      btn.disabled = true

      try {
        if (editId) {
          await patchAlyc(editId, name, cuit || null, website || null)
          showToast(`ALyC "${name}" actualizada.`, 'success')
          this._cancelEdit()
        } else {
          await postAlyc(name, cuit || null, website || null)
          showToast(`ALyC "${name}" agregada.`, 'success')
          form.reset()
        }
        await this._loadList()
      } catch (err) {
        showToast(err.code === '23505' ? `La ALyC "${name}" ya existe.` : 'Error al guardar.', 'error')
      } finally {
        btn.disabled = false
      }
    })
  },

  _startEdit(record) {
    document.getElementById('alyc-form-title').textContent          = 'Editar ALyC'
    document.getElementById('alyc-name').value                      = record.name
    document.getElementById('alyc-cuit').value                      = record.cuit || ''
    document.getElementById('alyc-website').value                   = record.website || ''
    document.getElementById('btn-alyc-submit').textContent          = 'Guardar cambios'
    document.getElementById('btn-alyc-cancel-edit').style.display   = ''
    document.getElementById('form-alyc').dataset.editId             = record.id
    document.getElementById('alyc-name').focus()
    document.getElementById('form-alyc').scrollIntoView({ behavior: 'smooth' })
  },

  _cancelEdit() {
    document.getElementById('alyc-form-title').textContent          = 'Nueva ALyC'
    document.getElementById('form-alyc').reset()
    document.getElementById('btn-alyc-submit').textContent          = 'Agregar'
    document.getElementById('btn-alyc-cancel-edit').style.display   = 'none'
    delete document.getElementById('form-alyc').dataset.editId
  },

  async _delete(id, name) {
    if (!confirm(`¿Eliminar "${name}"?\nNo se puede eliminar si tiene operaciones registradas.`)) return

    const { error } = await supabase.from('alycs').delete().eq('id', id)

    if (error) {
      showToast(error.code === '23503' ? 'No se puede eliminar: tiene operaciones asociadas.' : 'Error al eliminar.', 'error')
      return
    }

    showToast(`ALyC "${name}" eliminada.`, 'success')
    await this._loadList()
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
