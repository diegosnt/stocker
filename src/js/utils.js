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

const _dp = () => window.DOMPurify

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
