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
- **Seguridad Robusta** — Validación local de tokens JWT, Row Level Security (RLS) en base de datos y política de seguridad de contenidos (CSP) estricta.
- **Experiencia de Usuario** — Interfaz responsiva con diseño de "isla" para tablas, sistema de temas (oscuro/claro) con iconos SVG minimalistas y persistencia de estado entre ventanas.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Servidor** | Node.js + Express.js |
| **Frontend** | Vanilla JS ES6+ (Módulos nativos, sin bundler) |
| **Gráficos** | Motor SVG Custom & Chart.js (vía ESM para análisis avanzado) |
| **Estilos** | CSS3 Moderno (Variables, Grid, Flexbox) |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Seguridad** | Supabase Auth + JWT (jose) + RLS + Helmet |
| **Logging** | Pino + pino-pretty |
| **Precios** | Finance API (proxy server-side con cache TTL 5 min) |

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
│   ├── js/
│   │   ├── pages/              # Lógica de cada pantalla (SPA)
│   │   │   ├── dashboard.js         # KPIs modernos, Gráfico Composición y Heatmap
│   │   │   ├── analysis.js          # Markowitz, CAPM, Monte Carlo y Stress Testing
│   │   │   ├── holdings-analysis.js # Análisis por ALyC con gráficos SVG
│   │   │   ├── operations.js        # Historial e importación masiva CSV
│   │   │   └── ...
│   │   ├── api-client.js       # Cliente HTTP con manejo de auth
│   │   ├── app.js              # Inicialización y Layout principal
│   │   └── ...
│   └── css/
│       └── styles.css          # Estilos personalizados y componentes modernos
├── supabase/
│   └── ...                     # Scripts de base de datos
├── server.js                   # API, proxy de precios y validaciones
└── logger.js                   # Configuración de logs (Pino)
```

---

## Seguridad

- **Validación Local:** El servidor utiliza la librería `jose` para verificar la firma de los tokens JWT de Supabase antes de procesar cualquier mutación.
- **RLS (Row Level Security):** Garantiza que un usuario solo pueda acceder a sus propios registros.
- **CSP (Content Security Policy):** Políticas estrictas que limitan la carga de scripts externos a fuentes confiables (como `esm.sh`).
- **Rate Limiting:** Control de flujo para las peticiones de precios externos.
- **Sesión Inteligente:** El frontend detecta cambios de foco y sincroniza la sesión sin recargar la página, manteniendo el estado de navegación del usuario.
