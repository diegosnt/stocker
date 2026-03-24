import { onAuthChange, signOut } from './auth.js'
import { register, start, navigate, currentHash } from './router.js'
import { LoginPage }           from './pages/login.js'
import { InstrumentTypesPage } from './pages/instrument-types.js'
import { InstrumentsPage }     from './pages/instruments.js'
import { AlycsPage }           from './pages/alycs.js'
import { OperationsPage }      from './pages/operations.js'
import { SettingsPage }        from './pages/settings.js'
import { HoldingsAnalysisPage } from './pages/holdings-analysis.js'
import { AnalysisPage }         from './pages/analysis.js'
import { DashboardPage }        from './pages/dashboard.js'

const app = document.getElementById('app')

// ── Dark Mode ──────────────────────────────────────────────
function initDarkMode() {
  const isDark = localStorage.getItem('dark-mode') === 'true'
  if (isDark) document.body.classList.add('dark-mode')
}

export function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode')
  localStorage.setItem('dark-mode', isDark)
}

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
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(20px)'
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

const SUN_SVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
const MENU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`

// ── Layout principal ───────────────────────────────────────
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderShell(userEmail) {
  app.innerHTML = `
    <div class="app-shell">
      <nav class="navbar">
        <button class="navbar-hamburger" id="btn-menu" aria-label="Menú" style="display:none">
          ${MENU_SVG}
        </button>
        <span class="navbar-brand">
          <img class="navbar-logo" src="/img/logo.svg" alt=""> 
          <span>Stocker</span>
        </span>
        <div class="navbar-actions" style="display:flex; gap:0.75rem; align-items:center">
          <span class="navbar-user">${esc(userEmail)}</span>
          <button class="dark-mode-toggle" id="btn-dark-mode" title="Cambiar tema">
            ${SUN_SVG}${MOON_SVG}
          </button>
          <button class="navbar-logout" id="btn-logout">
            <span>Salir</span>
          </button>
        </div>
      </nav>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="app-body">
        <aside class="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Operaciones</div>
            <a class="sidebar-link" data-route="dashboard">Dashboard</a>
            <a class="sidebar-link" data-route="operations">Operaciones</a>
            <a class="sidebar-link" data-route="holdings-analysis">Tenencia</a>
            <a class="sidebar-link" data-route="analysis">Análisis</a>
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
    // Marcar activo inicialmente si coincide la ruta
    if (currentHash() === link.dataset.route) link.classList.add('active')
  })

  // Escuchar cambios de ruta para actualizar sidebar active
  window.addEventListener('hashchange', () => {
    app.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', currentHash() === link.dataset.route)
    })
  })

  // Dark Mode Toggle
  document.getElementById('btn-dark-mode').addEventListener('click', toggleDarkMode)

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await signOut()
    } catch (e) {
      showToast('Error al cerrar sesión', 'error')
    }
  })

  // Registrar rutas
  register('dashboard',         () => DashboardPage.render())
  register('operations',        () => OperationsPage.render())
  register('holdings-analysis', () => HoldingsAnalysisPage.render())
  register('analysis',          () => AnalysisPage.render())
  register('instrument-types',  () => InstrumentTypesPage.render())
  register('instruments',       () => InstrumentsPage.render())
  register('alycs',             () => AlycsPage.render())
  register('settings',          () => SettingsPage.render())

  start()
}

// ── Sesión expirada ────────────────────────────────────────
window.addEventListener('session-expired', async () => {
  try { await signOut() } catch {}
  showToast('Tu sesión expiró. Ingresá de nuevo.', 'error')
})

// ── Punto de entrada ───────────────────────────────────────
initDarkMode()

let _currentUserId = null

onAuthChange((session) => {
  if (session) {
    if (_currentUserId !== session.user.id) {
      _currentUserId = session.user.id
      renderShell(session.user.email)
    }
  } else {
    _currentUserId = null
    app.innerHTML = ''
    LoginPage.mount(app)
  }
})

// ── Service Worker ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] Registrado OK:', reg.scope))
      .catch((err) => console.error('[SW] Error:', err))
  })
}
