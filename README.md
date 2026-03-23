# 📈 Stocker

Aplicación web para el registro y seguimiento de operaciones bursátiles personales (compras y ventas de acciones, CEDEARs y otros instrumentos financieros).

## Características

- **Autenticación** — Login y registro de usuarios vía Supabase Auth.
- **Dashboard** — Resumen ejecutivo de la cartera con KPIs enfocados (en USD si están disponibles) junto a un heatmap de distribución y detalle de activos con cotizaciones en tiempo real.
- **Análisis de Tenencia** — Visualización de la cartera segmentada por ALyC con un diseño simplificado y libre de ruidos. Cada ALyC presenta su propio **Resumen de Cartera** con "Total Invertido", "Valor Actual" y "P&L" (monto/porcentaje) dinámico. Se eliminaron los totales globales en ARS y el gráfico de barras de rendimiento individual para agilizar el análisis.
- **Historial de operaciones** — Registro completo de compras y ventas con soporte para múltiples monedas (ARS/USD).
- **Importación de Operaciones** — Carga masiva de transacciones mediante archivos CSV con detección inteligente de duplicados y previsualización de errores.
- **Búsqueda y Filtrado Avanzado** — Motor de búsqueda optimizado mediante vistas SQL que permite filtrar por ticker, nombre, notas o ALyC en tiempo real.
- **Gestión de Maestros** — ABM (Alta, Baja, Modificación) de Instrumentos, Tipos de Instrumento y ALyCs / Brokers.
- **Seguridad Robusta** — Validación local de tokens JWT, Row Level Security (RLS) en base de datos y validación de esquemas en servidor.
- **Experiencia de Usuario** — Interfaz responsiva con diseño de "isla" para tablas, sistema de temas (oscuro/claro) con iconos SVG minimalistas, notificaciones (toasts) y formularios inteligentes con detección de cambios sin guardar.
- **Optimización Mobile** — Historial ultra-compacto con columnas dinámicas, código de colores semántico (Verde/Rojo) para montos, filas expandibles para acceso a detalles/acciones y paginación táctil con indicador de progreso.
- **Registro Adaptativo** — La interfaz de login oculta automáticamente las opciones de registro si la configuración del sistema las deshabilita, simplificando la entrada al usuario.
- **Logs Estructurados** — Registro detallado de actividad en el servidor utilizando Pino.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Servidor** | Node.js + Express.js |
| **Frontend** | Vanilla JS ES6+ (Módulos nativos, sin bundler) |
| **Estilos** | CSS3 + Water.css (Light/Dark mode automático) |
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

### 3. Descargar dependencias de frontend (Water.css)

```bash
pnpm run setup
```

### 4. Configurar Supabase

En el **SQL Editor** de Supabase, ejecutar los scripts en el siguiente orden para una instalación limpia:

1. `supabase/schema.sql` (Estructura base, relaciones y RLS)
2. `supabase/migration_app_settings.sql` (Tabla de configuración global)
3. `supabase/migration_market_badge_setting.sql` (Configuración de badges de mercado)
4. `supabase/view_operations_search.sql` (Vista optimizada para búsquedas)
5. `supabase/rpc_get_user_holdings.sql` (Lógica de cálculo de tenencias por ALyC)
6. `supabase/rpc_get_user_holdings_global.sql` (Lógica de cálculo de tenencias consolidada)
7. `supabase/performance_indexes.sql` (Índices para optimizar consultas)

### 5. Configurar variables de entorno

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

> **Nota:** El `SUPABASE_JWT_SECRET` es necesario para la validación local de tokens y se encuentra en **Settings -> API -> JWT Settings**.
>
> **`FINANCE_EXCHANGE`** define el sufijo de bolsa para los tickers (ej: `BA` = Bolsa de Buenos Aires). Dejar vacío para tickers sin sufijo (mercados internacionales).

### 6. Iniciar la aplicación

```bash
# Desarrollo (con hot-reload)
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
│   │   │   ├── dashboard.js         # Resumen ejecutivo, KPIs y Heatmap
│   │   │   ├── holdings-analysis.js # Análisis por ALyC con P&L en tiempo real
│   │   │   ├── operations.js        # Historial, formularios e importación
│   │   │   ├── instruments.js       # Gestión de activos
│   │   │   ├── instrument-types.js  # Tipos de activos
│   │   │   ├── alycs.js             # Gestión de Brokers/ALyCs
│   │   │   ├── settings.js          # Configuración de usuario
│   │   │   └── login.js             # Autenticación y registro
│   │   ├── api-client.js       # Cliente HTTP con fetch y manejo de auth
│   │   ├── app.js              # Inicialización, Layout y Toasts
│   │   ├── router.js           # Manejo de rutas mediante hash
│   │   ├── cache.js            # Cache de respuestas API
│   │   ├── auth.js             # Integración con Supabase Auth
│   │   └── utils.js            # Utilidades (modales, escape, etc.)
│   └── css/
├── supabase/
│   ├── schema.sql              # Estructura base: tablas, relaciones y políticas RLS
│   ├── migration_app_settings.sql # Configuración global
│   ├── migration_market_badge_setting.sql # Configuración de UI
│   ├── view_operations_search.sql # Vista para buscador de operaciones
│   ├── rpc_get_user_holdings.sql  # Cálculo de cartera por ALyC
│   ├── rpc_get_user_holdings_global.sql # Cálculo de cartera consolidada
│   └── performance_indexes.sql    # Optimización de consultas
├── views/
│   └── renderPage.js           # Template base (SSR mínimo)
├── server.js                   # API, proxy de precios y validaciones
└── logger.js                   # Configuración de logs (Pino)
```

---

## Seguridad


- **Validación Local:** El servidor utiliza la librería `jose` para verificar la firma de los tokens JWT de Supabase antes de procesar cualquier mutación, reduciendo la latencia y mejorando la seguridad.
- **RLS (Row Level Security):** Todas las tablas de PostgreSQL tienen políticas activas que garantizan que un usuario solo pueda acceder a sus propios registros (`user_id = auth.uid()`).
- **Validación de Datos:** Se implementa un middleware de validación riguroso para asegurar que los datos recibidos en el servidor cumplan con los formatos esperados (UUID, fechas ISO, montos positivos).
- **Cabeceras HTTP:** Helmet.js configura cabeceras de seguridad (CSP, X-Frame-Options, HSTS, Referrer-Policy, etc.) en todas las respuestas.
- **Rate Limiting:** El endpoint de precios limita las consultas reales a Finance a 30 por IP cada 5 minutos (las respuestas cacheadas no consumen quota).
- **Sesión Expirada:** El cliente detecta respuestas 401 automáticamente, cierra la sesión y redirige al login con un mensaje de aviso.
