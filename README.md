# 📈 Stocker

Aplicación web para el registro y seguimiento de operaciones bursátiles personales (compras y ventas de acciones, CEDEARs y otros instrumentos financieros).

## Características

- **Autenticación** — Login y registro de usuarios vía Supabase Auth con persistencia de sesión inteligente que evita refrescos innecesarios.
- **Dashboard Avanzado** — Resumen ejecutivo de la cartera con tarjetas KPI rediseñadas, visualización de **Composición de Cartera** mediante un gráfico circular dinámico y un **Mapa de Calor** de distribución. La tabla de activos incluye indicadores visuales de "peso" en la cartera.
- **Análisis de Cartera Profesional** — Módulo avanzado de análisis cuantitativo para la toma de decisiones informada:
  - **Modelo de Markowitz**: Cálculo de la Frontera Eficiente para identificar la combinación óptima de activos (Max Sharpe).
  - **Métricas CAPM**: Evaluación de **Beta** (sensibilidad al mercado), **Alpha** (exceso de retorno) y **Correlación (R²)** frente a un Benchmark.
  - **Simulaciones de Monte Carlo**: Proyección probabilística de 50 escenarios posibles para la cartera a 1 año de vista.
  - **Backtesting Histórico**: Comparativa de rendimiento acumulado de tu cartera real vs. Benchmarks globales (SPY, QQQ, etc.).
  - **Gestión de Riesgo**: Visualización detallada de **Drawdown** (caídas históricas), contribución al riesgo por activo y matriz de correlación Pearson.
  - **Stress Testing**: Simulación de impacto directo en la cartera ante escenarios de crisis históricas (Crash COVID, Crisis 2008, etc.).
- **Análisis de Tenencia** — Visualización de la cartera segmentada por ALyC con un diseño limpio. Cada ALyC presenta su propio gráfico de distribución y resumen de P&L dinámico.
- **Importación de Operaciones** — Carga masiva mediante archivos CSV con motor de normalización de datos. Soporta el formato estándar: `Alyc;Operacion;Fecha Operacion;Precio;Moneda;Especie;Cantidad`.
- **Historial de operaciones** — Registro completo de compras y ventas con soporte para múltiples monedas (ARS/USD).
- **Búsqueda y Filtrado Avanzado** — Motor de búsqueda optimizado mediante vistas SQL que permite filtrar por ticker, nombre, notas o ALyC en tiempo real.
- **Gestión de Maestros** — ABM (Alta, Baja, Modificación) de Instrumentos, Tipos de Instrumento y ALyCs / Brokers.
- **Seguridad Avanzada** — Implementación de **Rol de Administrador** para restringir configuraciones críticas, **Sanitización XSS** en el servidor para proteger notas y maestros, y **Optimización de JWT** mediante la carga persistente de la librería `jose`.
- **Rendimiento & Escalabilidad** — Uso de **Bulk Quotes API** (`/api/quotes`) para reducir drásticamente el número de peticiones al cargar el dashboard y **Service Workers (PWA Ready)** con estrategia *Stale-While-Revalidate* para carga instantánea de assets.
- **Experiencia de Usuario (UX)** — Interfaz responsiva con diseño de "isla" para tablas, sistema de temas y reemplazo de spinners por **Skeleton Screens (Shimmer)** en Dashboard, Operaciones y Tenencias para una carga percibida superior.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Servidor** | Node.js + Express.js |
| **Frontend** | Vanilla JS ES6+ (Módulos nativos, sin bundler) |
| **Gráficos** | Motor SVG Custom & Chart.js (vía ESM para análisis avanzado) |
| **Estilos** | CSS3 Moderno (Variables, Grid, Flexbox, Shimmer effects) |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Seguridad** | Supabase Auth + JWT (jose persistente) + RLS + Sanitización XSS + Helmet |
| **PWA / Cache** | Service Worker (Stale-While-Revalidate) |
| **Logging** | Pino + pino-pretty |
| **Precios** | Finance API (Bulk Quotes API con cache TTL 5 min) |

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
├── public/
│   ├── sw.js                   # Service Worker (Estrategia SWR)
│   ├── js/
│   │   ├── pages/              # Lógica de cada pantalla (SPA)
│   │   │   ├── dashboard.js         # KPIs modernos y Skeletons
│   │   │   ├── analysis.js          # Análisis avanzado (Markowitz, Monte Carlo)
│   │   │   ├── holdings-analysis.js # Análisis por ALyC
│   │   │   ├── operations.js        # Historial e importación CSV
│   │   │   └── ...
│   │   ├── api-client.js       # Cliente HTTP con soporte Bulk Quotes
│   │   ├── app.js              # Inicialización y Layout principal
│   │   └── ...
│   └── css/
│       └── styles.css          # Estilos personalizados y animaciones Shimmer
├── supabase/
│   └── ...                     # Scripts de base de datos
├── server.js                   # API, sanitización XSS y middleware Admin
└── logger.js                   # Configuración de logs (Pino)
```

---

## Seguridad

- **Validación Local & Optimización:** El servidor utiliza la librería `jose` precargada para verificar la firma de los tokens JWT de Supabase, reduciendo la latencia en cada petición.
- **Rol de Administrador:** Restricción de acceso a configuraciones críticas mediante metadatos de usuario en Supabase (`auth.jwt() -> role`), validado en el servidor mediante un middleware específico.
- **Sanitización XSS:** Todas las entradas de texto (notas, maestros, etc.) son filtradas mediante un motor de sanitización en el servidor para prevenir inyecciones de código HTML malicioso.
- **RLS (Row Level Security):** Garantiza que un usuario solo pueda acceder a sus propios registros directamente en la capa de datos.
- **CSP (Content Security Policy):** Políticas estrictas que limitan la carga de scripts externos a fuentes confiables.
- **Sesión Inteligente:** El frontend detecta cambios de foco y sincroniza la sesión sin recargar la página, manteniendo el estado de navegación del usuario.
