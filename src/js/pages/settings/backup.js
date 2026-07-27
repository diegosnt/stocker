import { supabase } from '../../supabase-client.js'
import { showToast } from '../../init.js'

const BACKUP_TABLES = ['instrument_types', 'instruments', 'alycs', 'operations']
const PAGE_SIZE = 1000

// Trae todas las filas de una tabla (RLS ya las limita al usuario logueado),
// paginando de a PAGE_SIZE porque PostgREST corta la respuesta por defecto.
async function fetchAllRows(table) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

function mdEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

async function fetchAllOperationsSearch() {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('operations_search')
      .select('*')
      .order('operated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

export async function downloadOperationsMarkdown(button) {
  const originalText = button.innerHTML
  button.innerHTML = 'Generando...'
  button.disabled = true

  try {
    const ops = await fetchAllOperationsSearch()

    if (ops.length === 0) {
      showToast('No hay operaciones para exportar.', 'info')
      return
    }

    const headers = ['Fecha', 'Ticker', 'Nombre', 'ALyC', 'Tipo', 'Cantidad', 'Precio', 'Moneda', 'Notas']
    const tableLines = [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...ops.map(op => `| ${[
        (op.operated_at || '').split('T')[0] || '—',
        mdEscape(op.instrument_ticker || '—'),
        mdEscape(op.instrument_name || '—'),
        mdEscape(op.alyc_name || '—'),
        op.type || '—',
        op.quantity ?? 0,
        op.price ?? 0,
        op.currency || '—',
        mdEscape(op.notes)
      ].join(' | ')} |`)
    ]

    const mdContent = [
      '# Operaciones — Stocker',
      '',
      `Exportado: ${new Date().toISOString()}`,
      `Total: ${ops.length} operaciones`,
      '',
      ...tableLines,
      ''
    ].join('\n')

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const dateStr = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute('download', `stocker_operaciones_${dateStr}.md`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast(`Exportadas ${ops.length} operaciones a Markdown.`, 'success')
  } catch (err) {
    console.error('Error exportando operaciones a Markdown:', err)
    showToast('Error al exportar. Intentá de nuevo.', 'error')
  } finally {
    button.innerHTML = originalText
    button.disabled = false
  }
}

export async function downloadFullBackup(button) {
  const originalText = button.innerHTML
  button.innerHTML = 'Generando backup...'
  button.disabled = true

  try {
    const [instrument_types, instruments, alycs, operations] = await Promise.all(
      BACKUP_TABLES.map(fetchAllRows)
    )

    const backup = {
      backup_version: 1,
      exported_at: new Date().toISOString(),
      instrument_types,
      instruments,
      alycs,
      operations
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const dateStr = new Date().toISOString().split('T')[0]
    link.setAttribute('href', url)
    link.setAttribute('download', `stocker_backup_${dateStr}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const total = instrument_types.length + instruments.length + alycs.length + operations.length
    showToast(`Backup generado: ${operations.length} operaciones, ${total} registros en total.`, 'success')
  } catch (err) {
    console.error('Error generando backup:', err)
    showToast('Error al generar el backup. Intentá de nuevo.', 'error')
  } finally {
    button.innerHTML = originalText
    button.disabled = false
  }
}
