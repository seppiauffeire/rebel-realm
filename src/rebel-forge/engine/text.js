import { EFFECTS, KEYWORDS, KEYWORD_ORDER, PRICES, TRIGGERS, LIFESPANS } from './balance.js';

export const effectText = (e) => EFFECTS[e.id].text(e.amount);

// Plain language lines for the card face. Effects are the only part counted toward "too long".
export function renderCardText(design) {
  const effects = design.effects.map(effectText);
  const keywords = KEYWORD_ORDER.filter((k) => (design.keywords || []).includes(k)).map((k) => KEYWORDS[k].text);
  const price = design.price ? PRICES[design.price.id].text(design.price.amount) : null;
  const out = { effects, keywords, price };
  if (design.type === 'permanent' && design.permanent) {
    const p = design.permanent;
    out.when = p.trigger ? TRIGGERS[p.trigger].text : null;
    out.life = p.lifespan ? LIFESPANS[p.lifespan].text : null;
    out.once = p.oncePerTurn ? 'Once per turn.' : null;
    out.price = price ? `On play: ${price}` : null;
  }
  return out;
}

export function wordCount(design) {
  const t = renderCardText(design);
  const parts = [...t.effects];
  if (t.when) parts.unshift(t.when);
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function oneLine(design) {
  const t = renderCardText(design);
  const bits = [];
  if (t.when) bits.push(t.when + ':');
  bits.push(t.effects.join('. '));
  if (t.life) bits.push(t.life);
  return bits.join(' ');
}
