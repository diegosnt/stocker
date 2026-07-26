export function setFieldError(fieldId, message) {
  const el = document.getElementById(fieldId)
  if (!el) return
  el.classList.add('field-error-input')
  const group = el.closest('.form-group')
  if (group) {
    group.querySelector('.field-error-msg')?.remove()
    const msg = document.createElement('span')
    msg.className   = 'field-error-msg'
    msg.textContent = message
    group.appendChild(msg)
  }
  const clear = () => {
    el.classList.remove('field-error-input')
    el.closest('.form-group')?.querySelector('.field-error-msg')?.remove()
  }
  el.addEventListener('input',  clear, { once: true })
  el.addEventListener('change', clear, { once: true })
}

// Devuelve una alerta de concentración si el ítem de mayor peso supera el umbral,
// o null si la cartera está razonablemente diversificada en esa dimensión.
export function getConcentrationAlert(items, { subject, thresholdWarning, thresholdDanger }) {
  if (!items || items.length === 0) return null
  const top = items.reduce((max, it) => it.weight > max.weight ? it : max, items[0])
  if (top.weight < thresholdWarning) return null
  const level = top.weight >= thresholdDanger ? 'danger' : 'warning'
  return {
    level,
    message: `El ${top.weight.toFixed(1)}% de ${subject} está concentrado en ${esc(top.label)}. Considerá diversificar.`
  }
}

export function renderRiskAlerts(alerts) {
  if (!alerts || alerts.length === 0) return ''
  return alerts.map(a => `
    <div class="risk-alert risk-alert--${a.level}">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>${a.message}</span>
    </div>`).join('')
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function fmtDateShort(iso) {
  if (!iso) return '—'
  const datePart = iso.split('T')[0]
  const [y, m, d] = datePart.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function buildPageRange(current, total) {
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

export function initDarkMode() {
  const isDark = localStorage.getItem('dark-mode') === 'true'
  if (isDark) document.body.classList.add('dark-mode')
}

let darkModeTimeout = null

export function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode')
  document.dispatchEvent(new CustomEvent('darkmodechange', { detail: { isDark } }))
  if (darkModeTimeout) clearTimeout(darkModeTimeout)
  darkModeTimeout = setTimeout(() => {
    localStorage.setItem('dark-mode', isDark)
    darkModeTimeout = null
  }, 300)
}

export function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// DOMPurify se precarga en background (ver init.js) y se registra acá vía
// setDOMPurify, en vez de depender de un global en `window`.
let _domPurify = null
export function setDOMPurify(instance) { _domPurify = instance }
const _dp = () => _domPurify

export function sanitize(str) {
  const dp = _dp()
  if (!dp) return String(str)
  return dp.sanitize(String(str), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function sanitizeAttr(str) {
  const dp = _dp()
  if (!dp) return String(str)
  return dp.sanitize(String(str), { ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'br', 'span'], ALLOWED_ATTR: ['style', 'class'] })
}

export function confirmModal({ title, message, confirmLabel = 'Eliminar' }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${sanitizeAttr(title)}</h3>
        <p class="modal-message">${sanitizeAttr(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-danger"    id="modal-confirm">${sanitize(confirmLabel)}</button>
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

// Bindea el click de columnas ordenables (th[data-col]) de UNA tabla, identificada por
// el id de su tbody. El caller es dueño del estado de orden; onChange recibe la columna
// clickeada y es responsable de actualizar ese estado y volver a renderizar las filas.
export function bindSortableHeaders(tbodyId, { getCol, getAsc, onChange }) {
  const headers = [...document.querySelectorAll('th[data-col]')]
    .filter(th => th.closest('table')?.querySelector(`#${tbodyId}`))

  const updateClasses = () => {
    headers.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc')
      if (th.dataset.col === getCol()) th.classList.add(getAsc() ? 'sort-asc' : 'sort-desc')
    })
  }

  headers.forEach(th => {
    th.addEventListener('click', () => {
      onChange(th.dataset.col)
      updateClasses()
    })
  })
  updateClasses()
}

// Compara los valores actuales de un form contra los que tenía al empezar a editar
// (guardados en form.dataset). Si hay cambios sin guardar, confirma con el usuario
// antes de descartarlos. Devuelve true si está OK seguir (no dirty, o confirmado).
export function confirmDiscardIfDirty(fields) {
  const isDirty = fields.some(({ inputId, form, datasetKey }) =>
    document.getElementById(inputId).value.trim() !== (form.dataset[datasetKey] || ''))
  return !isDirty || confirm('Tenés cambios sin guardar. ¿Descartarlos?')
}

// Vuelve un formulario de alta/edición a su estado "Nuevo" — mismo patrón repetido
// en instrument-types.js, instruments.js y alycs.js al cancelar una edición.
export function resetEditForm({ formId, titleId, submitId, cancelId, defaultTitle, defaultSubmitLabel = '+ Agregar' }) {
  document.getElementById(titleId).textContent = defaultTitle
  document.getElementById(formId).reset()
  document.getElementById(submitId).textContent = defaultSubmitLabel
  document.getElementById(cancelId).style.display = 'none'
  delete document.getElementById(formId).dataset.editId
}

// Header colapsable (div con onclick) que muestra/oculta un body y rota un chevron.
// Lo hace operable por teclado (Enter/Espacio) y expone aria-expanded — el patrón
// <div onclick> por sí solo no es alcanzable con Tab ni anunciado por lectores de pantalla.
export function bindCollapsibleSection({ headerId, bodyId, chevronId }) {
  const header  = document.getElementById(headerId)
  const body    = document.getElementById(bodyId)
  const chevron = chevronId ? document.getElementById(chevronId) : null
  if (!header || !body) return

  header.setAttribute('role', 'button')
  header.setAttribute('tabindex', '0')
  header.setAttribute('aria-expanded', String(body.style.display !== 'none'))

  const toggle = () => {
    const collapsed = body.style.display === 'none'
    body.style.display = collapsed ? '' : 'none'
    if (chevron) chevron.style.transform = collapsed ? '' : 'rotate(-90deg)'
    header.setAttribute('aria-expanded', String(collapsed))
  }

  header.addEventListener('click', toggle)
  header.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    toggle()
  })
}

// Acordeón de tarjetas mobile (`.dash-instrument-card` / `.dash-instrument-card-header`):
// togglea la clase `.collapsed` en la tarjeta contenedora. Mismo motivo que arriba —
// hace falta tabindex + rol + manejo de teclado porque el header es un <div>, no un <button>.
// scope acota la búsqueda (por default, todo el documento) para evitar re-bindear
// headers de otras secciones si se llama más de una vez por render.
export function bindCardAccordion(scope = document) {
  scope.querySelectorAll('.dash-instrument-card-header').forEach(header => {
    const card = header.closest('.dash-instrument-card')
    if (!card) return

    header.setAttribute('role', 'button')
    header.setAttribute('tabindex', '0')
    header.setAttribute('aria-expanded', String(!card.classList.contains('collapsed')))

    const toggle = () => {
      card.classList.toggle('collapsed')
      header.setAttribute('aria-expanded', String(!card.classList.contains('collapsed')))
    }

    header.addEventListener('click', toggle)
    header.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      toggle()
    })
  })
}
