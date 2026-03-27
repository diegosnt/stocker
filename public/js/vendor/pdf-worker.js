self.onmessage = async function(e) {
  const { type, data } = e.data
  
  if (type === 'generate') {
    const { elementId, alycName, scale } = data
    
    try {
      // For now, html2canvas cannot run in workers (needs DOM)
      // We'll do the heavy lifting in chunks on main thread
      self.postMessage({ type: 'ready' })
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message })
    }
  }
}
