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
19. Evolución histórica del patrimonio total (equity curve) — nueva tarjeta "Evolución del Patrimonio" en el Dashboard con selector de rango (6M/1A/5A/Todo) y una curva por moneda (ARS/USD, sin mezclar). Reconstruye día a día, a partir de `operations_search` + historial de precios por ticker (`/api/history/:ticker?range=`), el valor de cartera y el capital invertido (costo promedio ponderado, mismo método que `get_user_realized_pnl`), con forward-fill de precios entre fechas sin cotización. Lógica pura en `src/js/pages/dashboard/equity-curve.js`, con 7 tests unitarios (`equity-curve.test.js`) cubriendo compra simple, recompra con recálculo de costo promedio, venta total, forward-fill y fallback a costo cuando todavía no hay precio de mercado. No bloquea el resto del Dashboard: se carga en paralelo y de forma no bloqueante porque puede tardar varios segundos (un request de historial por ticker)

### 🔜 Pendientes — ordenados de mayor a menor prioridad
20. Factory reutilizable de tabla CRUD simple — fuerte duplicación entre `instrument-types.js`, `alycs.js` e `instruments.js`
21. Estado mutable centralizado — las 6 páginas con estado usan `let`/objetos sueltos sin patrón común
22. Eliminar `window.Chart` y `window.DOMPurify` — ya no son necesarios como globales
23. Performance — virtual scrolling en tablas grandes, lazy loading de imágenes *(no urgente con el volumen de datos actual)*
24. Features — filtros combinados, exportación avanzada, vistas personalizadas *(vago, definir alcance antes de estimar)*
25. Accesibilidad general — roles ARIA, contraste, navegación por teclado *(gran parte ya cubierta por el #15)*

### ❌ Descartados
- Distribución global por tipo de instrumento — sin sentido si operás un solo tipo de instrumento (ej. solo CEDEARs): siempre mostraría 100% en una categoría, cero información útil. Mismo motivo por el que se sacó la alerta de concentración por tipo (ver #12).

---

*Stocker Intelligence — Potenciado por Vite.*
