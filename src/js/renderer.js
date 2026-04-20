// Sistema de renderizado con diffing básico para evitar re-renders completos.
// Reemplaza solo los nodos que cambian, manteniendo el resto del DOM intacto.

const _diff = (oldNode, newNode) => {
  if (typeof newNode === 'string') {
    if (oldNode.textContent !== newNode) {
      oldNode.textContent = newNode
    }
    return
  }
  
  if (oldNode.nodeName !== newNode.nodeName) {
    return false
  }
  
  if (newNode.attributes) {
    for (const [key, value] of Object.entries(newNode.attributes)) {
      if (oldNode.getAttribute(key) !== value) {
        oldNode.setAttribute(key, value)
      }
    }
  }
  
  if (newNode.children) {
    const oldChildren = Array.from(oldNode.childNodes)
    const newChildren = newNode.children
    
    let oldIdx = 0
    let newIdx = 0
    
    while (newIdx < newChildren.length) {
      const newChild = newChildren[newIdx]
      
      if (oldIdx >= oldChildren.length) {
        if (typeof newChild === 'object') {
          oldNode.appendChild(_createElement(newChild))
        } else {
          oldNode.appendChild(document.createTextNode(newChild))
        }
        newIdx++
        continue
      }
      
      const oldChild = oldChildren[oldIdx]
      
      if (typeof newChild === 'object') {
        if (!_diff(oldChild, newChild)) {
          oldNode.replaceChild(_createElement(newChild), oldChild)
        }
      } else if (String(oldChild.textContent) !== String(newChild)) {
        oldChild.textContent = newChild
      }
      
      oldIdx++
      newIdx++
    }
    
    while (oldIdx < oldChildren.length) {
      oldNode.removeChild(oldChildren[oldIdx])
      oldIdx++
    }
  } else if (newNode.text !== undefined && oldNode.textContent !== newNode.text) {
    oldNode.textContent = newNode.text
  }
  
  return true
}

const _createElement = (spec) => {
  const el = document.createElement(spec.tag)
  
  if (spec.attributes) {
    for (const [key, value] of Object.entries(spec.attributes)) {
      el.setAttribute(key, value)
    }
  }
  
  if (spec.text) {
    el.textContent = spec.text
  }
  
  if (spec.children) {
    for (const child of spec.children) {
      if (typeof child === 'object') {
        el.appendChild(_createElement(child))
      } else {
        el.appendChild(document.createTextNode(child))
      }
    }
  }
  
  return el
}

export function render(container, spec) {
  if (!container) return
  
  if (typeof spec === 'string') {
    container.innerHTML = spec
    return
  }
  
  if (!spec) {
    container.innerHTML = ''
    return
  }
  
  if (!container._currentSpec) {
    container.innerHTML = ''
    const newEl = _createElement(spec)
    container.appendChild(newEl)
    container._currentSpec = spec
    return
  }
  
  const firstChild = container.firstChild
  if (firstChild && firstChild.nodeName === spec.tag) {
    _diff(firstChild, spec)
  } else {
    container.innerHTML = ''
    const newEl = _createElement(spec)
    container.appendChild(newEl)
  }
  
  container._currentSpec = spec
}

export function clear(container) {
  if (!container) return
  container.innerHTML = ''
  container._currentSpec = null
}