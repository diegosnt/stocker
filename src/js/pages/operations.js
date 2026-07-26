import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { get as cacheGet, set as cacheSet, invalidate as cacheInvalidate } from '../cache.js'
import { esc, confirmModal, setFieldError, fmtDateShort, buildPageRange } from '../utils.js'
import { handleCsvImport } from './operations/csv-import.js'

const ICON_EDIT   = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`
const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`
const ICON_CLONE  = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const PAGE_SIZE = 10
const FILTERS_STORAGE_KEY = 'stocker_operations_filters'

const state = {
  editingOperation: null,
  pagination: {
    currentPage: 0,
    pageSize: PAGE_SIZE,
    requestId: null
  },
  filters: {
    searchQuery: '',
    alycFilter: '',
    instrumentFilter: '',
    typeFilter: '',
    currencyFilter: '',
    dateFrom: '',
    dateTo: ''
  },
  sorting: {
    column: 'operated_at',
    ascending: false
  },
  searchTimer: null,
  abortController: null
}

const get = (path) => path.split('.').reduce((obj, key) => obj?.[key], state)
const set = (path, value) => {
  const keys = path.split('.')
  const last = keys.pop()
  keys.reduce((obj, key) => obj[key] ??= {}, state)[last] = value
}
const updateFilters = (updates) => {
  Object.assign(state.filters, updates)
  state.pagination.currentPage = 0
}
const setPage = (page) => { state.pagination.currentPage = page }
const setSort = (col, asc) => {
  state.sorting.column = col
  state.sorting.ascending = asc
}

// Recuerda la última combinación de filtros usada, para restaurarla la próxima
// vez que se entra a la página (se pierde al navegar por el reset en cleanup()).
const persistFilters = () => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state.filters))
  } catch { /* localStorage lleno o deshabilitado: no bloquea la app */ }
}
const loadPersistedFilters = () => {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    for (const key of Object.keys(state.filters)) {
      if (typeof saved[key] === 'string') state.filters[key] = saved[key]
    }
  } catch { /* dato corrupto: seguimos con los filtros default */ }
}

export const OperationsPage = {
  async render() {
    await this._renderList()
  },

  // ── Listado ──────────────────────────────────────────────
  async _renderList() {
    state.pagination.currentPage = 0
    loadPersistedFilters()
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Operaciones</h2>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="btn-export-csv">↓ Exportar CSV</button>
          <button class="btn btn-ghost" id="btn-import-csv">↑ Importar CSV</button>
          <input type="file" id="input-csv" accept=".csv" style="display:none">
          <button class="btn btn-primary" id="btn-nueva-op">+ Nueva Operación</button>
        </div>
      </div>

      <div class="card ops-card">
        <div class="ops-filters-bar">
          <div class="ops-filters-title">
            <h3 style="margin:0">Registros</h3>
            <button class="btn btn-sm btn-ghost" id="btn-clear-filters" style="display:none">✕ Limpiar filtros</button>
          </div>
          <div class="ops-filters-row">
            <select id="ops-alyc-filter">
              <option value="">Todas las ALyCs</option>
            </select>
            <select id="ops-instrument-filter">
              <option value="">Todos los instrumentos</option>
            </select>
            <select id="ops-type-filter">
              <option value="">Todos los tipos</option>
              <option value="compra" ${state.filters.typeFilter === 'compra' ? 'selected' : ''}>Compra</option>
              <option value="venta" ${state.filters.typeFilter === 'venta' ? 'selected' : ''}>Venta</option>
            </select>
            <select id="ops-currency-filter">
              <option value="">Todas las monedas</option>
              <option value="ARS" ${state.filters.currencyFilter === 'ARS' ? 'selected' : ''}>ARS</option>
              <option value="USD" ${state.filters.currencyFilter === 'USD' ? 'selected' : ''}>USD</option>
            </select>
            <div class="ops-date-range">
              <input type="date" id="ops-date-from" title="Fecha desde" value="${state.filters.dateFrom}">
              <span>—</span>
              <input type="date" id="ops-date-to" title="Fecha hasta" value="${state.filters.dateTo}">
            </div>
            <input type="search" id="ops-search" class="search-input" placeholder="Buscar por ticker...">
          </div>
        </div>
        <div class="ops-table-container">
          <div class="table-wrapper ops-desktop-table">
            <table class="ops-table">
              <thead>
                <tr>
                  <th class="sortable" data-col="operated_at">Fecha</th>
                  <th class="sortable" data-col="instrument_ticker">Ticker</th>
                  <th class="sortable" data-col="alyc_name">ALyC</th>
                  <th class="sortable" data-col="quantity" style="text-align:right">Can.</th>
                  <th class="sortable" data-col="price" style="text-align:right">Precio</th>
                  <th style="text-align:right">Total</th>
                  <th class="sortable currency-col" data-col="currency">Moneda</th>
                  <th class="actions-cell"></th>
                </tr>
              </thead>
              <tbody id="ops-tbody">
                ${Array(10).fill(`
                  <tr>
                    <td><div class="skeleton" style="height:14px; width:80px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:60px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:120px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:40px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:70px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:70px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:40px"></div></td>
                    <td><div class="skeleton" style="height:14px; width:60px"></div></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div id="ops-cards" class="ops-cards-grid">
            ${Array(5).fill(`
              <div class="op-card--modern skeleton" style="height: 160px; border: none"></div>
            `).join('')}
          </div>
          <div id="ops-pagination"></div>
        </div>
      </div>
    </div>`

    document.getElementById('btn-export-csv').addEventListener('click', () => this._exportCSV())
    document.getElementById('btn-nueva-op').addEventListener('click', () => {
      state.editingOperation = null
      this._showFormModal()
    })

    const inputCsv = document.getElementById('input-csv')
    document.getElementById('btn-import-csv').addEventListener('click', () => inputCsv.click())
    inputCsv.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      await handleCsvImport(file, this)
      inputCsv.value = '' // Reset
    })
    this._bindSearch()
    this._bindFilters()
    this._bindSortHeaders()
    await Promise.all([this._loadAlycFilter(), this._loadInstrumentFilter(), this._loadList(0)])
  },



  async _loadList(page = 0) {
    const tbody    = document.getElementById('ops-tbody')
    const opsCards = document.getElementById('ops-cards')
    if (!tbody) return

    persistFilters()

    // Cancelar request anterior si existe
    if (state.abortController) {
      state.abortController.abort()
    }
    state.abortController = new AbortController()

    tbody.innerHTML    = `<tr><td colspan="9" class="table-empty"><span class="spinner"></span></td></tr>`
    if (opsCards) opsCards.innerHTML = `<div class="table-empty"><span class="spinner"></span></div>`

    const from = page * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    const requestId = state.pagination.requestId = {}

    let data = []
    let count = 0

    // Usamos la vista operations_search para filtrar en el servidor
    let query = supabase
      .from('operations_search')
      .select('*', { count: 'exact' })
      .order(state.sorting.column, { ascending: state.sorting.ascending })

    if (state.filters.alycFilter)       query = query.eq('alyc_id', state.filters.alycFilter)
    if (state.filters.instrumentFilter) query = query.eq('instrument_id', state.filters.instrumentFilter)
    if (state.filters.typeFilter)       query = query.eq('type', state.filters.typeFilter)
    if (state.filters.currencyFilter)   query = query.eq('currency', state.filters.currencyFilter)
    if (state.filters.dateFrom)         query = query.gte('operated_at', state.filters.dateFrom)
    if (state.filters.dateTo)           query = query.lte('operated_at', state.filters.dateTo)

    if (state.filters.searchQuery) {
      const q = `%${state.filters.searchQuery}%`
      // Ahora .ilike() ya está disponible en nuestra librería minimal
      query = query.ilike('instrument_ticker', q)
    }

    try {
      const result = await query.range(from, to)
      data = result.data
      count = result.count

      // Ignorar respuesta si ya hay una más reciente
      if (state.pagination.requestId !== requestId) return

      if (result.error) {
        console.error('Error cargando operaciones:', result.error)
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`
        this._renderPagination(0, 0)
        return
      }

      if (!data.length) {
        const hasFilters = state.filters.searchQuery || state.filters.alycFilter || state.filters.instrumentFilter || state.filters.typeFilter || state.filters.currencyFilter || state.filters.dateFrom || state.filters.dateTo
        const emptyMsg = hasFilters ? 'No se encontraron resultados para los filtros aplicados.' : 'No hay operaciones registradas.'
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">${emptyMsg}</td></tr>`
        if (opsCards) opsCards.innerHTML = `<div class="table-empty">${emptyMsg}</div>`
        this._renderPagination(0, 0)
        return
      }
    } catch (e) {
      // Request cancelado o error de red
      if (state.pagination.requestId !== requestId) return
      console.error('Error cargando operaciones:', e)
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`
      this._renderPagination(0, 0)
      return
    }

    let rowsHtml  = ''
    let cardsHtml = ''
    data.forEach(op => {
      const total    = parseFloat(op.quantity) * parseFloat(op.price)
      const fmtPrice = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const fmtQty   = n => Math.round(parseFloat(n) || 0).toLocaleString('es-AR')
      const ticker   = op.instrument_ticker ?? '—'
      const instName = op.instrument_name   ?? ''
      const alycName = op.alyc_name         ?? '—'
      const hasNotes = !!op.notes?.trim()
      const idx      = data.indexOf(op)

      rowsHtml += `
        <tr class="op-row ${hasNotes ? 'has-notes' : ''}" data-id="${op.id}">
          <td class="date-col">${fmtDateShort(op.operated_at)}</td>
         
          <td>
            <span class="ticker-chip" title="${esc(instName)}">${esc(ticker)}</span>
            <span class="ticker-name" style="color:var(--color-muted);font-size:.8rem;margin-left:.35rem">${esc(instName)}</span>
          </td>
          <td class="alyc-col"><div class="alyc-name-cell">${esc(alycName)}</div></td>
          <td class="amount total-${op.type}"><strong>${fmtQty(op.quantity)}</strong></td>
          <td class="amount">${fmtPrice(parseFloat(op.price))}</td>
          <td class="amount"><strong class="total-amount total-${op.type}">${fmtPrice(total)}</strong></td>
          <td class="currency-col"><span class="badge badge-${(op.currency || '').toLowerCase()}">${op.currency || '—'}</span></td>
          <td class="actions-cell">
            <button class="btn btn-sm btn-ghost btn-icon-only btn-edit-op" data-op-idx="${idx}" title="Editar" aria-label="Editar">${ICON_EDIT}</button>
            <button class="btn btn-sm btn-ghost btn-icon-only btn-clone-op" data-op-idx="${idx}" title="Clonar" aria-label="Clonar">${ICON_CLONE}</button>
            <button class="btn btn-sm btn-danger btn-icon-only btn-delete-op" data-id="${op.id}" title="Eliminar" aria-label="Eliminar">${ICON_DELETE}</button>
          </td>
        </tr>
        <tr class="op-detail-row" id="detail-${op.id}">
          <td colspan="9">
            <div class="op-detail-content">
              <div class="op-detail-type"><strong>Tipo:</strong> <span class="badge badge-${(op.type || '').toLowerCase()}">${(op.type || '—').toUpperCase()}</span></div>
              <div class="op-detail-instrument"><strong>Instrumento:</strong> ${esc(instName)} (${op.currency || '—'})</div>
              ${op.notes ? `<div><strong>Notas:</strong> <span style="color:var(--text-muted)">${esc(op.notes)}</span></div>` : ''}
              <div class="op-detail-actions">
                <button class="btn btn-primary btn-edit-op" data-op-idx="${idx}">${ICON_EDIT} Editar</button>
                <button class="btn btn-ghost btn-clone-op" data-op-idx="${idx}">${ICON_CLONE} Clonar</button>
                <button class="btn btn-danger btn-delete-op" data-id="${op.id}">${ICON_DELETE} Eliminar</button>
              </div>
            </div>
          </td>
        </tr>`

      cardsHtml += `
        <div class="op-card--modern ${op.type} collapsed" data-id="${op.id}">
          <div class="op-card-header">
            <div class="op-card-ticker-badge">
              ${esc(ticker)}
            </div>
            <div class="op-card-header-meta">
              <span class="op-card-header-date">${fmtDateShort(op.operated_at)}</span>
              <span class="op-card-qty-badge">${fmtQty(op.quantity)}</span>
              <span class="op-card-header-alyc">${esc(alycName)}</span>
            </div>
          </div>

          <div class="op-card-body">
            <div class="op-card-instrument-full">
              ${esc(instName)}
            </div>
            <div class="op-card-stats-row">
              <div class="op-card-stat">
                <span class="op-card-stat-label">Precio</span>
                <span class="op-card-stat-value">${fmtPrice(parseFloat(op.price))}</span>
              </div>
              <div class="op-card-stat" style="text-align: right">
                <span class="op-card-stat-label">Total (${op.currency})</span>
                <span class="op-card-stat-value" style="color: var(--total-${op.type})">${fmtPrice(total)}</span>
              </div>
            </div>
          </div>
          
          ${hasNotes ? `<div class="op-card-notes-modern">${esc(op.notes)}</div>` : ''}

          <div class="op-card-actions-modern">
            <button class="btn btn-sm btn-ghost btn-edit-op" data-op-idx="${idx}">${ICON_EDIT} Editar</button>
            <button class="btn btn-sm btn-ghost btn-clone-op" data-op-idx="${idx}">${ICON_CLONE} Clonar</button>
            <button class="btn btn-sm btn-ghost btn-delete-op" data-id="${op.id}" style="color: var(--color-danger)">${ICON_DELETE} Borrar</button>
          </div>
        </div>`
    })

    tbody.innerHTML = rowsHtml
    if (opsCards) {
      opsCards.innerHTML = cardsHtml
      // Eventos para colapsar/expandir tarjetas mobile
      opsCards.querySelectorAll('.op-card-header').forEach(header => {
        header.addEventListener('click', () => {
          header.parentElement.classList.toggle('collapsed')
        })
      })
    }

    // Eventos de expansión (desktop)
    tbody.querySelectorAll('.op-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.actions-cell')) return
        row.classList.toggle('expanded')
      })
    })

    const handleEdit = (btn) => {
      state.editingOperation = { ...data[btn.dataset.opIdx] }
      this._showFormModal()
    }

    const handleClone = (btn) => {
      const { id, created_at, ...rest } = data[btn.dataset.opIdx]
      state.editingOperation = { ...rest, _cloning: true }
      this._showFormModal()
    }

    const handleDelete = async (btn) => {
      await this._deleteOp(btn.dataset.id)
    }

    tbody.querySelectorAll('.btn-edit-op').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); handleEdit(btn) })
    })
    tbody.querySelectorAll('.btn-clone-op').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); handleClone(btn) })
    })
    tbody.querySelectorAll('.btn-delete-op').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); handleDelete(btn) })
    })

    if (opsCards) {
      opsCards.querySelectorAll('.btn-edit-op').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); handleEdit(btn) })
      })
      opsCards.querySelectorAll('.btn-clone-op').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); handleClone(btn) })
      })
      opsCards.querySelectorAll('.btn-delete-op').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); handleDelete(btn) })
      })
    }

    this._renderPagination(page, count)
    this._updateSortHeaders()
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

    // Genera la secuencia de páginas a mostrar con elipsis cuando hay muchas
    const pages = buildPageRange(page, totalPages)

    const pageButtons = pages.map(p =>
      p === '...'
        ? `<span class="pag-ellipsis">…</span>`
        : `<button class="btn btn-sm ${p === page ? 'btn-primary pag-active' : 'btn-ghost'} pag-num" data-page="${p}">${p + 1}</button>`
    ).join('')

    container.innerHTML = `
      <div class="pagination">
        <button class="btn btn-sm btn-ghost" id="btn-pag-prev" ${page === 0 ? 'disabled' : ''}>←</button>
        <div class="pag-pages">${pageButtons}</div>
        <button class="btn btn-sm btn-ghost" id="btn-pag-next" ${page >= totalPages - 1 ? 'disabled' : ''}>→</button>
        <span class="pag-info">Mostrando ${from}–${to} de ${total}</span>
      </div>`

    container.querySelectorAll('.pag-num').forEach(btn => {
      btn.addEventListener('click', () => {
        state.pagination.currentPage = parseInt(btn.dataset.page, 10)
        this._loadList(state.pagination.currentPage)
      })
    })
    if (page > 0) {
      document.getElementById('btn-pag-prev').addEventListener('click', () => {
        state.pagination.currentPage = page - 1
        this._loadList(state.pagination.currentPage)
      })
    }
    if (page < totalPages - 1) {
      document.getElementById('btn-pag-next').addEventListener('click', () => {
        state.pagination.currentPage = page + 1
        this._loadList(state.pagination.currentPage)
      })
    }
  },

  async _exportCSV() {
    const btn = document.getElementById('btn-export-csv')
    const originalText = btn.innerHTML
    btn.innerHTML = 'Exportando...'
    btn.disabled = true

    try {
      let query = supabase
        .from('operations_search')
        .select('*')
        .order('operated_at', { ascending: false })

      if (state.filters.alycFilter)       query = query.eq('alyc_id', state.filters.alycFilter)
      if (state.filters.instrumentFilter) query = query.eq('instrument_id', state.filters.instrumentFilter)
      if (state.filters.typeFilter)       query = query.eq('type', state.filters.typeFilter)
      if (state.filters.currencyFilter)   query = query.eq('currency', state.filters.currencyFilter)
      if (state.filters.dateFrom)         query = query.gte('operated_at', state.filters.dateFrom)
      if (state.filters.dateTo)           query = query.lte('operated_at', state.filters.dateTo)

      if (state.filters.searchQuery) {
        query = query.ilike('instrument_ticker', `%${state.filters.searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error

      if (!data || data.length === 0) {
        showToast('No hay operaciones para exportar.', 'info')
        return
      }

      // Generar CSV
      const headers = ['Fecha', 'Ticker', 'Nombre', 'ALyC', 'Tipo', 'Cantidad', 'Precio', 'Moneda', 'Notas']
      const rows = data.map(op => [
        (op.operated_at || '').split('T')[0] || '—',
        op.instrument_ticker || '—',
        `"${(op.instrument_name || '').replace(/"/g, '""')}"`,
        `"${(op.alyc_name || '').replace(/"/g, '""')}"`,
        op.type || '—',
        op.quantity || 0,
        op.price || 0,
        op.currency || '—',
        `"${(op.notes || '').replace(/"/g, '""')}"`
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const dateStr = new Date().toISOString().split('T')[0]
      link.setAttribute('href', url)
      link.setAttribute('download', `stocker_operaciones_${dateStr}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('Exportación completada.', 'success')
    } catch (err) {
      console.error('Error exportando CSV:', err)
      showToast('Error al exportar. Intentá de nuevo.', 'error')
    } finally {
      btn.innerHTML = originalText
      btn.disabled = false
    }
  },

  async _deleteOp(id) {
    const ok = await confirmModal({
      title: 'Eliminar operación',
      message: 'Esta acción no se puede deshacer.'
    })
    if (!ok) return

    try {
      await apiRequest('DELETE', `/api/operations/${id}`)
      showToast('Operación eliminada.', 'success')
      cacheInvalidate('user_holdings')
      await this._loadList(state.pagination.currentPage)
    } catch {
      showToast('Error al eliminar.', 'error')
    }
  },

  async _loadAlycFilter() {
    const sel = document.getElementById('ops-alyc-filter')
    if (!sel) return

    let data = cacheGet('alycs')
    if (!data) {
      ;({ data } = await supabase.from('alycs').select('id,name').order('name'))
      if (data) cacheSet('alycs', data)
    }

    if (data?.length) {
      sel.innerHTML = '<option value="">Todas las ALyCs</option>' +
        data.map(a => `<option value="${a.id}" ${a.id === state.filters.alycFilter ? 'selected' : ''}>${esc(a.name)}</option>`).join('')
    }

    sel.addEventListener('change', () => {
      state.filters.alycFilter  = sel.value
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })
  },

  async _loadInstrumentFilter() {
    const sel = document.getElementById('ops-instrument-filter')
    if (!sel) return

    let data = cacheGet('instruments')
    if (!data) {
      ;({ data } = await supabase.from('instruments').select('id,ticker,name').order('ticker'))
      if (data) cacheSet('instruments', data)
    }

    if (data?.length) {
      sel.innerHTML = '<option value="">Todos los instrumentos</option>' +
        data.map(i => `<option value="${i.id}" ${i.id === state.filters.instrumentFilter ? 'selected' : ''}>${esc(i.ticker)} – ${esc(i.name)}</option>`).join('')
    }

    sel.addEventListener('change', () => {
      state.filters.instrumentFilter = sel.value
      
      // Si el usuario selecciona un instrumento del combo, reseteamos el buscador manual
      if (state.filters.instrumentFilter) {
        state.filters.searchQuery = ''
        const searchInput = document.getElementById('ops-search')
        if (searchInput) searchInput.value = ''
      }

      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })
  },

  _bindFilters() {
    const typeSel     = document.getElementById('ops-type-filter')
    const currencySel = document.getElementById('ops-currency-filter')
    const dateFrom    = document.getElementById('ops-date-from')
    const dateTo      = document.getElementById('ops-date-to')
    const clearBtn    = document.getElementById('btn-clear-filters')

    typeSel?.addEventListener('change', () => {
      state.filters.typeFilter = typeSel.value
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })

    currencySel?.addEventListener('change', () => {
      state.filters.currencyFilter = currencySel.value
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })

    dateFrom?.addEventListener('change', () => {
      state.filters.dateFrom = dateFrom.value
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })

    dateTo?.addEventListener('change', () => {
      state.filters.dateTo = dateTo.value
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })

    clearBtn?.addEventListener('click', () => {
      state.filters.alycFilter = ''; state.filters.instrumentFilter = ''; state.filters.typeFilter = ''; state.filters.currencyFilter = ''; state.filters.dateFrom = ''; state.filters.dateTo = ''; state.filters.searchQuery = ''
      document.getElementById('ops-alyc-filter').value        = ''
      document.getElementById('ops-instrument-filter').value  = ''
      document.getElementById('ops-type-filter').value        = ''
      document.getElementById('ops-currency-filter').value    = ''
      document.getElementById('ops-date-from').value          = ''
      document.getElementById('ops-date-to').value            = ''
      document.getElementById('ops-search').value             = ''
      state.pagination.currentPage = 0
      this._updateClearBtn()
      this._loadList(0)
    })

    this._updateClearBtn()
  },

  _updateClearBtn() {
    const btn = document.getElementById('btn-clear-filters')
    if (!btn) return
    const active = state.filters.alycFilter || state.filters.instrumentFilter || state.filters.typeFilter || state.filters.currencyFilter || state.filters.dateFrom || state.filters.dateTo || state.filters.searchQuery
    btn.style.display = active ? '' : 'none'
  },

  _bindSearch() {
    const input = document.getElementById('ops-search')
    if (!input) return
    input.value = state.filters.searchQuery
    input.addEventListener('input', () => {
      clearTimeout(state.searchTimer)
      state.searchTimer = setTimeout(() => {
        state.filters.searchQuery = input.value.trim()
        
        // Si el usuario busca un ticker por texto, reseteamos el combo de instrumentos 
        // para evitar el conflicto de filtros (que aparezca vacío porque no coinciden)
        if (state.filters.searchQuery) {
          state.filters.instrumentFilter = ''
          const instFilter = document.getElementById('ops-instrument-filter')
          if (instFilter) instFilter.value = ''
        }

        state.pagination.currentPage = 0
        this._updateClearBtn()
        this._loadList(0)
      }, 300)
    })
  },

  _bindSortHeaders() {
    document.querySelectorAll('.ops-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col
        if (state.sorting.column === col) {
          state.sorting.ascending = !state.sorting.ascending
        } else {
          state.sorting.column = col
          state.sorting.ascending = (col !== 'operated_at')  // fechas por defecto desc; resto asc
        }
        state.pagination.currentPage = 0
        this._updateSortHeaders()
        this._loadList(0)
      })
    })
    this._updateSortHeaders()
  },

  _updateSortHeaders() {
    document.querySelectorAll('.ops-table th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === state.sorting.column) {
        th.classList.add(state.sorting.ascending ? 'sort-asc' : 'sort-desc')
      }
    })
  },

  // ── Modal formulario (alta y edición) ────────────────────
  async _showFormModal() {
    const editing = state.editingOperation

    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <h3 style="margin:0">${editing?._cloning ? 'Clonar Operación' : editing ? 'Editar Operación' : 'Nueva Operación'}</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-op-close" aria-label="Cerrar">✕</button>
        </div>
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
            <div class="form-group">
              <label for="op-instrument-search">Instrumento *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <div class="combobox" id="op-instrument-combobox" style="flex:1">
                  <input type="text" id="op-instrument-search" class="combobox-input" placeholder="Buscar por ticker o nombre..." autocomplete="off">
                  <input type="hidden" id="op-instrument">
                  <ul class="combobox-list" id="op-instrument-list" hidden></ul>
                </div>
                <button type="button" class="btn btn-sm btn-ghost btn-icon-only" id="btn-new-instrument" title="Crear nuevo instrumento" aria-label="Crear nuevo instrumento" style="flex-shrink:0">+</button>
              </div>
            </div>
            <div class="form-group">
              <label for="op-alyc">ALyC / Broker *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <select id="op-alyc" required style="flex:1"><option value="">Cargando...</option></select>
                <button type="button" class="btn btn-sm btn-ghost btn-icon-only" id="btn-new-alyc" title="Crear nueva ALyC" aria-label="Crear nueva ALyC" style="flex-shrink:0">+</button>
              </div>
            </div>
          </div>

          <div class="form-row form-row-3">
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

          <div id="op-total-row" style="display:none;margin: 1rem 0;padding: 0.75rem 1rem;background:var(--bg-main);border-radius:var(--radius);font-size:1rem; border: 1px dashed var(--border)">
            Total estimado: <strong id="op-total-value" style="color: var(--color-primary)">—</strong>
          </div>

          <div class="form-group">
            <label for="op-notes">Notas</label>
            <textarea id="op-notes" placeholder="Observaciones opcionales..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="btn-op-submit">
              ${editing?._cloning ? 'Clonar operación' : editing ? 'Guardar cambios' : 'Registrar operación'}
            </button>
            <button type="button" class="btn btn-ghost" id="btn-op-cancel">Cancelar</button>
          </div>
        </form>
      </div>`

    document.body.appendChild(overlay)

    // Fecha de hoy por defecto (solo alta)
    document.getElementById('op-date').value = editing
      ? editing.operated_at
      : new Date().toISOString().split('T')[0]

    const close = () => {
      const type    = document.getElementById('op-type').value
      const instrId = document.getElementById('op-instrument').value
      const alycId  = document.getElementById('op-alyc').value
      const qty     = document.getElementById('op-qty').value
      const price   = document.getElementById('op-price').value
      const date    = document.getElementById('op-date').value
      const notes   = document.getElementById('op-notes').value.trim()

      const isDirty = editing
        ? type !== editing.type           || instrId !== editing.instrument_id ||
          alycId !== editing.alyc_id      || qty !== String(editing.quantity)  ||
          price !== String(editing.price) || date !== editing.operated_at      ||
          notes !== (editing.notes || '')
        : type !== '' || instrId !== '' || alycId !== '' || qty !== '' || price !== '' || notes !== ''

      if (isDirty && !confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return
      state.editingOperation = null
      overlay.remove()
    }

    document.getElementById('btn-op-close').addEventListener('click', close)
    document.getElementById('btn-op-cancel').addEventListener('click', close)
    document.getElementById('btn-new-instrument').addEventListener('click', () => this._showInstrumentModal())
    document.getElementById('btn-new-alyc').addEventListener('click', () => this._showAlycModal())

    try {
      await Promise.all([
        this._loadInstrumentsSelect(editing?.instrument_id),
        this._loadAlycsSelect(editing?.alyc_id)
      ])
    } catch {
      showToast('Error al cargar los datos del formulario. Intentá recargar la página.', 'error')
    }

    if (editing) {
      document.getElementById('op-type').value     = editing.type
      document.getElementById('op-qty').value      = editing.quantity
      document.getElementById('op-price').value    = editing.price
      document.getElementById('op-currency').value = editing.currency
      document.getElementById('op-notes').value    = editing.notes || ''
    }

    this._bindTotalCalc()
    this._bindFormSubmit(overlay)
  },

  async _loadInstrumentsSelect(selectedId = null) {
    const searchEl  = document.getElementById('op-instrument-search')
    const hiddenEl  = document.getElementById('op-instrument')
    const listEl    = document.getElementById('op-instrument-list')
    if (!searchEl || !hiddenEl || !listEl) return

    let instruments = cacheGet('instruments')
    if (!instruments) {
      ;({ data: instruments } = await supabase
        .from('instruments')
        .select('id, ticker, name, instrument_types(name)')
        .order('ticker'))
      if (instruments) cacheSet('instruments', instruments)
    }

    if (!instruments?.length) {
      searchEl.placeholder = 'Sin instrumentos — creá uno primero'
      searchEl.disabled = true
      return
    }

    const labelFor = (i) => `[${i.ticker}] ${i.name}${i.instrument_types?.name ? ` (${i.instrument_types.name})` : ''}`

    // Pre-fill si hay un instrumento seleccionado (editar / clonar)
    if (selectedId) {
      const found = instruments.find(i => i.id === selectedId)
      if (found) {
        hiddenEl.value   = found.id
        searchEl.value   = labelFor(found)
      }
    }

    const renderList = (query) => {
      const q = query.trim().toLowerCase()
      const filtered = q
        ? instruments.filter(i =>
            i.ticker.toLowerCase().includes(q) ||
            i.name.toLowerCase().includes(q)
          )
        : instruments

      if (!filtered.length) {
        listEl.innerHTML = `<li class="combobox-empty">Sin resultados para "${esc(query)}"</li>`
      } else {
        listEl.innerHTML = filtered.map(i =>
          `<li class="combobox-option" data-id="${i.id}" data-label="${esc(labelFor(i))}">`+
          `<span class="combobox-ticker">${esc(i.ticker)}</span>`+
          `<span class="combobox-name">${esc(i.name)}</span>`+
          `</li>`
        ).join('')

        listEl.querySelectorAll('.combobox-option').forEach(opt => {
          opt.addEventListener('mousedown', (e) => {
            e.preventDefault() // evita que blur se dispare antes
            hiddenEl.value  = opt.dataset.id
            searchEl.value  = opt.dataset.label
            listEl.hidden   = true
            searchEl.classList.remove('field-error-input')
            // Limpiar mensaje de error si había
            const errMsg = searchEl.closest('.form-group')?.querySelector('.field-error-msg')
            if (errMsg) errMsg.remove()
          })
        })
      }

      listEl.hidden = false
    }

    searchEl.addEventListener('input', () => {
      // Si el usuario edita el texto, limpiar la selección oculta
      hiddenEl.value = ''
      renderList(searchEl.value)
    })

    searchEl.addEventListener('focus', () => {
      renderList(searchEl.value)
    })

    searchEl.addEventListener('blur', () => {
      // Pequeño delay para permitir el mousedown del option
      setTimeout(() => {
        listEl.hidden = true
        // Si no hay nada seleccionado, limpiar el texto
        if (!hiddenEl.value) searchEl.value = ''
      }, 150)
    })

    searchEl.addEventListener('keydown', (e) => {
      if (listEl.hidden) return
      const opts = listEl.querySelectorAll('.combobox-option')
      const active = listEl.querySelector('.combobox-option.active')
      let idx = [...opts].indexOf(active)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        idx = (idx + 1) % opts.length
        opts.forEach(o => o.classList.remove('active'))
        opts[idx]?.classList.add('active')
        opts[idx]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        idx = idx <= 0 ? opts.length - 1 : idx - 1
        opts.forEach(o => o.classList.remove('active'))
        opts[idx]?.classList.add('active')
        opts[idx]?.scrollIntoView({ block: 'nearest' })
      } else if (e.key === 'Enter' && active) {
        e.preventDefault()
        hiddenEl.value = active.dataset.id
        searchEl.value = active.dataset.label
        listEl.hidden  = true
      } else if (e.key === 'Escape') {
        listEl.hidden = true
        if (!hiddenEl.value) searchEl.value = ''
      }
    })
  },

  async _loadAlycsSelect(selectedId = null) {
    const sel = document.getElementById('op-alyc')
    if (!sel) return

    let data = cacheGet('alycs')
    if (!data) {
      ;({ data } = await supabase.from('alycs').select('id,name').order('name'))
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
          <button type="button" class="btn btn-sm btn-ghost" id="modal-close" aria-label="Cerrar">✕</button>
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

      let hasError = false
      if (!ticker) { setFieldError('modal-ticker', 'Ingresá un ticker');   hasError = true }
      if (!name)   { setFieldError('modal-name',   'Ingresá un nombre');   hasError = true }
      if (!typeId) { setFieldError('modal-type',   'Seleccioná un tipo'); hasError = true }
      if (hasError) return

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

  async _showAlycModal() {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="margin:0">Nueva ALyC</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="modal-alyc-close" aria-label="Cerrar">✕</button>
        </div>
        <form id="modal-alyc-form" novalidate>
          <div class="form-group">
            <label for="modal-alyc-name">Nombre *</label>
            <input type="text" id="modal-alyc-name" placeholder="Ej: IOL invertironline" required>
          </div>
          <div class="form-group">
            <label for="modal-alyc-cuit">CUIT</label>
            <input type="text" id="modal-alyc-cuit" placeholder="Ej: 30-12345678-9">
          </div>
          <div class="form-group">
            <label for="modal-alyc-website">Sitio web</label>
            <input type="url" id="modal-alyc-website" placeholder="Ej: https://www.iol.com.ar">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="modal-alyc-submit">+ Agregar</button>
            <button type="button" class="btn btn-ghost" id="modal-alyc-cancel">Cancelar</button>
          </div>
        </form>
      </div>`

    document.body.appendChild(overlay)

    const close = () => overlay.remove()
    document.getElementById('modal-alyc-close').addEventListener('click', close)
    document.getElementById('modal-alyc-cancel').addEventListener('click', close)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

    const nameInput = document.getElementById('modal-alyc-name')
    nameInput.focus()

    document.getElementById('modal-alyc-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const name    = nameInput.value.trim()
      const cuit    = document.getElementById('modal-alyc-cuit').value.trim()
      const website = document.getElementById('modal-alyc-website').value.trim()

      if (!name) { setFieldError('modal-alyc-name', 'El nombre es obligatorio'); return }

      const btn = document.getElementById('modal-alyc-submit')
      btn.disabled    = true
      btn.textContent = 'Guardando...'

      try {
        const result = await apiRequest('POST', '/api/alycs', { name, cuit: cuit || null, website: website || null })
        const newId  = Array.isArray(result) ? result[0]?.id : result?.id
        cacheInvalidate('alycs')
        showToast(`ALyC "${name}" creada.`, 'success')
        close()
        await this._loadAlycsSelect(newId)
      } catch (err) {
        showToast(err.code === '23505' ? `La ALyC "${name}" ya existe.` : 'Error al guardar.', 'error')
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

  _bindFormSubmit(overlay) {
    const form    = document.getElementById('form-op')
    const editing = state.editingOperation
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

      let hasError = false
      if (!type)                           { setFieldError('op-type',       'Seleccioná un tipo de operación'); hasError = true }
      if (!operatedAt)                     { setFieldError('op-date',       'Ingresá una fecha');              hasError = true }
      if (!instrumentId)                   { setFieldError('op-instrument-search', 'Seleccioná un instrumento'); hasError = true }
      if (!alycId)                         { setFieldError('op-alyc',       'Seleccioná una ALyC');           hasError = true }
      if (!qty   || parseFloat(qty)   <= 0){ setFieldError('op-qty',        'Ingresá una cantidad mayor a 0'); hasError = true }
      if (!price || parseFloat(price) <= 0){ setFieldError('op-price',      'Ingresá un precio mayor a 0');   hasError = true }
      if (hasError) return

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
        if (editing && !editing._cloning) {
          await apiRequest('PATCH', `/api/operations/${editing.id}`, payload)
          showToast('Operación actualizada correctamente.', 'success')
        } else {
          await apiRequest('POST', '/api/operations', payload)
          showToast('Operación registrada correctamente.', 'success')
        }
        cacheInvalidate('user_holdings')
        state.editingOperation = null
        overlay.remove()
        await this._loadList(state.pagination.currentPage)
      } catch {
        showToast('Error al guardar la operación.', 'error')
        btn.disabled    = false
        btn.textContent = editing?._cloning ? 'Clonar operación' : editing ? 'Guardar cambios' : 'Registrar operación'
      }
    })
  },

  cleanup() {
    if (state.searchTimer) {
      clearTimeout(state.searchTimer)
      state.searchTimer = null
    }
    state.editingOperation = null
    state.pagination.currentPage = 0
    state.pagination.requestId = null
    Object.assign(state.filters, {
      searchQuery: '',
      alycFilter: '',
      instrumentFilter: '',
      typeFilter: '',
      currencyFilter: '',
      dateFrom: '',
      dateTo: ''
    })
  }
}
