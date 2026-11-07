import { EFFECTS, KEYWORDS, PRICES, TRIGGERS, LIFESPANS, TYPES, FLAGS, MAX_KEYWORDS, PERMANENT_KEYWORDS, MAX_NET, EPS } from './balance.js';
import { computeNet } from './power.js';

export function effectAllowed(type, id) {
  const d = EFFECTS[id];
  if (!d) return false;
  if (d.future && type !== 'setup' && type !== 'permanent') return false;
  if (d.instantOnly && type !== 'instant') return false;
  return true;
}

export function keywordAllowed(type, id, current = []) {
  if (!KEYWORDS[id]) return { ok: false, why: 'Unknown rule.' };
  if (type === 'permanent' && !PERMANENT_KEYWORDS.includes(id)) return { ok: false, why: 'Permanent cards can only use Starts in Hand and Keep in Hand.' };
  const clash = (KEYWORDS[id].conflicts || []).find((c) => current.includes(c));
  if (clash) return { ok: false, why: `${KEYWORDS[id].name} does not work with ${KEYWORDS[clash].name}.` };
  if (!current.includes(id) && current.length >= MAX_KEYWORDS) return { ok: false, why: `A card can have ${MAX_KEYWORDS} rules at most.` };
  return { ok: true };
}

export function selfFeeds(design) {
  if (design.type !== 'permanent' || !design.permanent || !design.permanent.trigger) return false;
  const feed = TRIGGERS[design.permanent.trigger].selfFeed;
  return design.effects.some((e) => feed.includes(e.id));
}

// Returns a list of { code, text }. Empty means the card can be forged.
export function validate(design) {
  const errors = [];
  const add = (code, text) => errors.push({ code, text });
  const type = design.type;
  if (!type || !TYPES[type]) return [{ code: 'type', text: 'Pick a card type.' }];
  if (type === 'permanent' && !FLAGS.permanent) add('flag', 'Permanent cards are not available yet.');
  const t = TYPES[type];

  if (design.effects.length < 1) add('effects', 'Add at least one effect.');
  if (design.effects.length > t.maxEffects) add('maxEffects', `${t.label} cards can have ${t.maxEffects} effects at most.`);
  const seen = new Set();
  for (const e of design.effects) {
    const d = EFFECTS[e.id];
    if (!d) { add('effect', 'Unknown effect.'); continue; }
    if (seen.has(e.id)) add('dupe', 'Each effect can only be used once.');
    seen.add(e.id);
    if (!effectAllowed(type, e.id)) {
      add('scope', d.future ? 'Set Up effects only work on Set Up and Permanent cards.' : 'Cancel only works on Instant cards.');
    }
    if (!Number.isInteger(e.amount) || e.amount < d.min || e.amount > d.max || (e.amount - d.min) % d.step !== 0) add('amount', `${d.short} needs a number from ${d.min} to ${d.max}.`);
  }
  if (t.requires && !design.effects.some((e) => EFFECTS[e.id] && EFFECTS[e.id].family === t.requires)) {
    const fam = { damage: 'Damage', defense: 'Defense', setup: 'Set Up' }[t.requires];
    add('requires', `${t.label} cards need at least one ${fam} effect.`);
  }

  const kws = design.keywords || [];
  if (kws.length > MAX_KEYWORDS) add('maxKeywords', `A card can have ${MAX_KEYWORDS} rules at most.`);
  kws.forEach((k, i) => {
    const r = keywordAllowed(type, k, kws.filter((_, j) => j !== i));
    if (!r.ok && !r.why.includes('at most')) add('keyword', r.why);
  });

  if (design.price) {
    const p = PRICES[design.price.id];
    if (!p || !Number.isInteger(design.price.amount) || design.price.amount < p.min || design.price.amount > p.max) add('price', 'That price is out of range.');
  }

  if (type === 'permanent') {
    const p = design.permanent;
    if (!p || !p.trigger || !TRIGGERS[p.trigger]) add('trigger', 'Pick when it triggers.');
    if (!p || !p.lifespan || !LIFESPANS[p.lifespan]) add('lifespan', 'Pick how long it lasts.');
    if (p && p.trigger && selfFeeds(design) && !p.oncePerTurn) add('selfFeed', 'This could loop forever. Limit it to once per turn.');
  }

  if (errors.length === 0 && computeNet(design).net > MAX_NET + EPS) add('budget', 'Over budget. Trim a number or add a price.');
  return errors;
}
