// Colores del tema para código que no puede usar var(--token) directamente
// (canvas de Chart.js, html2canvas). En estilos HTML, usar var(--token).
// Los valores salen de los tokens de styles.css, así que siguen al modo claro/oscuro.

export const cssVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim()

const CHART_TOKEN_COUNT = 8

/** Paleta categórica de gráficos del tema actual (sin verde ni rojo). */
export function chartColors() {
  return Array.from({ length: CHART_TOKEN_COUNT }, (_, i) => cssVar(`--chart-${i + 1}`))
}

/** Color de texto para un valor de P&L, como var() para estilos HTML. */
export const pnlColorVar = (v) => v > 0 ? 'var(--color-success)' : v < 0 ? 'var(--color-danger)' : 'var(--text-muted)'

/**
 * Relleno de mapa de calor según el rendimiento (%), ya resuelto para canvas.
 * Más allá de ±strongAt se usa el tono fuerte.
 */
export function heatColor(pct, strongAt = 10) {
  if (pct > 0) return cssVar(pct > strongAt ? '--heat-gain-strong' : '--heat-gain')
  if (pct < 0) return cssVar(pct < -strongAt ? '--heat-loss-strong' : '--heat-loss')
  return cssVar('--heat-neutral')
}

/** Convierte #rrggbb en rgba(r, g, b, alpha). Para colores con transparencia en canvas. */
export function withAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}
