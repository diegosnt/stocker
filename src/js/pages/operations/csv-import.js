import { showToast } from '../../init.js'
import { apiRequest } from '../../api-client.js'
import { invalidate as cacheInvalidate } from '../../cache.js'
import { esc, fmtDateShort } from '../../utils.js'

export async function showFailedEntitiesModal(failedEntities) {
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
}

export async function showDuplicateSelectionModal(duplicates, cleanCount = 0) {
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
}

export async function handleCsvImport(file, ops) {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) {
    showToast('Archivo vacío o sin datos.', 'error')
    return
  }

  const headers = lines[0].split(';').map(h => h.trim().toLowerCase())
  const rows = lines.slice(1)

  const operations = rows.map(row => {
    const cols = row.split(';').map(c => c.trim())
    if (cols.length < 7) return null

    const raw = {}
    headers.forEach((h, i) => raw[h] = cols[i])

    const type = raw['operacion']?.toLowerCase() === 'compra' ? 'compra' : 'venta'
    const alyc = raw['alyc']
    const ticker = raw['especie']

    let operated_at = ''
    const dateParts = raw['fecha operacion']?.split('/')
    if (dateParts?.length === 3) {
      const [d, m, y] = dateParts
      const fullYear = y.length === 2 ? `20${y}` : y
      operated_at = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

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

        const selection = await showDuplicateSelectionModal(duplicates, clean_ops.length)

        if (selection === 'CANCEL_ALL') {
          if (allFailedEntities.length > 0) await showFailedEntitiesModal(allFailedEntities)
          showToast('Importación cancelada.', 'info')
          return
        }

        const selectedDuplicates = Array.isArray(selection) ? selection : []
        const finalOps = [...clean_ops, ...selectedDuplicates]

        if (finalOps.length === 0) {
          if (allFailedEntities.length > 0) await showFailedEntitiesModal(allFailedEntities)
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
      await showFailedEntitiesModal(allFailedEntities)
    }

    await ops._loadList(0)
  } catch (err) {
    console.error('Error en importación masiva:', err)
    showToast('Error al procesar el archivo CSV.', 'error')
  }
}
