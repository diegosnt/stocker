# Stocker Intelligence

Aplicación web para el registro, seguimiento y análisis estratégico de operaciones bursátiles personales. Diseñada para inversores que buscan una visión profunda de su cartera con herramientas de optimización avanzada.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Vanilla JS ES6+ (módulos), CSS3 (Variables, Grid, Flexbox) |
| **Backend** | Node.js + Express, deployado en Vercel |
| **Base de datos** | Supabase (PostgreSQL) con RPCs, Vistas y RLS |
| **Autenticación** | Supabase Auth (JWT) + cookies HttpOnly |
| **Gráficos** | Chart.js + chartjs-chart-treemap |
| **PDF** | jsPDF + html2canvas |
| **Cache** | Sistema híbrido memoria + localStorage con TTL configurable |
| **PWA** | Service Worker con soporte offline |

Sin build tools ni bundlers — ES modules nativos del browser.

---

## Características

### Dashboard
- KPIs de cartera: total invertido ARS/USD y P&L en tiempo real
- Gráfico de composición por tipo de activo (doughnut)
- Comparativa inversión vs. valor de mercado por instrumento (barras)
- Mapa de calor (treemap) de Peso vs. P&L %
- Tabla de instrumentos con ordenamiento por columna y precios de mercado en vivo
- Precios actualizados vía API con caché de 2 horas

### Análisis Pro
- Selección de cartera por ALyC con botones dinámicos
- Algoritmos de optimización: Sharpe, Michaud y Hierarchical Risk Parity (HRP) ejecutados en Web Worker
- Métricas de riesgo: Beta, Alpha, VaR 95%, Max Drawdown, Expected Shortfall
- Frontera eficiente de Markowitz (scatter)
- Simulación Monte Carlo (1 año)
- Backtesting vs. benchmark dinámico (SPY, QQQ, DIA, IWM o custom)
- Matriz de correlación entre activos
- Generador de reporte PDF con gráficos y KPIs
- Caché de datos históricos de 24 horas

### Operaciones
- Alta, edición y eliminación de operaciones (compra/venta)
- Importación masiva vía CSV con motor de normalización
- Exportación CSV filtrada para auditoría
- Soporte multi-moneda ARS y USD

### Maestros
- Tipos de instrumentos, instrumentos, ALyCs/Brokers
- CRUD completo con validaciones

### Configuración
- Ajustes globales con control de acceso por rol (solo admins)

---

## Seguridad

| Medida | Detalle |
|--------|---------|
| **HttpOnly Cookies** | Tokens de sesión con flags HttpOnly, Secure, SameSite |
| **CSRF Protection** | Tokens sincronizados en todas las mutaciones (POST/PATCH/DELETE) |
| **XSS Protection** | DOMPurify sanitiza todo el contenido dinámico en el frontend |
| **Row Level Security** | RLS en PostgreSQL — aislamiento total de datos por usuario |
| **JWT Validation** | Tokens verificados en cada request al backend via `jose` |
| **Input Sanitization** | Backend sanitiza inputs con `sanitize-html` |
| **Helmet + CSP** | Content Security Policy configurada |
| **Rate Limiting** | Auth: 10 req/15min · Mutaciones: 60 req/15min · General: 200 req/15min |
| **Admin-only endpoints** | Settings globales verifican rol vía JWT antes de procesar |

---

## Estructura de Archivos

```
api/
  server.js              ← Express: auth, CRUD, quotes, history
  views/renderPage.js    ← HTML shell con inyección de config Supabase
  logger.js              ← Logging estructurado
public/
  css/styles.css         ← Estilos globales, dark mode, componentes
  js/
    init.js              ← Entry point, shell layout, router setup
    router.js            ← Hash router
    auth.js              ← signIn, signUp, signOut, session
    supabase-client.js   ← createClient()
    api-client.js        ← Wrapper fetch con CSRF y auth
    cache.js             ← Cache híbrido memoria + localStorage con TTL
    chart-manager.js     ← Abstracción centralizada de Chart.js
    smart-render.js      ← renderIfChanged() para evitar re-renders innecesarios
    utils.js             ← Dark mode, sanitize, helpers
    analysis-worker.js   ← Web Worker: Markowitz, HRP, Michaud, Monte Carlo
    pages/
      login.js
      dashboard.js
      analysis.js
      operations.js
      instruments.js
      instrument-types.js
      alycs.js
      settings.js
      holdings-analysis.js
supabase/
  schema.sql             ← Tablas, RPCs, Vistas, RLS completo
```

---

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/csrf-token` | Obtener token CSRF |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/signup` | Registro |
| `GET` | `/api/quotes` | Precios bulk por tickers |
| `GET` | `/api/quote/:ticker` | Precio individual |
| `GET` | `/api/history/:ticker` | Historial de precios |
| `POST/PATCH/DELETE` | `/api/operations` | CRUD operaciones |
| `POST` | `/api/operations/bulk` | Importación CSV masiva |
| `POST/PATCH/DELETE` | `/api/instruments` | CRUD instrumentos |
| `POST/PATCH/DELETE` | `/api/instrument-types` | CRUD tipos |
| `POST/PATCH/DELETE` | `/api/alycs` | CRUD ALyCs |
| `PATCH` | `/api/settings/:key` | Config global (admin) |

---

## Setup

```bash
cp .env.example .env          # Completar SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
pnpm install
pnpm run setup                # Descarga dependencias CSS/vendor
# Ejecutar supabase/schema.sql en Supabase SQL Editor
pnpm dev
```

---

## Base de Datos

Tablas principales: `instrument_types`, `instruments`, `alycs`, `operations`

- Todas con `user_id UUID REFERENCES auth.users(id)` + RLS habilitado
- `operations` FK a `instruments` y `alycs`
- `operations.type` CHECK IN `('compra', 'venta')`
- `operations.currency` CHECK IN `('ARS', 'USD')`
- RPC `get_user_holdings_global` para cálculo de tenencias consolidadas

---

## Backlog — Mejoras Responsive

Estado actual del soporte mobile por sección:

| Sección | Estado | Detalle |
|---------|--------|---------|
| Dashboard | ✅ Adaptado | KPIs, gráficos y tabla con versión cards |
| Operaciones | ✅ Adaptado | Tabla con versión cards, filtros responsive |
| Holdings Analysis | ✅ Adaptado | Tabla con versión cards mobile |
| Análisis Pro | ⚠️ Parcial | Panel de control OK, 3 tablas sin adaptar |
| Instrumentos | ❌ Sin adaptar | Tabla sin versión mobile |
| ALyCs | ❌ Sin adaptar | Tabla sin versión mobile |
| Tipos de Instrumento | ❌ Sin adaptar | Tabla sin versión mobile |
| Configuración | ⚠️ Parcial | Grid con minmax rígido |

---

### 🔴 Crítico — Bloquea usabilidad en mobile

- [ ] **Análisis Pro: tabla "Detalle de Tenencia Actual"** — 9 columnas sin `.desktop-only`. Crear versión cards `.mobile-only` con el mismo patrón que dashboard (`analysis.js` línea ~501).
- [ ] **Análisis Pro: tabla "Peso Óptimo (Rebalancing)"** — 10 columnas en HTML crudo sin `table-wrapper`. Crear versión card o tabla horizontal scrolleable con menos columnas en mobile (`analysis.js` línea ~787).
- [ ] **Análisis Pro: tabla "Matriz de Correlación"** — NxN fija, imposible de leer en mobile. Implementar scroll horizontal con sticky headers o versión comprimida (`analysis.js` línea ~958).
- [ ] **Instrumentos: tabla sin versión mobile** — 5 columnas, sin `.desktop-only`. Crear versión cards con ticker + nombre + tipo + acciones (`instruments.js` línea ~55).
- [ ] **ALyCs: tabla sin versión mobile** — 5 columnas con URLs largas. Crear versión cards con nombre + CUIT + link + acciones (`alycs.js` línea ~49).
- [ ] **Tipos de Instrumento: tabla sin versión mobile** — 4 columnas con descripción larga. Crear versión cards (`instrument-types.js` línea ~43).

---

### 🟡 Importante — Afecta UX

- [ ] **Análisis Pro: grilla `analysis-grid-top` desbalanceada** — `6fr 2fr 2fr` que no colapsa bien hasta 768px. Agregar breakpoint en 1024px con `1fr 1fr` y en 768px con `1fr` (`styles.css`).
- [ ] **Análisis Pro: grilla `analysis-grid-mixed` con widths fijos** — `300px 300px 1fr` rompe en pantallas medianas. Reemplazar por `minmax(280px, 1fr)` (`styles.css`).
- [ ] **Análisis Pro: inputs con width inline fijo** — `width: 160px` en benchmark input y `width: 180px` en botón PDF no escalan. Mover a clases CSS con media queries (`analysis.js` líneas ~68-83).
- [ ] **Análisis Pro: tabla de errores de importación** — Sin `.table-wrapper` ni versión mobile (`instruments.js` línea ~320).
- [ ] **Dashboard: weight bar en mobile** — `.weight-bar-container` no tiene media query, ocupa mucho espacio en pantallas pequeñas. Colapsar a solo etiqueta `%` en ≤768px (`styles.css`).
- [ ] **Dashboard: altura de gráficos en mobile** — `height: 300px` y `height: 240px` son grandes en 480px. Reducir a ~200px en `@media (max-width: 480px)` (`styles.css`).
- [ ] **Configuración: grid con minmax rígido** — `minmax(300px, 520px)` puede no caber en pantallas pequeñas. Cambiar a `minmax(min(300px, 100%), 520px)` (`styles.css`).
- [ ] **Cards de holdings: overflow de valores** — Números grandes (P&L, precios) pueden desbordarse en cards mobile. Agregar `overflow-wrap: break-word` a celdas de valor en ≤768px (`styles.css`).

---

### 🟢 Mejoras — Optimización y pulido

- [ ] **Modales en 480px** — `.modal-card-lg` sin `max-height` móvil, puede quedar cortado. Agregar `max-height: 90vh; overflow-y: auto` en `@media (max-width: 480px)` (`styles.css`).
- [ ] **Formularios `.form-row-3`** — 3 columnas sin breakpoint para 480px. Agregar `grid-template-columns: 1fr` en `@media (max-width: 480px)` (`styles.css`).
- [ ] **Gráficos de Análisis Pro en mobile** — Sin media queries para reducir alturas en 480px. Los canvas de Markowitz (350px), Monte Carlo (250px) y Backtesting (220px) son muy altos en mobile.
- [ ] **Paginación compacta en 480px** — `.pag-num` podría mostrar menos páginas en pantallas muy pequeñas (ej: solo anterior/siguiente + página actual) (`styles.css`).
- [ ] **Breakpoints para pantallas muy pequeñas** — No hay media queries para 375px ni 320px. Testar en iPhone SE y agregar ajustes de padding/font-size mínimos.
- [ ] **Operaciones: `.op-card` en 480px** — Padding y gaps pueden ser más ajustados en pantallas muy pequeñas para mostrar más contenido (`styles.css`).
- [ ] **Sidebar: cerrar al navegar desde links internos** — Ya funciona en mobile, pero verificar que el overlay cierra correctamente en todas las páginas al usar `navigate()` programático.

---

*Stocker Intelligence — Decisiones basadas en datos.*
