import { supabase } from '../supabase-client.js'
import { showToast } from '../app.js'
import { navigate }  from '../router.js'

// Estado de edición — persiste entre navegación de lista → formulario
let _editingOperation = null

async function postOperation(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify(payload)
  })
  const json = await res.json()
  if (!res.ok) throw new Error('Error al guardar la operación')
  return json.data
}

async function patchOperation(id, payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/operations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify(payload)
  })
  const json = await res.json()
  if (!res.ok) throw new Error('Error al actualizar la operación')
  return json.data
}

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
    const content = document.getElementById('page-content')
    content.innerHTML = `
      <div class="page-header">
        <h2>Historial de Operaciones</h2>
        <button class="btn btn-blue" id="btn-nueva-op">+ Nueva Operación</button>
      </div>

      <div class="card" style="padding:0">
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
      </div>`

    document.getElementById('btn-nueva-op').addEventListener('click', () => {
      _editingOperation = null
      navigate('new-operation')
    })
    await this._loadList()
  },

  async _loadList() {
    const tbody = document.getElementById('ops-tbody')
    if (!tbody) return

    const { data, error } = await supabase
      .from('operations')
      .select('*, instruments(ticker, name), alycs(name)')
      .order('operated_at', { ascending: false })
      .order('created_at',  { ascending: false })

    if (error) {
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Error al cargar.</td></tr>`
      return
    }

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="table-empty">No hay operaciones registradas.</td></tr>`
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
            <button class="btn btn-sm btn-red btn-delete-op" data-id="${op.id}">Eliminar</button>
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
  },

  async _deleteOp(id) {
    if (!confirm('¿Eliminar esta operación? Esta acción no se puede deshacer.')) return

    const { error } = await supabase.from('operations').delete().eq('id', id)

    if (error) { showToast('Error al eliminar.', 'error'); return }

    showToast('Operación eliminada.', 'success')
    await this._loadList()
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
              <select id="op-instrument" required><option value="">Cargando...</option></select>
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

          <div id="op-total-row" style="display:none;margin:-.25rem 0 .75rem;padding:.5rem .75rem;background:var(--color-bg);border-radius:4px;font-size:.88rem">
            Total estimado: <strong id="op-total-value">—</strong>
          </div>

          <div class="form-group">
            <label for="op-notes">Notas</label>
            <textarea id="op-notes" placeholder="Observaciones opcionales..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-blue" id="btn-op-submit">
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

    const goBack = () => { _editingOperation = null; navigate('operations') }
    document.getElementById('btn-volver').addEventListener('click', goBack)
    document.getElementById('btn-op-cancel').addEventListener('click', goBack)

    await Promise.all([
      this._loadInstrumentsSelect(editing?.instrument_id),
      this._loadAlycsSelect(editing?.alyc_id)
    ])

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

    const { data } = await supabase
      .from('instruments')
      .select('id, ticker, name, instrument_types(name)')
      .order('ticker')

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

    const { data } = await supabase.from('alycs').select('id, name').order('name')

    if (!data?.length) {
      sel.innerHTML = '<option value="">— Sin ALyCs (creá una primero) —</option>'
      return
    }

    sel.innerHTML = '<option value="">— Seleccioná una ALyC —</option>' +
      data.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')
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
          await patchOperation(editing.id, payload)
          showToast('Operación actualizada correctamente.', 'success')
        } else {
          await postOperation(payload)
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
