import { encode } from '../engine/codec.js';
import { TYPES, KEYWORDS, KEYWORD_ORDER } from '../engine/balance.js';
import { renderCardText } from '../engine/text.js';
import { artFor, drawArt } from './art.js';
import { FRAMES, FRAME_INNER_PERMANENT } from './card.js';

export function cardLink(design) {
  return `${location.origin}${location.pathname}?card=${encode(design)}`;
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

// Returns 'shared', 'copied' or 'failed'. The shared text never names another game.
export async function shareCard(design, rating) {
  const link = cardLink(design);
  const text = `I forged "${design.name}", a ${TYPES[design.type].label} card at cost ${design.cost ?? rating.cost}. Think you can balance it better?`;
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: 'Rebel Forge card', text, url: link }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'failed'; }
  }
  return (await copyText(`${text} ${link}`)) ? 'copied' : 'failed';
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}

// Renders the card client side. Reads the live CSS tokens so it matches the page theme.
export function cardCanvas(design, rating, cardEl) {
  const cs = getComputedStyle(cardEl);
  const c = (v, f) => cs.getPropertyValue(v).trim() || f;
  const color = c('--rf-c', '#E5484D');
  const bg = c('--rf-card-bg', '#0f0f13');
  const ink = c('--rf-ink', '#f4f1ea');
  const dim = c('--rf-dim', '#a8a39a');
  const display = c('--rf-display', 'Syne, system-ui, sans-serif');
  const body = c('--rf-body', 'Figtree, system-ui, sans-serif');
  const S = 2;
  const cv = document.createElement('canvas');
  cv.width = 300 * S + 60; cv.height = 420 * S + 60;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0b0b0f'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.save(); ctx.translate(30, 30); ctx.scale(S, S);
  const shape = new Path2D(FRAMES[design.type]);
  ctx.fillStyle = bg; ctx.fill(shape);
  ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke(shape);
  if (design.type === 'permanent') { ctx.lineWidth = 1.2; ctx.stroke(new Path2D(FRAME_INNER_PERMANENT)); }
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  const left = 30 + 26 * S;
  const right = 30 + 274 * S;
  const cx = (left + right) / 2;
  // art window
  const artY = 30 + 24 * S, artH = 250;
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const grad = ctx.createLinearGradient(left, artY, left + 120, artY + artH);
  grad.addColorStop(0, color + '44'); grad.addColorStop(1, color + '0d');
  rr(left, artY, right - left, artH, 14); ctx.fillStyle = grad; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
  drawArt(ctx, artFor(design.name), left, artY, right - left, artH, color);
  // cost gem, number centered in it
  const gx = left + 54, gy = artY + 54;
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const ang = -Math.PI / 2 + i * Math.PI / 3; ctx.lineTo(gx + 46 * Math.cos(ang), gy + 46 * Math.sin(ang)); } ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = c('--rf-on', '#0b0b0e'); ctx.font = `800 50px ${display}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(design.cost ?? rating.cost), gx, gy + 3); ctx.textBaseline = 'alphabetic';
  // type, centered under the art
  let y = artY + artH + 40;
  ctx.fillStyle = color; ctx.font = `700 22px ${body}`; ctx.fillText(TYPES[design.type].label.toUpperCase().split('').join(' '), cx, y);
  // name
  y += 56; let nf = 46; ctx.fillStyle = ink;
  do { ctx.font = `800 ${nf}px ${display}`; nf -= 2; } while (ctx.measureText(design.name).width > right - left && nf > 24);
  ctx.fillText(design.name, cx, y);
  ctx.fillStyle = color; ctx.fillRect(cx - 100, y + 14, 200, 3);
  // rules text
  const t = renderCardText(design);
  ctx.textAlign = 'left'; y += 58;
  ctx.font = `600 25px ${body}`; ctx.fillStyle = ink;
  if (t.when) { ctx.fillStyle = color; ctx.font = `700 16px ${body}`; ctx.fillText('WHEN', left, y); ctx.fillStyle = ink; ctx.font = `600 25px ${body}`; y = wrap(ctx, t.when, left + 76, y, right - left - 76, 32); y += 6; }
  for (const line of t.effects) y = wrap(ctx, line + '.', left, y, right - left, 32) + 4;
  if (t.life) { ctx.fillStyle = color; ctx.font = `700 16px ${body}`; ctx.fillText('FOR', left, y); ctx.fillStyle = ink; ctx.font = `600 25px ${body}`; y = wrap(ctx, t.life + (t.once ? '. Once per turn' : ''), left + 76, y, right - left - 76, 32); }
  ctx.font = `500 18px ${body}`; ctx.fillStyle = dim; y += 6;
  for (const k of KEYWORD_ORDER.filter((x) => design.keywords.includes(x))) y = wrap(ctx, `${KEYWORDS[k].name}. ${KEYWORDS[k].text}`, left, y, right - left, 24);
  if (t.price) y = wrap(ctx, t.price, left, y, right - left, 24);
  // footer
  const fy = 30 + 408 * 2 - 40;
  ctx.fillStyle = dim; ctx.font = `600 15px ${body}`; ctx.textAlign = 'left';
  ctx.fillText(`${(cardEl.dataset.brand || 'Rebel Realm').toUpperCase()}  FORGE`, left, fy);
  if (rating.grade) {
    ctx.save(); ctx.translate(right - 44, fy - 18); ctx.rotate(-0.16);
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(-46, -34, 92, 64);
    ctx.fillStyle = color; ctx.font = `800 44px ${display}`; ctx.textAlign = 'center'; ctx.fillText(rating.grade, 0, 14);
    ctx.restore();
  }
  return cv;
}

export function downloadCard(design, rating, cardEl) {
  const cv = cardCanvas(design, rating, cardEl);
  const name = (design.name || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card';
  return new Promise((resolve) => cv.toBlob((blob) => {
    if (!blob) return resolve(false);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `forge-${name}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    resolve(true);
  }, 'image/png'));
}
