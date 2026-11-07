import { EFFECTS, KEYWORDS, PRICES, TRIGGERS, LIFESPANS, TYPES, FLAGS, MAX_KEYWORDS } from './balance.js';
import { effectAllowed, keywordAllowed, selfFeeds, validate } from './validate.js';
import { rate } from './rating.js';
import { cleanName, NAME_MAX } from './codec.js';
import { normalize, coachHint } from './coach.js';
import { suggestName } from './names.js';

const clone = (d) => JSON.parse(JSON.stringify(d));

// `auto` is the id of the starting effect a type comes with. It is a placeholder: adding another effect swaps it out
// (unless the card still needs it), and editing its number makes it the player's own.
export const blankDesign = () => ({ type: null, effects: [], keywords: [], price: null, permanent: null, name: '', auto: null });
export const initialState = () => ({ step: 'kind', design: blankDesign(), history: [], toast: null, result: null, skipped: false, rev: 0, fx: null });

export function stepsFor(type) {
  return type === 'permanent'
    ? ['kind', 'when', 'effects', 'life', 'rules', 'price', 'name']
    : ['kind', 'effects', 'rules', 'price', 'name'];
}

export function stepComplete(design, step) {
  switch (step) {
    case 'kind': return !!design.type;
    case 'when': return !!(design.permanent && design.permanent.trigger);
    case 'effects': {
      if (!design.type || design.effects.length < 1) return false;
      const req = TYPES[design.type].requires;
      return !req || design.effects.some((e) => EFFECTS[e.id].family === req);
    }
    case 'life': return !!(design.permanent && design.permanent.lifespan);
    default: return true;
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
let toastId = 0;
const toast = (state, text) => ({ ...state, toast: { id: ++toastId, text } });
const fx = (state, kind, extra = {}) => ({ ...state, fx: { n: (state.fx ? state.fx.n : 0) + 1, kind, ...extra } });

// Applies a design change, snapshotting the old design for Undo. Returns the new state.
function change(state, mutate, fxKind, fxExtra) {
  const d = clone(state.design);
  const before = selfFeeds(state.design);
  mutate(d);
  normalize(d);
  let next = { ...state, design: d, history: [...state.history, clone(state.design)].slice(-50), rev: state.rev + 1, result: null };
  if (selfFeeds(d) && !before) next = toast(next, 'Locked on to stop endless loops.');
  return fxKind ? fx(next, fxKind, fxExtra) : next;
}

export function reducer(state, action) {
  const d = state.design;
  switch (action.type) {
    case 'SET_TYPE': {
      const type = action.value;
      if (!TYPES[type] || (type === 'permanent' && !FLAGS.permanent) || type === d.type) return state;
      let dropped = 0;
      const next = change(state, (n) => {
        const prev = n.type;
        n.type = type;
        const t = TYPES[type];
        if (!prev) {
          n.effects = t.def();
          n.auto = n.effects[0].id;
        } else {
          // an untouched starting effect belongs to the old type, so it never follows the player to a new one
          if (n.auto) { n.effects = n.effects.filter((e) => e.id !== n.auto); n.auto = null; }
          const keep = n.effects.filter((e) => effectAllowed(type, e.id));
          dropped = n.effects.length - keep.length;
          n.effects = keep.slice(0, t.maxEffects);
          dropped += keep.length - n.effects.length;
          if (t.requires && !n.effects.some((e) => EFFECTS[e.id].family === t.requires)) {
            if (n.effects.length >= t.maxEffects) n.effects.pop();
            n.effects.unshift(t.def()[0]);
            n.auto = t.def()[0].id;
          }
          if (n.effects.length === 0) { n.effects = t.def(); n.auto = n.effects[0].id; }
          if (n.auto && !n.effects.some((e) => e.id === n.auto)) n.auto = null;
        }
        const kept = [];
        for (const k of n.keywords) if (keywordAllowed(type, k, kept).ok) kept.push(k);
        n.keywords = kept;
        n.permanent = type === 'permanent' ? n.permanent || { trigger: 'startOfTurn', lifespan: 'turns3', oncePerTurn: false } : null;
      }, 'type', { value: type });
      return dropped ? toast(next, `Dropped ${dropped} ${dropped === 1 ? 'effect' : 'effects'} that ${dropped === 1 ? "doesn't" : "don't"} fit ${TYPES[type].label}`) : next;
    }
    case 'ADD_EFFECT': {
      const id = action.id;
      if (!d.type || !EFFECTS[id]) return state;
      if (d.effects.some((e) => e.id === id)) return state;
      if (!effectAllowed(d.type, id)) return toast(state, EFFECTS[id].future ? 'Set Up effects only work on Set Up and Permanent cards.' : 'Cancel only works on Instant cards.');
      const hasAuto = !!d.auto && d.effects.some((e) => e.id === d.auto);
      if (d.effects.length >= TYPES[d.type].maxEffects && !hasAuto) return toast(state, `${TYPES[d.type].label} cards can have ${TYPES[d.type].maxEffects} effects at most.`);
      let swapped = null;
      const next = change(state, (n) => {
        n.effects.push({ id, amount: EFFECTS[id].def });
        if (n.auto && n.auto !== id && n.effects.some((e) => e.id === n.auto)) {
          const req = TYPES[n.type].requires;
          const others = n.effects.filter((e) => e.id !== n.auto);
          const stillOk = !req || others.some((e) => EFFECTS[e.id].family === req);
          if (stillOk) { swapped = n.auto; n.effects = others; }
        }
        n.auto = null;
      }, 'effect', { id });
      return swapped ? toast(next, `Swapped the starting effect (${EFFECTS[swapped].short}) for ${EFFECTS[id].short}.`) : next;
    }
    case 'REMOVE_EFFECT': {
      if (!d.effects.some((e) => e.id === action.id)) return state;
      if (d.effects.length === 1) return toast(state, 'A card needs at least one effect.');
      return change(state, (n) => { n.effects = n.effects.filter((e) => e.id !== action.id); if (n.auto === action.id) n.auto = null; }, 'effect-remove', { id: action.id });
    }
    case 'SET_AMOUNT': {
      const def = EFFECTS[action.id];
      const e = d.effects.find((x) => x.id === action.id);
      if (!def || !e) return state;
      const amount = clamp(def.min + Math.round((action.value - def.min) / def.step) * def.step, def.min, def.max);
      if (amount === e.amount) return state;
      return change(state, (n) => { n.effects.find((x) => x.id === action.id).amount = amount; if (n.auto === action.id) n.auto = null; }, 'amount', { id: action.id });
    }
    case 'SET_TRIGGER': {
      if (!TRIGGERS[action.id] || d.type !== 'permanent') return state;
      return change(state, (n) => { n.permanent.trigger = action.id; }, 'chain', { part: 'when' });
    }
    case 'SET_LIFESPAN': {
      if (!LIFESPANS[action.id] || d.type !== 'permanent') return state;
      return change(state, (n) => { n.permanent.lifespan = action.id; }, 'chain', { part: 'life' });
    }
    case 'TOGGLE_ONCE': {
      if (d.type !== 'permanent') return state;
      if (selfFeeds(d)) return toast(state, 'Locked on to stop endless loops.');
      return change(state, (n) => { n.permanent.oncePerTurn = !n.permanent.oncePerTurn; });
    }
    case 'TOGGLE_KEYWORD': {
      const k = action.id;
      if (!d.type || !KEYWORDS[k]) return state;
      if (d.keywords.includes(k)) return change(state, (n) => { n.keywords = n.keywords.filter((x) => x !== k); });
      const r = keywordAllowed(d.type, k, d.keywords);
      if (!r.ok) return toast(state, r.why);
      return change(state, (n) => { n.keywords.push(k); });
    }
    case 'SET_PRICE': {
      if (!d.type) return state;
      if (!action.id) return d.price ? change(state, (n) => { n.price = null; }) : state;
      const p = PRICES[action.id];
      if (!p) return state;
      const amount = clamp(action.amount ?? (d.price && d.price.id === action.id ? d.price.amount : p.min), p.min, p.max);
      if (d.price && d.price.id === action.id && d.price.amount === amount) return state;
      return change(state, (n) => { n.price = { id: action.id, amount }; });
    }
    case 'SET_NAME': {
      const name = String(action.value || '').normalize('NFKC').replace(/[^\p{L}\p{N} '.,!?&+\-]/gu, '').slice(0, NAME_MAX);
      return { ...state, design: { ...d, name } };
    }
    case 'NEXT': {
      const steps = stepsFor(d.type);
      const i = steps.indexOf(state.step);
      if (i < 0) return state;
      if (!stepComplete(d, state.step)) {
        const why = state.step === 'kind' ? 'Pick a card type first.' : state.step === 'effects' ? `Add at least one ${{ damage: 'Damage', defense: 'Defense', setup: 'Set Up' }[TYPES[d.type].requires] || ''} effect to continue.`.replace('  ', ' ') : 'Make a choice to continue.';
        return toast(state, why);
      }
      if (state.step === 'name') return reducer(state, { type: 'FORGE' });
      return { ...state, step: steps[i + 1] };
    }
    case 'BACK': {
      const steps = stepsFor(d.type);
      const i = steps.indexOf(state.step);
      if (i <= 0) return state;
      return { ...state, step: steps[i - 1] };
    }
    case 'GOTO': {
      const steps = stepsFor(d.type);
      const to = steps.indexOf(action.step);
      const from = steps.indexOf(state.step);
      if (to < 0 || to > from) return state;
      return { ...state, step: action.step };
    }
    case 'UNDO': {
      if (!state.history.length) return state;
      const prev = state.history[state.history.length - 1];
      const keepName = state.design.name;
      const steps = stepsFor(prev.type);
      return { ...state, design: { ...prev, name: keepName }, history: state.history.slice(0, -1), step: steps.includes(state.step) ? state.step : 'kind', rev: state.rev + 1, result: null };
    }
    case 'FORGE': {
      const errors = validate(d);
      if (errors.length) return toast(state, errors[0].text);
      const design = clone(d);
      design.name = cleanName(design.name) || suggestName(design);
      return fx({ ...state, design, step: 'result', result: rate(design) }, 'forge');
    }
    case 'LOAD': {
      // Used for ?card= links: the design was already validated by decode().
      return fx({ ...initialState(), design: clone(action.design), step: 'result', result: rate(action.design) }, 'forge');
    }
    case 'RESET': return { ...initialState(), fx: state.fx };
    case 'NOTE': return toast(state, action.text);
    case 'SKIP': return { ...state, skipped: true };
    default: return state;
  }
}

// Everything the UI needs that is derived from the design. Cached on the design JSON.
let cache = { key: '', value: null };
export function derive(state) {
  const key = JSON.stringify(state.design);
  if (cache.key === key) return cache.value;
  const d = state.design;
  let value;
  if (!d.type) value = { rating: null, hint: 'Pick a card type to begin.', errors: [], locked: false };
  else {
    const rating = rate(d);
    value = { rating, hint: coachHint(d), errors: rating.errors, locked: selfFeeds(d) };
  }
  cache = { key, value };
  return value;
}
