// Router simple basado en hash (#ruta)
const routes = {}
const cleanups = {}
let currentRoute  = null
let _hashListener = null

export function register(hash, handler, cleanup) {
  routes[hash] = handler
  if (cleanup) {
    cleanups[hash] = cleanup
  }
}

export function navigate(hash) {
  window.location.hash = hash
}

export function start() {
  // Resetear ruta actual para que el render siempre ocurra al iniciar
  currentRoute = null

  // Evitar listeners duplicados si onAuthChange dispara más de una vez
  if (_hashListener) window.removeEventListener('hashchange', _hashListener)
  _hashListener = () => resolve()
  window.addEventListener('hashchange', _hashListener)

  resolve()
}

function resolve() {
  const hash = window.location.hash.replace('#', '') || 'operations'
  if (currentRoute === hash) return

  // Ejecutar cleanup de la ruta actual antes de navegar
  if (currentRoute && cleanups[currentRoute]) {
    cleanups[currentRoute]()
  }

  currentRoute = hash

  const handler = routes[hash]
  if (handler) {
    handler()
  } else {
    // Ruta desconocida: ir a operaciones
    navigate('operations')
  }

  // Actualizar sidebar link activo
  document.querySelectorAll('.sidebar-link').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash)
  })
}

export function currentHash() {
  return window.location.hash.replace('#', '') || 'operations'
}
