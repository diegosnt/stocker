# Stocker Intelligence

Aplicación web para el registro, seguimiento y análisis estratégico de operaciones bursátiles personales. Diseñada para inversores que buscan una visión profunda de su cartera con herramientas de optimización avanzada.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Vanilla JS ES6+ (módulos), CSS3 (Variables, Grid, Flexbox) |
| **Backend** | Node.js + Express, deployado en Vercel |
| **Base de datos** | Supabase (PostgreSQL) con RPCs, Vistas y RLS |
| **Autenticación** | Supabase Auth (JWT) + cookies HttpOnly + **Tokens en memoria** |
| **Gráficos** | Chart.js + chartjs-chart-treemap |
| **PDF** | jsPDF + html2canvas |
| **Cache** | Sistema híbrido memoria + localStorage con TTL configurable |
| **PWA** | Service Worker optimizado con soporte offline |

Sin build tools ni bundlers — ES modules nativos del browser.

---

## Características

### Dashboard
- KPIs de cartera: total invertido ARS/USD y P&L en tiempo real con **tarjetas modernas interactivas**.
- **Actualización automática de precios** cada 2 minutos sin recargar.
- Gráfico de composición por tipo de activo (doughnut).
- Comparativa inversión vs. valor de mercado por instrumento (barras).
- Mapa de calor (treemap) de Peso vs. P&L %.
- Tabla de instrumentos con ordenamiento por columna y precios de mercado en vivo.
- **Vista Mobile optimizada**: los instrumentos se transforman en tarjetas colapsables con el mismo estilo que los KPIs.

### Análisis Pro
- Selección de cartera por ALyC con **botones modernos de gran formato** y feedback visual.
- Algoritmos de optimización: Sharpe, Michaud y Hierarchical Risk Parity (HRP) ejecutados en Web Worker.
- Métricas de riesgo: Beta, Alpha, VaR 95%, Max Drawdown, Expected Shortfall.
- Frontera eficiente de Markowitz (scatter).
- Simulación Monte Carlo (1 año).
- Backtesting vs. benchmark dinámico (SPY, QQQ, DIA, IWM o custom).
- Matriz de correlación entre activos.
- Generador de reporte PDF con gráficos y KPIs, con botón de acceso rápido mejorado.
- Caché de datos históricos de 24 horas.

### Operaciones
- Gestión completa (CRUD) de compras y ventas de activos.
- **Filtros avanzados**: por ALyC, instrumento, tipo de operación, moneda y rango de fechas.
- **Importación/Exportación CSV**: compatible con formatos de brokers locales.
- **Vista Mobile Pro**: las operaciones se presentan en **tarjetas modernas y colapsables** que siguen la línea estética del dashboard, optimizando el espacio en pantalla.
- Acciones rápidas (Editar/Borrar) accesibles tanto en tabla como en tarjetas.

---

## Seguridad

| Medida | Detalle |
|--------|---------|
| **HttpOnly Cookies** | Tokens de sesión con flags HttpOnly, Secure, SameSite (blindado contra lectura JS) |
| **Tokens en Memoria** | Access/Refresh tokens ya no se guardan en localStorage (protección contra robo físico/XSS) |
| **CSRF Protection** | Tokens sincronizados en todas las mutaciones (POST/PATCH/DELETE) |
| **CSP con Nonce** | Content Security Policy dinámica con **Nonces** generados por request (bloquea XSS inyectado) |
| **XSS Protection** | DOMPurify sanitiza todo el contenido dinámico en el frontend |
| **Row Level Security** | RLS en PostgreSQL — aislamiento total de datos por usuario |
| **JWT Validation** | Tokens verificados en cada request al backend via `jose` |
| **Input Sanitization** | Backend sanitiza inputs con `sanitize-html` |
| **Helmet** | Configurado para bloquear sniffing de tipos, clickjacking y scripts no autorizados |
| **Rate Limiting** | Auth: 10 req/15min · Mutaciones: 60 req/15min · General: 200 req/15min |

---

## Backlog — Optimización y Buenas Prácticas

### 🔴 Crítico — Bugs y seguridad (COMPLETADO ✅)

- [x] **Service Worker consolidado** — Listeners unificados, estrategia Stale-While-Revalidate limpia.
- [x] **Timeouts en requests externos** — `AbortController` de 10s en servidor y cliente para todas las APIs de finanzas.
- [x] **CSP Robusta** — Implementación de Nonces dinámicos y eliminación de `unsafe-inline` en scripts.
- [x] **Seguridad de Tokens** — Migración total de localStorage a variables en memoria.
- [x] **UI Navbar** — Iconos unificados y botones de acción (Logout, Reload, Dark Mode) con tamaño consistente.

### 🟡 Importante — Resiliencia y UX (EN PROGRESO 🏗️)

- [x] **Mobile Operations Cards** — Implementación de tarjetas colapsables con estilo Dashboard.
- [x] **Mejora en botones de Análisis** — Aumento de tamaño y legibilidad para botones de ALyC y Benchmark.
- [x] **Layout de acciones en mobile** — Botones de exportar/importar/nueva-op adaptados para pantallas pequeñas.
- [ ] **Event listeners sin cleanup en modales** — `utils.js` agrega listeners de click al overlay del modal pero solo remueve el listener de `keydown` al cerrar.
- [ ] **Error handling sin feedback al usuario** — Múltiples `catch(err)` mudos en `init.js`, `operations.js` y `analysis.js`. Reemplazar por `showToast(err.message, 'error')`.

---

## Backlog — Mejoras Responsive (Completado ✅)

| Sección | Estado | Detalle |
|---------|--------|---------|
| Dashboard | ✅ Adaptado | KPIs, gráficos y tarjetas de instrumentos modernas |
| Operaciones | ✅ Adaptado | Tarjetas colapsables modernas y acciones de cabecera responsive |
| Análisis Pro | ✅ Adaptado | Botones de control optimizados y PDF responsive |
| Maestros | ⚠️ Parcial | Instrumentos, ALyCs y Tipos con tablas clásicas (pendiente cards) |

---

*Stocker Intelligence — Decisiones basadas en datos.*
