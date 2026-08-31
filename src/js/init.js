import { signOut } from './auth.js'
import { register, start, navigate, currentHash } from './router.js'
import { initDarkMode, toggleDarkMode, setDOMPurify } from './utils.js'
import { prunePersistentCache, get as cacheGet, set as cacheSet } from './cache.js'
import { supabase } from './supabase-client.js'
import { requestAlycAnalysis } from './nav-state.js'
import { LoginPage } from './pages/login.js'

const app = document.getElementById('app')

// ── Toast ──────────────────────────────────────────────────
let toastContainer = null
let domPurifyLoading = false

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

// Puebla la barra de accesos rápidos con una entrada por ALyC con tenencias.
// Al hacer clic, salta a Análisis Pro y corre el análisis de esa cartera.
async function loadQuickNavAlycs() {
  const box = document.getElementById('quicknav-alycs')
  if (!box) return
  try {
    let data = cacheGet('user_holdings')
    if (!data) {
      const { data: rpcData, error } = await supabase.rpc('get_user_holdings', { p_limit: 500, p_offset: 0 })
      if (error) throw error
      data = rpcData || []
      if (data.length) cacheSet('user_holdings', data)
    }

    const alycs = new Map()
    for (const h of data) {
      if (h.alyc_id && !alycs.has(h.alyc_id)) alycs.set(h.alyc_id, h.alyc_name)
    }

    if (alycs.size === 0) {
      box.innerHTML = '<span class="quicknav-hint">Sin tenencias</span>'
      return
    }

    box.innerHTML = ''
    for (const [id, name] of alycs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'quicknav-alyc'
      btn.dataset.alycId = id
      btn.textContent = name
      btn.addEventListener('click', () => {
        requestAlycAnalysis({ id, name })
        if (currentHash() !== 'analysis') navigate('analysis')
      })
      box.appendChild(btn)
    }
  } catch (e) {
    console.warn('No se pudieron cargar las ALyCs de la barra:', e)
    box.innerHTML = '<span class="quicknav-hint">Error al cargar</span>'
  }
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
        <div class="navbar-quicklinks" id="quicknav" aria-label="Accesos rápidos">
          <a href="#dashboard" class="quicknav-item" data-path="dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
            <span>Dashboard</span>
          </a>
          <span class="quicknav-divider" aria-hidden="true"></span>
          <div class="quicknav-alycs" id="quicknav-alycs">
            <span class="quicknav-hint">Cargando…</span>
          </div>
        </div>
        <div class="navbar-user">${userEmail}</div>
        <button class="dark-mode-toggle" id="theme-toggle" title="Cambiar tema" aria-label="Cambiar tema">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
        <button class="navbar-reload mobile-only" id="reload-btn" title="Recargar" aria-label="Recargar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
        </button>
        <button class="navbar-logout" id="logout-btn" title="Salir" aria-label="Salir">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </nav>
      <div class="app-body">
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Cartera</div>
            <a href="#dashboard" class="sidebar-link" data-path="dashboard" title="Dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Dashboard</span>
            </a>
            <a href="#analysis" class="sidebar-link" data-path="analysis" title="Análisis Pro">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <span>Análisis Pro</span>
            </a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-section-title">Maestros</div>
            <a href="#operations" class="sidebar-link" data-path="operations" title="Operaciones">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
              <span>Operaciones</span>
            </a>
            <a href="#instruments" class="sidebar-link" data-path="instruments" title="Instrumentos">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
              <span>Instrumentos</span>
            </a>
            <a href="#instrument-types" class="sidebar-link" data-path="instrument-types" title="Tipos">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              <span>Tipos</span>
            </a>
            <a href="#alycs" class="sidebar-link" data-path="alycs" title="ALyCs / Brokers">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              <span>ALyCs / Brokers</span>
            </a>
          </div>
          <div class="sidebar-section" style="margin-top: auto">
            <a href="#settings" class="sidebar-link" data-path="settings" title="Configuración">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Configuración</span>
            </a>
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
  document.getElementById('reload-btn').addEventListener('click', () => window.location.reload())

  // Manejo de links activos en la sidebar y en la barra de accesos rápidos
  const updateActiveLink = () => {
    const hash = currentHash() || 'dashboard'
    document.querySelectorAll('.sidebar-link, .quicknav-item').forEach(link => {
      link.classList.toggle('active', link.dataset.path === hash)
    })
    // Fuera de Análisis Pro no hay ninguna cartera "en foco"
    if (hash !== 'analysis') {
      document.querySelectorAll('.quicknav-alyc.active').forEach(b => b.classList.remove('active'))
    }
  }

  window.addEventListener('hashchange', updateActiveLink)
  updateActiveLink()

  // La página de Análisis avisa qué cartera está mostrando → la marcamos en la barra
  window.addEventListener('analysis-alyc-changed', (e) => {
    const id = e.detail?.id
    document.querySelectorAll('.quicknav-alyc').forEach(b => {
      b.classList.toggle('active', b.dataset.alycId === String(id))
    })
  })

  loadQuickNavAlycs()

  // Pre-cargar DOMPurify en background para cuando se necesite
  if (!domPurifyLoading) {
    domPurifyLoading = true
    import('dompurify').then(mod => setDOMPurify(mod.default)).catch(() => {})
  }

  const dyn = (loader) => {
    let mod = null
    return async () => {
      if (!mod) mod = await loader()
      return mod
    }
  }

  const dashboard  = dyn(() => import('./pages/dashboard.js'))
  const operations = dyn(() => import('./pages/operations.js'))
  const analysis   = dyn(() => import('./pages/analysis.js'))
  const instTypes  = dyn(() => import('./pages/instrument-types.js'))
  const insts      = dyn(() => import('./pages/instruments.js'))
  const alycs      = dyn(() => import('./pages/alycs.js'))
  const settings   = dyn(() => import('./pages/settings.js'))

  // Registrar rutas
  register('dashboard',         async () => (await dashboard()).DashboardPage.render(),
                                async () => (await dashboard()).DashboardPage.cleanup?.())
  register('operations',        async () => (await operations()).OperationsPage.render(),
                                async () => (await operations()).OperationsPage.cleanup?.())
  register('analysis',          async () => (await analysis()).AnalysisPage.render(),
                                async () => (await analysis()).AnalysisPage.cleanup?.())
  register('instrument-types',  async () => (await instTypes()).InstrumentTypesPage.render(),
                                async () => (await instTypes()).InstrumentTypesPage.cleanup?.())
  register('instruments',       async () => (await insts()).InstrumentsPage.render(),
                                async () => (await insts()).InstrumentsPage.cleanup?.())
  register('alycs',             async () => (await alycs()).AlycsPage.render(),
                                async () => (await alycs()).AlycsPage.cleanup?.())
  register('settings',         async () => (await settings()).SettingsPage.render(),
                                async () => (await settings()).SettingsPage.cleanup?.())

  start()
}

window.addEventListener('session-expired', () => {
  if (document.getElementById('modal-session-expired')) return

  const overlay = document.createElement('div')
  overlay.id = 'modal-session-expired'
  overlay.className = 'modal-overlay'
  overlay.style.zIndex = '2000'
  
  overlay.innerHTML = `
    <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2.5rem; background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow);">
      <div style="background: rgba(79, 70, 230, 0.1); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h3 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 1.25rem;">Sesión Finalizada</h3>
      <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5;">Tu sesión ha expirado por inactividad o seguridad. Por favor, volvé a ingresar para continuar.</p>
      <button class="btn btn-primary" id="btn-reload-session" style="width: 100%; padding: 0.75rem; font-weight: 600;">Iniciar Sesión</button>
    </div>
  `
  document.body.appendChild(overlay)
  
  overlay.querySelector('#btn-reload-session').onclick = () => {
    window.location.href = '/' // Forzar redirección al home/login
  }
})

initDarkMode()
prunePersistentCache()

let _currentUserId = null

async function initAuth() {
  try {
    const res = await fetch('/api/config')
    const cfg = await res.json()
    window.__SUPABASE_URL__      = cfg.supabaseUrl
    window.__SUPABASE_ANON_KEY__ = cfg.supabaseAnonKey
  } catch (e) {
    console.warn('Could not load runtime config:', e)
  }

  const { getSession, recoverSession, onAuthChange } = await import('./auth.js')
  
  // 1. Intentamos recuperar sesión desde la cookie del servidor (silencioso)
  await recoverSession()
  
  // 2. Verificamos si ahora tenemos sesión en memoria
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
function showUpdatePrompt(sw) {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  
  const toast = document.createElement('div')
  toast.className = 'toast toast-update'
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">Nueva Versión</div>
      <div class="toast-msg">Actualizá para ver los cambios.</div>
    </div>
    <button class="btn btn-primary btn-sm" id="btn-sw-update">Actualizar</button>
  `
  toast.style.pointerEvents = 'auto'
  toastContainer.appendChild(toast)

  toast.querySelector('#btn-sw-update').addEventListener('click', () => {
    sw.postMessage('SKIP_WAITING')
    toast.remove()
  })
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registrado OK:', reg.scope)
        
        // 1. Hay un SW esperando (vuelto a abrir después de una descarga silenciosa)
        if (reg.waiting) {
          showUpdatePrompt(reg.waiting)
        }

        // 2. Nuevo SW detectado mientras la app está abierta
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdatePrompt(newSW)
            }
          })
        })
      })
      .catch((err) => console.error('[SW] Error:', err))
  })

  // 3. Cuando el nuevo SW tome el control, recargamos
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      window.location.reload()
    }
  })
}
