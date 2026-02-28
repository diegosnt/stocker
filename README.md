# 📈 Stocker

Aplicación web para el registro y seguimiento de operaciones bursátiles personales (compras y ventas de acciones, CEDEARs y otros instrumentos financieros).

## Características

- **Autenticación** — login y registro de usuarios vía Supabase Auth
- **Historial de operaciones** — registro de compras y ventas con instrumento, ALyC, cantidad, precio, moneda y fecha
- **Maestros** — ABM completo de Tipos de Instrumento, Instrumentos y ALyCs / Brokers
- **Configuración** — habilitación/deshabilitación del registro de nuevos usuarios
- **Logs estructurados** — todas las operaciones de escritura quedan registradas en el servidor con Pino

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express.js |
| Frontend | Vanilla JS ES6+ (módulos nativos, sin bundler) |
| Estilos | CSS3 + Water.css |
| Base de datos | Supabase (PostgreSQL + Row Level Security) |
| Autenticación | Supabase Auth |
| Logging | Pino + pino-pretty |

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [pnpm](https://pnpm.io/) (o npm / yarn)
- Cuenta en [Supabase](https://supabase.com/) (plan gratuito es suficiente)

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

### 3. Descargar Water.css

```bash
pnpm run setup
```

### 4. Configurar Supabase

En el [SQL Editor de Supabase](https://supabase.com/dashboard), ejecutar el archivo `supabase/schema.sql`. Esto crea las tablas, índices, políticas RLS e inserta la configuración inicial.

> Si ya tenés el schema base y solo querés agregar la tabla de configuración, ejecutá `supabase/migration_app_settings.sql`.

### 5. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los datos del proyecto de Supabase:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=<tu-anon-key>
PORT=3000
```

Las claves se encuentran en **Supabase → Project Settings → API**.

### 6. Iniciar la aplicación

```bash
# Producción
pnpm start

# Desarrollo (recarga automática)
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Estructura del proyecto

```
stocker/
├── public/
│   ├── css/
│   │   └── styles.css          # Estilos personalizados
│   ├── img/
│   │   └── logo.svg            # Logo de la aplicación
│   ├── js/
│   │   ├── app.js              # Punto de entrada, layout y router
│   │   ├── auth.js             # Funciones de autenticación
│   │   ├── router.js           # Router basado en hash (#ruta)
│   │   ├── supabase-client.js  # Cliente Supabase
│   │   └── pages/
│   │       ├── login.js
│   │       ├── operations.js
│   │       ├── instruments.js
│   │       ├── instrument-types.js
│   │       ├── alycs.js
│   │       └── settings.js
│   └── favicon.ico
├── scripts/
│   └── download-deps.js        # Descarga Water.css
├── supabase/
│   ├── schema.sql              # Schema completo (instalación nueva)
│   └── migration_app_settings.sql  # Migración incremental
├── views/
│   └── renderPage.js           # Template HTML del servidor
├── logger.js                   # Configuración de Pino
├── server.js                   # Servidor Express y rutas API
├── .env.example
└── package.json
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto de Supabase |
| `SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |
| `PORT` | Puerto del servidor (por defecto: `3000`) |
| `LOG_LEVEL` | Nivel de log de Pino (por defecto: `info`) |
| `NODE_ENV` | `production` para logs en JSON puro, cualquier otro para pino-pretty |

## Seguridad

- Todas las tablas tienen **Row Level Security (RLS)** activado en Supabase: cada usuario solo puede ver y modificar sus propios datos.
- El servidor actúa como intermediario para las operaciones de escritura, registrando cada acción con Pino y reenviando el token JWT del usuario a Supabase para que RLS siga activo.
- Las variables de entorno con claves nunca se suben al repositorio (`.gitignore`).
