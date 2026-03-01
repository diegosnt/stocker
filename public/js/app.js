import { onAuthChange, signOut } from './auth.js'
import { register, start, navigate, currentHash } from './router.js'
import { LoginPage }           from './pages/login.js'
import { InstrumentTypesPage } from './pages/instrument-types.js'
import { InstrumentsPage }     from './pages/instruments.js'
import { AlycsPage }           from './pages/alycs.js'
import { OperationsPage }      from './pages/operations.js'
import { SettingsPage }        from './pages/settings.js'

const app = document.getElementById('app')

// ── Toast ──────────────────────────────────────────────────
let toastContainer = null

export function showToast(msg, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = msg
  toastContainer.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}

// ── Layout principal ───────────────────────────────────────
function renderShell(userEmail) {
  app.innerHTML = `
    <div class="app-shell">
      <nav class="navbar">
        <button class="navbar-hamburger" id="btn-menu" aria-label="Menú">&#9776;</button>
        <span class="navbar-brand"><img class="navbar-logo" src="/img/logo.svg" alt=""> Stocker</span>
        <span class="navbar-user">${userEmail}</span>
        <button class="navbar-logout" id="btn-logout">Salir</button>
      </nav>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="app-body">
        <aside class="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Operaciones</div>
            <a class="sidebar-link" data-route="operations">Historial</a>
            <a class="sidebar-link" data-route="new-operation">Nueva Operación</a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Maestros</div>
            <a class="sidebar-link" data-route="instrument-types">Tipos de Instrumento</a>
            <a class="sidebar-link" data-route="instruments">Instrumentos</a>
            <a class="sidebar-link" data-route="alycs">ALyCs</a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Sistema</div>
            <a class="sidebar-link" data-route="settings">Configuración</a>
          </div>
        </aside>
        <main class="main-content" id="page-content"></main>
      </div>
    </div>`

  // Drawer (mobile)
  const sidebar = app.querySelector('.sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  const openDrawer  = () => { sidebar.classList.add('open');    overlay.classList.add('open') }
  const closeDrawer = () => { sidebar.classList.remove('open'); overlay.classList.remove('open') }

  document.getElementById('btn-menu').addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeDrawer() : openDrawer()
  )
  overlay.addEventListener('click', closeDrawer)
  window.addEventListener('resize', () => { if (window.innerWidth > 768) closeDrawer() })

  // Navegación por sidebar
  app.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      navigate(link.dataset.route)
      closeDrawer()
    })
  })

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await signOut()
    } catch (e) {
      showToast('Error al cerrar sesión', 'error')
    }
  })

  // Registrar rutas
  register('operations',       () => OperationsPage.render('list'))
  register('new-operation',    () => OperationsPage.render('form'))
  register('instrument-types', () => InstrumentTypesPage.render())
  register('instruments',      () => InstrumentsPage.render())
  register('alycs',            () => AlycsPage.render())
  register('settings',         () => SettingsPage.render())

  start()
}

// ── Punto de entrada ───────────────────────────────────────
onAuthChange((session) => {
  if (session) {
    renderShell(session.user.email)
  } else {
    app.innerHTML = ''
    LoginPage.mount(app)
  }
})
