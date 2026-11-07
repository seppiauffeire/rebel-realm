import { EFFECTS, FAMILIES, FAMILY_ORDER, TYPES, TYPE_ORDER, KEYWORDS, KEYWORD_ORDER, PRICES, PRICE_ORDER, TRIGGERS, TRIGGER_ORDER, LIFESPANS, LIFESPAN_ORDER, FLAGS, MAX_KEYWORDS, MAXES, COST_NAMES } from '../engine/balance.js';
import { reducer, initialState, derive, stepsFor, stepComplete } from '../engine/reducer.js';
import { effectAllowed, keywordAllowed, selfFeeds } from '../engine/validate.js';
import { bestSingleStep } from '../engine/coach.js';
import { suggestName } from '../engine/names.js';
import { esc, html, $, $$, createStore, track, reduced, setTracker } from './dom.js';
import { TYPE_ICON, FAMILY_ICON, UI_ICON } from './icons.js';
import { createCard } from './card.js';
import { createSound, haptic, countUp, sparks, forgeSequence } from './fx.js';
import { shareCard, downloadCard, cardLink } from './share.js';

const TITLES = { kind: 'Pick a card type', effects: 'What does it do?', effectsPerm: 'What happens?', when: 'When does it trigger?', life: 'How long does it last?', rules: 'Add rules', price: 'Pay a price (optional)', cost: 'Set the cost', name: 'Name your card' };
const SUB_NAMES = { budget: 'Budget fit', focus: 'Focus', synergy: 'Synergy', depth: 'Depth', originality: 'Originality' };
const SUB_ORDER = ['budget', 'focus', 'synergy', 'depth', 'originality'];
const POWER_WORDS = [[0.08, 'Tiny'], [0.22, 'Light'], [0.42, 'Solid'], [0.62, 'Strong'], [0.82, 'Heavy'], [9, 'Huge']];
const powerWord = (f) => POWER_WORDS.find(([m]) => f < m)[1];
const FAMILY_TIP = 'Set Up effects only work on Set Up and Permanent cards.';
const PAGE = 6;
const defaultFamily = (t) => ({ attack: 'damage', defend: 'defense', setup: 'setup', instant: 'defense', permanent: 'cards' }[t] || 'damage');

export function mount(root, opts = {}) {
  const store = createStore(reducer, initialState());
  setTracker(opts.onEvent);
  const card = createCard(opts.brand);
  const sound = createSound();
  const ui = { fam: 'damage', page: 0, forging: false, interacted: false, confirm: false, toastTimer: 0, revealed: new Set(), prevCost: null, prevBand: 'none' };

  root.innerHTML = `
    <div class="rf-game" data-step="kind">
      <div class="rf-top">
        <ol class="rf-dots" aria-label="Progress"></ol>
        <span class="rf-grow"></span>
        <button type="button" class="rf-tb" data-act="undo" aria-label="Undo last change">${UI_ICON.undo}<span>Undo</span></button>
        <button type="button" class="rf-tb" data-act="sound" aria-pressed="false">${UI_ICON.mute}<span>Sound off</span></button>
        <button type="button" class="rf-tb rf-skip" data-act="skip">${UI_ICON.skip}<span>Skip</span></button>
      </div>
      <div class="rf-main">
        <div class="rf-left">
          <div class="rf-cardwrap"></div>
          <div class="rf-meter" role="meter" aria-label="Power efficiency" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="rf-mhead"><span>Power</span><b class="rf-mval">0 / 0</b></div>
            <div class="rf-track"><i class="rf-fill"></i><span class="rf-sweet" title="Sweet spot: 95% to 100% of the cost"></span></div>
            <div class="rf-mfoot"><span class="rf-mcost">Cost ?</span><span class="rf-mpct">Pick a type</span></div>
          </div>
          <p class="rf-hint" aria-live="off"></p>
        </div>
        <div class="rf-right"><div class="rf-panel"></div></div>
      </div>
      <div class="rf-live" aria-live="polite" aria-atomic="true"></div>
      <div class="rf-toast" role="status" hidden></div>
      <div class="rf-confirm" role="dialog" aria-modal="true" aria-labelledby="rf-cf-t" hidden>
        <div class="rf-cf-box"><h3 id="rf-cf-t">Skip the card game?</h3><p>You can enter the site right away. Nothing is lost.</p>
          <div class="rf-cf-btns"><button type="button" class="rf-btn ghost" data-act="keep">Keep forging</button><button type="button" class="rf-btn" data-act="confirm-skip">Skip</button></div></div>
      </div>
    </div>`;
  const g = $(root, '.rf-game');
  if (opts.theme) g.dataset.theme = opts.theme;
  $(g, '.rf-cardwrap').appendChild(card.el);
  const panel = $(g, '.rf-panel');
  const live = $(g, '.rf-live');
  const say = (t) => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

  // ---------- panels ----------
  const stepNo = (s, st) => { const steps = stepsFor(st.design.type); return `Step ${Math.max(1, steps.indexOf(s) + 1)} of ${steps.length}`; };

  function chipEffect(id, d) {
    const def = EFFECTS[id];
    const on = d.effects.some((e) => e.id === id);
    const ok = effectAllowed(d.type, id);
    const reason = !ok ? (def.future ? FAMILY_TIP : 'Cancel only works on Instant cards.') : '';
    return `<button type="button" class="rf-chip${on ? ' on' : ''}${!ok ? ' dim' : ''}" data-act="eff" data-v="${id}" data-key="eff-${id}" aria-pressed="${on}" ${!ok ? `aria-disabled="true" title="${esc(reason)}"` : `title="${esc(def.text(def.def))}"`}><b>${esc(def.short)}</b><small>${esc(def.text(def.def))}</small></button>`;
  }

  function effectsPanel(st) {
    const d = st.design;
    const t = TYPES[d.type];
    const perm = d.type === 'permanent';
    const inFam = Object.keys(EFFECTS).filter((id) => EFFECTS[id].family === ui.fam);
    const pages = Math.ceil(inFam.length / PAGE);
    ui.page = Math.min(ui.page, Math.max(0, pages - 1));
    const slice = inFam.slice(ui.page * PAGE, ui.page * PAGE + PAGE);
    const famOk = (f) => Object.keys(EFFECTS).some((id) => EFFECTS[id].family === f && effectAllowed(d.type, id));
    const tabs = FAMILY_ORDER.map((f) => {
      const ok = famOk(f);
      return `<button type="button" role="tab" class="rf-ftab${ui.fam === f ? ' on' : ''}${!ok ? ' dim' : ''}" data-act="fam" data-v="${f}" data-key="fam-${f}" aria-selected="${ui.fam === f}" ${!ok ? `aria-disabled="true" title="${FAMILY_TIP}"` : ''}>${FAMILY_ICON[f]}<span>${FAMILIES[f].label}</span></button>`;
    }).join('');
    const req = t.requires ? { damage: 'a Damage', defense: 'a Defense', setup: 'a Set Up' }[t.requires] : null;
    const has = req ? d.effects.some((e) => EFFECTS[e.id].family === t.requires) : true;
    return `
      <div class="rf-tabs" role="tablist" aria-label="Effect families">${tabs}</div>
      <div class="rf-chips">${slice.map((id) => chipEffect(id, d)).join('')}</div>
      ${pages > 1 ? `<div class="rf-pager"><button type="button" class="rf-link" data-act="page" data-v="${(ui.page + 1) % pages}" data-key="page">${ui.page + 1 < pages ? 'More effects' : 'Back to first'} (${ui.page + 1} of ${pages})</button></div>` : ''}
      <ul class="rf-sel" aria-label="Your effects">${d.effects.map((e) => { const def = EFFECTS[e.id]; return `<li class="rf-selrow"><span class="rf-seltxt">${esc(def.short)}${d.auto === e.id ? '<em class="rf-auto">Starting effect</em>' : ''}</span>${def.flat ? '<em>Fixed</em>' : `<span class="rf-stepper"><button type="button" class="rf-sb" data-act="amt" data-id="${e.id}" data-d="-1" data-key="amt-${e.id}-m" aria-label="Lower ${esc(def.short)}">${UI_ICON.minus}</button><output>${e.amount}</output><button type="button" class="rf-sb" data-act="amt" data-id="${e.id}" data-d="1" data-key="amt-${e.id}-p" aria-label="Raise ${esc(def.short)}">${UI_ICON.plus}</button></span>`}<button type="button" class="rf-sb rf-rm" data-act="rm" data-id="${e.id}" data-key="rm-${e.id}" aria-label="Remove ${esc(def.short)}">${UI_ICON.x}</button></li>`; }).join('')}</ul>
      <p class="rf-note">${d.effects.length} of ${t.maxEffects} effects.${req ? ` ${t.label} cards need ${req} effect.${has ? '' : ' Add one to continue.'}` : ''} Change numbers right on the card.${perm ? '' : ''}</p>`;
  }

  function optionList(items, current, act, label) {
    return `<div class="rf-list" role="radiogroup" aria-label="${label}">${items.map(({ id, text, tag }) => `<button type="button" role="radio" class="rf-opt${current === id ? ' on' : ''}" data-act="${act}" data-v="${id}" data-key="${act}-${id}" aria-checked="${current === id}"><span>${esc(text)}</span>${tag ? `<em>${esc(tag)}</em>` : ''}</button>`).join('')}</div>`;
  }

  function rulesPanel(st) {
    const d = st.design;
    const perm = d.type === 'permanent';
    const chips = KEYWORD_ORDER.map((k) => {
      const on = d.keywords.includes(k);
      const r = keywordAllowed(d.type, k, d.keywords);
      const dim = !on && !r.ok;
      return `<button type="button" class="rf-chip${on ? ' on' : ''}${dim ? ' dim' : ''}" data-act="kw" data-v="${k}" data-key="kw-${k}" aria-pressed="${on}" ${dim ? `aria-disabled="true" title="${esc(r.why)}"` : ''}><b>${esc(KEYWORDS[k].name)}</b><small>${esc(KEYWORDS[k].text)}</small></button>`;
    }).join('');
    const locked = selfFeeds(d);
    const once = perm ? `<button type="button" class="rf-chip${d.permanent.oncePerTurn ? ' on' : ''}${locked ? ' lock' : ''}" data-act="once" data-key="once" aria-pressed="${d.permanent.oncePerTurn}"><b>Once per turn</b><small>${locked ? 'Locked on to stop endless loops' : 'It fires at most once each turn'}</small></button>` : '';
    return `<div class="rf-chips">${chips}${once}</div><p class="rf-note">${d.keywords.length} of ${MAX_KEYWORDS} rules. Rules are optional.${perm ? ' Permanent cards can only use Starts in Hand and Keep in Hand.' : ''}</p>`;
  }

  function pricePanel(st) {
    const d = st.design;
    const chips = [`<button type="button" role="radio" class="rf-chip${!d.price ? ' on' : ''}" data-act="price" data-v="" data-key="price-none" aria-checked="${!d.price}"><b>No price</b><small>Keep full power</small></button>`]
      .concat(PRICE_ORDER.map((id) => `<button type="button" role="radio" class="rf-chip${d.price && d.price.id === id ? ' on' : ''}" data-act="price" data-v="${id}" data-key="price-${id}" aria-checked="${!!d.price && d.price.id === id}"><b>${esc(PRICES[id].name)}</b><small>${esc(PRICES[id].text(PRICES[id].min))}</small></button>`)).join('');
    const amt = d.price ? `<div class="rf-pamt"><span>${esc(PRICES[d.price.id].short(d.price.amount))}</span><span class="rf-stepper"><button type="button" class="rf-sb" data-act="pamt" data-d="-1" aria-label="Lower the price">${UI_ICON.minus}</button><output aria-live="off">${d.price.amount}</output><button type="button" class="rf-sb" data-act="pamt" data-d="1" aria-label="Raise the price">${UI_ICON.plus}</button></span></div>` : '';
    return `<div class="rf-chips" role="radiogroup" aria-label="Price">${chips}</div>${amt}<p class="rf-note">${d.type === 'permanent' ? 'A price on a Permanent card is paid once, when you play it.' : 'A price buys back power. A small one is the sweet spot.'}</p>`;
  }

  function costPanel(st) {
    const d = st.design;
    const tiles = COST_NAMES.map((n, c) => `<button type="button" role="radio" class="rf-ctile${d.cost === c ? ' on' : ''}" data-act="cost" data-v="${c}" data-key="cost-${c}" aria-checked="${d.cost === c}"><b>${c}</b><small>${n}</small></button>`).join('');
    return `<div class="rf-costs" role="radiogroup" aria-label="Energy cost">${tiles}</div>
      <p class="rf-note">Watch the Power bar. A stronger card should cost more, a weaker one less. A card with no downsides and a low cost is too good to be true. You will see how close you got.</p>`;
  }

  function namePanel(st) {
    const d = st.design;
    return `<label class="rf-lbl2" for="rf-name-in">Card name</label>
      <div class="rf-namerow"><input id="rf-name-in" class="rf-input" data-key="name" maxlength="24" autocomplete="off" spellcheck="false" placeholder="Leave empty and we will suggest one" value="${esc(d.name)}"><button type="button" class="rf-btn ghost" data-act="suggest" data-key="suggest">Suggest</button></div>
      <p class="rf-note">Up to 24 characters. Letters, numbers, spaces and basic punctuation.</p>`;
  }

  function stepBody(st) {
    switch (st.step) {
      case 'kind': return `<div class="rf-tiles" role="radiogroup" aria-label="Card type">${TYPE_ORDER.filter((t) => FLAGS.permanent || t !== 'permanent').map((t, i) => `<button type="button" role="radio" class="rf-tile${st.design.type === t ? ' on' : ''}" style="--rf-c:var(--rf-${t});--rf-cc:var(--rf-${t})" data-act="type" data-v="${t}" data-key="type-${t}" aria-checked="${st.design.type === t}" tabindex="${st.design.type === t || (!st.design.type && i === 0) ? 0 : -1}"><span class="rf-tile-n" aria-hidden="true">${i + 1}</span><span class="rf-tile-i">${TYPE_ICON[t]}</span><b>${TYPES[t].label}</b><small>${esc(TYPES[t].promise)}</small></button>`).join('')}</div><p class="rf-note">Press 1 to 5 to choose. You will set the cost yourself at the end.</p>`;
      case 'when': return optionList(TRIGGER_ORDER.map((id) => ({ id, text: TRIGGERS[id].text, tag: TRIGGERS[id].conditional ? 'Reacts' : '' })), st.design.permanent && st.design.permanent.trigger, 'trig', 'Trigger');
      case 'effects': return effectsPanel(st);
      case 'life': return optionList(LIFESPAN_ORDER.map((id) => ({ id, text: LIFESPANS[id].text })), st.design.permanent && st.design.permanent.lifespan, 'life', 'Lifespan');
      case 'rules': return rulesPanel(st);
      case 'price': return pricePanel(st);
      case 'cost': return costPanel(st);
      case 'name': return namePanel(st);
      default: return '';
    }
  }

  function renderPanel(st, view) {
    if (st.step === 'result') return renderResult(st, view);
    const active = document.activeElement && panel.contains(document.activeElement) ? document.activeElement : null;
    const key = active && active.dataset ? active.dataset.key : null;
    const caret = active && active.tagName === 'INPUT' ? [active.selectionStart, active.selectionEnd] : null;
    const steps = stepsFor(st.design.type);
    const idx = steps.indexOf(st.step);
    const last = st.step === 'name';
    const blocked = last && view.errors.length > 0;
    const title = st.step === 'effects' && st.design.type === 'permanent' ? TITLES.effectsPerm : TITLES[st.step];
    const next = !stepComplete(st.design, st.step);
    panel.innerHTML = `
      <div class="rf-ph"><span class="rf-pstep">${stepNo(st.step, st)}</span><h2 class="rf-ptitle" tabindex="-1">${title}</h2></div>
      <div class="rf-pbody">${stepBody(st)}</div>
      ${view.errors.length && st.design.type ? `<ul class="rf-errs">${view.errors.slice(0, 2).map((e) => `<li>${esc(e.text)}</li>`).join('')}</ul>` : ''}
      <div class="rf-nav">
        <button type="button" class="rf-btn ghost" data-act="back" data-key="back" ${idx <= 0 ? 'disabled' : ''}>Back</button>
        <button type="button" class="rf-btn${last ? ' forge' : ''}" data-act="next" data-key="next" ${blocked ? 'aria-disabled="true"' : ''} ${next ? 'aria-disabled="true"' : ''}>${last ? 'Forge it' : 'Next'}</button>
      </div>`;
    if (key) {
      const el = panel.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) { el.focus({ preventScroll: true }); if (caret && el.setSelectionRange) el.setSelectionRange(caret[0], caret[1]); }
    }
  }

  function renderResult(st, view) {
    const r = st.result;
    if (ui.forging) { panel.innerHTML = `<div class="rf-ph"><span class="rf-pstep">Forging</span><h2 class="rf-ptitle" tabindex="-1">Hold on</h2></div><div class="rf-pbody"><p class="rf-note">The card is heating up.</p></div>`; return; }
    const costGain = MAXES.budget - r.parts.budget;
    const tip = r.chosen !== r.cost
      ? { gain: costGain, label: `Set the cost to ${r.cost} instead of ${r.chosen}` }
      : bestSingleStep(st.design);
    const subs = SUB_ORDER.map((k, i) => `<li class="rf-sub" style="--d:${i * 130}ms"><span class="rf-sn">${SUB_NAMES[k]}</span><span class="rf-sbar"><i style="--w:${(r.parts[k] / MAXES[k]) * 100}%"></i></span><span class="rf-sv">${r.parts[k].toFixed(1).replace(/\.0$/, '')}<small>/${MAXES[k]}</small></span><p>${esc(r.reasons[k])}</p></li>`).join('');
    panel.innerHTML = `
      <div class="rf-ph"><span class="rf-pstep">Your card</span><h2 class="rf-ptitle" tabindex="-1">${esc(st.design.name)}</h2></div>
      <div class="rf-res">
        <div class="rf-score" data-g="${r.grade[0]}"><span class="rf-sc-n">0</span><span class="rf-sc-of">/100</span><span class="rf-sc-g">${esc(r.grade)}</span></div>
        ${r.cap ? `<p class="rf-cap">${esc(r.reasons.cap)}</p>` : ''}
        <ul class="rf-subs">${subs}</ul>
        <p class="rf-tip"><b>${tip ? 'Biggest gain' : 'Nothing to fix'}</b> ${tip ? `${esc(tip.label)}. That is worth about ${Math.max(1, Math.round(tip.gain))} ${Math.round(tip.gain) <= 1 ? 'point' : 'points'}.` : 'No single change makes this card better.'}</p>
        <div class="rf-acts">
          <button type="button" class="rf-btn" data-act="enter" data-key="enter">Enter the site</button>
          <button type="button" class="rf-btn ghost" data-act="again" data-key="again">Forge another</button>
          <button type="button" class="rf-btn ghost" data-act="share" data-key="share">${UI_ICON.link}<span>Share card</span></button>
          <button type="button" class="rf-btn ghost" data-act="png" data-key="png">${UI_ICON.download}<span>Download PNG</span></button>
        </div>
      </div>`;
    const n = $(panel, '.rf-sc-n');
    countUp(n, r.total, 900, () => { $$(panel, '.rf-sub').forEach((s) => s.classList.add('in')); });
    if (reduced()) $$(panel, '.rf-sub').forEach((s) => s.classList.add('in'));
    else setTimeout(() => $$(panel, '.rf-sub').forEach((s) => s.classList.add('in')), 150);
  }

  function renderTop(st) {
    const steps = stepsFor(st.design.type);
    const idx = st.step === 'result' ? steps.length : steps.indexOf(st.step);
    $(g, '.rf-dots').innerHTML = steps.map((s, i) => `<li><button type="button" class="rf-dot${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}" data-act="goto" data-v="${s}" ${i >= idx || st.step === 'result' ? 'tabindex="-1" disabled' : ''} aria-label="${esc(TITLES[s === 'effects' && st.design.type === 'permanent' ? 'effectsPerm' : s])}${i < idx ? ', done' : ''}"></button></li>`).join('');
    $(g, '[data-act="undo"]').disabled = !st.history.length || st.step === 'result';
    g.dataset.step = st.step;
  }

  // The meter shows how strong the card is, not what it should cost. Reading the cost off it is the player's job.
  function renderMeter(st, view) {
    const m = $(g, '.rf-meter');
    const r = view.rating;
    const fill = $(m, '.rf-fill');
    const d = st.design;
    $(m, '.rf-mcost').textContent = Number.isInteger(d.cost) ? `Cost ${d.cost}` : 'Cost ?';
    if (r && r.power && r.power.net > 27.5) {
      $(m, '.rf-mval').textContent = 'Too strong'; $(m, '.rf-mpct').textContent = 'Trim a number';
      fill.style.setProperty('--w', '100%'); m.dataset.band = 'over'; m.setAttribute('aria-valuenow', 100); return;
    }
    if (!r || !r.parts) {
      $(m, '.rf-mval').textContent = '-'; $(m, '.rf-mpct').textContent = d.type ? 'Add an effect' : 'Pick a type';
      fill.style.setProperty('--w', '0%'); m.dataset.band = 'none'; m.setAttribute('aria-valuenow', 0); return;
    }
    const f = Math.max(0, Math.min(1, r.power.net / 27.5));
    $(m, '.rf-mval').textContent = powerWord(f);
    $(m, '.rf-mpct').textContent = '';
    fill.style.setProperty('--w', `${Math.round(f * 100)}%`);
    m.dataset.band = 'none';
    m.setAttribute('aria-valuenow', Math.round(f * 100));
  }

  // ---------- reveal bookkeeping ----------
  function checkReveal(st) {
    const steps = stepsFor(st.design.type);
    const at = (s) => steps.indexOf(s);
    if (st.design.type && !ui.revealed.has('kind') && at(st.step) > 0) { ui.revealed.add('kind'); if (opts.onReveal) opts.onReveal('kind'); }
    if (!ui.revealed.has('effects') && st.step !== 'kind' && st.step !== 'when' && st.step !== 'effects' && st.step !== 'result' && at(st.step) > at('effects')) { ui.revealed.add('effects'); if (opts.onReveal) opts.onReveal('effects'); }
    if (st.step === 'result' && !ui.revealed.has('forge')) { ui.revealed.add('forge'); if (opts.onReveal) opts.onReveal('forge'); }
  }

  // ---------- main render ----------
  function render(st, prev, action) {
    const view = derive(st);
    g.dataset.type = st.design.type || 'none';
    card.update(st, view);
    renderTop(st);
    renderMeter(st, view);
    const hint = $(g, '.rf-hint');
    hint.textContent = st.design.type && st.step !== 'result' ? view.hint : '';
    hint.hidden = !st.design.type || st.step === 'result';
    $(g, '.rf-left').dataset.mode = st.step === 'result' ? 'result' : 'build';
    if (!prev || st.step !== prev.step || st.design.type !== prev.design.type) {
      if (!ui.fam || st.design.type !== (prev && prev.design.type)) ui.fam = defaultFamily(st.design.type);
    }
    const typing = action && action.type === 'SET_NAME' && st.step === 'name' && prev && prev.step === 'name';
    if (!typing) renderPanel(st, view);
    checkReveal(st);

    // toast
    if (st.toast && (!prev || st.toast !== prev.toast)) {
      const t = $(g, '.rf-toast');
      t.textContent = st.toast.text; t.hidden = false;
      clearTimeout(ui.toastTimer);
      ui.toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
      say(st.toast.text);
    }
    // fx
    if (st.fx && (!prev || st.fx !== prev.fx)) playFx(st, view);
    if (prev && st.step !== prev.step && ui.interacted && st.step !== 'result') { const h = $(panel, '.rf-ptitle'); if (h) h.focus({ preventScroll: true }); }
  }

  function playFx(st, view) {
    const f = st.fx;
    if (f.kind === 'type') { sound.click(); haptic(8); card.el.classList.remove('rf-morph'); void card.el.offsetWidth; card.el.classList.add('rf-morph'); }
    else if (f.kind === 'effect') { sound.click(); requestAnimationFrame(() => card.stampEffect(f.id)); }
    else if (f.kind === 'chain') { const el = card.q(f.part === 'when' ? '.rf-when' : '.rf-life'); el.classList.remove('rf-snap'); void el.offsetWidth; el.classList.add('rf-snap'); sound.click(); }
    else if (f.kind === 'forge') runForge(st);
  }

  function runForge(st) {
    const r = st.result;
    ui.forging = true;
    renderPanel(st, derive(st));
    sound.click(); haptic(20);
    forgeSequence(card, st.design.type, () => { sound.stamp(); haptic(30); card.setStamp(r.grade, r.total); }).then(() => {
      ui.forging = false;
      if (store.get().step === 'result') {
        renderPanel(store.get(), derive(store.get()));
        say(`Forged. Score ${r.total} out of 100. Grade ${r.grade}. ${r.cap ? r.reasons.cap : ''}`);
        if (r.total >= 95) { sparks(card.el); sound.chord(); haptic([20, 40, 20]); }
        else if (r.total >= 75) sound.chord();
        else if (r.total < 20) sound.sad();
        const h = $(panel, '.rf-ptitle'); if (h) h.focus({ preventScroll: true });
      }
    });
    track('rf_forged', { type: st.design.type, score: r.total, grade: r.grade, cost: st.design.cost, fair_cost: r.cost, effects_count: st.design.effects.length });
  }

  // ---------- events ----------
  const D = (a) => store.dispatch(a);
  function startRepeat(fn, e) {
    fn();
    let t = setTimeout(function loop() { fn(); t = setTimeout(loop, 85); }, 380);
    const stop = () => { clearTimeout(t); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); e.target.removeEventListener('pointerleave', stop); };
    window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop); e.target.addEventListener('pointerleave', stop);
  }
  const stepAmount = (id, dir) => {
    const e = store.get().design.effects.find((x) => x.id === id);
    if (e) D({ type: 'SET_AMOUNT', id, value: e.amount + dir * EFFECTS[id].step });
  };
  const stepPrice = (dir) => {
    const p = store.get().design.price;
    if (p) D({ type: 'SET_PRICE', id: p.id, amount: p.amount + dir });
  };

  const actions = {
    type: (b) => { D({ type: 'SET_TYPE', value: b.dataset.v }); track('rf_type_set', { type: b.dataset.v }); },
    fam: (b) => { if (b.getAttribute('aria-disabled') === 'true') { D({ type: 'NOTE', text: FAMILY_TIP }); return; } ui.fam = b.dataset.v; ui.page = 0; renderPanel(store.get(), derive(store.get())); sound.click(); },
    page: (b) => { ui.page = Number(b.dataset.v); renderPanel(store.get(), derive(store.get())); sound.click(); },
    eff: (b) => {
      const id = b.dataset.v; const has = store.get().design.effects.some((e) => e.id === id);
      D({ type: has ? 'REMOVE_EFFECT' : 'ADD_EFFECT', id });
      if (!has && store.get().design.effects.some((e) => e.id === id)) track('rf_effect_added', { id });
    },
    rm: (b) => D({ type: 'REMOVE_EFFECT', id: b.dataset.id }),
    trig: (b) => { D({ type: 'SET_TRIGGER', id: b.dataset.v }); track('rf_trigger_set', { id: b.dataset.v }); },
    life: (b) => { D({ type: 'SET_LIFESPAN', id: b.dataset.v }); track('rf_lifespan_set', { id: b.dataset.v }); },
    kw: (b) => { D({ type: 'TOGGLE_KEYWORD', id: b.dataset.v }); track('rf_keyword_toggled', { id: b.dataset.v }); sound.click(); },
    once: () => D({ type: 'TOGGLE_ONCE' }),
    price: (b) => { D({ type: 'SET_PRICE', id: b.dataset.v || null }); if (b.dataset.v) track('rf_price_set', { id: b.dataset.v }); sound.click(); },
    cost: (b) => { D({ type: 'SET_COST', value: Number(b.dataset.v) }); track('rf_cost_set', { cost: Number(b.dataset.v) }); sound.click(); },
    next: (b) => { D({ type: 'NEXT' }); if (b.getAttribute('aria-disabled') !== 'true') sound.click(); },
    back: () => { D({ type: 'BACK' }); sound.click(); },
    goto: (b) => D({ type: 'GOTO', step: b.dataset.v }),
    undo: () => { D({ type: 'UNDO' }); sound.click(); },
    suggest: () => {
      const name = suggestName(store.get().design);
      D({ type: 'SET_NAME', value: name });
      const inp = $(panel, '#rf-name-in');
      if (inp) { inp.value = name; inp.focus({ preventScroll: true }); }
      sound.click();
    },
    sound: (b) => { const on = sound.toggle(); b.setAttribute('aria-pressed', on); $(b, 'span').textContent = on ? 'Sound on' : 'Sound off'; b.querySelector('svg').outerHTML = on ? UI_ICON.sound : UI_ICON.mute; },
    skip: () => openConfirm(true),
    keep: () => openConfirm(false),
    'confirm-skip': () => { track('rf_skip', { step: store.get().step }); openConfirm(false); if (opts.onSkip) opts.onSkip(); },
    again: () => { card.clearStamp(); ui.prevCost = null; D({ type: 'RESET' }); const h = $(panel, '.rf-ptitle'); if (h) h.focus({ preventScroll: true }); },
    enter: () => { track('rf_enter_site'); if (opts.onEnter) opts.onEnter(); },
    share: async (b) => {
      const st = store.get(); const res = await shareCard(st.design, st.result); track('rf_share');
      const t = $(g, '.rf-toast'); t.textContent = res === 'copied' ? 'Link copied. Anyone who opens it sees your card and scores it fresh.' : res === 'shared' ? 'Shared.' : 'Could not copy automatically. The link is below.'; t.hidden = false; clearTimeout(ui.toastTimer); ui.toastTimer = setTimeout(() => { t.hidden = true; }, 3200); say(t.textContent);
      if (res === 'failed') {
        let box = $(panel, '.rf-linkbox');
        if (!box) { box = html('<input class="rf-input rf-linkbox" readonly aria-label="Card link">'); $(panel, '.rf-acts').after(box); }
        box.value = cardLink(st.design); box.focus(); box.select();
      }
    },
    png: async () => { const st = store.get(); const ok = await downloadCard(st.design, st.result, card.el); track('rf_download'); const t = $(g, '.rf-toast'); t.textContent = ok ? 'Saved as a PNG.' : 'Could not make the image.'; t.hidden = false; clearTimeout(ui.toastTimer); ui.toastTimer = setTimeout(() => { t.hidden = true; }, 2400); },
  };

  function openConfirm(open) {
    ui.confirm = open;
    const c = $(g, '.rf-confirm'); c.hidden = !open;
    if (open) { const b = $(c, '[data-act="confirm-skip"]'); b.focus(); } else { const s = $(g, '.rf-skip'); if (s) s.focus({ preventScroll: true }); }
  }

  g.addEventListener('click', (e) => {
    ui.interacted = true;
    const b = e.target.closest('[data-act]');
    if (!b || !g.contains(b)) return;
    const act = b.dataset.act;
    if ((act === 'amt' || act === 'pamt') && e.detail !== 0) return; // pointer clicks are handled on pointerdown
    if (b.disabled) return;
    if (act === 'amt') return stepAmount(b.dataset.id, Number(b.dataset.d));
    if (act === 'pamt') return stepPrice(Number(b.dataset.d));
    const fn = actions[act];
    if (fn) fn(b);
  });

  g.addEventListener('pointerdown', (e) => {
    ui.interacted = true;
    const b = e.target.closest('[data-act="amt"],[data-act="pamt"]');
    if (b && !b.disabled && e.button === 0) {
      e.preventDefault();
      if (b.dataset.act === 'amt') startRepeat(() => stepAmount(b.dataset.id, Number(b.dataset.d)), e);
      else startRepeat(() => stepPrice(Number(b.dataset.d)), e);
      return;
    }
    const num = e.target.closest('.rf-num');
    if (num) {
      const id = num.dataset.id;
      const def = EFFECTS[id];
      const base = store.get().design.effects.find((x) => x.id === id).amount;
      const x0 = e.clientX;
      num.setPointerCapture(e.pointerId);
      num.classList.add('drag');
      const move = (ev) => D({ type: 'SET_AMOUNT', id, value: base + Math.trunc((ev.clientX - x0) / 14) * def.step });
      const up = () => { num.classList.remove('drag'); num.removeEventListener('pointermove', move); num.removeEventListener('pointerup', up); num.removeEventListener('pointercancel', up); };
      num.addEventListener('pointermove', move); num.addEventListener('pointerup', up); num.addEventListener('pointercancel', up);
    }
  });

  g.addEventListener('input', (e) => { if (e.target.id === 'rf-name-in') { ui.interacted = true; D({ type: 'SET_NAME', value: e.target.value }); } });

  g.addEventListener('keydown', (e) => {
    ui.interacted = true;
    const num = e.target.closest && e.target.closest('.rf-num');
    if (num) {
      const id = num.dataset.id; const def = EFFECTS[id];
      const cur = store.get().design.effects.find((x) => x.id === id).amount;
      const map = { ArrowUp: cur + def.step, ArrowRight: cur + def.step, ArrowDown: cur - def.step, ArrowLeft: cur - def.step, PageUp: cur + def.step * 5, PageDown: cur - def.step * 5, Home: def.min, End: def.max };
      if (e.key in map) { e.preventDefault(); D({ type: 'SET_AMOUNT', id, value: map[e.key] }); const n = card.q(`.rf-num[data-id="${id}"]`); if (n) n.focus(); }
      return;
    }
    if (e.target.getAttribute && e.target.getAttribute('role') === 'radio' && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      const group = e.target.closest('[role="radiogroup"]');
      const items = group ? $$(group, '[role="radio"]') : [];
      const i = items.indexOf(e.target);
      const j = (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      e.preventDefault(); items[j].focus(); items[j].click();
      const again = panel.querySelector(`[data-key="${CSS.escape(items[j].dataset.key)}"]`); if (again) again.focus();
    }
    if (e.target.id === 'rf-name-in' && e.key === 'Enter') { e.preventDefault(); D({ type: 'FORGE' }); }
  });

  function globalKey(e) {
    if (!root.isConnected || !root.offsetParent) return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const st = store.get();
    if (e.key === 'Escape') { openConfirm(!ui.confirm); e.preventDefault(); return; }
    if (ui.confirm) { if (e.key === 'Enter') { e.preventDefault(); actions['confirm-skip'](); } return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); D({ type: 'UNDO' }); return; }
    const inGame = g.contains(document.activeElement) || document.activeElement === document.body;
    if (!inGame || typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (st.step === 'kind' && /^[1-5]$/.test(e.key)) { const t = TYPE_ORDER[Number(e.key) - 1]; if (t && (FLAGS.permanent || t !== 'permanent')) { ui.interacted = true; actions.type({ dataset: { v: t } }); } return; }
    if (e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A' && st.step !== 'result') { e.preventDefault(); D({ type: 'NEXT' }); }
  }
  document.addEventListener('keydown', globalKey);

  // tilt follows the pointer (off for reduced motion and touch)
  const wrap = $(g, '.rf-cardwrap');
  const tilt = (e) => {
    if (reduced() || e.pointerType === 'touch' || card.el.classList.contains('rf-heat')) return;
    const r = wrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; const y = (e.clientY - r.top) / r.height - 0.5;
    card.el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`); card.el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
  };
  wrap.addEventListener('pointermove', tilt);
  wrap.addEventListener('pointerleave', () => { card.el.style.setProperty('--rx', '0deg'); card.el.style.setProperty('--ry', '0deg'); });

  // ---------- go ----------
  store.subscribe(render);
  if (opts.initialCard) {
    D({ type: 'LOAD', design: opts.initialCard });
  } else {
    render(store.get(), null, null);
    if (opts.invalidCard) {
      const t = $(g, '.rf-toast'); t.textContent = 'That card is not valid. Here is a blank forge.'; t.hidden = false; ui.toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
    }
  }
  track('rf_start');

  return {
    destroy() { document.removeEventListener('keydown', globalKey); setTracker(null); root.innerHTML = ''; },
    setTheme(t) { if (t) g.dataset.theme = t; else delete g.dataset.theme; },
    focus() { const b = $(g, '.rf-tile[tabindex="0"]'); if (b) b.focus({ preventScroll: true }); },
    state: () => store.get(),
    dispatch: D,
  };
}
export { decode as decodeCard } from '../engine/codec.js';
