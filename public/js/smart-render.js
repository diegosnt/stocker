// Optimización: Solo re-renderiza si el contenido cambió.
// Evita innerHTML innecesario que causa reflow/repaint.

let _lastContent = new Map()  // container → contentHash

function _hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return h
}

export function renderIfChanged(container, content) {
  if (!container) return
  
  const contentStr = typeof content === 'string' ? content : ''
  const hash = _hash(contentStr)
  
  const lastHash = _lastContent.get(container)
  if (lastHash === hash) return
  
  container.innerHTML = contentStr
  _lastContent.set(container, hash)
}

export function clearRenderCache(container) {
  _lastContent.delete(container)
}