import { onAuthChange, signOut } from './auth.js'
import { register, start, navigate, currentHash } from './router.js'
import { initDarkMode, toggleDarkMode } from './utils.js'
import { LoginPage }           from './pages/login.js'
import { InstrumentTypesPage } from './pages/instrument-types.js'
import { InstrumentsPage }     from './pages/instruments.js'
import { AlycsPage }           from './pages/alycs.js'
import { OperationsPage }      from './pages/operations.js'
import { SettingsPage }        from './pages/settings.js'
import { AnalysisPage }         from './pages/analysis.js'
import { DashboardPage }        from './pages/dashboard.js'

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
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

function renderShell(userEmail) {
  app.innerHTML = `
    <div class="app-shell">
      <nav class="navbar">
        <div class="navbar-brand">
          <img src="/img/logo.svg" alt="Logo" class="navbar-logo">
          <span>Stocker</span>
        </div>
        <div class="navbar-user">${userEmail}</div>
        <button class="dark-mode-toggle" id="theme-toggle" title="Cambiar tema">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
        <button class="navbar-logout" id="logout-btn">Salir</button>
      </nav>
      <div class="app-body">
        <aside class="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Cartera</div>
            <a href="#dashboard" class="sidebar-link" data-path="dashboard">Dashboard</a>
            <a href="#operations" class="sidebar-link" data-path="operations">Operaciones</a>
            <a href="#analysis" class="sidebar-link" data-path="analysis">Análisis Pro</a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Maestros</div>
            <a href="#instruments" class="sidebar-link" data-path="instruments">Instrumentos</a>
            <a href="#instrument-types" class="sidebar-link" data-path="instrument-types">Tipos</a>
            <a href="#alycs" class="sidebar-link" data-path="alycs">ALyCs / Brokers</a>
          </div>
          <div class="sidebar-section" style="margin-top: auto">
            <a href="#settings" class="sidebar-link" data-path="settings">Configuración</a>
          </div>
        </aside>
        <main class="main-content" id="page-content"></main>
      </div>
    </div>`

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await signOut() } catch (err) { console.error(err) }
  })

  document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode)

  // Manejo de links activos en la sidebar
  const updateActiveLink = () => {
    const hash = currentHash() || 'dashboard'
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.toggle('active', link.dataset.path === hash)
    })
  }

  window.addEventListener('hashchange', updateActiveLink)
  updateActiveLink()

  // Registrar rutas
  register('dashboard',         () => DashboardPage.render(), () => DashboardPage.cleanup?.())
  register('operations',        () => OperationsPage.render())
  register('analysis',          () => AnalysisPage.render(), () => AnalysisPage.cleanup?.())
  register('instrument-types',  () => InstrumentTypesPage.render())
  register('instruments',       () => InstrumentsPage.render())
  register('alycs',             () => AlycsPage.render())
  register('settings',         () => SettingsPage.render())

  start()
}

window.addEventListener('session-expired', async () => {
  try { await signOut() } catch {}
  alert('Tu sesión expiró. Ingresá de nuevo.')
})

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
