// Puente entre la barra de accesos rápidos global (init.js) y la página de Análisis Pro.
// La navbar no puede llamar directo a AnalysisPage: se carga de forma lazy y puede
// no estar montada todavía. Por eso deja acá la ALyC pedida y dispara un evento;
// la página la consume al montar, o reacciona en vivo si ya está abierta.

let _pending = null

// alyc: { id, name }
export function requestAlycAnalysis(alyc) {
  _pending = alyc
  window.dispatchEvent(new CustomEvent('quicknav-alyc', { detail: alyc }))
}

// Devuelve la ALyC pendiente (una sola vez) y limpia el estado.
export function consumeAlycRequest() {
  const alyc = _pending
  _pending = null
  return alyc
}
