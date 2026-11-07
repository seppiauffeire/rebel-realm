import { EFFECTS, TRIGGERS, TYPES, INSTANT_FIT, RATING, GRADES, CLASSICS, PAIRS_RAW, EPS, MAXES, KEYWORDS } from './balance.js';
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
  (design.keywords || []).forEach((k) => ctx.push(k));
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

// How far the player's chosen cost is from the fair one. Under-pricing is punished harder than over-pricing:
// a strong card that is cheap and has no downside is the thing this game is about catching.
// Only the exact cost earns the maximum; every miss still scores, so a near miss feels like one.
const UNDER = [20, 11, 6, 3, 1];
const OVER = [20, 15, 10, 6, 3, 1];
export function budgetScore(chosen, fair) {
  const diff = chosen - fair;
  return diff >= 0 ? OVER[Math.min(diff, OVER.length - 1)] : UNDER[Math.min(-diff, UNDER.length - 1)];
}

function budgetReason(chosen, fair, eff) {
  const diff = chosen - fair;
  if (diff === 0) return `Cost ${fair} is exactly right for this power.`;
  if (diff < 0) return `You paid ${chosen}, but this card is worth ${fair}. Too cheap for what it does.`;
  return `You paid ${chosen}, but this card is only worth ${fair}. You overpaid.`;
}

// Depth: does the card ask the player to make real decisions? (Not the same as Focus, which is about simplicity,
// or Synergy, which is about parts fitting together.)
const SCALING = ['perEnemyCard', 'perCardPlayed', 'blockPerCard'];
const PLANNING = ['keepCards', 'peek', 'recycle', 'tutor', 'copyLast', 'extraDrawNext', 'extraEnergyNext'];
function depthDetail(design) {
  let pts = 4;
  const why = [];
  const add = (n, text) => { pts += n; why.push(text); };
  const ids = design.effects.map((e) => e.id);
  const kws = design.keywords || [];
  if (ids.some((i) => SCALING.includes(i))) add(5, 'it scales with the board');
  if (ids.some((i) => EFFECTS[i].future || PLANNING.includes(i)) && design.type !== 'permanent') add(4, 'it is a plan for later');
  if (design.type === 'instant') add(4, 'you choose when to play it');
  if (design.type === 'permanent' && design.permanent && design.permanent.trigger && TRIGGERS[design.permanent.trigger].conditional) add(5, 'it reacts to the game');
  if (kws.includes('chainBonus') || kws.includes('opener')) add(4, 'its timing matters');
  if (kws.includes('keepInHand')) add(3, 'you decide when to cash it in');
  if (kws.includes('singleUse')) add(3, 'you only get to use it once');
  if (design.price) add(3, 'you decide if the price is worth it');
  return { depth: Math.min(MAXES.depth, pts), why };
}

// rate(design) works on any card. `valid` is false when Forge must be blocked.
// design.cost is the cost the PLAYER picked; out.cost is the fair cost. Until a cost is picked, the fair one stands in.
export function rate(design) {
  const errors = validate(design);
  const pw = computeNet(design);
  const cost = costFor(pw.net);
  const out = { valid: errors.length === 0, errors, power: pw, cost, chosen: null, efficiency: null, parts: null, max: MAXES, total: 0, grade: null, cap: null, reasons: [] };
  if (!design.type || cost === null || design.effects.length === 0) return out;
  const chosen = Number.isInteger(design.cost) ? design.cost : cost;
  out.chosen = chosen;
  out.efficiency = pw.net / (2.5 + 5 * chosen);

  const reasons = {};
  // 1. Budget fit: did the player pay the fair price?
  const budget = budgetScore(chosen, cost);
  reasons.budget = budgetReason(chosen, cost);

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

  // 4. Depth
  const dd = depthDetail(design);
  const depth = dd.depth;
  reasons.depth = dd.why.length ? `Makes you think: ${dd.why.slice(0, 3).join(', ')}.` : 'No real decision. It plays itself.';

  // 5. Originality
  const od = originalityDistance(design);
  const originality = 20 * clamp(od.d / 0.6, 0, 1);
  reasons.originality = od.d <= EPS ? `Identical to the classic ${od.nearest.name}.` : od.d >= 0.6 - EPS ? 'Nothing like the classics.' : `Close to the classic ${od.nearest.name}.`;

  const parts = { budget, focus, synergy, depth, originality };
  const raw = budget + focus + synergy + depth + originality;
  let total = Math.round(raw);
  let cap = null;
  if (loopRisk(design, chosen)) {
    cap = RATING.loopCap;
    if (total > cap) total = cap;
    reasons.cap = 'This could loop forever, so the grade is capped at C-.';
  }
  return { ...out, parts, raw, total, grade: gradeFor(total), cap, reasons, words };
}
