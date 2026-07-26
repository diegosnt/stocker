# Stocker Intelligence 🚀

Aplicación web moderna para el registro, seguimiento y análisis estratégico de operaciones bursátiles personales. Diseñada para inversores que buscan una visión profunda de su cartera con herramientas de optimización avanzada.

---

## ⚡ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | **Vite 8** + Vanilla JS ES6+ (Módulos optimizados) |
| **Bundling** | Vite (HMR, Tree-shaking, Minificación con hashes) |
| **Backend** | Node.js + Express (Serverless Functions en Vercel) |
| **Base de datos** | Supabase (PostgreSQL) con RPCs, Vistas y RLS |
| **Autenticación** | Supabase Auth (JWT) + Doble Cookie HttpOnly |
| **Librerías (NPM)** | Chart.js (v4), DOMPurify, jsPDF, html2canvas, concurrently |
| **Estilos** | CSS3 nativo (Variables, Grid, Flexbox) |
| **PWA** | Service Worker optimizado para Vite (Cache dinámico/estático) |

---

## 📂 Estructura del Proyecto

```
api/
  server.js                         ← Express API (Serverless en Vercel)
  logger.js                         ← Logger centralizado con Pino
  views/renderPage.js               ← Renderizador legacy (ahora index.html en raíz)
src/                                ← Corazón del Frontend procesado por Vite
  css/                              ← Estilos modulares con variables CSS
  js/
    init.js                         ← Bootstrap, lazy-loading de páginas y Auth
    router.js                       ← Hash router con cleanup por ruta
    auth.js                         ← Lógica de sesión y tokens
    api-client.js                   ← Fetch autenticado con proxy a /api
    cache.js                        ← Caché en memoria con invalidación por clave
    chart-manager.js                ← Gestor centralizado de gráficos (Chart.js)
    utils.js                        ← Helpers compartidos (formateo, sanitización, modales)
    crud-helpers.js                 ← Helper de borrado compartido por las páginas ABM
    analysis-worker.js              ← Web Worker: Optimización (Markowitz, HRP, Monte Carlo)
    pages/
      dashboard.js                  ← Panel principal con gráficos
      dashboard/equity-curve.js     ← Cálculo puro de la evolución del patrimonio (testeado)
      operations.js                 ← CRUD de operaciones con filtros
      operations/csv-import.js      ← Importación CSV extraída
      analysis.js                   ← Análisis de cartera avanzado
      analysis/correlation.js       ← Matriz de correlación
      analysis/treemap.js           ← Treemap de tenencias
      instruments.js                ← ABM de instrumentos
      instrument-types.js           ← ABM de tipos de instrumento
      alycs.js                      ← ABM de ALyCs
      settings.js                   ← Configuración de usuario
      login.js                      ← Pantalla de inicio de sesión
    vendor/                         ← Librerías estáticas manuales
public/                             ← Assets estáticos puros (no procesados)
  img/                              ← Logos e iconos
  fonts/                            ← Fuentes Inter (Preloaded)
  sw.js                             ← Service Worker (Vite-friendly)
index.html                          ← Punto de entrada de la SPA
vite.config.js                      ← Configuración del motor Vite + Proxy API
vercel.json                         ← Configuración de despliegue híbrido (Static + Functions)
```

---

## 🚀 Puesta en Marcha (Entorno de Desarrollo)

Un solo comando levanta el servidor de la API y el entorno de desarrollo de Vite en paralelo.

```bash
# 1. Preparar el entorno
cp .env.example .env        # Completar SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
                            # No se necesitan prefijos VITE_ — el frontend obtiene la config
                            # en runtime desde /api/config, no en tiempo de build.

# 2. Instalar dependencias
pnpm install

# 3. Lanzar motores (Express + Vite)
pnpm dev
```

- **Frontend (Vite):** [http://localhost:5173](http://localhost:5173)
- **Backend (API):** [http://localhost:3000](http://localhost:3000) (Proxyeado automáticamente por Vite)

---

## 📦 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta API y Frontend simultáneamente con `concurrently`. |
| `pnpm build` | Genera el bundle de producción optimizado en `/dist`. |
| `pnpm dev:server` | Solo levanta el servidor de Express (Backend). |
| `pnpm dev:client` | Solo levanta el entorno de Vite (Frontend). |
| `pnpm start` | Corre el servidor de producción. |
| `pnpm test` | Corre la suite de tests una vez (Vitest). |
| `pnpm test:watch` | Corre los tests en modo watch. |

---

## ☁️ Despliegue en Vercel

El proyecto está configurado para un despliegue **Híbrido**:
1.  **Frontend:** Se compila con `vite build` y se sirve desde el Edge de Vercel (CDNs).
2.  **Backend:** La carpeta `/api` se despliega como **Serverless Functions**.

### ⚠️ Configuración de Env Vars en Vercel

El frontend **no usa variables `VITE_*`**. La config de Supabase se sirve en runtime desde `/api/config`, que lee directamente `process.env`. Solo necesitás configurar las variables del servidor (sin prefijo) en el dashboard de Vercel:

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública anon |
| `SUPABASE_JWT_SECRET` | Secret para validar JWTs |

> **¿Por qué no `VITE_*`?** Las variables `VITE_*` se bakean en el bundle en tiempo de build — si no están disponibles en ese momento, el valor queda como `undefined` y todas las llamadas REST a Supabase fallan con `401 Invalid API key`. Con el enfoque actual, el cliente fetchea la config al arrancar y el problema no puede ocurrir.

> **`dist/` está en `.gitignore`** — Vercel siempre buildea desde source. No commitear el build evita que un bundle local sobreescriba el build de Vercel.

---

## 🛡️ Seguridad y Optimización

- **HMR (Hot Module Replacement):** Los cambios en JS/CSS se reflejan al instante sin recargar.
- **Cache Busting:** Vite agrega hashes únicos a los archivos en cada build (`index-a1b2c3d4.js`), eliminando problemas de cache vieja.
- **Lazy-loading por ruta:** Cada página se carga con `import()` dinámico — las páginas no visitadas no entran al bundle inicial (~22 kB).
- **Gestión centralizada de gráficos:** Chart.js se carga solo cuando una página con gráficos lo necesita, a través de `chart-manager.js`.
- **DOMPurify lazy:** Se precarga en background post-auth; las funciones de sanitización en `utils.js` tienen fallback seguro si aún no está disponible.
- **Web Workers:** El trabajador de análisis pesado se carga dinámicamente usando `new URL(..., import.meta.url)`.

---

## 📥 Importación de Operaciones por CSV

La pantalla de Operaciones permite importar un lote de operaciones desde un archivo `.csv` usando el botón **Importar CSV**.

### Especificación del archivo

| Propiedad | Valor |
|-----------|-------|
| Formato | CSV con separador **punto y coma** (`;`) |
| Encoding | UTF-8 |
| Primera fila | Encabezados (obligatorio) |
| Mínimo | 1 fila de datos |

### Columnas requeridas

Los nombres de encabezado son **case-insensitive** y el orden de las columnas es libre, siempre que los nombres coincidan exactamente.

| Columna | Descripción | Valores aceptados |
|---------|-------------|-------------------|
| `fecha operacion` | Fecha de la operación | `DD/MM/AAAA` o `DD/MM/AA` |
| `operacion` | Tipo de operación | `compra` / `venta` (case-insensitive) |
| `especie` | Ticker del instrumento | Debe existir en el sistema |
| `alyc` | Nombre del ALyC | Debe existir en el sistema |
| `precio` | Precio unitario | Número (`,` o `.` como decimal) |
| `cantidad` | Cantidad de unidades | Número (`,` o `.` como decimal) |
| `moneda` | Moneda de la operación | `ARS`, `USD` (también acepta `ARG` → normaliza a `ARS`) |

### Comportamiento al importar

- **Duplicados:** si se detectan operaciones ya existentes, se muestra un modal para elegir cuáles reimportar.
- **Entidades no encontradas:** si el ticker o el ALyC no existen en el sistema, la fila se omite y se informa en un modal de errores al finalizar.
- **Números:** se aceptan tanto `1.234,56` (formato europeo) como `1234.56` (formato anglosajón).

### Ejemplo de archivo CSV

```csv
fecha operacion;operacion;especie;alyc;precio;cantidad;moneda
15/03/2024;compra;GGAL;IOL;450,50;100;ARS
20/03/2024;venta;YPFD;PPI;25000;50;ARS
05/04/2024;compra;BMA;Balanz;550,75;200;ARS
10/04/2024;compra;AAPL;IOL;185.30;10;USD
```

---

## 🗺️ Roadmap

### ✅ Completadas
1. Eliminación de `holdings-analysis.js` (código muerto, 667 líneas)
2. Consistencia en router — las 3 referencias default a `dashboard`
3. CSS huérfano movido dentro de media query
4. Eliminación de `renderer.js` (virtual DOM no utilizado, 132 líneas)
5. Eliminación de `_performCAPM()` y `_calculateMDD()` (valores vienen del Worker)
6. Code-splitting por ruta — Chart.js, Treemap y DOMPurify lazy-loaded
7. Descomposición de archivos grandes — `operations/csv-import.js`, `analysis/correlation.js`, `analysis/treemap.js`
8. Centralización de helpers duplicados — `fmtDate`, `fmtDateShort`, `buildPageRange` en `utils.js` (~39 líneas menos)
9. Cleanup methods para las 7 páginas — timers cancelados, estado de módulo reseteado al navegar
10. Ganancias Realizadas en el Dashboard — nueva tarjeta colapsable usando `get_user_realized_pnl()` (P&L realizado con costo promedio ponderado); requiere aplicar el RPC en Supabase (`supabase/rpc_get_user_realized_pnl.sql`)
11. Límite/expiración activa en `quoteCache` (`api/server.js`) — barrido periódico de entradas vencidas + tope de 500 tickers para evitar crecimiento indefinido en memoria
12. Alertas de concentración de riesgo — aviso si un solo ticker supera el 25%/40% de la cartera (Dashboard y Análisis, por ALyC)
13. Responsive mobile (tabla → tarjetas apiladas) en `instruments.js`, `instrument-types.js` y `alycs.js` (`operations.js` ya lo tenía resuelto)
14. Seguridad — verificado en `api/server.js`: CSP real con nonce por request, CSRF en todas las mutaciones, rate limiting por tipo de endpoint, JWT verificado con `jose`, y validación server-side por campo (tipos, longitudes, regex, UUID/fecha/positivos) + `sanitize()` antes de insertar. Ya estaba hecho, el ítem quedó desactualizado. Gap menor conocido y aceptado: `styleSrcAttr: 'unsafe-inline'` (refactor grande, riesgo bajo, no priorizado)
15. `aria-label` en botones icon-only — el ítem apuntaba a archivos que en realidad no tienen botones icon-only (`instruments.js`, `instrument-types.js`, `alycs.js`, `dashboard.js`, `settings.js` ya usan texto visible). Se corrigieron los 10 botones reales sin label en todo el proyecto: navbar global (`init.js` — tema/recargar/salir), `login.js` (tema), `analysis.js` (toggle config + refresh comparativa) y 5 botones de cerrar modal (✕) en `operations.js`/`operations/csv-import.js`
16. Unificar skeleton loaders — `instrument-types.js`, `instruments.js` y `alycs.js` usaban un `<span class="spinner">` genérico en vez de skeleton (y las tarjetas mobile no tenían ningún estado de carga); `settings.js` también pasó de spinner+texto a skeleton con la forma real de cada `setting-row`. `analysis.js` quedó afuera a propósito: su loading principal cubre un cálculo compuesto y de duración variable (Monte Carlo, backtesting, Worker), donde un spinner comunica mejor que un skeleton con forma fija
17. Tests — se agregó **Vitest** (comparte config con Vite vía `vite.config.js`, cero configuración extra) con `pnpm test` / `pnpm test:watch`. Primer archivo: `src/js/utils.test.js` (15 tests) cubriendo `esc`, `fmtDateShort`, `buildPageRange` y `getConcentrationAlert` — funciones puras sin DOM, elegidas a propósito como punto de partida
18. Comparación de rendimiento/composición entre ALyCs — la composición (distribución + posiciones por ALyC) ya existía en el Dashboard; lo que faltaba era **rendimiento**. Se agregó una tarjeta "Rendimiento por ALyC" (gráfico de barras P&L % + tabla Invertido/Valor Actual/P&L $/P&L %), reutilizando `get_user_holdings_by_alyc` y los precios ya resueltos — sin queries nuevas
19. Evolución histórica del patrimonio total (equity curve) — nueva tarjeta "Evolución del Patrimonio" en el Dashboard con selector de rango (6M/1A/5A/Todo) y una curva por moneda (ARS/USD, sin mezclar), mostrando el valor de cartera día a día (simplificado a una sola línea a pedido del usuario, sin la comparación contra capital invertido). Lógica pura en `src/js/pages/dashboard/equity-curve.js` (sigue calculando también `invested` con costo promedio ponderado, mismo método que `get_user_realized_pnl`, por si se retoma), con 7 tests unitarios. No bloquea el resto del Dashboard (se carga en paralelo, puede tardar varios segundos). De paso se encontró y corrigió un bug real en `/api/history/:ticker`: elegía el ticker con más historia entre el subyacente (USD) y el local `.BA` (ARS), y el subyacente casi siempre gana — devolvía sistemáticamente precios en la moneda equivocada para CEDEARs. Ahora prioriza siempre el local si tiene datos
20. Factory reutilizable de tabla CRUD simple — se extrajeron a `src/js/utils.js` (`bindSortableHeaders`, `confirmDiscardIfDirty`, `resetEditForm`) y a un `src/js/crud-helpers.js` nuevo (`deleteWithConfirm`, separado para evitar un import circular con `init.js`) las partes 100% idénticas entre `instrument-types.js`, `instruments.js` y `alycs.js`. Se descartó una factory de página completa: las tres difieren demasiado (paginación solo en instruments, sorting ausente en instrument-types) como para que un único generador de página redujera complejidad en vez de agregarla
21. Estado mutable centralizado — `instrument-types.js`, `instruments.js` y `alycs.js` usaban variables `let` a nivel de módulo; se movieron a propiedades `this._x` del objeto de página, igual que ya hacían `dashboard.js`/`analysis.js`. `operations.js` quedó afuera a propósito: ya usa un patrón distinto pero más sofisticado (`const state = {...}` con `get`/`set` por path anidado) y no vale el riesgo de tocar un archivo de 1200+ líneas por consistencia de estilo pura, sin ningún beneficio para el usuario
22. Eliminar `window.Chart` y `window.DOMPurify` — `chart-manager.js` ya tenía `Chart` importado como módulo ES; se sacó el `window.Chart = Chart` y los 11 `new window.Chart(...)` (ahí y en `analysis.js`) pasaron a usar el import directo, re-exportado desde `chart-manager.js` para garantizar que ya esté registrado con los controllers (Treemap, etc.). `window.DOMPurify` (usado en `utils.js` para lazy-load, seteado desde `init.js` tras un `import('dompurify')` dinámico) pasó a una variable de módulo (`setDOMPurify()` en `utils.js`) con un flag `domPurifyLoading` en `init.js` para preservar el guard contra recargas duplicadas al re-renderizar el shell
24. Features — verificado antes de tocar código: "filtros combinados" (ALyC + instrumento + tipo + moneda + rango de fechas + búsqueda, todos combinables con AND) y "exportación avanzada" (CSV respetando filtros activos en `operations.js`, reporte PDF completo en `analysis.js`) **ya existían**. Lo único que faltaba de verdad era "vistas personalizadas"; se implementó la versión simple que el usuario eligió: `operations.js` ahora recuerda la última combinación de filtros usada (`localStorage`, key `stocker_operations_filters`) y la restaura al volver a entrar a la página
25. Accesibilidad general — se encontraron y corrigieron 3 problemas reales (verificados, no solo "podría ser"): **(1) navegación por teclado** — 4 headers colapsables (`dash-table-header`, `dash-realized-pnl-header`, el acordeón de tarjetas mobile en Dashboard/Análisis, y las tarjetas de `operations.js`) eran `<div onclick>` sin `tabindex`/rol/manejo de teclado, inoperables para un usuario que navega solo con Tab; se agregaron `bindCollapsibleSection()`/`bindCardAccordion()` en `utils.js` (rol, `tabindex`, Enter/Espacio, `aria-expanded`), reduciendo también la duplicación entre los 3 call sites que hacían lo mismo a mano. **(2) contraste** — `--text-muted` en modo claro (`#64748b`) daba 4.35:1 contra `--bg-main`, por debajo del mínimo WCAG AA de 4.5:1 (calculado con la fórmula de luminancia relativa); se oscureció a `#475569` (Slate 600, ~6.9:1). **(3) bug de CSS** — `var(--color-muted)` se usaba en 6 lugares pero esa variable nunca existió (typo de `--text-muted`); el navegador la ignoraba silenciosamente y esos textos renderizaban en color normal en vez de atenuado. `analysis-config-header` se revisó y no necesitaba arreglo: ya es accesible por teclado indirectamente a través del botón interno con el evento que hace bubbling

**Roadmap completo — los 25 ítems originales fueron revisados y resueltos (implementados, verificados-ya-hechos, o descartados con justificación).**

### ❌ Descartados
- Distribución global por tipo de instrumento — sin sentido si operás un solo tipo de instrumento (ej. solo CEDEARs): siempre mostraría 100% en una categoría, cero información útil. Mismo motivo por el que se sacó la alerta de concentración por tipo (ver #12).
- Performance (virtual scrolling / lazy loading de imágenes) — verificado, no hay nada real para resolver: solo hay 2 `<img>` en todo el proyecto (el mismo logo SVG, contenido crítico above-the-fold que no debe lazy-loadearse), y la única tabla que puede crecer sin límite (`operations.js`) ya tiene paginación. El resto de las tablas están acotadas por naturaleza (catálogos chicos o cantidad de tickers distintos, no historial transaccional)

## 🔍 Segunda ronda (auditoría posterior al roadmap original)

### ✅ Completadas
26. **Bug de integridad de datos — importación CSV** (crítico): cualquier fila donde la columna "operacion" no fuera exactamente "compra" (typo, celda vacía, columna corrida) se guardaba **silenciosamente como "venta"**, sin avisar — podía corromper holdings, P&L y la evolución del patrimonio sin que el usuario se entere. El endpoint `/api/operations/bulk` tampoco validaba `type` (a diferencia del endpoint simple `/api/operations`, que sí lo hace). Fix en dos capas: **(1)** el parseo de CSV (extraído a `src/js/pages/operations/csv-parser.js`, módulo puro y testeado — 8 tests nuevos) ahora rechaza explícitamente cualquier valor que no sea "compra"/"venta" y lo reporta en el modal de "Registros no importados" en vez de adivinar; **(2)** `api/server.js` valida `type` por fila en el bulk endpoint como defensa en profundidad. De paso se corrigió un bug de acumulación en `csv-import.js`: `allFailedEntities` se *reemplazaba* en vez de *concatenarse* en 3 lugares, perdiendo errores previos (incluidos los nuevos de validación local) cuando había reintentos por duplicados

### 🔜 Pendientes
27. Exponer `role` del usuario en `/api/auth/session` (ya se calcula en cada request vía `requireAuth`, cero queries nuevas) y ocultar/gatear la página de Configuración en el frontend para no-admins — hoy cualquier usuario ve los toggles y le falla el guardado sin explicación
28. Guard de request obsoleta en `_loadEquityCurve` (`dashboard.js`) — si cambiás de rango rápido (6M→5A), no hay cancelación de la request anterior; puede terminar mostrando datos de un rango distinto al botón marcado activo. `operations.js` ya resuelve esto mismo con `state.abortController`/`requestId`, no se reusó ese patrón acá
29. Actualizar `dompurify` a la última versión — no explotable con la configuración actual (`ALLOWED_TAGS`/`ALLOWED_ATTR` explícitos, sin las opciones vulnerables), pero mala higiene mantener desactualizada la defensa XSS del cliente en una app financiera
30. CAGR (retorno anualizado) y drawdown máximo real, calculables directo de `computeEquitySeries` sin fetch nuevo — mostrarlos como dato junto a la curva de patrimonio
31. Posible inconsistencia de fuente de verdad para "admin": `requireAdmin` en `api/server.js` usa la tabla `user_roles`, pero la policy RLS de `app_settings` en `schema.sql` chequea un claim JWT (`user_metadata.role`) que el trigger de `fix-user-roles.sql` nunca setea. Hoy queda enmascarado porque todo pasa por la API Express; solo importa si algún día se llama a Supabase directo desde el cliente para `app_settings`

---

*Stocker Intelligence — Potenciado por Vite.*
