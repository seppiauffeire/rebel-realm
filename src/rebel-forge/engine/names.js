import { EFFECTS } from './balance.js';
import { seededRng, xmur3 } from './rng.js';
import { NAME_MAX } from './codec.js';

// Closed word lists, so no moderation is needed for suggested names.
const ADJ = {
  attack: ['Savage', 'Swift', 'Ember', 'Iron', 'Cruel', 'Rapid', 'Rebel', 'Wicked'],
  defend: ['Stalwart', 'Granite', 'Steady', 'Patient', 'Stout', 'Quiet', 'Sturdy', 'Loyal'],
  setup: ['Careful', 'Clever', 'Silent', 'Patient', 'Early', 'Sly', 'Wary', 'Calm'],
  instant: ['Sudden', 'Flash', 'Quick', 'Snap', 'Sharp', 'Late', 'Spark', 'Brisk'],
  permanent: ['Lasting', 'Ancient', 'Endless', 'Rooted', 'Eternal', 'Standing', 'Old', 'Deep'],
};
const NOUN = {
  damage: ['Edge', 'Fang', 'Strike', 'Barrage', 'Gambit', 'Reckoning'],
  defense: ['Bulwark', 'Ward', 'Aegis', 'Wall', 'Shelter', 'Guard'],
  cards: ['Insight', 'Cache', 'Deal', 'Reserve', 'Shuffle', 'Archive'],
  setup: ['Prelude', 'Plan', 'Primer', 'Ritual', 'Scheme', 'Groundwork'],
  disrupt: ['Snare', 'Hex', 'Hush', 'Jam', 'Trap', 'Static'],
};

export function suggestName(design) {
  const key = JSON.stringify([design.type, design.effects, design.keywords, design.price, design.permanent]);
  const rnd = seededRng(xmur3(key)());
  const prim = design.effects[0] ? EFFECTS[design.effects[0].id].family : 'damage';
  const adj = ADJ[design.type] || ADJ.attack;
  const noun = NOUN[prim] || NOUN.damage;
  const name = `${adj[Math.floor(rnd() * adj.length)]} ${noun[Math.floor(rnd() * noun.length)]}`;
  return name.slice(0, NAME_MAX);
}
