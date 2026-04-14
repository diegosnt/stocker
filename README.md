# Stocker Intelligence

Aplicación web para el registro, seguimiento y análisis estratégico de operaciones bursátiles personales. Diseñada para inversores que buscan una visión profunda de su cartera con herramientas de optimización avanzada.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Vanilla JS ES6+ (módulos), CSS3 (Variables, Grid, Flexbox) |
| **Backend** | Node.js + Express, deployado en Vercel |
| **Base de datos** | Supabase (PostgreSQL) con RPCs, Vistas y RLS |
| **Autenticación** | Supabase Auth (JWT) + Doble Cookie HttpOnly (Persistencia Mobile) |
| **Gráficos** | Chart.js + chartjs-chart-treemap |
| **PDF** | jsPDF + html2canvas |
| **Cache** | Sistema híbrido memoria + localStorage con TTL configurable |
| **PWA** | Service Worker con Versionado Granular y Notificación de Actualización |

Sin build tools ni bundlers — ES modules nativos del browser.

---

## Estructura del Proyecto

```
server.js                         ← Express + proxy de APIs externas + inyección de config
public/
  css/styles.css                  ← Estilos globales, variables, componentes, responsive
  js/
    init.js                       ← Bootstrap de la app, showToast(), eventos globales
    router.js                     ← Hash router: register(), navigate(), start()
    auth.js                       ← signIn, signUp, signOut, getSession, onAuthChange
    api-client.js                 ← apiRequest() autenticado con retry y AbortController
    supabase-client.js            ← createClient() para uso general
    supabase-minimal.js           ← Cliente liviano para contextos sin módulos completos
    cache.js                      ← Cache híbrido memoria + localStorage con TTL
    calculations.js               ← Cálculos financieros reutilizables (retornos, estadísticas)
    chart-manager.js              ← Wrapper de Chart.js: crea, actualiza y destruye instancias
    renderer.js                   ← Helpers de render para tablas y listas
    smart-render.js               ← renderIfChanged(): evita reflows innecesarios por hash
    utils.js                      ← Helpers: esc(), modal, formatters
    analysis-worker.js            ← Web Worker: Markowitz, HRP, Michaud, Monte Carlo
    pages/
      login.js                    ← LoginPage.mount()
      dashboard.js                ← DashboardPage: KPIs, gráficos, precios en vivo
      holdings-analysis.js        ← HoldingsAnalysisPage: posiciones por ALyC con P&L en vivo
      analysis.js                 ← AnalysisPage: optimización avanzada de cartera
      operations.js               ← OperationsPage: CRUD, filtros, CSV import/export
      instrument-types.js         ← InstrumentTypesPage: maestro de tipos
      instruments.js              ← InstrumentsPage: maestro de instrumentos
      alycs.js                    ← AlycsPage: maestro de ALyCs
      settings.js                 ← SettingsPage: configuración de cache, TTL y preferencias
supabase/
  schema.sql                      ← Tablas, RLS, constraints y triggers
  rpc_get_user_holdings.sql       ← RPC: posiciones consolidadas por usuario y ALyC
  rpc_get_user_holdings_global.sql← RPC: posiciones globales (todas las ALyCs)
  view_operations_search.sql      ← Vista: búsqueda full-text de operaciones
  performance_indexes.sql         ← Índices para queries frecuentes
  migration_app_settings.sql      ← Tabla app_settings por usuario
  migration_market_badge_setting.sql ← Setting de badge de mercado
```

---

## Características

### Dashboard
- KPIs de cartera: total invertido ARS/USD y P&L en tiempo real con tarjetas modernas interactivas.
- Actualización automática de precios cada 2 minutos sin recargar.
- Gráfico de composición por tipo de activo (doughnut).
- Comparativa inversión vs. valor de mercado por instrumento (barras).
- Mapa de calor (treemap) de Peso vs. P&L %.
- Tabla de instrumentos con ordenamiento por columna y precios de mercado en vivo.
- Vista Mobile optimizada: los instrumentos se transforman en tarjetas colapsables.

### Análisis de Posiciones
- Vista consolidada de tenencias agrupadas por ALyC con lazy loading por panel.
- Precio promedio de compra, cantidad, valor actual y P&L absoluto/porcentual por instrumento.
- Precios de mercado en vivo con actualización automática (solo en horario bursátil ART).
- Gráficos de distribución (pie) por instrumento y tipo de activo por ALyC.
- Gráfico de barras de P&L por instrumento.
- Ordenamiento por columna en cada tabla de ALyC.

### Análisis Pro
- Selección de cartera por ALyC con botones modernos de gran formato y feedback visual.
- Algoritmos de optimización ejecutados en **Web Worker** (sin bloquear el hilo principal):
  - **Sharpe**: Maximización del ratio de Sharpe (Markowitz).
  - **Michaud**: Resampling estocástico para robustez ante estimaciones ruidosas.
  - **HRP**: Hierarchical Risk Parity — diversificación basada en clustering jerárquico.
- Tabla comparativa Sharpe vs. Michaud vs. HRP con diferencias vs. cartera actual y promedio.
- Métricas de riesgo: Beta, Alpha, R², VaR 95%, Expected Shortfall, Max Drawdown.
- Frontera eficiente de Markowitz (scatter).
- Simulación Monte Carlo (1 año, 500 trayectorias).
- Backtesting vs. benchmark dinámico (SPY, QQQ, DIA, IWM o custom).
- Matriz de correlación entre activos con heatmap cromático.
- **Señales de compra por activo** en la tabla de tenencias, combinando dos fuentes:
  - **Técnica (52 semanas):** ubica el precio actual en el rango histórico anual → `↓ Precio bajo` / `→ Neutral` / `↑ Precio elevado`. El tooltip muestra mínimo, máximo, MA50, MA200 y percentil exacto.
  - **Markowitz:** compara el peso actual vs. el peso óptimo calculado → `↑ Comprar más` / `✓ OK` / `↓ Reducir`.
- Generador de reporte PDF con gráficos y KPIs.
- Caché de datos históricos de 24 horas.

### Operaciones
- Gestión completa (CRUD) de compras y ventas de activos.
- **Clonar operación**: duplica cualquier registro con un click, abre el formulario pre-llenado para editarlo antes de guardar.
- Formulario con **combobox de instrumentos**: buscador en tiempo real por ticker o nombre con navegación por teclado (↑↓ Enter Escape).
- Filtros avanzados: por ALyC, instrumento, tipo de operación, moneda y rango de fechas.
- Importación/Exportación CSV compatible con formatos de brokers locales.
- Vista Mobile Pro: tarjetas modernas y colapsables con acciones integradas.

### Configuración
- TTL de cache configurable por usuario (datos históricos y precios de mercado).
- Badge de estado de mercado (abierto/cerrado) activable desde settings.
- Datos persistidos por usuario en tabla `app_settings` en Supabase.

---

## Seguridad

| Medida | Detalle |
|--------|---------|
| **Doble Cookie HttpOnly** | Persistencia de sesión robusta con flags HttpOnly, Secure, SameSite: Lax |
| **Tokens en Memoria** | El cliente opera con tokens en memoria para requests activos |
| **Silent Refresh** | Renovación de sesión segura mediante endpoints dedicados |
| **CSRF Protection** | Tokens sincronizados en todas las mutaciones (POST/PATCH/DELETE) |
| **CSP con Nonce** | Content Security Policy dinámica con nonces por request (bloquea XSS) |
| **XSS Protection** | DOMPurify sanitiza todo el contenido dinámico en el frontend |
| **Row Level Security** | RLS en PostgreSQL — aislamiento total de datos por usuario |
| **JWT Validation** | Tokens verificados en cada request al backend via `jose` |
| **Input Sanitization** | Backend sanitiza inputs con `sanitize-html` |
| **Helmet** | Bloqueo de sniffing de tipos, clickjacking y scripts no autorizados |
| **Rate Limiting** | Auth: 10 req/15min · Mutaciones: 60 req/15min · General: 200 req/15min |

---

## Base de Datos (Supabase)

**Tablas principales:**
- `instrument_types` — tipos de activos (acciones, bonos, CEDEARs, etc.)
- `instruments` — instrumentos con ticker, tipo y moneda
- `alycs` — brokers/ALyCs del usuario
- `operations` — operaciones de compra/venta con FK a instruments y alycs
- `app_settings` — preferencias por usuario (TTL, badges, etc.)

Todas las tablas tienen `user_id UUID REFERENCES auth.users(id)` con RLS habilitado.

**RPCs:**
- `get_user_holdings(user_id)` — posiciones consolidadas por ALyC (precio promedio ponderado, cantidad neta)
- `get_user_holdings_global(user_id)` — posiciones globales sin agrupación por ALyC

**Vistas:**
- `operations_search` — búsqueda full-text sobre operaciones con joins a instruments y alycs

---

## Puesta en marcha

```bash
cp .env.example .env        # Completar SUPABASE_URL y SUPABASE_ANON_KEY
pnpm install
pnpm run setup              # Descarga water.css localmente
# Ejecutar schema.sql + migrations en el Supabase SQL Editor
pnpm dev
```

---

## Responsive

| Sección | Estado | Detalle |
|---------|--------|---------|
| Dashboard | ✅ | KPIs, gráficos y tarjetas de instrumentos |
| Posiciones | ✅ | Tablas por ALyC con scroll horizontal |
| Operaciones | ✅ | Tarjetas colapsables con acciones integradas |
| Análisis Pro | ✅ | Tabla de optimización en cards, correlación compacta |
| Maestros | ⚠️ Parcial | Tablas clásicas (sin cards mobile por ahora) |

---

*Stocker Intelligence — Decisiones basadas en datos.*
