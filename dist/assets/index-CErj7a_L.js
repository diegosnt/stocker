const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/dashboard-Cp3HiAK-.js","assets/chart-manager-NkFeXNJp.js","assets/api-client-CZ7NvV8n.js","assets/preload-helper-D4M6sveU.js","assets/operations-DYpgdS6-.js","assets/analysis-H1Q1nWVa.js","assets/chunk-CilyBKbf.js","assets/instrument-types-CFbm7OtZ.js","assets/instruments-DQrQeYpN.js","assets/alycs-B1O2IDdO.js","assets/settings-CQzW-r_t.js","assets/auth-BMkAhGBs.js"])))=>i.map(i=>d[i]);
import{r as e}from"./api-client-CZ7NvV8n.js";import{t}from"./preload-helper-D4M6sveU.js";import{i as n,n as r,r as i}from"./auth-BMkAhGBs.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})(),window.__SUPABASE_URL__=`https://viaxajnuwnqcdbrikpzh.supabase.co`,window.__SUPABASE_ANON_KEY__=`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXhham51d25xY2RicmlrcHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDQzNTUsImV4cCI6MjA4Nzg4MDM1NX0._44Yq9EmcjGk5wstkpsfSxxnYZdAvWKlq0k8jYF-5pE`;var a={},o={},s=null,c=null;function l(e,t,n){a[e]=t,n&&(o[e]=n)}function u(e){window.location.hash=e}function d(){s=null,c&&window.removeEventListener(`hashchange`,c),c=()=>f(),window.addEventListener(`hashchange`,c),f()}async function f(){let e=window.location.hash.replace(`#`,``)||`dashboard`;if(s===e)return;s&&o[s]&&await o[s](),s=e;let t=a[e];t?await t():u(`dashboard`),document.querySelectorAll(`.sidebar-link`).forEach(t=>{t.classList.toggle(`active`,t.dataset.route===e)})}function p(){return window.location.hash.replace(`#`,``)||`dashboard`}function m(e,t){let n=document.getElementById(e);if(!n)return;n.classList.add(`field-error-input`);let r=n.closest(`.form-group`);if(r){r.querySelector(`.field-error-msg`)?.remove();let e=document.createElement(`span`);e.className=`field-error-msg`,e.textContent=t,r.appendChild(e)}let i=()=>{n.classList.remove(`field-error-input`),n.closest(`.form-group`)?.querySelector(`.field-error-msg`)?.remove()};n.addEventListener(`input`,i,{once:!0}),n.addEventListener(`change`,i,{once:!0})}function h(e){return new Date(e).toLocaleDateString(`es-AR`,{day:`2-digit`,month:`2-digit`,year:`numeric`})}function g(e){if(!e)return`—`;let[t,n,r]=e.split(`T`)[0].split(`-`);return r&&n&&t?`${r}/${n}/${t}`:e}function _(e,t){if(t<=7)return Array.from({length:t},(e,t)=>t);let n=new Set([0,t-1,e]);for(let r=Math.max(0,e-1);r<=Math.min(t-1,e+1);r++)n.add(r);let r=[...n].sort((e,t)=>e-t),i=[],a=-1;for(let e of r)e-a>1&&i.push(`...`),i.push(e),a=e;return i}function v(){localStorage.getItem(`dark-mode`)===`true`&&document.body.classList.add(`dark-mode`)}var y=null;function b(){let e=document.body.classList.toggle(`dark-mode`);y&&clearTimeout(y),y=setTimeout(()=>{localStorage.setItem(`dark-mode`,e),y=null},300)}function x(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}var S=()=>window.DOMPurify;function C(e){let t=S();return t?t.sanitize(String(e),{ALLOWED_TAGS:[],ALLOWED_ATTR:[]}):String(e)}function w(e){let t=S();return t?t.sanitize(String(e),{ALLOWED_TAGS:[`b`,`i`,`strong`,`em`,`br`,`span`],ALLOWED_ATTR:[`style`,`class`]}):String(e)}function T({title:e,message:t,confirmLabel:n=`Eliminar`}){return new Promise(r=>{let i=document.createElement(`div`);i.className=`modal-overlay`,i.innerHTML=`
      <div class="modal" role="dialog" aria-modal="true">
        <h3 class="modal-title">${w(e)}</h3>
        <p class="modal-message">${w(t)}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
          <button class="btn btn-danger"    id="modal-confirm">${C(n)}</button>
        </div>
      </div>`,document.body.appendChild(i);let a=e=>{document.removeEventListener(`keydown`,o),i.remove(),r(e)},o=e=>{e.key===`Escape`&&a(!1)};document.addEventListener(`keydown`,o),i.querySelector(`#modal-cancel`).addEventListener(`click`,()=>a(!1)),i.querySelector(`#modal-confirm`).addEventListener(`click`,()=>a(!0)),i.addEventListener(`click`,e=>{e.target===i&&a(!1)}),i.querySelector(`#modal-cancel`).focus()})}var E=new Map,D=300*1e3,O=`stocker_cache_`;function k(e,t={persistent:!1}){if(!t.persistent){let t=E.get(e);return t?Date.now()-t.ts>D?(E.delete(e),null):t.data:null}try{let t=localStorage.getItem(O+e);if(!t)return null;let n=JSON.parse(t);return Date.now()>n.expiresAt?(localStorage.removeItem(O+e),null):n.data}catch{return null}}function A(e,t,n={persistent:!1,ttlMs:D}){if(!n.persistent){E.set(e,{data:t,ts:Date.now()});return}try{let r={data:t,expiresAt:Date.now()+(n.ttlMs||D)};localStorage.setItem(O+e,JSON.stringify(r))}catch(e){console.warn(`Error al guardar en localStorage (posiblemente lleno):`,e)}}function j(e,t={persistent:!1}){t.persistent?localStorage.removeItem(O+e):E.delete(e)}function M(){try{let e=Date.now();for(let t=0;t<localStorage.length;t++){let n=localStorage.key(t);if(n?.startsWith(O)){let t=localStorage.getItem(n);t&&e>JSON.parse(t).expiresAt&&localStorage.removeItem(n)}}}catch{}}var N=`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,P=`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,F={mount(t){t.innerHTML=`
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-card-header">
            <button class="login-dark-mode-toggle" id="login-theme-toggle" title="Cambiar tema">
              ${N}${P}
            </button>
            <img class="login-logo" src="/img/logo.svg" alt="Stocker">
            <h1>Stocker</h1>
            <p class="subtitle">Registro de operaciones bursátiles</p>
          </div>
          <div class="login-card-body">
            <div class="login-tabs" id="login-tabs" style="display: none">
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
      </div>`;let i=`signin`,a=t.querySelector(`#tab-signin`),o=t.querySelector(`#tab-signup`),s=t.querySelector(`#login-tabs`),c=t.querySelector(`#login-submit`),l=t.querySelector(`#login-error`),u=t.querySelector(`#login-form`);function d(e){i=e,a.classList.toggle(`active`,e===`signin`),o.classList.toggle(`active`,e===`signup`),c.textContent=e===`signin`?`Ingresar`:`Crear cuenta`,l.textContent=``,l.style.color=`var(--color-danger)`}a.addEventListener(`click`,()=>d(`signin`)),o.addEventListener(`click`,()=>d(`signup`)),t.querySelector(`#login-theme-toggle`).addEventListener(`click`,b),e.from(`app_settings`).select(`value`).eq(`key`,`registration_enabled`).single().then(({data:e})=>{e?.value===`true`?s.style.display=`flex`:(s.style.display=`none`,i===`signup`&&d(`signin`))}).catch(()=>{s.style.display=`none`}),u.addEventListener(`submit`,async e=>{e.preventDefault();let a=t.querySelector(`#login-email`).value.trim(),o=t.querySelector(`#login-password`).value;if(!a||!o){l.textContent=`Completá email y contraseña.`;return}c.disabled=!0,c.textContent=`Cargando...`,l.textContent=``;try{i===`signin`?await r(a,o):(await n(a,o),l.style.color=`var(--color-success)`,l.textContent=`Cuenta creada. Revisá tu email para confirmar.`)}catch(e){l.style.color=`var(--color-danger)`,l.textContent=I(e.message)}finally{c.disabled=!1,c.textContent=i===`signin`?`Ingresar`:`Crear cuenta`}})}};function I(e){return e.includes(`Invalid login`)?`Email o contraseña incorrectos.`:e.includes(`already registered`)?`El email ya está registrado.`:e.includes(`Password should be`)?`La contraseña debe tener al menos 6 caracteres.`:e}var L=document.getElementById(`app`),R=null;function z(e,t=`info`){R||(R=document.createElement(`div`),R.className=`toast-container`,document.body.appendChild(R));let n=document.createElement(`div`);n.className=`toast toast-${t}`,n.textContent=e,R.appendChild(n),setTimeout(()=>{n.style.opacity=`0`,setTimeout(()=>n.remove(),300)},3e3)}function B(e){L.innerHTML=`
    <div class="app-shell">
      <nav class="navbar">
        <button class="navbar-hamburger" id="sidebar-toggle" style="display: none" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div class="navbar-brand">
          <img src="/img/logo.svg" alt="Logo" class="navbar-logo">
          <span>Stocker</span>
        </div>
        <div class="navbar-user">${e}</div>
        <button class="dark-mode-toggle" id="theme-toggle" title="Cambiar tema">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
        <button class="navbar-reload mobile-only" id="reload-btn" title="Recargar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
        </button>
        <button class="navbar-logout" id="logout-btn" title="Salir">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
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
    </div>`;let n=document.getElementById(`sidebar`),r=document.getElementById(`sidebar-overlay`),a=document.getElementById(`sidebar-toggle`),o=()=>{n.classList.toggle(`open`),r.classList.toggle(`open`)};a.addEventListener(`click`,o),r.addEventListener(`click`,o),document.querySelectorAll(`.sidebar-link`).forEach(e=>{e.addEventListener(`click`,()=>{window.innerWidth<=768&&(n.classList.remove(`open`),r.classList.remove(`open`))})}),document.getElementById(`logout-btn`).addEventListener(`click`,async()=>{try{await i()}catch(e){console.error(e)}}),document.getElementById(`theme-toggle`).addEventListener(`click`,b),document.getElementById(`reload-btn`).addEventListener(`click`,()=>window.location.reload());let s=()=>{let e=p()||`dashboard`;document.querySelectorAll(`.sidebar-link`).forEach(t=>{t.classList.toggle(`active`,t.dataset.path===e)})};window.addEventListener(`hashchange`,s),s(),window.DOMPurify||t(()=>import(`./purify.es-CuTrUsFy.js`).then(e=>{window.DOMPurify=e.default}),[]).catch(()=>{});let c=e=>{let t=null;return async()=>(t||=await e(),t)},u=c(()=>t(()=>import(`./dashboard-Cp3HiAK-.js`),__vite__mapDeps([0,1,2,3]))),f=c(()=>t(()=>import(`./operations-DYpgdS6-.js`),__vite__mapDeps([4,2,3]))),m=c(()=>t(()=>import(`./analysis-H1Q1nWVa.js`),__vite__mapDeps([5,6,3,1,2]))),h=c(()=>t(()=>import(`./instrument-types-CFbm7OtZ.js`),__vite__mapDeps([7,2,3]))),g=c(()=>t(()=>import(`./instruments-DQrQeYpN.js`),__vite__mapDeps([8,2,3]))),_=c(()=>t(()=>import(`./alycs-B1O2IDdO.js`),__vite__mapDeps([9,2,3]))),v=c(()=>t(()=>import(`./settings-CQzW-r_t.js`),__vite__mapDeps([10,2,3])));l(`dashboard`,async()=>(await u()).DashboardPage.render(),async()=>(await u()).DashboardPage.cleanup?.()),l(`operations`,async()=>(await f()).OperationsPage.render(),async()=>(await f()).OperationsPage.cleanup?.()),l(`analysis`,async()=>(await m()).AnalysisPage.render(),async()=>(await m()).AnalysisPage.cleanup?.()),l(`instrument-types`,async()=>(await h()).InstrumentTypesPage.render(),async()=>(await h()).InstrumentTypesPage.cleanup?.()),l(`instruments`,async()=>(await g()).InstrumentsPage.render(),async()=>(await g()).InstrumentsPage.cleanup?.()),l(`alycs`,async()=>(await _()).AlycsPage.render(),async()=>(await _()).AlycsPage.cleanup?.()),l(`settings`,async()=>(await v()).SettingsPage.render(),async()=>(await v()).SettingsPage.cleanup?.()),d()}window.addEventListener(`session-expired`,()=>{if(document.getElementById(`modal-session-expired`))return;let e=document.createElement(`div`);e.id=`modal-session-expired`,e.className=`modal-overlay`,e.style.zIndex=`2000`,e.innerHTML=`
    <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2.5rem; background: var(--bg-card); border-radius: 16px; box-shadow: var(--shadow);">
      <div style="background: rgba(79, 70, 230, 0.1); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h3 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 1.25rem;">Sesión Finalizada</h3>
      <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5;">Tu sesión ha expirado por inactividad o seguridad. Por favor, volvé a ingresar para continuar.</p>
      <button class="btn btn-primary" id="btn-reload-session" style="width: 100%; padding: 0.75rem; font-weight: 600;">Iniciar Sesión</button>
    </div>
  `,document.body.appendChild(e),e.querySelector(`#btn-reload-session`).onclick=()=>{window.location.href=`/`}}),v(),M();var V=null;async function H(){let{getSession:e,recoverSession:n,onAuthChange:r}=await t(async()=>{let{getSession:e,recoverSession:t,onAuthChange:n}=await import(`./auth-BMkAhGBs.js`).then(e=>e.t);return{getSession:e,recoverSession:t,onAuthChange:n}},__vite__mapDeps([11,6,2,3]));await n();let i=await e();i?(V=i.user.id,B(i.user.email)):(L.innerHTML=``,F.mount(L)),r(e=>{e?V!==e.user.id&&(V=e.user.id,B(e.user.email)):(V=null,L.innerHTML=``,F.mount(L))})}H();function U(e){R||(R=document.createElement(`div`),R.className=`toast-container`,document.body.appendChild(R));let t=document.createElement(`div`);t.className=`toast toast-update`,t.innerHTML=`
    <div class="toast-content">
      <div class="toast-title">Nueva Versión</div>
      <div class="toast-msg">Actualizá para ver los cambios.</div>
    </div>
    <button class="btn btn-primary btn-sm" id="btn-sw-update">Actualizar</button>
  `,t.style.pointerEvents=`auto`,R.appendChild(t),t.querySelector(`#btn-sw-update`).addEventListener(`click`,()=>{e.postMessage(`SKIP_WAITING`),t.remove()})}if(`serviceWorker`in navigator){window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`/sw.js`).then(e=>{console.log(`[SW] Registrado OK:`,e.scope),e.waiting&&U(e.waiting),e.addEventListener(`updatefound`,()=>{let t=e.installing;t.addEventListener(`statechange`,()=>{t.state===`installed`&&navigator.serviceWorker.controller&&U(t)})})}).catch(e=>console.error(`[SW] Error:`,e))});let e=!1;navigator.serviceWorker.addEventListener(`controllerchange`,()=>{e||(e=!0,window.location.reload())})}export{_ as a,h as c,m as d,A as i,g as l,k as n,T as o,j as r,x as s,z as t,C as u};
//# sourceMappingURL=index-CErj7a_L.js.map