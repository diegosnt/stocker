import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { invalidate as cacheInvalidate } from '../cache.js'
import { esc, confirmModal, setFieldError } from '../utils.js'

let _alycsData    = []
let _alycSortCol  = 'name'
let _alycSortAsc  = true

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
            <button type="submit" class="btn btn-primary" id="btn-alyc-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="btn-alyc-cancel-edit" style="display:none">Cancelar edición</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="table-card-header">
          <h3>ALyCs registradas</h3>
          <input type="search" id="alyc-search" class="search-input" placeholder="Buscar por nombre, CUIT o sitio web...">
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th class="sortable" data-col="name">Nombre</th>
                <th class="sortable" data-col="cuit">CUIT</th>
                <th>Sitio web</th>
                <th class="sortable" data-col="created_at">Fecha alta</th>
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
    this._bindSearch()
    this._bindSortHeaders()
  },

  async _loadList() {
    const tbody = document.getElementById('alyc-tbody')
    if (!tbody) return

    const { data, error } = await supabase.from('alycs').select('*').order('name')

    if (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error al cargar.</td></tr>`
      return
    }

    _alycsData = data
    this._renderRows(this._sorted(data))
  },

  _renderRows(data) {
    const tbody = document.getElementById('alyc-tbody')
    if (!tbody) return

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
          <button class="btn btn-sm btn-danger btn-delete" data-id="${a.id}" data-name="${esc(a.name)}">
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

  _bindSearch() {
    const input = document.getElementById('alyc-search')
    if (!input) return
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase()
      const filtered = q
        ? _alycsData.filter(a =>
            a.name.toLowerCase().includes(q) ||
            (a.cuit || '').toLowerCase().includes(q) ||
            (a.website || '').toLowerCase().includes(q))
        : _alycsData
      this._renderRows(this._sorted(filtered))
    })
  },

  _sorted(data) {
    return [...data].sort((a, b) => {
      let va, vb
      if (_alycSortCol === 'name')       { va = a.name || '';       vb = b.name || '' }
      else if (_alycSortCol === 'cuit')  { va = a.cuit || '';       vb = b.cuit || '' }
      else if (_alycSortCol === 'created_at') { va = a.created_at; vb = b.created_at }
      else return 0
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return _alycSortAsc ? cmp : -cmp
    })
  },

  _bindSortHeaders() {
    document.querySelectorAll('th[data-col]').forEach(th => {
      if (!th.closest('table')?.querySelector('#alyc-tbody')) return
      th.addEventListener('click', () => {
        const col = th.dataset.col
        if (_alycSortCol === col) { _alycSortAsc = !_alycSortAsc }
        else { _alycSortCol = col; _alycSortAsc = col !== 'created_at' }
        this._updateSortHeaders()
        const q = document.getElementById('alyc-search')?.value.trim().toLowerCase() || ''
        const visible = q
          ? _alycsData.filter(a => a.name.toLowerCase().includes(q) || (a.cuit || '').toLowerCase().includes(q) || (a.website || '').toLowerCase().includes(q))
          : _alycsData
        this._renderRows(this._sorted(visible))
      })
    })
    this._updateSortHeaders()
  },

  _updateSortHeaders() {
    document.querySelectorAll('th[data-col]').forEach(th => {
      if (!th.closest('table')?.querySelector('#alyc-tbody')) return
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === _alycSortCol) th.classList.add(_alycSortAsc ? 'sort-asc' : 'sort-desc')
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

      if (!name) { setFieldError('alyc-name', 'El nombre es obligatorio'); return }

      const btn = document.getElementById('btn-alyc-submit')
      btn.disabled = true

      try {
        if (editId) {
          await apiRequest('PATCH', `/api/alycs/${editId}`, { name, cuit: cuit || null, website: website || null })
          showToast(`ALyC "${name}" actualizada.`, 'success')
          this._cancelEdit(true)
        } else {
          await apiRequest('POST', '/api/alycs', { name, cuit: cuit || null, website: website || null })
          showToast(`ALyC "${name}" agregada.`, 'success')
          form.reset()
        }
        cacheInvalidate('alycs')
        await this._loadList()
      } catch (err) {
        showToast(err.code === '23505' ? `La ALyC "${name}" ya existe.` : 'Error al guardar.', 'error')
      } finally {
        btn.disabled = false
      }
    })
  },

  _startEdit(record) {
    const form = document.getElementById('form-alyc')
    document.getElementById('alyc-form-title').textContent        = 'Editar ALyC'
    document.getElementById('alyc-name').value                    = record.name
    document.getElementById('alyc-cuit').value                    = record.cuit || ''
    document.getElementById('alyc-website').value                 = record.website || ''
    document.getElementById('btn-alyc-submit').textContent        = 'Guardar cambios'
    document.getElementById('btn-alyc-cancel-edit').style.display = ''
    form.dataset.editId          = record.id
    form.dataset.originalName    = record.name
    form.dataset.originalCuit    = record.cuit || ''
    form.dataset.originalWebsite = record.website || ''
    document.getElementById('alyc-name').focus()
    form.scrollIntoView({ behavior: 'smooth' })
  },

  _cancelEdit(confirmed = false) {
    if (!confirmed) {
      const form    = document.getElementById('form-alyc')
      const isDirty = document.getElementById('alyc-name').value.trim()    !== (form.dataset.originalName    || '') ||
                      document.getElementById('alyc-cuit').value.trim()    !== (form.dataset.originalCuit    || '') ||
                      document.getElementById('alyc-website').value.trim() !== (form.dataset.originalWebsite || '')
      if (isDirty && !confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return
    }
    document.getElementById('alyc-form-title').textContent          = 'Nueva ALyC'
    document.getElementById('form-alyc').reset()
    document.getElementById('btn-alyc-submit').textContent          = '+ Agregar'
    document.getElementById('btn-alyc-cancel-edit').style.display   = 'none'
    delete document.getElementById('form-alyc').dataset.editId
  },

  async _delete(id, name) {
    const ok = await confirmModal({
      title: `Eliminar "${name}"`,
      message: 'Esta acción no se puede deshacer. No se puede eliminar si tiene operaciones registradas.'
    })
    if (!ok) return

    try {
      await apiRequest('DELETE', `/api/alycs/${id}`)
      cacheInvalidate('alycs')
      showToast(`ALyC "${name}" eliminada.`, 'success')
      await this._loadList()
    } catch (err) {
      showToast(err.code === '23503' ? 'No se puede eliminar: tiene operaciones asociadas.' : 'Error al eliminar.', 'error')
    }
  }
}


function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
