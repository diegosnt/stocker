# 📈 Stocker

Aplicación web para el registro y seguimiento de operaciones bursátiles personales (compras y ventas de acciones, CEDEARs y otros instrumentos financieros).

## Características

- **Autenticación** — Login y registro de usuarios vía Supabase Auth.
- **Análisis de Tenencia** — Visualización en tiempo real de la cartera actual por ALyC e instrumento, con KPIs de valorización total (ARS/USD) y gráficos de distribución.
- **Historial de operaciones** — Registro completo de compras y ventas con soporte para múltiples monedas (ARS/USD).
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
| **Seguridad** | Supabase Auth + JWT (jose) + RLS |
| **Logging** | Pino + pino-pretty |

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

1. `supabase/schema.sql` (Estructura base y RLS)
2. `supabase/migration_app_settings.sql` (Tabla de configuración global)
3. `supabase/view_operations_search.sql` (Vista optimizada para búsquedas)
4. `supabase/rpc_get_user_holdings.sql` (Lógica de cálculo de tenencias en servidor)
5. `supabase/performance_indexes.sql` (Índices para optimizar consultas)

### 5. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_JWT_SECRET=<tu-jwt-secret>
PORT=3000
```

> **Nota:** El `SUPABASE_JWT_SECRET` es necesario para la validación local de tokens y se encuentra en **Settings -> API -> JWT Settings**.

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
│   │   │   ├── holdings-analysis.js # Análisis de cartera
│   │   │   ├── operations.js        # Historial y formularios
│   │   │   └── ...
│   │   ├── api-client.js       # Cliente HTTP con fetch y auth
│   │   ├── app.js              # Inicialización y Layout
│   │   └── router.js           # Manejo de rutas mediante hash
│   └── css/
├── supabase/
│   ├── schema.sql              # Estructura base: tablas, relaciones y políticas RLS
│   ├── migration_app_settings.sql # Configuración global (ej: habilitar registros)
│   ├── view_operations_search.sql # Vista optimizada para el buscador de operaciones
│   ├── rpc_get_user_holdings.sql  # Lógica de cálculo de cartera (ejecutada en DB)
│   ├── performance_indexes.sql    # Índices para acelerar consultas frecuentes
│   └── ...
├── views/
│   └── renderPage.js           # Template base (Server Side Rendering mínimo)
├── server.js                   # Endpoints API y validaciones
└── logger.js                   # Configuración de logs (Pino)
```

## Seguridad

- **Validación Local:** El servidor utiliza la librería `jose` para verificar la firma de los tokens JWT de Supabase antes de procesar cualquier mutación, reduciendo la latencia y mejorando la seguridad.
- **RLS (Row Level Security):** Todas las tablas de PostgreSQL tienen políticas activas que garantizan que un usuario solo pueda acceder a sus propios registros (`user_id = auth.uid()`).
- **Validación de Datos:** Se implementa un middleware de validación riguroso para asegurar que los datos recibidos en el servidor cumplan con los formatos esperados (UUID, fechas ISO, montos positivos).
