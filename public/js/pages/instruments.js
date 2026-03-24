import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { invalidate as cacheInvalidate } from '../cache.js'
import { esc, confirmModal, setFieldError } from '../utils.js'

const PAGE_SIZE   = 10

let _instrData    = []
let _instrSortCol = 'ticker'
let _instrSortAsc = true
let _instrPage    = 0
let _instrVisible = []   // datos filtrados + ordenados actualmente visibles

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
          <div class="form-row form-row-3">
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
            <button type="submit" class="btn btn-primary" id="btn-inst-submit">+ Agregar</button>
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
                <th class="sortable" data-col="ticker">Ticker</th>
                <th class="sortable" data-col="name">Nombre</th>
                <th class="sortable" data-col="type">Tipo</th>
                <th class="sortable" data-col="created_at">Fecha alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="inst-tbody">
              <tr><td colspan="5" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
        <div id="inst-pagination"></div>
      </div>`

    try {
      await Promise.all([this._loadTypes(), this._loadList()])
    } catch {
      showToast('Error al cargar los datos. Intentá recargar la página.', 'error')
    }
    this._bindForm()
    this._bindSearch()
    this._bindSortHeaders()
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

    _instrData    = data
    _instrPage    = 0
    _instrVisible = this._sorted(data)
    this._renderRows()
  },

  _sorted(data) {
    return [...data].sort((a, b) => {
      let va, vb
      if (_instrSortCol === 'ticker')      { va = a.ticker;                           vb = b.ticker }
      else if (_instrSortCol === 'name')   { va = a.name;                             vb = b.name }
      else if (_instrSortCol === 'type')   { va = a.instrument_types?.name ?? '';     vb = b.instrument_types?.name ?? '' }
      else if (_instrSortCol === 'created_at') { va = a.created_at;                  vb = b.created_at }
      else return 0
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
      return _instrSortAsc ? cmp : -cmp
    })
  },

  _bindSortHeaders() {
    document.querySelectorAll('#inst-tbody').forEach(() => {})  // ensure DOM ready
    document.querySelectorAll('th[data-col]').forEach(th => {
      if (!th.closest('table')?.querySelector('#inst-tbody')) return
      th.addEventListener('click', () => {
        const col = th.dataset.col
        if (_instrSortCol === col) { _instrSortAsc = !_instrSortAsc }
        else { _instrSortCol = col; _instrSortAsc = col !== 'created_at' }
        this._updateSortHeaders()
        const q = document.getElementById('inst-search')?.value.trim().toLowerCase() || ''
        const filtered = q
          ? _instrData.filter(i => i.ticker.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.instrument_types?.name || '').toLowerCase().includes(q))
          : _instrData
        _instrPage    = 0
        _instrVisible = this._sorted(filtered)
        this._renderRows()
      })
    })
    this._updateSortHeaders()
  },

  _updateSortHeaders() {
    document.querySelectorAll('th[data-col]').forEach(th => {
      if (!th.closest('table')?.querySelector('#inst-tbody')) return
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === _instrSortCol) th.classList.add(_instrSortAsc ? 'sort-asc' : 'sort-desc')
    })
  },

  _renderRows() {
    const tbody = document.getElementById('inst-tbody')
    if (!tbody) return

    if (!_instrVisible.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No hay instrumentos. Agregá uno arriba.</td></tr>`
      this._renderPagination()
      return
    }

    const start = _instrPage * PAGE_SIZE
    const page  = _instrVisible.slice(start, start + PAGE_SIZE)

    tbody.innerHTML = page.map(i => `
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
          <button class="btn btn-sm btn-danger btn-delete" data-id="${i.id}" data-name="${esc(i.ticker)}">
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

    this._renderPagination()
  },

  _renderPagination() {
    const container = document.getElementById('inst-pagination')
    if (!container) return

    const total      = _instrVisible.length
    const totalPages = Math.ceil(total / PAGE_SIZE)

    if (totalPages <= 1) { container.innerHTML = ''; return }

    const from  = _instrPage * PAGE_SIZE + 1
    const to    = Math.min((_instrPage + 1) * PAGE_SIZE, total)
    const pages = _buildPageRange(_instrPage, totalPages)

    const pageButtons = pages.map(p =>
      p === '...'
        ? `<span class="pag-ellipsis">…</span>`
        : `<button class="btn btn-sm ${p === _instrPage ? 'btn-primary pag-active' : 'btn-ghost'} pag-num" data-page="${p}">${p + 1}</button>`
    ).join('')

    container.innerHTML = `
      <div class="pagination">
        <button class="btn btn-sm btn-ghost" id="btn-inst-prev" ${_instrPage === 0 ? 'disabled' : ''}>←</button>
        <div class="pag-pages">${pageButtons}</div>
        <button class="btn btn-sm btn-ghost" id="btn-inst-next" ${_instrPage >= totalPages - 1 ? 'disabled' : ''}>→</button>
        <span class="pag-info">Mostrando ${from}–${to} de ${total}</span>
      </div>`

    container.querySelectorAll('.pag-num').forEach(btn => {
      btn.addEventListener('click', () => { _instrPage = parseInt(btn.dataset.page, 10); this._renderRows() })
    })
    if (_instrPage > 0) {
      document.getElementById('btn-inst-prev').addEventListener('click', () => { _instrPage--; this._renderRows() })
    }
    if (_instrPage < totalPages - 1) {
      document.getElementById('btn-inst-next').addEventListener('click', () => { _instrPage++; this._renderRows() })
    }
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
      _instrPage    = 0
      _instrVisible = this._sorted(filtered)
      this._renderRows()
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

      let hasError = false
      if (!ticker) { setFieldError('inst-ticker', 'Ingresá un ticker');   hasError = true }
      if (!name)   { setFieldError('inst-name',   'Ingresá un nombre');   hasError = true }
      if (!typeId) { setFieldError('inst-type',   'Seleccioná un tipo'); hasError = true }
      if (hasError) return

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
        cacheInvalidate('instruments')
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
    document.getElementById('btn-inst-submit').textContent          = '+ Agregar'
    document.getElementById('btn-inst-cancel-edit').style.display   = 'none'
    delete document.getElementById('form-instrumento').dataset.editId
    this._loadTypes()
  },

  async _delete(id, ticker) {
    const ok = await confirmModal({
      title: `Eliminar "${ticker}"`,
      message: 'Esta acción no se puede deshacer. No se puede eliminar si tiene operaciones registradas.'
    })
    if (!ok) return

    try {
      await apiRequest('DELETE', `/api/instruments/${id}`)
      cacheInvalidate('instruments')
      showToast(`Instrumento "${ticker}" eliminado.`, 'success')
      await this._loadList()
    } catch (err) {
      showToast(err.code === '23503' ? 'No se puede eliminar: tiene operaciones asociadas.' : 'Error al eliminar.', 'error')
    }
  }
}


function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function _buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages = new Set([0, total - 1, current])
  for (let i = Math.max(0, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.add(i)
  const sorted = [...pages].sort((a, b) => a - b)
  const result = []
  let prev = -1
  for (const p of sorted) {
    if (p - prev > 1) result.push('...')
    result.push(p)
    prev = p
  }
  return result
}
