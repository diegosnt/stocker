export function renderCorrelationHeatmap(tickers, returnsMatrix) {
  const container = document.getElementById('correlation-matrix')
  if (!container) return
  const isMobile = window.innerWidth <= 768
  const n = tickers.length, numDays = returnsMatrix[0].length
  const stats = returnsMatrix.map(r => { const avg = r.reduce((a, b) => a + b, 0) / r.length; return { avg, std: Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length) } })
  const fontSize = isMobile ? '0.5rem' : '0.6rem'
  const cellPad = '2px 1px'
  const shortTicker = t => t.length > 4 ? t.slice(0, 4) : t
  const labelStyle = `padding:${cellPad}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:0`
  let html = `<table style="width:100%; table-layout:fixed; font-size:${fontSize}; border-collapse:collapse"><tr><th style="${labelStyle}"></th>`
  tickers.forEach(t => html += `<th style="${labelStyle}">${shortTicker(t)}</th>`)
  for (let i = 0; i < n; i++) {
    html += `<tr><td style="font-weight:bold; ${labelStyle}">${shortTicker(tickers[i])}</td>`
    for (let j = 0; j < n; j++) {
      let cov = 0; for (let d = 0; d < numDays; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg)
      const corr = (stats[i].std * stats[j].std === 0) ? 0 : (cov / numDays) / (stats[i].std * stats[j].std)
      const bg = corr > 0.5 ? `rgba(16, 185, 129, ${corr})` : (corr < -0.2 ? `rgba(239, 68, 68, ${Math.abs(corr)})` : 'transparent')
      html += `<td style="background:${bg}; text-align:center; padding:${cellPad}">${corr.toFixed(2)}</td>`
    }
    html += `</tr>`
  }
  container.innerHTML = html + `</table>`
}
