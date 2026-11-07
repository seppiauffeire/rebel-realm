import { EFFECTS, TRIGGERS, TYPES, INSTANT_FIT, RATING, GRADES, CLASSICS, PAIRS_RAW, EPS, ceiling } from './balance.js';
import { computeNet, costFor, efficiencyFor, effectPP, effectiveRate } from './power.js';
import { validate } from './validate.js';
import { wordCount } from './text.js';

export const PAIRS = new Map(PAIRS_RAW.map(([a, b, v]) => [[a, b].sort().join('|'), v]));
const pairScore = (a, b) => PAIRS.get([a, b].sort().join('|')) || 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function gradeFor(total) {
  for (const [min, g] of GRADES) if (total >= min) return g;
  return 'F-';
}

export function tokensOf(design) {
  const t = new Set([design.type]);
  if (design.type === 'permanent' && design.permanent && design.permanent.trigger) t.add(design.permanent.trigger);
  design.effects.forEach((e) => t.add(e.id));
  (design.keywords || []).forEach((k) => t.add(k));
  if (design.price) t.add(design.price.id);
  return t;
}

export function originalityDistance(design) {
  const mine = tokensOf(design);
  let best = 1;
  let nearest = null;
  for (const c of CLASSICS) {
    const theirs = new Set([c.type, ...c.tokens]);
    let inter = 0;
    for (const x of mine) if (theirs.has(x)) inter++;
    const union = mine.size + theirs.size - inter;
    const d = 1 - inter / union;
    if (d < best || nearest === null) { best = d; nearest = c; }
  }
  return { d: best, nearest };
}

function primaryEffect(design) {
  let best = null;
  for (const e of design.effects) if (!best || effectPP(e) > effectPP(best) + EPS) best = e;
  return best;
}

function pairDetail(design) {
  const ids = design.effects.map((e) => e.id);
  const ctx = [...ids];
  if (design.type === 'permanent' && design.permanent && design.permanent.trigger) ctx.push(design.permanent.trigger);
  if (design.price) ctx.push(design.price.id);
  let sum = 0;
  let trigEffectPositive = false;
  const hits = [];
  for (let i = 0; i < ctx.length; i++) {
    for (let j = i + 1; j < ctx.length; j++) {
      const v = pairScore(ctx[i], ctx[j]);
      if (v) {
        sum += v;
        hits.push({ a: ctx[i], b: ctx[j], v });
        const trig = design.permanent && design.permanent.trigger;
        if (trig && (ctx[i] === trig || ctx[j] === trig) && v > 0) trigEffectPositive = true;
      }
    }
  }
  return { sum, hits, trigEffectPositive };
}

export function loopRisk(design, cost) {
  if (design.type === 'permanent') {
    return design.effects.some((e) => e.id === 'energy') && design.permanent && effectiveRate(design) > 1.0 + EPS;
  }
  const kws = design.keywords || [];
  if (kws.includes('singleUse')) return false;
  const en = design.effects.find((e) => e.id === 'energy');
  if (!en) return false;
  const gained = en.amount * (kws.includes('playTwice') ? 2 : 1);
  const hasCards = design.effects.some((e) => ['draw', 'cycle', 'recycle'].includes(e.id));
  return hasCards && cost !== null && gained >= cost;
}

// rate(design) works on any card. `valid` is false when Forge must be blocked.
export function rate(design) {
  const errors = validate(design);
  const pw = computeNet(design);
  const cost = costFor(pw.net);
  const out = { valid: errors.length === 0, errors, power: pw, cost, efficiency: null, parts: null, total: 0, grade: null, cap: null, reasons: [] };
  if (!design.type || cost === null || design.effects.length === 0) return out;
  const eff = efficiencyFor(pw.net, cost);
  out.efficiency = eff;

  const reasons = {};
  // 1. Budget fit
  const budget = 20 * clamp((eff - RATING.budgetFloor) / RATING.budgetSpan, 0, 1);
  reasons.budget = eff >= 0.95 - EPS ? `Uses ${Math.round(eff * 100)}% of cost ${cost}. Full marks.` : `Uses ${Math.round(eff * 100)}% of cost ${cost}. Fill more of the tier.`;

  // 2. Focus
  let focus = 20;
  const fr = [];
  const totalPP = design.effects.reduce((s, e) => s + effectPP(e), 0) || 1;
  const prim = primaryEffect(design);
  const share = prim ? effectPP(prim) / totalPP : 1;
  const families = new Set(design.effects.map((e) => EFFECTS[e.id].family));
  if (design.effects.length === 3) { focus -= 4; fr.push('three effects'); }
  if (design.effects.length >= 2 && share < 0.5 - EPS) { focus -= 5; fr.push('no clear lead effect'); }
  if (families.size >= 3) { focus -= 4; fr.push('three different families'); }
  const words = wordCount(design);
  const threshold = design.type === 'permanent' ? RATING.textThresholdPermanent : RATING.textThreshold;
  if (words > threshold) { focus -= Math.min(12, words - threshold); fr.push('card text is long'); }
  focus = Math.max(0, focus);
  reasons.focus = fr.length ? `Loses points for ${fr.join(', ')}.` : 'One clear idea.';

  // 3. Synergy
  const pd = pairDetail(design);
  let typeFit = 0;
  switch (design.type) {
    case 'attack': typeFit = prim && EFFECTS[prim.id].family === 'damage' ? 4 : -2; break;
    case 'defend': typeFit = prim && EFFECTS[prim.id].family === 'defense' ? 4 : -2; break;
    case 'setup': {
      const futurePP = design.effects.filter((e) => EFFECTS[e.id].future).reduce((s, e) => s + effectPP(e), 0);
      typeFit = futurePP / totalPP >= 0.5 - EPS ? 4 : 0;
      break;
    }
    case 'instant': typeFit = prim && INSTANT_FIT.includes(prim.id) ? 4 : 0; break;
    case 'permanent': typeFit = pd.trigEffectPositive ? 4 : 0; break;
  }
  const synergy = clamp(6 + typeFit + clamp(pd.sum, -8, 10), 0, 20);
  reasons.synergy = pd.hits.length
    ? (pd.sum >= 0 ? 'Parts work together.' : 'Some parts fight each other.')
    : (typeFit > 0 ? 'Fits the card type, but the parts do not combine.' : 'Parts do not combine yet.');

  // 4. Tension
  const conditional = design.type === 'permanent' && design.permanent && design.permanent.trigger && TRIGGERS[design.permanent.trigger].conditional;
  const conditionCut = conditional ? RATING.conditionCut * pw.gross : 0;
  const t = pw.gross > 0 ? (pw.keywordCut + pw.pricePP + conditionCut) / pw.gross : 0;
  let tension;
  if (t <= EPS) tension = 8;
  else if (t < 0.15 - EPS) tension = 12;
  else if (t <= 0.40 + EPS) tension = 20;
  else if (t <= 0.55 + EPS) tension = 14;
  else tension = 6;
  reasons.tension = t <= EPS ? 'No tradeoff at all. Give something up.' : t < 0.15 - EPS ? 'A small tradeoff. A bit more would be interesting.' : t <= 0.40 + EPS ? 'A real tradeoff. This is the sweet spot.' : 'The tradeoff eats too much of the card.';

  // 5. Originality
  const od = originalityDistance(design);
  const originality = 20 * clamp(od.d / 0.6, 0, 1);
  reasons.originality = od.d <= EPS ? `Identical to the classic ${od.nearest.name}.` : od.d >= 0.6 - EPS ? 'Nothing like the classics.' : `Close to the classic ${od.nearest.name}.`;

  const parts = { budget, focus, synergy, tension, originality };
  const raw = budget + focus + synergy + tension + originality;
  let total = Math.round(raw);
  let cap = null;
  if (loopRisk(design, cost)) {
    cap = RATING.loopCap;
    if (total > cap) total = cap;
    reasons.cap = 'This could loop forever, so the grade is capped at C-.';
  }
  return { ...out, parts, raw, total, grade: gradeFor(total), cap, reasons, words, tValue: t };
}


