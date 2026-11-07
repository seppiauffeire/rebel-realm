import { reduced } from './dom.js';
import { FRAMES } from './card.js';

// ---- Sound: Web Audio synth, no files, off by default ----
export function createSound() {
  let ctx = null;
  let on = false;
  try { on = localStorage.getItem('rf_sound') === '1'; } catch (e) { on = false; }

  function ensure() {
    if (!on) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type = 'square', vol = 0.04, slideTo = null, delay = 0) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.08) {
    const c = ensure(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); const g = c.createGain();
    g.gain.value = vol; s.buffer = buf; s.connect(g).connect(c.destination); s.start();
  }
  return {
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem('rf_sound', on ? '1' : '0'); } catch (e) { /* ignore */ }
      if (on) { ensure(); tone(660, 0.08, 'triangle', 0.05); }
      return on;
    },
    click: () => tone(880, 0.04, 'square', 0.035),
    up: () => tone(440, 0.13, 'triangle', 0.06, 700),
    down: () => tone(520, 0.1, 'triangle', 0.05, 360),
    stamp: () => { noise(0.12, 0.09); tone(90, 0.22, 'sine', 0.16, 45); },
    chord: () => [523, 659, 784].forEach((f, i) => tone(f, 0.5, 'sine', 0.05, null, i * 0.06)),
    sad: () => tone(240, 0.55, 'sawtooth', 0.04, 110),
  };
}

// Only after a real user gesture, otherwise the browser logs an intervention error.
export const haptic = (ms) => {
  try {
    const ua = navigator.userActivation;
    if (navigator.vibrate && ua && ua.hasBeenActive) navigator.vibrate(ms);
  } catch (e) { /* ignore */ }
};

// ---- Count-up used on the end screen ----
export function countUp(el, to, ms = 900, done) {
  if (reduced()) { el.textContent = to; if (done) done(); return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step); else if (done) done();
  };
  requestAnimationFrame(step);
}

// ---- Sparks for a great grade ----
export function sparks(host, n = 26) {
  if (reduced() || !host.animate) return;
  const r = host.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.className = 'rf-spark';
    s.style.left = `${r.width / 2}px`; s.style.top = `${r.height / 2}px`;
    host.appendChild(s);
    const a = Math.random() * Math.PI * 2; const d = 90 + Math.random() * 160;
    s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }], { duration: 650 + Math.random() * 450, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => s.remove();
  }
}

// ---- Forge: card heats, a seam of light travels the frame, the card slams down ----
export function forgeSequence(card, type, onSlam) {
  const el = card.el;
  if (reduced() || !el.animate) { el.classList.add('rf-flash'); setTimeout(() => { el.classList.remove('rf-flash'); onSlam(); }, 180); return Promise.resolve(); }
  const seam = card.q('.rf-seam');
  seam.setAttribute('d', FRAMES[type] || FRAMES.none);
  seam.setAttribute('pathLength', '1');
  el.classList.add('rf-heat');
  const seamAnim = seam.animate([{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 650, easing: 'ease-in-out', fill: 'forwards' });
  return seamAnim.finished.then(() => {
    seam.style.opacity = 0;
    const slam = el.animate([{ transform: 'translateY(-18px) scale(1.05)' }, { transform: 'translateY(0) scale(0.98)', offset: 0.6 }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.5,0,.8,.4)' });
    onSlam();
    return slam.finished;
  }).then(() => { el.classList.remove('rf-heat'); seam.style.opacity = ''; seam.getAnimations().forEach((a) => a.cancel()); }).catch(() => { el.classList.remove('rf-heat'); onSlam(); });
}
