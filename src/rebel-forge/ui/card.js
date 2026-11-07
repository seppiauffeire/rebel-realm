import { EFFECTS, TYPES, KEYWORDS, KEYWORD_ORDER, PRICES, TRIGGERS, LIFESPANS } from '../engine/balance.js';
import { html, esc, $, $$, reduced } from './dom.js';
import { TYPE_ICON, FAMILY_ICON, UI_ICON } from './icons.js';
import { artFor, artSvg } from './art.js';

// Each type has its own silhouette. Paths are drawn in a 300 x 420 box.
export const FRAMES = {
  attack: 'M0 0 H266 L300 34 V420 H34 L0 386 Z',
  defend: 'M0 40 Q0 0 40 0 H260 Q300 0 300 40 V372 Q300 400 150 420 Q0 400 0 372 Z',
  setup: 'M20 0 H280 V20 H300 V400 H280 V420 H20 V400 H0 V20 H20 Z',
  instant: 'M0 0 H300 L274 86 L300 152 L268 236 L300 316 L280 368 L300 420 H0 Z',
  permanent: 'M16 0 H284 Q300 0 300 16 V404 Q300 420 284 420 H16 Q0 420 0 404 V16 Q0 0 16 0 Z',
  none: 'M0 0 H300 V420 H0 Z',
};
export const FRAME_INNER_PERMANENT = 'M26 10 H274 Q290 10 290 26 V394 Q290 410 274 410 H26 Q10 410 10 394 V26 Q10 10 26 10 Z';

const frameSvg = () => `<svg class="rf-frame" viewBox="0 0 300 420" preserveAspectRatio="none" aria-hidden="true">${
  Object.entries(FRAMES).map(([t, d]) => `<g class="rf-fr" data-t="${t}"><path class="rf-fr-fill" d="${d}"/><path class="rf-fr-line" d="${d}"/>${t === 'permanent' ? `<path class="rf-fr-line2" d="${FRAME_INNER_PERMANENT}"/>` : ''}</g>`).join('')
}<path class="rf-seam" d="${FRAMES.none}" /></svg>`;

// Splits "Deal 6 damage" into text before and after the number so only the number is live.
export function splitEffect(id, n) {
  const t = EFFECTS[id].text(n);
  const s = String(n);
  const i = t.lastIndexOf(s);
  if (EFFECTS[id].flat || i < 0) return { pre: t, post: '', flat: true };
  return { pre: t.slice(0, i), post: t.slice(i + s.length), flat: false };
}

export function createCard(brand = 'Rebel Realm') {
  const el = html(`
    <div class="rf-card" data-type="none" role="img" aria-label="Your card">
      ${frameSvg()}
      <div class="rf-in">
        <div class="rf-artw">
          <div class="rf-art" aria-hidden="true"></div>
          <div class="rf-gem" title="Cost"><span class="rf-cost">?</span></div>
        </div>
        <div class="rf-typebar"><span class="rf-ticon"></span><span class="rf-tlabel">No type yet</span></div>
        <div class="rf-name"><span class="rf-nametext"></span><span class="rf-bar" aria-hidden="true"><i>Redacted</i></span></div>
        <div class="rf-body">
          <div class="rf-ghost">Pick a card type to start forging.</div>
          <div class="rf-chain rf-when" hidden><span class="rf-lbl">When</span><span class="rf-lval"></span></div>
          <div class="rf-join rf-join1" hidden>${UI_ICON.chain}</div>
          <div class="rf-rows"></div>
          <div class="rf-join rf-join2" hidden>${UI_ICON.chain}</div>
          <div class="rf-chain rf-life" hidden><span class="rf-lbl">For</span><span class="rf-lval"></span><span class="rf-once"></span></div>
        </div>
        <div class="rf-foot">
          <div class="rf-kws"></div>
          <div class="rf-price"></div>
          <div class="rf-mark"><span class="rf-anchor">${UI_ICON.anchor}</span><span class="rf-brand"></span></div>
        </div>
      </div>
      <div class="rf-stamp" hidden></div>
    </div>`);

  const q = (s) => $(el, s);
  q('.rf-brand').textContent = `${brand} Forge`;
  el.dataset.brand = brand;
  const rows = new Map();
  let lastCost = null;
  let lastType = 'none';

  function rowFor(effect) {
    const def = EFFECTS[effect.id];
    let row = rows.get(effect.id);
    const parts = splitEffect(effect.id, effect.amount);
    if (!row) {
      row = html(`
        <div class="rf-row" data-key="${effect.id}">
          <span class="rf-rico" title="${esc(def.family)}">${FAMILY_ICON[def.family]}</span>
          <span class="rf-rtext"><span class="rf-pre"></span>${parts.flat ? '' : `<span class="rf-num" role="spinbutton" tabindex="0" data-id="${effect.id}" aria-label="${esc(def.short)} amount"></span>`}<span class="rf-post"></span></span>
          <span class="rf-rctl">
            ${parts.flat ? '' : `<button type="button" class="rf-sb" data-act="amt" data-id="${effect.id}" data-d="-1" aria-label="Lower ${esc(def.short)}">${UI_ICON.minus}</button><button type="button" class="rf-sb" data-act="amt" data-id="${effect.id}" data-d="1" aria-label="Raise ${esc(def.short)}">${UI_ICON.plus}</button>`}
            <button type="button" class="rf-sb rf-rm" data-act="rm" data-id="${effect.id}" aria-label="Remove ${esc(def.short)}">${UI_ICON.x}</button>
          </span>
        </div>`);
      rows.set(effect.id, row);
      row.dataset.fresh = '1';
    }
    $(row, '.rf-pre').textContent = parts.pre;
    $(row, '.rf-post').textContent = parts.post;
    const num = $(row, '.rf-num');
    if (num) {
      num.textContent = effect.amount;
      num.setAttribute('aria-valuenow', effect.amount);
      num.setAttribute('aria-valuemin', def.min);
      num.setAttribute('aria-valuemax', def.max);
      num.setAttribute('aria-valuetext', splitEffect(effect.id, effect.amount).pre + effect.amount + splitEffect(effect.id, effect.amount).post);
    }
    return row;
  }

  function update(state, view) {
    const d = state.design;
    const type = d.type || 'none';
    const rating = view.rating;
    el.dataset.type = type;
    if (type !== lastType) {
      lastType = type;
      q('.rf-ticon').innerHTML = d.type ? TYPE_ICON[d.type] : '';
      q('.rf-tlabel').textContent = d.type ? TYPES[d.type].label : 'No type yet';
    }
    const perm = d.type === 'permanent';
    q('.rf-ghost').hidden = !!d.type;
    for (const s of ['.rf-when', '.rf-life', '.rf-join1', '.rf-join2']) q(s).hidden = !perm;
    if (perm && d.permanent) {
      $(q('.rf-when'), '.rf-lval').textContent = d.permanent.trigger ? TRIGGERS[d.permanent.trigger].text : 'Pick a trigger';
      $(q('.rf-life'), '.rf-lval').textContent = d.permanent.lifespan ? LIFESPANS[d.permanent.lifespan].text : 'Pick a lifespan';
      $(q('.rf-life'), '.rf-once').textContent = d.permanent.oncePerTurn ? 'Once per turn' : '';
    }

    // effect rows, keyed so a number being dragged is never rebuilt
    const rowsEl = q('.rf-rows');
    const keep = new Set(d.effects.map((e) => e.id));
    for (const [id, row] of rows) if (!keep.has(id)) { row.remove(); rows.delete(id); }
    d.effects.forEach((e, i) => {
      const row = rowFor(e);
      if (row.parentNode !== rowsEl || rowsEl.children[i] !== row) rowsEl.insertBefore(row, rowsEl.children[i] || null);
    });

    // rules + price lines
    const kws = KEYWORD_ORDER.filter((k) => (d.keywords || []).includes(k));
    q('.rf-kws').innerHTML = kws.map((k) => `<div class="rf-kw"><b>${esc(KEYWORDS[k].name)}.</b><span class="rf-kwt"> ${esc(KEYWORDS[k].text)}</span></div>`).join('');
    q('.rf-price').innerHTML = d.price ? `<div class="rf-pr">${perm ? '<b>On play:</b> ' : ''}${esc(PRICES[d.price.id].text(d.price.amount))}</div>` : '';

    // name
    const nameText = q('.rf-nametext');
    nameText.textContent = d.name || '';
    q('.rf-name').classList.toggle('named', !!d.name);
    paintArt(d);
    fitName();

    // cost gem
    const cost = rating && rating.cost !== null && rating.parts ? rating.cost : null;
    const gem = q('.rf-gem');
    q('.rf-cost').textContent = cost === null ? (rating && rating.power && rating.power.net > 27.5 ? '!' : '?') : cost;
    gem.classList.toggle('over', cost === null && !!rating && rating.power.net > 27.5);
    if (cost !== null && lastCost !== null && cost !== lastCost && !reduced() && gem.animate) {
      gem.animate([{ transform: 'rotateX(0deg) scale(1)' }, { transform: 'rotateX(90deg) scale(1.15)' }, { transform: 'rotateX(0deg) scale(1)' }], { duration: 320, easing: 'ease-in-out' });
    }
    if (cost !== null) lastCost = cost;
    if (!d.type) lastCost = null;

    const desc = !d.type ? 'Blank card' : `${d.name || 'Unnamed'}, ${TYPES[d.type].label}, cost ${cost === null ? 'unknown' : cost}. ${d.effects.map((e) => EFFECTS[e.id].text(e.amount)).join('. ')}`;
    el.setAttribute('aria-label', desc);
  }

  // Before a name is picked the art window shows a faint type glyph. Once there is a name, the card gets its illustration.
  let artKey = '';
  function paintArt(d) {
    const box = q('.rf-art');
    const key = d.name ? `a:${artFor(d.name).name}` : `t:${d.type || ''}`;
    if (key === artKey) return;
    artKey = key;
    box.classList.toggle('has-art', !!d.name);
    box.innerHTML = d.name ? artSvg(artFor(d.name)) : (d.type ? TYPE_ICON[d.type] : '');
    if (d.name && !reduced() && box.animate) box.firstElementChild.animate([{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' });
  }

  // Long names shrink to fit the name bar instead of being clipped.
  function fitName() {
    const box = q('.rf-name');
    box.style.setProperty('--ns', '1');
    const need = box.scrollWidth;
    const have = box.clientWidth;
    if (have > 0 && need > have) box.style.setProperty('--ns', String(Math.max(0.58, have / need).toFixed(3)));
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => fitName()).observe(el);

  function stampEffect(id) {
    const row = rows.get(id);
    if (!row || reduced() || !row.animate) return;
    row.animate([{ transform: 'scale(1.12)', filter: 'brightness(1.8)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(2px)' }, { transform: 'none', filter: 'none' }], { duration: 300, easing: 'ease-out' });
  }

  function setStamp(grade, total) {
    const s = q('.rf-stamp');
    s.hidden = false;
    s.dataset.grade = grade[0];
    s.innerHTML = `<span class="rf-stamp-g">${esc(grade)}</span><span class="rf-stamp-s">${total}</span>`;
    if (!reduced() && s.animate) s.animate([{ transform: 'scale(2.6) rotate(-30deg)', opacity: 0 }, { transform: 'scale(0.92) rotate(9deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(9deg)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
  }
  const clearStamp = () => { const s = q('.rf-stamp'); s.hidden = true; s.innerHTML = ''; };

  return { el, update, stampEffect, setStamp, clearStamp, q };
}
