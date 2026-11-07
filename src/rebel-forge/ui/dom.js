export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const html = (str) => { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; };
export const $ = (root, sel) => root.querySelector(sel);
export const $$ = (root, sel) => [...root.querySelectorAll(sel)];
export const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const coarse = () => window.matchMedia && matchMedia('(pointer: coarse)').matches;

export function createStore(reducer, initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      const prev = state;
      state = next;
      subs.forEach((f) => f(state, prev, action));
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
}

// The host can route events anywhere with mount({ onEvent }). With no handler, fall back to gtag when the page has it.
let tracker = null;
export function setTracker(fn) { tracker = typeof fn === 'function' ? fn : null; }
export function track(name, props) {
  try {
    if (tracker) { tracker(name, props || {}); return; }
    if (typeof window.gtag === 'function') window.gtag('event', name, props || {});
  } catch (e) { /* analytics must never break the game */ }
}
