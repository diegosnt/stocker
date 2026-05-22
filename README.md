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

### 🔜 Pendientes
10. Estado mutable centralizado — las 6 páginas con estado usan `let`/objetos sueltos sin patrón común
11. Eliminar `window.Chart` y `window.DOMPurify` — ya no son necesarios como globales
12. Tests — agregar dependencias y primer test unitario
13. Accesibilidad — roles ARIA, contraste, navegación por teclado
14. Features — filtros combinados, exportación avanzada, vistas personalizadas
15. Performance — virtual scrolling en tablas grandes, lazy loading de imágenes
16. Seguridad — Content-Security-Policy, validación del lado del servidor

---

*Stocker Intelligence — Potenciado por Vite.*
