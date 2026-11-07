import { KEYWORDS, KEYWORD_ORDER, PRICES, PRICE_ORDER, TYPES, TRIGGERS, TRIGGER_ORDER, LIFESPANS, LIFESPAN_ORDER, EFFECTS as E } from './balance.js';
import { effectAllowed, keywordAllowed, selfFeeds, validate } from './validate.js';
import { rate } from './rating.js';
import { effectText } from './text.js';

const clone = (d) => JSON.parse(JSON.stringify(d));

// Forces "once per turn" on when the combo could loop. Used by the reducer too.
export function normalize(design) {
  if (design.type === 'permanent' && design.permanent) design.permanent.oncePerTurn = design.permanent.oncePerTurn || selfFeeds(design);
  return design;
}

// Every legal single-step change from this card, each with a plain-language label.
export function neighbors(design) {
  const out = [];
  const push = (d, label, kind) => { normalize(d); if (validate(d).length === 0) out.push({ design: d, label, kind }); };
  const t = TYPES[design.type];
  const have = new Set(design.effects.map((e) => e.id));

  for (const id of Object.keys(E)) {
    if (have.has(id) || !effectAllowed(design.type, id) || design.effects.length >= t.maxEffects) continue;
    const d = clone(design); d.effects.push({ id, amount: E[id].def });
    push(d, `Add "${effectText({ id, amount: E[id].def })}"`, 'add');
  }
  design.effects.forEach((e, i) => {
    if (design.effects.length > 1) {
      const d = clone(design); d.effects.splice(i, 1);
      push(d, `Take off "${effectText(e)}"`, 'remove');
    }
    const def = E[e.id];
    if (!def.flat) {
      for (const dir of [-1, 1]) {
        const amount = e.amount + dir * def.step;
        if (amount < def.min || amount > def.max) continue;
        const d = clone(design); d.effects[i].amount = amount;
        push(d, `${dir > 0 ? 'Raise' : 'Lower'} "${effectText(e)}" to ${amount}`, 'tweak');
      }
    }
  });
  for (const k of KEYWORD_ORDER) {
    const cur = design.keywords || [];
    if (cur.includes(k)) {
      const d = clone(design); d.keywords = cur.filter((x) => x !== k);
      push(d, `Remove the "${KEYWORDS[k].name}" rule`, 'kw');
    } else if (keywordAllowed(design.type, k, cur).ok) {
      const d = clone(design); d.keywords = [...cur, k];
      push(d, `Add the "${KEYWORDS[k].name}" rule`, 'kw');
    }
  }
  if (design.price) {
    const d0 = clone(design); d0.price = null;
    push(d0, 'Drop the price', 'price');
    const p = PRICES[design.price.id];
    for (const dir of [-1, 1]) {
      const amount = design.price.amount + dir;
      if (amount < p.min || amount > p.max) continue;
      const d = clone(design); d.price.amount = amount;
      push(d, `${dir > 0 ? 'Raise' : 'Lower'} the price to "${p.short(amount)}"`, 'price');
    }
  }
  for (const id of PRICE_ORDER) {
    if (design.price && design.price.id === id) continue;
    const d = clone(design); d.price = { id, amount: PRICES[id].min };
    push(d, `Add the price "${PRICES[id].short(PRICES[id].min)}"`, 'price');
  }
  if (design.type === 'permanent' && design.permanent) {
    for (const l of LIFESPAN_ORDER) {
      if (l === design.permanent.lifespan) continue;
      const d = clone(design); d.permanent.lifespan = l;
      push(d, `Change it to "${LIFESPANS[l].text}"`, 'life');
    }
    for (const tr of TRIGGER_ORDER) {
      if (tr === design.permanent.trigger) continue;
      const d = clone(design); d.permanent.trigger = tr;
      push(d, `Change the trigger to "${TRIGGERS[tr].text}"`, 'trigger');
    }
  }
  return out;
}

// The single change with the biggest score gain, or null when nothing helps.
export function bestSingleStep(design) {
  const base = rate(design);
  const noBudget = (r) => (r.cap ? Math.min(r.raw, r.cap) : r.raw) - r.parts.budget;
  const baseScore = base.parts ? noBudget(base) : 0;
  let best = null;
  for (const n of neighbors(design)) {
    const r = rate(n.design);
    if (!r.valid || r.parts === null) continue;
    const score = noBudget(r);
    const gain = score - baseScore;
    if (gain > 0.5 && (!best || gain > best.gain)) best = { gain, label: n.label, design: n.design, rating: r, kind: n.kind };
  }
  return best;
}

// One plain sentence for the live hint. Rule-based diagnosis first, best single step as the fallback.
export function coachHint(design) {
  if (!design.type) return 'Pick a card type to begin.';
  const errors = validate(design);
  if (errors.length) return errors[0].text;
  const r = rate(design);
  if (r.parts === null) return 'Add an effect to see how strong the card is.';
  if (r.cap) return 'This could loop forever. Limit it to once per turn or take off the free energy.';
  if (r.parts.focus <= 15 && r.reasons.focus.includes('no clear lead')) return 'Two big effects fight for attention. Pick one to lead.';
  const step = bestSingleStep(design);
  if (step) return `Try this: ${step.label.charAt(0).toLowerCase()}${step.label.slice(1)}.`;
  return 'Nothing left to fix. Pick a fair cost and forge it.';
}
