/** Minimal DOM helpers so screen modules stay readable and dependency-free. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

export function screen(className, children) {
  return el('div', { class: `screen ${className}` }, children);
}

export function primaryButton(label, onClick) {
  return el('button', { class: 'btn btn-primary', onClick, type: 'button' }, label);
}

export function ghostButton(label, onClick) {
  return el('button', { class: 'btn btn-ghost', onClick, type: 'button' }, label);
}

/** Fade a node in on next frame (used for screen transitions). */
export function enter(node) {
  node.classList.add('enter');
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('enter-active')));
  return node;
}
