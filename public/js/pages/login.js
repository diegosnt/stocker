import { signIn, signUp } from '../auth.js'
import { supabase } from '../supabase-client.js'
import { toggleDarkMode } from '../app.js'

const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`

export const LoginPage = {
  mount(container) {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-card-header">
            <button class="login-dark-mode-toggle" id="login-theme-toggle" title="Cambiar tema">
              ${SUN_SVG}${MOON_SVG}
            </button>
            <img class="login-logo" src="/img/logo.svg" alt="Stocker">
            <h1>Stocker</h1>
            <p class="subtitle">Registro de operaciones bursátiles</p>
          </div>
          <div class="login-card-body">
            <div class="login-tabs" id="login-tabs">
              <button class="active" id="tab-signin">Iniciar sesión</button>
              <button id="tab-signup">Registrarse</button>
            </div>

            <form id="login-form" novalidate>
              <div class="form-group">
                <label for="login-email">Email</label>
                <input type="email" id="login-email" placeholder="usuario@email.com" required autocomplete="email">
              </div>
              <div class="form-group">
                <label for="login-password">Contraseña</label>
                <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password" minlength="6">
              </div>
              <button type="submit" class="btn btn-primary" id="login-submit" style="width: 100%; margin-top: 1rem">Ingresar</button>
              <p class="login-error" id="login-error"></p>
            </form>
          </div>
        </div>
      </div>`

    let activeTab = 'signin'

    const tabSignin = container.querySelector('#tab-signin')
    const tabSignup = container.querySelector('#tab-signup')
    const tabsContainer = container.querySelector('#login-tabs')
    const submitBtn = container.querySelector('#login-submit')
    const errorEl   = container.querySelector('#login-error')
    const form      = container.querySelector('#login-form')

    function setTab(tab) {
      activeTab = tab
      tabSignin.classList.toggle('active', tab === 'signin')
      tabSignup.classList.toggle('active', tab === 'signup')
      submitBtn.textContent = tab === 'signin' ? 'Ingresar' : 'Crear cuenta'
      errorEl.textContent   = ''
      errorEl.style.color   = 'var(--color-danger)'
    }

    tabSignin.addEventListener('click', () => setTab('signin'))
    tabSignup.addEventListener('click', () => setTab('signup'))
    container.querySelector('#login-theme-toggle').addEventListener('click', toggleDarkMode)

    // Verificar si el registro está habilitado (lectura pública, no requiere auth)
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .single()
      .then(({ data }) => {
        if (data?.value === 'false') {
          tabsContainer.style.display = 'none'
          if (activeTab === 'signup') setTab('signin')
        }
      })

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email    = container.querySelector('#login-email').value.trim()
      const password = container.querySelector('#login-password').value

      if (!email || !password) {
        errorEl.textContent = 'Completá email y contraseña.'
        return
      }

      submitBtn.disabled    = true
      submitBtn.textContent = 'Cargando...'
      errorEl.textContent   = ''

      try {
        if (activeTab === 'signin') {
          await signIn(email, password)
        } else {
          await signUp(email, password)
          errorEl.style.color = 'var(--color-success)'
          errorEl.textContent = 'Cuenta creada. Revisá tu email para confirmar.'
        }
      } catch (err) {
        errorEl.style.color  = 'var(--color-danger)'
        errorEl.textContent  = translateError(err.message)
      } finally {
        submitBtn.disabled    = false
        submitBtn.textContent = activeTab === 'signin' ? 'Ingresar' : 'Crear cuenta'
      }
    })
  }
}

function translateError(msg) {
  if (msg.includes('Invalid login'))      return 'Email o contraseña incorrectos.'
  if (msg.includes('already registered')) return 'El email ya está registrado.'
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}
