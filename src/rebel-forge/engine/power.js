import { EFFECTS, KEYWORDS, PRICES, TRIGGERS, LIFESPANS, TYPES, EPS, ceiling, MAX_NET } from './balance.js';

export function effectPP(e) {
  const d = EFFECTS[e.id];
  return d.flat ? d.pp : d.pp * e.amount;
}

export function effectiveRate(design) {
  const p = design.permanent;
  const rate = TRIGGERS[p.trigger].rate;
  return p.oncePerTurn ? Math.min(rate, 1.0) : rate;
}

export function lifeTurns(design) {
  const l = LIFESPANS[design.permanent.lifespan];
  if (l.special === 'uses3') return Math.min(3, effectiveRate(design) * 4);
  return l.turns;
}

export function computeNet(design) {
  const kw = new Set(design.keywords || []);
  const perTrigger = design.effects.reduce((sum, e) => sum + effectPP(e), 0);
  let base;
  if (design.type === 'permanent' && design.permanent) {
    base = perTrigger * effectiveRate(design) * lifeTurns(design);
  } else {
    base = perTrigger * TYPES[design.type].mult;
  }
  const playMult = (kw.has('playTwice') ? KEYWORDS.playTwice.playMult : 1) * (kw.has('chainBonus') ? KEYWORDS.chainBonus.playMult : 1);
  const gross = base * playMult;
  const keywordCut = gross * (1 - (kw.has('singleUse') ? KEYWORDS.singleUse.grossMult : 1) * (kw.has('useItOrLoseIt') ? KEYWORDS.useItOrLoseIt.grossMult : 1));
  const pricePP = design.price ? Math.abs(PRICES[design.price.id].credit * design.price.amount) : 0;
  const flats = (kw.has('keepInHand') ? KEYWORDS.keepInHand.flat : 0) + (kw.has('startsInHand') ? KEYWORDS.startsInHand.flat : 0);
  const net = gross - keywordCut - pricePP + flats;
  return { perTrigger, base, gross, keywordCut, pricePP, flats, net };
}

// Smallest cost whose ceiling covers the net power, or null when over budget.
export function costFor(net) {
  if (net > MAX_NET + EPS) return null;
  for (let c = 0; c <= 5; c++) if (net <= ceiling(c) + EPS) return c;
  return null;
}

export const efficiencyFor = (net, cost) => net / ceiling(cost);
