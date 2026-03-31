import { supabase } from '../supabase-client.js'
import { showToast } from '../init.js'
import { apiRequest } from '../api-client.js'
import { get as cacheGet, set as cacheSet, invalidate as cacheInvalidate } from '../cache.js'
import { esc, confirmModal, setFieldError } from '../utils.js'

const ICON_EDIT   = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`
const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`

const PAGE_SIZE = 10

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

export const OperationsPage = {
  async render() {
    await this._renderList()
  },

  // ── Listado ──────────────────────────────────────────────
  async _renderList() {
    state.pagination.currentPage = 0
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Operaciones</h2>
        <div style="display:flex; gap:0.5rem">
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
              <div class="op-card skeleton" style="height: 120px; border: none"></div>
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
      await this._handleCsvImport(file)
      inputCsv.value = '' // Reset
    })
    this._bindSearch()
    this._bindFilters()
    this._bindSortHeaders()
    await Promise.all([this._loadAlycFilter(), this._loadInstrumentFilter(), this._loadList(0)])
  },

  async _handleCsvImport(file) {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length < 2) {
      showToast('Archivo vacío o sin datos.', 'error')
      return
    }

    // Cabecera: Alyc;Operacion;Fecha Operacion;Precio;Moneda;Especie;Cantidad
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1)

    const operations = rows.map(row => {
      const cols = row.split(';').map(c => c.trim())
      if (cols.length < 7) return null

      // Mapear columnas a objeto
      const raw = {}
      headers.forEach((h, i) => raw[h] = cols[i])

      // Normalizar datos
      // Alyc;Operacion;Fecha Operacion;Precio;Moneda;Especie;Cantidad
      const type = raw['operacion']?.toLowerCase() === 'compra' ? 'compra' : 'venta'
      const alyc = raw['alyc']
      const ticker = raw['especie']
      
      // Fecha: DD/MM/YY -> YYYY-MM-DD
      let operated_at = ''
      const dateParts = raw['fecha operacion']?.split('/')
      if (dateParts?.length === 3) {
        const [d, m, y] = dateParts
        const fullYear = y.length === 2 ? `20${y}` : y
        operated_at = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }

      // Precios y cantidades: 25.260,00 -> 25260.00 (soporta formato europeo y anglosajón)
      const parseNum = (s) => {
        if (!s) return 0
        const cleaned = s.trim()
        const hasComma = cleaned.includes(',')
        const hasDot = cleaned.includes('.')
        if (hasComma && hasDot) {
          const lastComma = cleaned.lastIndexOf(',')
          const lastDot = cleaned.lastIndexOf('.')
          if (lastComma > lastDot) {
            return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
          } else {
            return parseFloat(cleaned.replace(/,/g, ''))
          }
        } else if (hasComma) {
          return parseFloat(cleaned.replace(',', '.'))
        } else if (hasDot) {
          return parseFloat(cleaned.replace(/,/g, ''))
        }
        return parseFloat(cleaned) || 0
      }
      const price = parseNum(raw['precio'])
      const quantity = parseNum(raw['cantidad'])

      // Moneda: ARG -> ARS
      let currency = raw['moneda']?.toUpperCase()
      if (currency === 'ARG') currency = 'ARS'

      return { type, alyc, ticker, operated_at, price, quantity, currency }
    }).filter(op => op !== null)

    if (operations.length === 0) {
      showToast('No se encontraron registros válidos.', 'error')
      return
    }

    try {
      showToast(`Procesando ${operations.length} registros...`, 'info')
      
      let res
      let allFailedEntities = []

      try {
        res = await apiRequest('POST', '/api/operations/bulk', { operations })
        if (res.failed_entities) allFailedEntities = res.failed_entities
      } catch (err) {
        if (err.status === 409) {
          const { duplicates, clean_ops, failed_entities } = err.response
          if (failed_entities) allFailedEntities = failed_entities

          // Mostramos el modal. selection será 'CANCEL_ALL' si aborta, o un array de dups seleccionados.
          const selection = await this._showDuplicateSelectionModal(duplicates, clean_ops.length)
          
          if (selection === 'CANCEL_ALL') {
            if (allFailedEntities.length > 0) await this._showFailedEntitiesModal(allFailedEntities)
            showToast('Importación cancelada.', 'info')
            return
          }

          const selectedDuplicates = Array.isArray(selection) ? selection : []
          const finalOps = [...clean_ops, ...selectedDuplicates]
          
          if (finalOps.length === 0) {
            if (allFailedEntities.length > 0) await this._showFailedEntitiesModal(allFailedEntities)
            showToast('No se seleccionaron operaciones para importar.', 'info')
            return
          }
          res = await apiRequest('POST', '/api/operations/bulk', { 
            operations: finalOps, 
            skip_duplicate_check: true 
          })
        } else {
          throw err
        }
      }
      
      const { imported, skipped } = res
      if (res.failed_entities && allFailedEntities.length === 0) {
        allFailedEntities = res.failed_entities
      }

      let msg = `Importación finalizada: ${imported} importados, ${skipped} omitidos/duplicados.`
      showToast(msg, allFailedEntities.length > 0 ? 'warning' : 'success')
      if (imported > 0) cacheInvalidate('user_holdings')
      
      if (allFailedEntities.length > 0) {
        await this._showFailedEntitiesModal(allFailedEntities)
      }

      await this._loadList(0)
    } catch (err) {
      console.error('Error en importación masiva:', err)
      showToast('Error al procesar el archivo CSV.', 'error')
    }
  },

  async _showFailedEntitiesModal(failedEntities) {
    return new Promise(resolve => {
      const overlay = document.createElement('div')
      overlay.className = 'modal-overlay'
      
      const rowsHtml = failedEntities.map(op => `
        <tr>
          <td>${op.row || '—'}</td>
          <td>${op.operated_at ? fmtDateShort(op.operated_at) : '—'}</td>
          <td><span class="ticker-chip">${esc(op._raw?.ticker || '—')}</span></td>
          <td>${esc(op._raw?.alyc || '—')}</td>
          <td style="color: var(--color-danger)">${esc(op.error)}</td>
        </tr>
      `).join('')

      overlay.innerHTML = `
        <div class="modal-card modal-card-lg">
          <div class="modal-header">
            <h3 style="margin:0">Registros no importados</h3>
            <button type="button" class="btn btn-sm btn-ghost" id="btn-failed-close">✕</button>
          </div>
          <div style="padding: 1rem; border-bottom: 1px solid var(--border); background: #fff5f5; color: #c53030; font-size: 0.9rem">
            Los siguientes <strong>${failedEntities.length}</strong> registros no pudieron cargarse porque los datos son incompletos o las entidades no existen. 
            Por favor, verificá que los instrumentos y ALyCs estén creados en el sistema.
          </div>
          <div class="table-wrapper" style="max-height: 400px; overflow-y: auto">
            <table class="ops-table">
              <thead>
                <tr>
                  <th style="width:50px">Fila</th>
                  <th>Fecha</th>
                  <th>Ticker</th>
                  <th>ALyC</th>
                  <th>Motivo del error</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div class="form-actions" style="margin-top:0; padding:1.5rem">
            <button class="btn btn-primary" id="btn-failed-ok">Entendido</button>
          </div>
        </div>`

      document.body.appendChild(overlay)

      const close = () => {
        overlay.remove()
        resolve()
      }

      overlay.querySelector('#btn-failed-close').addEventListener('click', close)
      overlay.querySelector('#btn-failed-ok').addEventListener('click', close)
    })
  },

  async _showDuplicateSelectionModal(duplicates, cleanCount = 0) {
    return new Promise(resolve => {
      const overlay = document.createElement('div')
      overlay.className = 'modal-overlay'
      
      const rowsHtml = duplicates.map((op, idx) => `
        <tr>
          <td style="text-align:center"><input type="checkbox" class="dup-check" data-idx="${idx}"></td>
          <td>${fmtDateShort(op.operated_at)}</td>
          <td><span class="ticker-chip">${esc(op._raw?.ticker || '—')}</span></td>
          <td>${esc(op._raw?.alyc || '—')}</td>
          <td>${op.type.toUpperCase()}</td>
          <td style="text-align:right">${op.quantity.toLocaleString('es-AR')}</td>
          <td style="text-align:right">${op.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
          <td>${op.currency}</td>
        </tr>
      `).join('')

      overlay.innerHTML = `
        <div class="modal-card modal-card-lg">
          <div class="modal-header">
            <h3 style="margin:0">Duplicados detectados</h3>
            <button type="button" class="btn btn-sm btn-ghost" id="btn-dup-close">✕</button>
          </div>
          <div style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--bg-main); font-size: 0.9rem">
            ${cleanCount > 0 ? `<div style="margin-bottom:0.5rem; color:var(--color-primary)"><strong>Hay ${cleanCount} registros nuevos listos para importar.</strong></div>` : ''}
            Se encontraron <strong>${duplicates.length}</strong> operaciones que ya existen. 
            Marcá las que quieras volver a importar, o dejá todo desmarcado para importar solo los registros nuevos.
          </div>
          <div class="table-wrapper" style="max-height: 400px; overflow-y: auto">
            <table class="ops-table">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center"><input type="checkbox" id="dup-check-all"></th>
                  <th>Fecha</th>
                  <th>Ticker</th>
                  <th>ALyC</th>
                  <th>Tipo</th>
                  <th style="text-align:right">Cant.</th>
                  <th style="text-align:right">Precio</th>
                  <th>Mon.</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div class="form-actions" style="margin-top:0; padding:1.5rem">
            <button class="btn btn-primary" id="btn-dup-confirm">Confirmar y continuar</button>
            <button class="btn btn-ghost" id="btn-dup-cancel">Abortar toda la importación</button>
          </div>
        </div>`

      document.body.appendChild(overlay)

      const close = (result) => {
        overlay.remove()
        resolve(result)
      }

      overlay.querySelector('#btn-dup-close').addEventListener('click', () => close('CANCEL_ALL'))
      overlay.querySelector('#btn-dup-cancel').addEventListener('click', () => close('CANCEL_ALL'))
      
      const checkAll = overlay.querySelector('#dup-check-all')
      const checks = overlay.querySelectorAll('.dup-check')
      
      checkAll.addEventListener('change', () => {
        checks.forEach(c => c.checked = checkAll.checked)
      })

      overlay.querySelector('#btn-dup-confirm').addEventListener('click', () => {
        const selected = []
        checks.forEach(c => {
          if (c.checked) selected.push(duplicates[parseInt(c.dataset.idx)])
        })
        close(selected)
      })
    })
  },

  async _loadList(page = 0) {
    const tbody    = document.getElementById('ops-tbody')
    const opsCards = document.getElementById('ops-cards')
    if (!tbody) return

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
                <button class="btn btn-danger btn-delete-op" data-id="${op.id}">${ICON_DELETE} Eliminar</button>
              </div>
            </div>
          </td>
        </tr>`

      cardsHtml += `
        <div class="op-card op-card-${op.type}" data-id="${op.id}">
          <div class="op-card-top">
            <span class="op-card-date">${fmtDateShort(op.operated_at)}</span>
            <div class="op-card-badges">
          <div class="op-card-alyc">${esc(alycName)}</div>
            </div>
          </div>
          <div class="op-card-instrument">
            <span class="ticker-chip">${esc(ticker)}</span>
            <span class="op-card-inst-name">${esc(instName)}</span>
          </div>

          <div class="op-card-amounts">
            <div class="op-card-amount-item">
              <span class="op-card-label">CANT</span>
               <strong class="total-${op.type}">${fmtQty(op.quantity)}</strong>
            </div>
            <div class="op-card-amount-item">
              <span class="op-card-label">Precio</span>
              <strong>${fmtPrice(parseFloat(op.price))}</strong>
            </div>
            <div class="op-card-amount-item">
              <span class="op-card-label">Total</span>
              <strong>${fmtPrice(total)}</strong>
            </div>
          </div>
          ${hasNotes ? `<div class="op-card-notes">${esc(op.notes)}</div>` : ''}
          <div class="op-card-actions">
            <button class="btn btn-sm btn-ghost btn-edit-op" data-op-idx="${idx}" title="Editar" aria-label="Editar">${ICON_EDIT} Editar</button>
            <button class="btn btn-sm btn-danger btn-delete-op" data-id="${op.id}" title="Eliminar" aria-label="Eliminar">${ICON_DELETE} Eliminar</button>
          </div>
        </div>`
    })

    tbody.innerHTML = rowsHtml
    if (opsCards) opsCards.innerHTML = cardsHtml

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

    const handleDelete = async (btn) => {
      await this._deleteOp(btn.dataset.id)
    }

    tbody.querySelectorAll('.btn-edit-op').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); handleEdit(btn) })
    })
    tbody.querySelectorAll('.btn-delete-op').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); handleDelete(btn) })
    })

    if (opsCards) {
      opsCards.querySelectorAll('.btn-edit-op').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); handleEdit(btn) })
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
    const pages = _buildPageRange(page, totalPages)

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
          <h3 style="margin:0">${editing ? 'Editar Operación' : 'Nueva Operación'}</h3>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-op-close">✕</button>
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
              <label for="op-instrument">Instrumento *</label>
              <div style="display:flex; gap:0.5rem; align-items:center">
                <select id="op-instrument" required style="flex:1"><option value="">Cargando...</option></select>
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
              ${editing ? 'Guardar cambios' : 'Registrar operación'}
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
          <button type="button" class="btn btn-sm btn-ghost" id="modal-alyc-close">✕</button>
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
      if (!instrumentId)                   { setFieldError('op-instrument', 'Seleccioná un instrumento');      hasError = true }
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
        if (editing) {
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
        btn.textContent = editing ? 'Guardar cambios' : 'Registrar operación'
      }
    })
  }
}


function fmtDateShort(iso) {
  if (!iso) return '—'
  const datePart = iso.split('T')[0]
  const [y, m, d] = datePart.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

// Genera un rango de páginas con elipsis, ej: [0,1,'...',8,9,10,'...',19,20]
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
