# Stocker Intelligence 🚀

Aplicación web de grado profesional para el registro, seguimiento y análisis estratégico de operaciones bursátiles personales. Diseñada para inversores que buscan una visión profunda de su cartera con herramientas de optimización avanzada.

## 🔒 Seguridad

La aplicación implementa múltiples capas de protección:

### Medidas Implementadas

| Feature | Descripción |
|---------|-------------|
| **HttpOnly Cookies** | Tokens de sesión almacenados en cookies con flags HttpOnly, Secure, SameSite |
| **CSRF Protection** | Tokens sincronizados en todas las mutaciones (POST/PATCH/DELETE) |
| **XSS Protection** | DOMPurify sanitiza todo el contenido dinámico en el frontend |
| **Row Level Security** | PostgreSQL RLS asegura aislamiento de datos por usuario |
| **Admin-only Settings** | Solo admins pueden modificar configuración global (verificado via JWT) |
| **JWT Validation** | Tokens verificados localmente en cada request al backend |
| **Input Sanitization** | Backend sanitiza todos los inputs antes de procesarlos |
| **Helmet CSP** | Content Security Policy configurada |

### Arquitectura de Autenticación

```
Frontend (SPA)
    │
    ├─► /api/auth/login  ──► Backend Express ──► Supabase Auth
    │                                              │
    │◄──── Cookie HttpOnly ◄──────────────────────┘
    │
    └─► Supabase (directo) ──► Queries RLS
              ▲
              │
       localStorage (token para RLS)
```

- **Sesión API**: Cookie HttpOnly con token de Supabase (segura contra XSS)
- **Queries Supabase**: Token guardado en localStorage (necesario para RLS)

---

## 🌟 Características Principales

### 📈 Análisis Estratégico Pro
- **Ejecución Instantánea**: Selección de ALyC mediante botones dinámicos para disparar análisis al toque.
- **Multicomp (Benchmark Dinámico)**: Comparación en tiempo real contra índices globales (SPY, QQQ, DIA, IWM) con un solo clic.
- **Algoritmos de Optimización**: Implementación de modelos de Sharpe, Michaud y Hierarchical Risk Parity (HRP).
- **Métricas de Riesgo Avanzadas**: Cálculo de Beta, Alpha, VaR (95%), Max Drawdown y Expected Shortfall.
- **Visualización Científica**: Matriz de correlación, frontera eficiente de Markowitz y simulaciones de Monte Carlo.
- **Reportes Premium**: Generador de reportes PDF de alta calidad con captura de gráficos y KPIs.

### 📊 Dashboard Inteligente
- **Unificación Visual**: Gráficos de composición por tipo y activos utilizando Chart.js, con etiquetas internas y diseño minimalista sin bordes.
- **Mapa de Calor (Treemap)**: Visualización bidimensional de Peso vs. P&L % para identificar rápidamente los drivers de rendimiento.
- **KPIs en Tiempo Real**: Seguimiento de P&L Total en ARS y USD con skeletons de carga (Shimmer) para una experiencia fluida.

### 🛠️ Gestión de Maestros
- **Estructura Organizada**: Acceso centralizado a Operaciones, Instrumentos, Tipos de Activos y ALyCs/Brokers desde la sección de Maestros.
- **Importación Masiva**: Motor de normalización para carga de operaciones mediante archivos CSV.
- **Multi-Moneda**: Soporte nativo para operaciones en ARS y USD con integración de precios de mercado.

## 💻 Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Variables, Grid, Flexbox).
- **Gráficos**: Chart.js con plugins para Treemap y etiquetas personalizadas.
- **Backend**: Node.js (Express) en Vercel.
- **Base de Datos**: Supabase (PostgreSQL) con lógica de negocio en RPCs y Vistas.
- **Autenticación**: Supabase Auth (JWT).
- **PWA**: Soporte para Service Workers y modo Offline (Cache).

## 🎨 UI/UX
- **Diseño de Isla**: Tablas y tarjetas con sombras suaves y bordes redondeados.
- **Dark Mode Nativo**: Sistema de temas con persistencia en localStorage.
- **Layout Estable**: Contenedores con anchos reservados para evitar saltos visuales durante la carga de datos o generación de reportes.

---
*Stocker Intelligence - Tomando decisiones basadas en datos.*
