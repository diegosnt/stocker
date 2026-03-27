// Módulo de cálculos financieros para Análisis de Cartera
// Extraído de analysis.js para reutilización y mantenibilidad

// Calcula matriz de retornos diarios a partir de históricos de precios
export function calculateReturns(histories, masterCalendar) {
  const returnsMatrix = []
  const firstDateIdx = {}
  
  // Index de cada historial a su primera fecha
  histories.forEach((h, idx) => {
    if (h.length > 0) firstDateIdx[idx] = h[0].date
  })
  
  // Crear matriz de retornos alineada al calendario maestro
  for (let i = 1; i < masterCalendar.length; i++) {
    const date = masterCalendar[i].date
    const row = []
    
    for (let h = 0; h < histories.length; h++) {
      const hist = histories[h]
      const currIdx = hist.findIndex(p => p.date === date)
      
      if (currIdx > 0) {
        const prevPrice = hist[currIdx - 1]?.price
        const currPrice = hist[currIdx]?.price
        if (prevPrice && currPrice && prevPrice > 0) {
          row.push((currPrice - prevPrice) / prevPrice)
        } else {
          row.push(null)
        }
      } else {
        row.push(null)
      }
    }
    returnsMatrix.push(row)
  }
  
  return returnsMatrix
}

// Calcula retornos diarios simples
export function calculateSimpleReturns(histories) {
  if (!histories || histories.length === 0) return []
  
  const returns = []
  for (let i = 1; i < histories.length; i++) {
    const prev = histories[i - 1]?.price
    const curr = histories[i]?.price
    if (prev && curr && prev > 0) {
      returns.push((curr - prev) / prev)
    } else {
      returns.push(null)
    }
  }
  return returns.filter(r => r !== null)
}

// Optimización de Markowitz - Cartera de máxima Ratio de Sharpe
export function performMarkowitz(tickers, returnsMatrix, holdings) {
  const n = tickers.length
  if (n < 2) return { weights: {}, std: 0, return: 0 }
  
  // Calcular media y covarianza
  const means = []
  const covMatrix = []
  
  for (let i = 0; i < n; i++) {
    const col = returnsMatrix.map(r => r[i]).filter(v => v !== null)
    const mean = col.reduce((a, b) => a + b, 0) / col.length
    means.push(mean)
  }
  
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      if (i === j) {
        const col = returnsMatrix.map(r => r[i]).filter(v => v !== null)
        const variance = col.reduce((sum, v) => sum + Math.pow(v - means[i], 2), 0) / (col.length - 1)
        row.push(variance)
      } else {
        const pairs = returnsMatrix
          .map(r => [r[i], r[j]])
          .filter(p => p[0] !== null && p[1] !== null)
        if (pairs.length < 2) {
          row.push(0)
        } else {
          const cov = pairs.reduce((sum, p) => sum + (p[0] - means[i]) * (p[1] - means[j]), 0) / (pairs.length - 1)
          row.push(cov)
        }
      }
    }
    covMatrix.push(row)
  }
  
  // Simulación de carteras aleatorias
  const portfolios = []
  const riskFreeRate = 0.02 / 252 // Tasa libre de riesgo diaria
  
  for (let sim = 0; sim < 5000; sim++) {
    let weights = []
    let remaining = 1
    for (let i = 0; i < n - 1; i++) {
      const w = Math.random() * remaining
      weights.push(w)
      remaining -= w
    }
    weights.push(remaining)
    
    // Calcular retorno y riesgo de la cartera
    let portReturn = 0
    for (let i = 0; i < n; i++) {
      portReturn += weights[i] * means[i]
    }
    
    let portVar = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portVar += weights[i] * weights[j] * covMatrix[i][j]
      }
    }
    const portStd = Math.sqrt(portVar * 252) // Anualizar
    
    const sharpe = portStd > 0 ? (portReturn * 252 - riskFreeRate) / portStd : 0
    
    portfolios.push({ weights: tickers.reduce((obj, t, idx) => { obj[t] = weights[idx]; return obj }, {}), return: portReturn * 252, std: portStd, sharpe })
  }
  
  // Encontrar óptima (max sharpe)
  portfolios.sort((a, b) => b.sharpe - a.sharpe)
  const optimal = portfolios[0]
  
  // Calcular stats de la cartera actual
  const currentWeights = {}
  const totalQty = holdings.reduce((sum, h) => sum + (h.total_quantity || 0), 0)
  
  for (const h of holdings) {
    const val = (h.total_quantity || 0) * (h.avg_buy_price || 0)
    currentWeights[h.ticker] = totalQty > 0 ? val / totalQty : 0
  }
  
  let currentReturn = 0
  for (const ticker in currentWeights) {
    const idx = tickers.indexOf(ticker)
    if (idx >= 0) currentReturn += currentWeights[ticker] * means[idx]
  }
  currentReturn *= 252
  
  let currentVar = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const wi = currentWeights[tickers[i]] || 0
      const wj = currentWeights[tickers[j]] || 0
      currentVar += wi * wj * covMatrix[i][j]
    }
  }
  const currentStd = Math.sqrt(currentVar * 252)
  
  return {
    tickers,
    portfolios: portfolios.slice(0, 1000),
    optimal,
    current: { weights: currentWeights, return: currentReturn, std: currentStd }
  }
}

// Hierarchical Risk Parity (HRP)
export function performHRP(tickers, returnsMatrix) {
  const n = tickers.length
  if (n < 2) return tickers.reduce((obj, t) => { obj[t] = 1 / n; return obj }, {})
  
  // Calcular matriz de covarianza
  const means = []
  for (let i = 0; i < n; i++) {
    const col = returnsMatrix.map(r => r[i]).filter(v => v !== null)
    means.push(col.reduce((a, b) => a + b, 0) / col.length)
  }
  
  const cov = []
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      const pairs = returnsMatrix.map(r => [r[i], r[j]]).filter(p => p[0] !== null && p[1] !== null)
      if (pairs.length < 2) {
        row.push(0)
      } else {
        row.push(pairs.reduce((sum, p) => sum + (p[0] - means[i]) * (p[1] - means[j]), 0) / (pairs.length - 1))
      }
    }
    cov.push(row)
  }
  
  // Clúster jerárquico simple (distancia euclidiana)
  const clusters = tickers.map((t, i) => ({ id: t, indices: [i], vars: [cov[i][i]] }))
  
  while (clusters.length > 1) {
    let minDist = Infinity
    let minPair = [0, 1]
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const ci = clusters[i], cj = clusters[j]
        let dist = 0
        for (const ii of ci.indices) {
          for (const jj of cj.indices) {
            dist += Math.sqrt((cov[ii][jj] || 0) ** 2)
          }
        }
        if (dist < minDist) {
          minDist = dist
          minPair = [i, j]
        }
      }
    }
    
    const [i, j] = minPair
    const newCluster = {
      id: clusters[i].id + '-' + clusters[j].id,
      indices: [...clusters[i].indices, ...clusters[j].indices],
      vars: [...clusters[i].vars, ...clusters[j].vars]
    }
    clusters.splice(j, 1)
    clusters.splice(i, 1)
    clusters.push(newCluster)
  }
  
  // Asignar pesos inversamente proporcionales a la varianza
  const cluster = clusters[0]
  const totalInvVar = cluster.vars.reduce((sum, v) => sum + (v > 0 ? 1 / v : 0), 0)
  
  const weights = {}
  for (let i = 0; i < tickers.length; i++) {
    const invVar = cluster.vars[i] > 0 ? 1 / cluster.vars[i] : 0
    weights[tickers[i]] = invVar / totalInvVar
  }
  
  return weights
}

// Resampled Efficient Frontier (Michaud)
export function performMichaud(tickers, returnsMatrix, nSimulations = 100) {
  const n = tickers.length
  
  // Calcular media y covarianza
  const means = []
  const covMatrix = []
  
  for (let i = 0; i < n; i++) {
    const col = returnsMatrix.map(r => r[i]).filter(v => v !== null)
    means.push(col.reduce((a, b) => a + b, 0) / col.length)
  }
  
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      const pairs = returnsMatrix.map(r => [r[i], r[j]]).filter(p => p[0] !== null && p[1] !== null)
      if (pairs.length < 2) {
        row.push(0)
      } else {
        row.push(pairs.reduce((sum, p) => sum + (p[0] - means[i]) * (p[1] - means[j]), 0) / (pairs.length - 1))
      }
    }
    covMatrix.push(row)
  }
  
  // Simular carteras
  const portfolios = []
  const riskFreeRate = 0.02 / 252
  
  for (let s = 0; s < nSimulations; s++) {
    // Bootstrap de los retornos
    const sampleSize = returnsMatrix.length
    const sampledMeans = means.map(() => {
      const idx = Math.floor(Math.random() * sampleSize)
      return returnsMatrix[idx].filter(v => v !== null)[Math.floor(Math.random() * 10)] || 0
    })
    
    let weights = []
    let remaining = 1
    for (let i = 0; i < n - 1; i++) {
      const w = Math.random() * remaining
      weights.push(w)
      remaining -= w
    }
    weights.push(Math.max(0, remaining))
    
    let ret = 0
    for (let i = 0; i < n; i++) ret += weights[i] * sampledMeans[i]
    ret *= 252
    
    portfolios.push({ weights: tickers.reduce((obj, t, i) => { obj[t] = weights[i]; return obj }, {}), return: ret })
  }
  
  // Promediar pesos
  const avgWeights = tickers.reduce((obj, t) => { obj[t] = 0; return obj }, {})
  for (const p of portfolios) {
    for (const t in p.weights) avgWeights[t] += p.weights[t]
  }
  for (const t in avgWeights) avgWeights[t] /= nSimulations
  
  return avgWeights
}

// Modelo CAPM
export function performCAPM(analysis, returnsMatrix, benchmarkReturns) {
  const n = returnsMatrix.length
  if (n < 10 || !benchmarkReturns || benchmarkReturns.length < 10) {
    return { beta: 1, alpha: 0, r2: 0 }
  }
  
  // Ajustar lengths
  const minLen = Math.min(returnsMatrix.length, benchmarkReturns.length)
  const assetReturns = returnsMatrix.slice(0, minLen).map(r => r[0] || 0)
  const benchReturns = benchmarkReturns.slice(0, minLen)
  
  const n2 = Math.min(assetReturns.length, benchReturns.length)
  const assetR = assetReturns.slice(0, n2)
  const benchR = benchReturns.slice(0, n2)
  
  // Calcular Beta: cov(asset, benchmark) / var(benchmark)
  const avgAsset = assetR.reduce((a, b) => a + b, 0) / n2
  const avgBench = benchR.reduce((a, b) => a + b, 0) / n2
  
  let cov = 0, varBench = 0
  for (let i = 0; i < n2; i++) {
    cov += (assetR[i] - avgAsset) * (benchR[i] - avgBench)
    varBench += Math.pow(benchR[i] - avgBench, 2)
  }
  cov /= n2
  varBench /= n2
  
  const beta = varBench > 0 ? cov / varBench : 1
  const alpha = avgAsset - beta * avgBench
  
  // R²
  const pred = benchR.map(r => alpha + beta * r)
  let ssRes = 0, ssTot = 0
  for (let i = 0; i < n2; i++) {
    ssRes += Math.pow(assetR[i] - pred[i], 2)
    ssTot += Math.pow(assetR[i] - avgAsset, 2)
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  
  return { beta, alpha, r2 }
}

// Calcular Maximum Drawdown
export function calculateMDD(returnsMatrix) {
  if (!returnsMatrix || returnsMatrix.length === 0) return { mdd: 0, peak: 0, trough: 0 }
  
  const cumulative = [1]
  for (const row of returnsMatrix) {
    const avgReturn = row.filter(v => v !== null).reduce((a, b) => a + b, 0) / row.length
    cumulative.push(cumulative[cumulative.length - 1] * (1 + avgReturn))
  }
  
  let peak = 0
  let mdd = 0
  let peakIdx = 0, troughIdx = 0
  
  for (let i = 0; i < cumulative.length; i++) {
    if (cumulative[i] > peak) {
      peak = cumulative[i]
      peakIdx = i
    }
    const dd = (peak - cumulative[i]) / peak
    if (dd > mdd) {
      mdd = dd
      troughIdx = i
    }
  }
  
  return { mdd, peakIdx, troughIdx }
}

// Calcular matriz de correlación
export function calculateCorrelationMatrix(returnsMatrix) {
  if (!returnsMatrix || returnsMatrix.length === 0) return []
  
  const n = returnsMatrix[0]?.length || 0
  const matrix = []
  
  for (let i = 0; i < n; i++) {
    const row = []
    for (let j = 0; j < n; j++) {
      const pairs = returnsMatrix
        .map(r => [r[i], r[j]])
        .filter(p => p[0] !== null && p[1] !== null)
      
      if (pairs.length < 2 || i === j) {
        row.push(i === j ? 1 : 0)
        continue
      }
      
      const avgI = pairs.reduce((s, p) => s + p[0], 0) / pairs.length
      const avgJ = pairs.reduce((s, p) => s + p[1], 0) / pairs.length
      
      let num = 0, denI = 0, denJ = 0
      for (const p of pairs) {
        num += (p[0] - avgI) * (p[1] - avgJ)
        denI += Math.pow(p[0] - avgI, 2)
        denJ += Math.pow(p[1] - avgJ, 2)
      }
      
      const corr = denI > 0 && denJ > 0 ? num / Math.sqrt(denI * denJ) : 0
      row.push(corr)
    }
    matrix.push(row)
  }
  
  return matrix
}