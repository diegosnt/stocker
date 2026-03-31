// Analysis Worker - Cálculos pesados para Stocker
self.onmessage = function(e) {
  const { tickers, returnsMatrix, holdings, benchmarkReturns } = e.data;

  try {
    // 1. Markowitz (Optimización Clásica)
    const markowitz = performMarkowitz(tickers, returnsMatrix, holdings);

    // 2. HRP (Hierarchical Risk Parity)
    const hrpWeights = performHRP(tickers, returnsMatrix);

    // 3. Michaud (Resampled Efficiency - MUY PESADO)
    const michaudWeights = performMichaud(tickers, returnsMatrix);

    // 4. Monte Carlo (Simulación de 1 año)
    const monteCarloData = performMonteCarlo(markowitz.optimal.return, markowitz.optimal.std);

    // 5. CAPM & Risk Metrics
    const metrics = calculateMetrics(markowitz, returnsMatrix, benchmarkReturns);

    self.postMessage({
      status: 'success',
      data: {
        markowitz,
        hrp: { weights: hrpWeights },
        michaud: { weights: michaudWeights },
        monteCarlo: monteCarloData,
        metrics
      }
    });
  } catch (err) {
    self.postMessage({ status: 'error', error: err.message });
  }
};

function performMarkowitz(tickers, returnsMatrix, holdings) {
  const numAssets = tickers.length, numPortfolios = 1500; // Subimos a 1500 ya que no traba la UI
  const avgRD = returnsMatrix.map(r => r.reduce((a, b) => a + b, 0) / r.length);
  const stdRD = returnsMatrix.map((r, i) => Math.sqrt(r.reduce((a, b) => a + Math.pow(b - avgRD[i], 2), 0) / r.length));
  const avgR = avgRD.map(r => r * 252), stdR = stdRD.map(s => s * Math.sqrt(252));
  const portfolios = [], minWeight = 0.05, totalMin = numAssets * minWeight;
  
  let maxSharpeIdx = 0, maxSharpe = -Infinity;
  
  for (let i = 0; i < numPortfolios; i++) {
    let w;
    if (totalMin < 1) {
      const raw = Array.from({ length: numAssets }, () => Math.random());
      const sumR = raw.reduce((a, b) => a + b, 0);
      w = raw.map(rw => minWeight + (rw / sumR) * (1 - totalMin));
    } else {
      w = Array.from({ length: numAssets }, () => Math.random());
      const s = w.reduce((a, b) => a + b, 0);
      w = w.map(v => v / s);
    }
    
    const pR = w.reduce((a, v, idx) => a + v * avgR[idx], 0);
    const pS = w.reduce((a, v, idx) => a + v * stdR[idx], 0);
    const sh = pS === 0 ? 0 : pR / pS;
    
    portfolios.push({ weights: w, return: pR, std: pS, sharpe: sh });
    if (sh > maxSharpe) { maxSharpe = sh; maxSharpeIdx = i; }
  }

  const totalV = holdings.reduce((a, h) => a + (h.total_quantity * h.avg_buy_price), 0);
  const currW = holdings.map(h => totalV > 0 ? (h.total_quantity * h.avg_buy_price) / totalV : 1/numAssets);
  
  const optimalW = portfolios[maxSharpeIdx].weights;
  const weightsObj = tickers.reduce((acc, t, i) => { acc[t] = optimalW[i]; return acc; }, {});
  const currentWeightsObj = tickers.reduce((acc, t, i) => { acc[t] = currW[i]; return acc; }, {});
  
  return { 
    portfolios, 
    tickers, 
    optimal: { weights: weightsObj, return: portfolios[maxSharpeIdx].return, std: portfolios[maxSharpeIdx].std },
    current: { weights: currentWeightsObj, return: currW.reduce((a, v, i) => a + v * avgR[i], 0), std: currW.reduce((a, v, i) => a + v * stdR[i], 0) }
  };
}

function performMichaud(tickers, returnsMatrix) {
  const n = tickers.length, iterations = 50, days = returnsMatrix[0].length;
  const averagedWeights = new Float64Array(n).fill(0);
  
  for (let i = 0; i < iterations; i++) {
    const resampled = Array.from({ length: n }, () => new Float64Array(days));
    for (let d = 0; d < days; d++) {
      const randomDay = Math.floor(Math.random() * days);
      for (let a = 0; a < n; a++) { resampled[a][d] = returnsMatrix[a][randomDay]; }
    }
    const scenario = performMarkowitz(tickers, resampled, Array(n).fill({ total_quantity: 0, avg_buy_price: 0 }));
    const optWeights = scenario.optimal?.weights || {};
    tickers.forEach((t, idx) => { averagedWeights[idx] += (optWeights[t] || 0); });
  }
  
  return Array.from(averagedWeights).map(w => w / iterations);
}

function performHRP(tickers, returnsMatrix) {
  const n = tickers.length;
  const stats = returnsMatrix.map(r => {
    const avg = r.reduce((a, b) => a + b, 0) / r.length;
    const v = r.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / r.length;
    return { avg, var: v, std: Math.sqrt(v) };
  });

  const corr = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let cov = 0; 
      for (let d = 0; d < returnsMatrix[0].length; d++) cov += (returnsMatrix[i][d] - stats[i].avg) * (returnsMatrix[j][d] - stats[j].avg);
      const c = (stats[i].std * stats[j].std === 0) ? 0 : (cov / returnsMatrix[0].length) / (stats[i].std * stats[j].std);
      corr[i][j] = corr[j][i] = c;
    }
  }

  const dist = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) { 
    for (let j = 0; j < n; j++) { dist[i][j] = Math.sqrt(Math.max(0, 0.5 * (1 - corr[i][j]))); } 
  }

  let order = Array.from({ length: n }, (_, i) => i);
  order.sort((a, b) => dist[a].reduce((acc, v) => acc + v, 0) - dist[b].reduce((acc, v) => acc + v, 0));

  const weights = new Float64Array(n).fill(1);
  const recursiveBisection = (items) => {
    if (items.length <= 1) return;
    const mid = Math.floor(items.length / 2), left = items.slice(0, mid), right = items.slice(mid);
    const vL = left.reduce((acc, idx) => acc + stats[idx].var, 0) / left.length;
    const vR = right.reduce((acc, idx) => acc + stats[idx].var, 0) / right.length;
    const alpha = 1 - (vL / (vL + vR));
    left.forEach(idx => weights[idx] *= alpha); 
    right.forEach(idx => weights[idx] *= (1 - alpha));
    recursiveBisection(left); 
    recursiveBisection(right);
  };

  recursiveBisection(order);
  const totalW = weights.reduce((acc, v) => acc + v, 0);
  return Array.from(weights).map(w => w / totalW);
}

function performMonteCarlo(annualReturn, annualStd) {
  const dailyReturn = (annualReturn / 252);
  const dailyVol = (annualStd / Math.sqrt(252));
  const datasets = [];
  
  const randn_bm = () => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  for (let s = 0; s < 100; s++) { // Subimos a 100 simulaciones
    const data = [100];
    let current = 100;
    for (let d = 1; d <= 252; d++) {
      current *= (1 + (dailyReturn + dailyVol * randn_bm()));
      data.push(current);
    }
    datasets.push({ label: s === 0 ? 'Mediana' : `Sim ${s}`, data });
  }
  return datasets;
}

function calculateMetrics(analysis, returnsMatrix, benchmarkReturns) {
  const numDays = Math.min(returnsMatrix[0].length, benchmarkReturns.length), pDR = [];
  const currentWeights = Object.values(analysis.current.weights);
  
  for (let d = 0; d < numDays; d++) { 
    let r = 0; 
    currentWeights.forEach((w, i) => r += w * returnsMatrix[i][d]); 
    pDR.push(r); 
  }
  
  const mR = benchmarkReturns.slice(0, numDays), mAvg = mR.reduce((a,b)=>a+b,0)/numDays, pAvg = pDR.reduce((a,b)=>a+b,0)/numDays;
  let cov = 0, vM = 0; 
  for (let i = 0; i < numDays; i++) { 
    cov += (pDR[i] - pAvg) * (mR[i] - mAvg); 
    vM += Math.pow(mR[i] - mAvg, 2); 
  }
  
  const beta = vM === 0 ? 0 : cov / vM;
  const r2 = vM === 0 ? 0 : Math.pow(cov, 2) / (vM * pDR.reduce((a, r) => a + Math.pow(r - pAvg, 2), 0));
  const alpha = (pAvg * 252) - (beta * (mAvg * 252));
  const sorted = [...pDR].sort((a,b)=>a-b);
  const varIdx = Math.floor(sorted.length * 0.05);
  const vR = sorted[varIdx] || 0;
  const es = sorted.slice(0, varIdx + 1).reduce((a, b) => a + b, 0) / (varIdx + 1);

  // MDD
  let cumulativeReturn = 1, peak = 1, maxDrawdown = 0;
  for (let d = 0; d < pDR.length; d++) {
    cumulativeReturn *= (1 + pDR[d]);
    if (cumulativeReturn > peak) peak = cumulativeReturn;
    const dd = (cumulativeReturn - peak) / peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  return { beta, alpha, r2, vR, es, maxDrawdown };
}
