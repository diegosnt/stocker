import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { navigate }  from '../router.js'
import { apiRequest } from '../api-client.js'
import { get as cacheGet, set as cacheSet, invalidate as cacheInvalidate } from '../cache.js'

// Estado de edición — persiste entre navegación de lista → formulario
let _editingOperation = null
let _currentPage  = 0
let _searchQuery  = ''
let _alycFilter   = ''   // persiste al volver del formulario de edición
let _searchTimer  = null
const PAGE_SIZE = 10

export const OperationsPage = {
  async render(mode = 'list') {
    if (mode === 'form') {
      await this._renderForm()
    } else {
      await this._renderList()
    }
  },

  // ── Listado ──────────────────────────────────────────────
  async _renderList() {
    _currentPage = 0
    _searchQuery  = ''
    // _alycFilter NO se resetea — se conserva al volver del formulario de edición
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Historial de Operaciones</h2>
        <button class="btn btn-primary" id="btn-nueva-op">+ Nueva Operación</button>
      </div>

      <div class="card" style="padding:0">
        <div class="table-card-header" style="padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem">
          <h3 style="margin:0">Registros</h3>
          <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap">
            <select id="ops-alyc-filter" style="width:200px">
              <option value="">Todas las ALyCs</option>
            </select>
            <input type="search" id="ops-search" class="search-input"
              style="width: 240px"
              placeholder="Buscar por ticker, tipo...">
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Instrumento</th>
                <th>ALyC</th>
                <th style="text-align:right">Cantidad</th>
                <th style="text-align:right">Precio unit.</th>
                <th style="text-align:right">Total</th>
                <th>Moneda</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="ops-tbody">
              <tr><td colspan="9" class="table-empty"><span class="spinner"></span></td></tr>
            </tbody>
          </table>
        </div>
        <div id="ops-pagination"></div>
      </div>`

    document.getElementById('btn-nueva-op').addEventListener('click', () => {
      _editingOperation = null
      navigate('new-operation')
    })
    this._bindSearch()
    await Promise.all([this._loadAlycFilter(), this._loadList(0)])
  },

  async _loadList(page = 0) {
    const tbody = document.getElementById('ops-tbody')
    if (!tbody) return

    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><span class="spinner"></span></td></tr>`

    let baseQuery = supabase
      .from('operations')
      .select('*, instruments(ticker, name), alycs(name)', { count: 'exact' })
      .order('operated_at', { ascending: false })
      .order('ticker', { referencedTable: 'instruments', ascending: true })

    if (_alycFilter) {
      baseQuery = baseQuery.eq('alyc_id', _alycFilter)
    }

    let data, error, count, searching = !!_searchQuery

    if (searching) {
      // Modo búsqueda: traer todo y filtrar en cliente
      ;({ data, error, count } = await baseQuery)
      if (!error && data) {
        const q = _searchQuery.toLowerCase()
        data  = data.filter(op =>
          (op.instruments?.ticker ?? '').toLowerCase().includes(q) ||
          (op.instruments?.name   ?? '').toLowerCase().includes(q) ||
          (op.alycs?.name         ?? '').toLowerCase().includes(q) ||
          (op.notes               ?? '').toLowerCase().includes(q) ||
          op.type.toLowerCase().includes(q)     ||
          op.currency.toLowerCase().includes(q)
        )
        count = data.length
      }
    } else {
      // Modo paginado normal
      const from = page * PAGE_SIZE
      const to   = from + PAGE_SIZE - 1
      ;({ data, error, count } = await baseQuery.range(from, to))
    }

    if (error) {
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`
      this._renderPagination(0, 0)
      return
    }

    if (!data.length) {
      const emptyMsg = searching || _alycFilter ? 'No se encontraron resultados para el filtro aplicado.' : 'No hay operaciones registradas.'
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">${emptyMsg}</td></tr>`
      this._renderPagination(0, 0)
      return
    }

    tbody.innerHTML = data.map(op => {
      const total    = parseFloat(op.quantity) * parseFloat(op.price)
      const fmtNum   = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const ticker   = op.instruments?.ticker ?? '—'
      const instName = op.instruments?.name   ?? ''
      const alycName = op.alycs?.name         ?? '—'

      return `
        <tr>
          <td>${fmtDateShort(op.operated_at)}</td>
          <td><span class="badge badge-${op.type}">${op.type}</span></td>
          <td>
            <span class="ticker-chip">${esc(ticker)}</span>
            <span style="color:var(--color-muted);font-size:.8rem;margin-left:.35rem">${esc(instName)}</span>
          </td>
          <td>${esc(alycName)}</td>
          <td class="amount">${fmtNum(parseFloat(op.quantity))}</td>
          <td class="amount">${fmtNum(parseFloat(op.price))}</td>
          <td class="amount"><strong>${fmtNum(total)}</strong></td>
          <td><span class="badge badge-${op.currency.toLowerCase()}">${op.currency}</span></td>
          <td class="actions-cell">
            <button class="btn btn-sm btn-ghost btn-edit-op"
              data-id="${op.id}"
              data-type="${op.type}"
              data-instrument="${op.instrument_id}"
              data-alyc="${op.alyc_id}"
              data-qty="${op.quantity}"
              data-price="${op.price}"
              data-currency="${op.currency}"
              data-date="${op.operated_at}"
              data-notes="${esc(op.notes || '')}">
              Editar
            </button>
            <button class="btn btn-sm btn-danger btn-delete-op" data-id="${op.id}">Eliminar</button>
          </td>
        </tr>`
    }).join('')

    tbody.querySelectorAll('.btn-edit-op').forEach(btn => {
      btn.addEventListener('click', () => {
        _editingOperation = {
          id:            btn.dataset.id,
          type:          btn.dataset.type,
          instrument_id: btn.dataset.instrument,
          alyc_id:       btn.dataset.alyc,
          quantity:      btn.dataset.qty,
          price:         btn.dataset.price,
          currency:      btn.dataset.currency,
          operated_at:   btn.dataset.date,
          notes:         btn.dataset.notes
        }
        navigate('new-operation')
      })
    })

    tbody.querySelectorAll('.btn-delete-op').forEach(btn => {
      btn.addEventListener('click', () => this._deleteOp(btn.dataset.id))
    })

    this._renderPagination(page, count)
  },

  _renderPagination(page, total) {
    const container = document.getElementById('ops-pagination')
    if (!container) return

    const totalPages = Math.ceil(total / PAGE_SIZE)

    if (totalPages <= 1) {
      container.innerHTML = ''
      return
    }

    const from = page * PAGE_SIZE + 1
    const to   = Math.min((page + 1) * PAGE_SIZE, total)

    container.innerHTML = `
      <div class="pagination">
        <button class="btn btn-sm btn-ghost" id="btn-pag-prev" ${page === 0 ? 'disabled' : ''}>← Anterior</button>
        <span class="pag-info">Mostrando ${from}–${to} de ${total}</span>
        <button class="btn btn-sm btn-ghost" id="btn-pag-next" ${page >= totalPages - 1 ? 'disabled' : ''}>Siguiente →</button>
      </div>`

    if (page > 0) {
      document.getElementById('btn-pag-prev').addEventListener('click', () => {
        _currentPage = page - 1
        this._loadList(_currentPage)
      })
    }
    if (page < totalPages - 1) {
      document.getElementById('btn-pag-next').addEventListener('click', () => {
        _currentPage = page + 1
        this._loadList(_currentPage)
      })
    }
  },

  async _deleteOp(id) {
    if (!confirm('¿Eliminar esta operación? Esta acción no se puede deshacer.')) return

    try {
      await apiRequest('DELETE', `/api/operations/${id}`)
      showToast('Operación eliminada.', 'success')
      await this._loadList(_currentPage)
    } catch {
      showToast('Error al eliminar.', 'error')
    }
  },

  async _loadAlycFilter() {
    const sel = document.getElementById('ops-alyc-filter')
    if (!sel) return

    let data = cacheGet('alycs')
    if (!data) {
      ;({ data } = await supabase.from('alycs').select('id, name').order('name'))
      if (data) cacheSet('alycs', data)
    }

    if (data?.length) {
      sel.innerHTML = '<option value="">Todas las ALyCs</option>' +
        data.map(a => `<option value="${a.id}" ${a.id === _alycFilter ? 'selected' : ''}>${esc(a.name)}</option>`).join('')
    }

    sel.addEventListener('change', () => {
      _alycFilter  = sel.value
      _currentPage = 0
      this._loadList(0)
    })
  },

  _bindSearch() {
    const input = document.getElementById('ops-search')
    if (!input) return
    input.addEventListener('input', () => {
      clearTimeout(_searchTimer)
      _searchTimer = setTimeout(() => {
        _searchQuery = input.value.trim()
        _currentPage = 0
        this._loadList(0)
      }, 300)
    })
  },

  // ── Formulario (alta y edición) ───────────────────────────
  async _renderForm() {
    const editing = _editingOperation
    const content = document.getElementById('page-content')

    content.innerHTML = `
      <div class="page-header">
        <h2>${editing ? 'Editar Operación' : 'Nueva Operación'}</h2>
        <button class="btn btn-ghost" id="btn-volver">← Volver al historial</button>
      </div>

      <div class="card" style="max-width:680px">
        <form id="form-op" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="op-type">Tipo de operación *</label>
              <select id="op-type" required>
                <option value="">— Seleccioná —</option>
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
              </select>
            </div>
            <div class="form-group">
              <label for="op-date">Fecha *</label>
              <input type="date" id="op-date" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="grid-column: span 2">
              <label for="op-instrument">Instrumento *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <select id="op-instrument" required style="flex:1"><option value="">Cargando...</option></select>
                <button type="button" class="btn btn-sm btn-ghost" id="btn-new-instrument" title="Crear nuevo instrumento" style="white-space:nowrap; flex-shrink:0">+ Nuevo</button>
              </div>
            </div>
            <div class="form-group" style="grid-column: span 2">
              <label for="op-alyc">ALyC / Broker *</label>
              <select id="op-alyc" required><option value="">Cargando...</option></select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="op-qty">Cantidad *</label>
              <input type="number" id="op-qty" min="0.0001" step="any" placeholder="Ej: 100" required>
            </div>
            <div class="form-group">
              <label for="op-price">Precio unitario *</label>
              <input type="number" id="op-price" min="0.0001" step="any" placeholder="Ej: 1250.50" required>
            </div>
            <div class="form-group">
              <label for="op-currency">Moneda *</label>
              <select id="op-currency" required>
                <option value="ARS">ARS – Pesos</option>
                <option value="USD">USD – Dólares</option>
              </select>
            </div>
          </div>

          <div id="op-total-row" style="display:none;margin: 1.5rem 0;padding: 1rem;background:var(--bg-main);border-radius:var(--radius);font-size:1rem; border: 1px dashed var(--border)">
            Total estimado: <strong id="op-total-value" style="color: var(--color-primary)">—</strong>
          </div>

          <div class="form-group">
            <label for="op-notes">Notas</label>
            <textarea id="op-notes" placeholder="Observaciones opcionales..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-op-submit">
              ${editing ? 'Guardar cambios' : 'Registrar operación'}
            </button>
            <button type="button" class="btn btn-ghost" id="btn-op-cancel">Cancelar</button>
          </div>
        </form>
      </div>`

    // Fecha de hoy por defecto (solo alta)
    document.getElementById('op-date').value = editing
      ? editing.operated_at
      : new Date().toISOString().split('T')[0]

    const goBack = () => {
      const type       = document.getElementById('op-type').value
      const instrId    = document.getElementById('op-instrument').value
      const alycId     = document.getElementById('op-alyc').value
      const qty        = document.getElementById('op-qty').value
      const price      = document.getElementById('op-price').value
      const currency   = document.getElementById('op-currency').value
      const date       = document.getElementById('op-date').value
      const notes      = document.getElementById('op-notes').value.trim()

      const isDirty = editing
        ? type !== editing.type         || instrId !== editing.instrument_id ||
          alycId !== editing.alyc_id    || qty !== String(editing.quantity)  ||
          price !== String(editing.price) || currency !== editing.currency   ||
          date !== editing.operated_at  || notes !== (editing.notes || '')
        : type !== '' || instrId !== '' || alycId !== '' || qty !== '' || price !== '' || notes !== ''

      if (isDirty && !confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return
      _editingOperation = null
      navigate('operations')
    }
    document.getElementById('btn-volver').addEventListener('click', goBack)
    document.getElementById('btn-op-cancel').addEventListener('click', goBack)
    document.getElementById('btn-new-instrument').addEventListener('click', () => this._showInstrumentModal())

    try {
      await Promise.all([
        this._loadInstrumentsSelect(editing?.instrument_id),
        this._loadAlycsSelect(editing?.alyc_id)
      ])
    } catch {
      showToast('Error al cargar los datos del formulario. Intentá recargar la página.', 'error')
    }

    // Pre-cargar campos si estamos editando
    if (editing) {
      document.getElementById('op-type').value     = editing.type
      document.getElementById('op-qty').value      = editing.quantity
      document.getElementById('op-price').value    = editing.price
      document.getElementById('op-currency').value = editing.currency
      document.getElementById('op-notes').value    = editing.notes || ''
    }

    this._bindTotalCalc()
    this._bindFormSubmit()
  },

  async _loadInstrumentsSelect(selectedId = null) {
    const sel = document.getElementById('op-instrument')
    if (!sel) return

    let data = cacheGet('instruments')
    if (!data) {
      ;({ data } = await supabase
        .from('instruments')
        .select('id, ticker, name, instrument_types(name)')
        .order('ticker'))
      if (data) cacheSet('instruments', data)
    }

    if (!data?.length) {
      sel.innerHTML = '<option value="">— Sin instrumentos (creá uno primero) —</option>'
      return
    }

    sel.innerHTML = '<option value="">— Seleccioná un instrumento —</option>' +
      data.map(i =>
        `<option value="${i.id}" ${i.id === selectedId ? 'selected' : ''}>[${esc(i.ticker)}] ${esc(i.name)} (${i.instrument_types?.name ?? ''})</option>`
      ).join('')
  },

  async _loadAlycsSelect(selectedId = null) {
    const sel = document.getElementById('op-alyc')
    if (!sel) return

    let data = cacheGet('alycs')
    if (!data) {
      ;({ data } = await supabase.from('alycs').select('id, name').order('name'))
      if (data) cacheSet('alycs', data)
    }

    if (!data?.length) {
      sel.innerHTML = '<option value="">— Sin ALyCs (creá una primero) —</option>'
      return
    }

    sel.innerHTML = '<option value="">— Seleccioná una ALyC —</option>' +
      data.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')
  },

  async _showInstrumentModal() {
    let types = cacheGet('instrument_types')
    if (!types) {
      ;({ data: types } = await supabase.from('instrument_types').select('id, name').order('name'))
      if (types) cacheSet('instrument_types', types)
    }

    if (!types?.length) {
      showToast('Primero creá al menos un tipo de instrumento.', 'error')
      return
    }

    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="margin:0">Nuevo Instrumento</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="modal-close">✕</button>
        </div>
        <form id="modal-inst-form" novalidate>
          <div class="form-group">
            <label for="modal-ticker">Ticker *</label>
            <input type="text" id="modal-ticker" placeholder="Ej: GGAL, AAPL, YPF" required style="text-transform:uppercase">
          </div>
          <div class="form-group">
            <label for="modal-name">Nombre *</label>
            <input type="text" id="modal-name" placeholder="Ej: Grupo Financiero Galicia" required>
          </div>
          <div class="form-group">
            <label for="modal-type">Tipo *</label>
            <select id="modal-type" required>
              <option value="">— Seleccioná un tipo —</option>
              ${types.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="modal-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="modal-cancel">Cancelar</button>
          </div>
        </form>
      </div>`

    document.body.appendChild(overlay)

    const close = () => overlay.remove()
    document.getElementById('modal-close').addEventListener('click', close)
    document.getElementById('modal-cancel').addEventListener('click', close)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

    const tickerInput = document.getElementById('modal-ticker')
    tickerInput.addEventListener('input', () => { tickerInput.value = tickerInput.value.toUpperCase() })
    tickerInput.focus()

    document.getElementById('modal-inst-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const ticker = tickerInput.value.trim().toUpperCase()
      const name   = document.getElementById('modal-name').value.trim()
      const typeId = document.getElementById('modal-type').value

      if (!ticker || !name || !typeId) {
        showToast('Completá todos los campos obligatorios.', 'error')
        return
      }

      const btn = document.getElementById('modal-submit')
      btn.disabled    = true
      btn.textContent = 'Guardando...'

      try {
        const result = await apiRequest('POST', '/api/instruments', { ticker, name, instrument_type_id: typeId })
        const newId  = Array.isArray(result) ? result[0]?.id : result?.id
        cacheInvalidate('instruments')
        showToast(`Instrumento "${ticker}" creado.`, 'success')
        close()
        await this._loadInstrumentsSelect(newId)
      } catch (err) {
        showToast(err.code === '23505' ? `El ticker "${ticker}" ya existe.` : 'Error al guardar.', 'error')
        btn.disabled    = false
        btn.textContent = '+ Agregar'
      }
    })
  },

  _bindTotalCalc() {
    const qtyInput   = document.getElementById('op-qty')
    const priceInput = document.getElementById('op-price')
    const totalRow   = document.getElementById('op-total-row')
    const totalVal   = document.getElementById('op-total-value')
    const currSel    = document.getElementById('op-currency')

    function update() {
      const qty = parseFloat(qtyInput.value), price = parseFloat(priceInput.value)
      if (qty > 0 && price > 0) {
        totalRow.style.display = 'block'
        totalVal.textContent = `${(qty * price).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${currSel.value}`
      } else {
        totalRow.style.display = 'none'
      }
    }

    qtyInput.addEventListener('input', update)
    priceInput.addEventListener('input', update)
    currSel.addEventListener('change', update)
    update()
  },

  _bindFormSubmit() {
    const form    = document.getElementById('form-op')
    const editing = _editingOperation
    if (!form) return

    form.addEventListener('submit', async (e) => {
      e.preventDefault()

      const type         = document.getElementById('op-type').value
      const instrumentId = document.getElementById('op-instrument').value
      const alycId       = document.getElementById('op-alyc').value
      const qty          = document.getElementById('op-qty').value
      const price        = document.getElementById('op-price').value
      const currency     = document.getElementById('op-currency').value
      const operatedAt   = document.getElementById('op-date').value
      const notes        = document.getElementById('op-notes').value.trim()

      if (!type || !instrumentId || !alycId || !qty || !price || !operatedAt) {
        showToast('Completá todos los campos obligatorios.', 'error')
        return
      }

      const btn = document.getElementById('btn-op-submit')
      btn.disabled    = true
      btn.textContent = 'Guardando...'

      const payload = {
        type,
        instrument_id: instrumentId,
        alyc_id:       alycId,
        quantity:      parseFloat(qty),
        price:         parseFloat(price),
        currency,
        operated_at:   operatedAt,
        notes:         notes || null
      }

      try {
        if (editing) {
          await apiRequest('PATCH', `/api/operations/${editing.id}`, payload)
          showToast('Operación actualizada correctamente.', 'success')
        } else {
          await apiRequest('POST', '/api/operations', payload)
          showToast('Operación registrada correctamente.', 'success')
        }
        _editingOperation = null
        navigate('operations')
      } catch {
        showToast('Error al guardar la operación.', 'error')
        btn.disabled    = false
        btn.textContent = editing ? 'Guardar cambios' : 'Registrar operación'
      }
    })
  }
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDateShort(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
