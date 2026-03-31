import { onAuthChange, signOut } from './auth.js'
import { register, start, navigate, currentHash } from './router.js'
import { initDarkMode, toggleDarkMode } from './utils.js'
import { prunePersistentCache } from './cache.js'
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
        <button class="navbar-hamburger" id="sidebar-toggle" style="display: none" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
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
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Cartera</div>
            <a href="#dashboard" class="sidebar-link" data-path="dashboard">Dashboard</a>
            <a href="#analysis" class="sidebar-link" data-path="analysis">Análisis Pro</a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Maestros</div>
            <a href="#operations" class="sidebar-link" data-path="operations">Operaciones</a>
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

  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')
  const toggle  = document.getElementById('sidebar-toggle')

  const toggleSidebar = () => {
    sidebar.classList.toggle('open')
    overlay.classList.toggle('open')
  }

  toggle.addEventListener('click', toggleSidebar)
  overlay.addEventListener('click', toggleSidebar)

  // Cerrar sidebar al navegar en mobile
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open')
        overlay.classList.remove('open')
      }
    })
  })

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
  
  // En lugar de un alert feo, usamos un modal con el estilo del proyecto
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.style.zIndex = '2000'
  
  overlay.innerHTML = `
    <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2.5rem; background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow);">
      <div style="background: rgba(79, 70, 230, 0.1); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h3 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 1.25rem;">Sesión Finalizada</h3>
      <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5;">Tu sesión ha expirado por inactividad o seguridad. Por favor, volvé a ingresar para continuar.</p>
      <button class="btn btn-primary" id="btn-reload" style="width: 100%; padding: 0.75rem; font-weight: 600;">Iniciar Sesión</button>
    </div>
  `
  document.body.appendChild(overlay)
  
  document.getElementById('btn-reload').onclick = () => {
    window.location.reload()
  }
})

initDarkMode()
prunePersistentCache()

let _currentUserId = null

async function initAuth() {
  const { getSession } = await import('./auth.js')
  const session = await getSession()
  if (session) {
    _currentUserId = session.user.id
    renderShell(session.user.email)
  } else {
    app.innerHTML = ''
    LoginPage.mount(app)
  }

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
}

initAuth()

// ── Service Worker ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SW] Registrado OK:', reg.scope))
      .catch((err) => console.error('[SW] Error:', err))
  })
}
