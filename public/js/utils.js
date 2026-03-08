export function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function confirmModal({ title, message, confirmLabel = 'Eliminar' }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${title}</h3>
        <p class="modal-message">${message}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-danger"    id="modal-confirm">${confirmLabel}</button>
        </div>
      </div>`
    document.body.appendChild(overlay)

    const close = result => {
      document.removeEventListener('keydown', onKey)
      overlay.remove()
      resolve(result)
    }

    const onKey = e => { if (e.key === 'Escape') close(false) }
    document.addEventListener('keydown', onKey)

    overlay.querySelector('#modal-cancel').addEventListener('click', () => close(false))
    overlay.querySelector('#modal-confirm').addEventListener('click', () => close(true))
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false) })

    // foco en el botón cancelar por seguridad
    overlay.querySelector('#modal-cancel').focus()
  })
}
