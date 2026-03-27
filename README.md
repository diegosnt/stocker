# 📈 Stocker

Aplicación web para el registro y seguimiento de operaciones bursátiles personales (compras y ventas de acciones, CEDEARs y otros instrumentos financieros).

## Características

- **Autenticación** — Login y registro de usuarios vía Supabase Auth con persistencia de sesión inteligente que evita refrescos innecesarios.
- **Reportes de Élite en PDF** — Generación de reportes profesionales en alta resolución (Screen-to-PDF). Captura íntegra del análisis respetando el diseño exacto de la pantalla, con encabezados dinámicos (ALyC y fecha), contenido educativo integrado desde Supabase y optimización de peso (JPEG High Quality).
- **Dashboard Avanzado** — Resumen ejecutivo de la cartera con tarjetas KPI rediseñadas, visualización de **Composición de Cartera** mediante un gráfico circular dinámico y un **Mapa de Calor** de distribución. La tabla de activos incluye indicadores visuales de "peso" en la cartera.
- **Análisis de Cartera Avanzado (Mejorado)** — Módulo cuantitativo profesional optimizado:
  - **Situación Actual**: Tabla de tenencia 100% sincronizada con precios de mercado y gráfico Donut de distribución.
  - **Optimización de Markowitz Pro**: Restricción de diversificación mínima (piso del 5% por activo) para carteras más realistas (Max Sharpe).
  - **Métricas CAPM**: Evaluación de **Beta**, **Alpha** y **Correlación (R²)** frente a un Benchmark.
  - **Simulaciones de Monte Carlo**: Proyección probabilística de escenarios posibles a 1 año.
  - **Backtesting Histórico**: Comparativa de rendimiento acumulado vs. Benchmarks globales.
  - **Gestión de Riesgo**: Visualización de **Drawdown** y Riesgo con diseño dinámico que se adapta al contenido vecino.
  - **Stress Testing**: Simulación de impacto ante escenarios de crisis históricas.
- **Análisis de Tenencia** — Visualización de la cartera segmentada por ALyC con un diseño limpio. Cada ALyC presenta su propio gráfico de distribución y resumen de P&L dinámico.
- **Importación de Operaciones** — Carga masiva mediante archivos CSV con motor de normalización de datos. Soporta formato europeo (`1.234,56`) y anglosajón (`1,234.56`).
- **Historial de operaciones** — Registro completo de compras y ventas con soporte para múltiples monedas (ARS/USD).
- **Búsqueda y Filtrado Avanzado** — Motor de búsqueda optimizado mediante vistas SQL que permite filtrar por ticker, nombre, notas o ALyC en tiempo real, con **cancelación de requests** para evitar race conditions.
- **Gestión de Maestros** — ABM (Alta, Baja, Modificación) de Instrumentos, Tipos de Instrumento y ALyCs / Brokers.
- **Seguridad Avanzada** — Implementación de **Rol de Administrador** para restringir configuraciones críticas, **Sanitización XSS** robusta en el servidor para proteger notas y maestros, y **Optimización de JWT** mediante la librería `jose`.
- **Rendimiento & Escalabilidad** — Múltiples optimizaciones implementadas:
  - **Lazy Loading de PDF** — jsPDF y html2canvas (~552KB) solo se cargan al exportar PDF, no en todas las páginas.
  - **Supabase Minimal Client** — SDK completo reemplazado por cliente fetch custom (~5KB vs 110KB).
  - **Non-blocking PDF Export** — PDF generation usa `requestIdleCallback` y progress updates para no bloquear el thread.
  - **CSS Transitions Optimizadas** — Transiciones limitadas a `transform`, `opacity`, `background-color`, `box-shadow` (evita repaints innecesarios).
  - **Preload de Fuentes** — Fuentes Inter pre-cargadas para mejorar LCP.
  - **Bulk Quotes API** (`/api/quotes`) con pool de concurrencia máximo 5 requests.
  - **Caché en memoria** para `get_user_holdings` con TTL 5 min.
  - **Paginación** en RPC de holdings para carteras grandes.
  - **Rate limiting** robusto con `express-rate-limit` (no bypassable).
  - **Service Workers (PWA Ready)** con versionado automático diario y estrategia *Stale-While-Revalidate*.
  - **Smart Render** que evita re-renders innecesarios.
  - **State consolidado** en Operations (pagination, filters, sorting).
  - **Cálculos financieros** extraídos a módulo reutilizable (`calculations.js`).
  - **Cleanup de intervals** al navegar entre páginas.
- **Experiencia de Usuario (UX)** — Interfaz responsiva con diseño de "isla" para tablas, sistema de temas con **debounce** en localStorage y reemplazo de spinners por **Skeleton Screens (Shimmer)** en Dashboard, Operaciones y Tenencias para una carga percibida superior.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Infraestructura** | [Vercel](https://vercel.com/) (Serverless Functions) |
| **Servidor** | Node.js + Express.js (Optimizado para API routes) |
| **Frontend** | Vanilla JS ES6+ (Módulos nativos, total independencia de CDNs) |
| **Reportes PDF** | **jsPDF** & **html2canvas** (Generación en cliente, lazy load) |
| **Gráficos** | Motor SVG Custom & **Chart.js** (vía ESM / Vendor) |
| **Estilos** | CSS3 Moderno (Variables, Grid, Flexbox, Shimmer effects) |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Seguridad** | Supabase Auth + JWT (jose persistente) + RLS + Sanitización XSS + Helmet + express-rate-limit |
| **PWA / Cache** | Service Worker (Stale-While-Revalidate, versionado automático) |
| **Logging** | Pino + pino-pretty |
| **Precios** | Finance API (Bulk Quotes API con cache TTL 5 min) |
| **Cálculos** | Módulo `calculations.js` (Markowitz, HRP, CAPM, Monte Carlo) |

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior.
- [pnpm](https://pnpm.io/) (recomendado) o npm / yarn.
- Cuenta en [Supabase](https://supabase.com/).

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd stocker
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar Supabase

En el **SQL Editor** de Supabase, ejecutar los scripts en el siguiente orden para una instalación limpia:

1. `supabase/schema.sql` (Estructura base, relaciones y RLS)
2. `supabase/migration_app_settings.sql` (Tabla de configuración global)
3. `supabase/migration_market_badge_setting.sql` (Configuración de badges de mercado)
4. `supabase/view_operations_search.sql` (Vista optimizada para buscas)
5. `supabase/rpc_get_user_holdings.sql` (Lógica de cálculo de tenencias por ALyC)
6. `supabase/rpc_get_user_holdings_global.sql` (Lógica de cálculo de tenencias consolidada)
7. `supabase/performance_indexes.sql` (Índices para optimizar consultas)

### 4. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_JWT_SECRET=<tu-jwt-secret>
PORT=3000

# Finance
FINANCE_URL=https://finance
FINANCE_EXCHANGE=BA
```

### 5. Iniciar la aplicación

```bash
# Desarrollo (con hot-reload nativo)
pnpm dev

# Producción
pnpm start
```

## Estructura del proyecto

```
stocker/
├── api/                    # Serverless Functions (Vercel)
│   ├── server.js           # API, sanitización XSS y middleware
│   ├── logger.js           # Configuración de logs (Pino)
│   └── views/              # Renderizado de vistas del lado servidor
├── public/                 # Assets estáticos y cliente
│   ├── sw.js               # Service Worker (Estrategia SWR)
│   ├── js/
│   │   ├── pages/          # Lógica de cada pantalla (SPA)
│   │   ├── vendor/         # Librerías locales (Chart.js, jsPDF, etc.)
│   │   ├── supabase-minimal.js  # Cliente Supabase custom (~5KB)
│   │   ├── api-client.js   # Cliente HTTP optimizado
│   │   └── init.js         # Inicialización del sistema
│   ├── css/
│   │   └── styles.css      # CSS Moderno y animaciones Shimmer
│   └── fonts/              # Tipografías auto-hospedadas (Inter)
├── supabase/               # Scripts de base de datos y migraciones
└── vercel.json             # Configuración de despliegue
```

---

## Seguridad

- **Validación Local & Optimización:** El servidor utiliza la librería `jose` precargada para verificar la firma de los tokens JWT de Supabase, reduciendo la latencia en cada petición.
- **Rol de Administrador:** Restricción de acceso a configuraciones críticas mediante metadatos de usuario en Supabase (`auth.jwt() -> role`), validado en el servidor mediante un middleware específico.
- **Sanitización XSS:** Todas las entradas de texto (notas, maestros, etc.) son filtradas mediante un motor de sanitización en el servidor que detecta tags HTML, event handlers inline, y URLs `javascript:`/`data:`.
- **RLS (Row Level Security):** Garantiza que un usuario solo pueda acceder a sus propios registros directamente en la capa de datos.
- **CSP (Content Security Policy):** Políticas estrictas que limitan la carga de scripts externos a fuentes confiables.
- **Sesión Inteligente:** El frontend detecta cambios de foco y sincroniza la sesión sin recargar la página, manteniendo el estado de navegación del usuario.
