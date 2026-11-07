import { EFFECTS, KEYWORDS, PRICES, TRIGGERS, LIFESPANS, TYPES } from './balance.js';
import { validate } from './validate.js';

// v3~type~effects~keywords~price~perm~cost~name
export const NAME_MAX = 24;

export function cleanName(raw) {
  return String(raw || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} '.,!?&+\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

export function encode(design) {
  const effects = design.effects.map((e) => `${e.id}:${e.amount}`).join(',');
  const keywords = (design.keywords || []).join(',');
  const price = design.price ? `${design.price.id}:${design.price.amount}` : '';
  const p = design.permanent;
  const perm = design.type === 'permanent' && p ? `${p.trigger},${p.lifespan},${p.oncePerTurn ? 1 : 0}` : '';
  return ['v3', design.type, effects, keywords, price, perm, Number.isInteger(design.cost) ? design.cost : '', encodeURIComponent(cleanName(design.name))].join('~');
}

// Returns a CardDesign or null. Never trusts the input: the result must pass validate().
export function decode(code) {
  try {
    if (typeof code !== 'string' || code.length > 400) return null;
    const parts = code.split('~');
    if (parts.length !== 8 || parts[0] !== 'v3') return null;
    const [, type, effectsStr, kwStr, priceStr, permStr, costStr, nameStr] = parts;
    const cost = Number(costStr);
    if (costStr === '' || !Number.isInteger(cost) || cost < 0 || cost > 5) return null;
    if (!TYPES[type]) return null;
    const effects = [];
    if (effectsStr) {
      for (const chunk of effectsStr.split(',')) {
        const [id, amt] = chunk.split(':');
        const amount = Number(amt);
        if (!EFFECTS[id] || !Number.isInteger(amount)) return null;
        effects.push({ id, amount });
      }
    }
    const keywords = kwStr ? kwStr.split(',') : [];
    if (keywords.some((k) => !KEYWORDS[k])) return null;
    let price = null;
    if (priceStr) {
      const [id, amt] = priceStr.split(':');
      const amount = Number(amt);
      if (!PRICES[id] || !Number.isInteger(amount)) return null;
      price = { id, amount };
    }
    const design = { type, effects, keywords, price, cost, name: cleanName(decodeURIComponent(nameStr)) };
    if (type === 'permanent') {
      const [trigger, lifespan, once] = (permStr || '').split(',');
      if (!TRIGGERS[trigger] || !LIFESPANS[lifespan] || (once !== '0' && once !== '1')) return null;
      design.permanent = { trigger, lifespan, oncePerTurn: once === '1' };
    } else if (permStr) {
      return null;
    }
    return validate(design).length === 0 ? design : null;
  } catch {
    return null;
  }
}
