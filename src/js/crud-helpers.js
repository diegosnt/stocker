// Helpers compartidos por las páginas ABM simples (instrument-types, instruments, alycs).
// Separado de utils.js para evitar un import circular: showToast vive en init.js,
// que a su vez importa de utils.js.
import { apiRequest } from './api-client.js'
import { showToast } from './init.js'
import { invalidate as cacheInvalidate } from './cache.js'
import { confirmModal } from './utils.js'

// Confirma, borra vía API, invalida cache y muestra el resultado — mismo flujo
// repetido en las 3 páginas ABM. Devuelve true si se borró, false si se canceló o falló.
export async function deleteWithConfirm({
  title, message, endpoint, cacheKey, successMessage,
  conflictCode = '23503', conflictMessage, genericMessage = 'Error al eliminar.',
  onDone
}) {
  const ok = await confirmModal({ title, message })
  if (!ok) return false

  try {
    await apiRequest('DELETE', endpoint)
    cacheInvalidate(cacheKey)
    showToast(successMessage, 'success')
    if (onDone) await onDone()
    return true
  } catch (err) {
    showToast(err.code === conflictCode ? conflictMessage : genericMessage, 'error')
    return false
  }
}
