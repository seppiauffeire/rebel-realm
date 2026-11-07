// Every number in the game lives here so it can be tuned from the sim.
export const FLAGS = { permanent: true };
export const EPS = 1e-9;
export const MAX_NET = 27.5;
export const ceiling = (c) => 2.5 + 5 * c;

export const FAMILY_ORDER = ['damage', 'defense', 'cards', 'setup', 'disrupt'];
export const FAMILIES = {
  damage: { label: 'Damage' },
  defense: { label: 'Defense' },
  cards: { label: 'Cards & Energy' },
  setup: { label: 'Set Up' },
  disrupt: { label: 'Disrupt' },
};

const s = (n, one, many) => (n === 1 ? one : many);

// pp: power points per unit (or flat value when flat: true)
export const EFFECTS = {
  // Damage
  damage: { family: 'damage', pp: 1.0, min: 1, max: 30, step: 1, def: 6, short: 'Damage', text: (n) => `Deal ${n} damage` },
  damageAll: { family: 'damage', pp: 1.6, min: 1, max: 20, step: 1, def: 4, short: 'Damage all', text: (n) => `Deal ${n} damage to all enemies` },
  poison: { family: 'damage', pp: 1.5, min: 1, max: 10, step: 1, def: 3, short: 'Poison', text: (n) => `Apply ${n} Poison` },
  perEnemyCard: { family: 'damage', pp: 3.5, min: 1, max: 4, step: 1, def: 1, short: 'Per enemy card', text: (n) => `Deal ${n} damage for each card in the enemy's hand` },
  perCardPlayed: { family: 'damage', pp: 1.5, min: 1, max: 6, step: 1, def: 2, short: 'Per card played', text: (n) => `Deal ${n} damage for each card you played this turn` },
  // Defense
  block: { family: 'defense', pp: 1.2, min: 1, max: 30, step: 1, def: 5, short: 'Block', text: (n) => `Gain ${n} Block` },
  doubleBlock: { family: 'defense', pp: 0.9, min: 5, max: 30, step: 5, def: 10, short: 'Double Block', text: (n) => `Double your Block (up to ${n})` },
  thorns: { family: 'defense', pp: 1.5, min: 1, max: 8, step: 1, def: 2, short: 'Thorns', text: (n) => `Deal ${n} damage to attackers while you have Block` },
  heal: { family: 'defense', pp: 1.5, min: 1, max: 15, step: 1, def: 4, short: 'Heal', text: (n) => `Heal ${n}` },
  blockPerCard: { family: 'defense', pp: 3.6, min: 1, max: 5, step: 1, def: 1, short: 'Block per card', text: (n) => `Gain ${n} Block for each card in your hand` },
  // Cards and Energy
  draw: { family: 'cards', pp: 3.0, min: 1, max: 4, step: 1, def: 1, short: 'Draw', text: (n) => `Draw ${n} ${s(n, 'card', 'cards')}` },
  peek: { family: 'cards', pp: 1.0, min: 1, max: 5, step: 1, def: 2, short: 'Peek', text: (n) => `Look at the top ${n} ${s(n, 'card', 'cards')} of your deck` },
  cycle: { family: 'cards', pp: 1.5, min: 1, max: 3, step: 1, def: 1, short: 'Cycle', text: (n) => `Discard ${n} ${s(n, 'card', 'cards')}, then draw that many` },
  recycle: { family: 'cards', pp: 3.5, min: 1, max: 2, step: 1, def: 1, short: 'Recycle', text: (n) => `Put ${n} ${s(n, 'card', 'cards')} from your discard pile on top of your deck` },
  enemyDiscard: { family: 'cards', pp: 3.0, min: 1, max: 3, step: 1, def: 1, short: 'Enemy discards', text: (n) => `Enemy discards ${n} ${s(n, 'card', 'cards')}` },
  energy: { family: 'cards', pp: 6.0, min: 1, max: 3, step: 1, def: 1, short: 'Energy', text: (n) => `Gain ${n} energy` },
  // Set Up (future scope, Set Up and Permanent only)
  nextCostLess: { family: 'setup', future: true, pp: 3.5, min: 1, max: 3, step: 1, def: 2, short: 'Next costs less', text: (n) => `Your next card costs ${n} less` },
  handCostLess: { family: 'setup', future: true, pp: 7.0, min: 1, max: 2, step: 1, def: 1, short: 'Hand costs less', text: (n) => `Cards in your hand cost ${n} less this turn` },
  nextAttackBonus: { family: 'setup', future: true, pp: 0.9, min: 2, max: 20, step: 1, def: 6, short: 'Next Attack bonus', text: (n) => `Your next Attack deals ${n} extra damage` },
  nextAttackDouble: { family: 'setup', future: true, flat: true, pp: 5.0, min: 1, max: 1, step: 1, def: 1, short: 'Next Attack x2', text: () => 'Your next Attack deals double damage' },
  nextDefendDouble: { family: 'setup', future: true, flat: true, pp: 4.5, min: 1, max: 1, step: 1, def: 1, short: 'Next Defend x2', text: () => 'Your next Defend gives double Block' },
  nextCardTwice: { family: 'setup', future: true, flat: true, pp: 6.0, min: 1, max: 1, step: 1, def: 1, short: 'Next card twice', text: () => 'Your next card is played twice' },
  extraDrawNext: { family: 'setup', future: true, pp: 2.5, min: 1, max: 3, step: 1, def: 1, short: 'Extra draw next turn', text: (n) => `Draw ${n} extra ${s(n, 'card', 'cards')} next turn` },
  extraEnergyNext: { family: 'setup', future: true, pp: 5.0, min: 1, max: 2, step: 1, def: 1, short: 'Extra energy next turn', text: (n) => `Gain ${n} extra energy next turn` },
  attackBoostFight: { family: 'setup', future: true, pp: 3.0, min: 1, max: 3, step: 1, def: 1, short: 'Attack boost', text: (n) => `All your Attacks deal ${n} extra damage this fight` },
  defendBoostFight: { family: 'setup', future: true, pp: 3.0, min: 1, max: 3, step: 1, def: 1, short: 'Defend boost', text: (n) => `All your Defends give ${n} extra Block this fight` },
  keepCards: { family: 'setup', future: true, pp: 1.5, min: 1, max: 3, step: 1, def: 1, short: 'Keep cards', text: (n) => `Keep ${n} ${s(n, 'card', 'cards')} in hand at end of turn` },
  // Disrupt
  stun: { family: 'disrupt', pp: 6.0, min: 1, max: 2, step: 1, def: 1, short: 'Stun', text: (n) => (n === 1 ? 'Enemy skips its next turn' : `Enemy skips its next ${n} turns`) },
  expose: { family: 'disrupt', pp: 2.5, min: 1, max: 3, step: 1, def: 1, short: 'Expose', text: (n) => `Enemy takes 50% more damage for ${n} ${s(n, 'turn', 'turns')}` },
  weaken: { family: 'disrupt', pp: 2.5, min: 1, max: 3, step: 1, def: 1, short: 'Weaken', text: (n) => `Enemy deals 25% less damage for ${n} ${s(n, 'turn', 'turns')}` },
  cancel: { family: 'disrupt', instantOnly: true, flat: true, pp: 8.0, min: 1, max: 1, step: 1, def: 1, short: 'Cancel', text: () => "Cancel the enemy's next card" },
  // Added in v3: more parts so combos matter
  burn: { family: 'damage', pp: 1.4, min: 1, max: 10, step: 1, def: 3, short: 'Burn', text: (n) => `Apply ${n} Burn` },
  pierce: { family: 'damage', pp: 1.2, min: 1, max: 25, step: 1, def: 5, short: 'Pierce', text: (n) => `Deal ${n} damage that ignores Block` },
  execute: { family: 'damage', pp: 1.15, min: 1, max: 15, step: 1, def: 4, short: 'Execute', text: (n) => `Deal ${n} damage, doubled if the enemy has 10 or less HP` },
  armor: { family: 'defense', pp: 3.2, min: 1, max: 4, step: 1, def: 1, short: 'Armor', text: (n) => `Gain ${n} Armor: take ${n} less damage from every hit` },
  regen: { family: 'defense', pp: 3.8, min: 1, max: 4, step: 1, def: 1, short: 'Regen', text: (n) => `Heal ${n} at the start of each of your next 3 turns` },
  tutor: { family: 'cards', flat: true, pp: 4.5, min: 1, max: 1, step: 1, def: 1, short: 'Tutor', text: () => 'Search your deck for any card and add it to your hand' },
  copyLast: { family: 'cards', flat: true, pp: 5.5, min: 1, max: 1, step: 1, def: 1, short: 'Copy last card', text: () => 'Add a copy of the last card you played to your hand' },
  nextFree: { family: 'setup', future: true, flat: true, pp: 7.5, min: 1, max: 1, step: 1, def: 1, short: 'Next card free', text: () => 'Your next card costs 0' },
  silence: { family: 'disrupt', flat: true, pp: 3.5, min: 1, max: 1, step: 1, def: 1, short: 'Silence', text: () => 'Enemy cannot play Instant cards next turn' },
  junkEnemy: { family: 'disrupt', pp: 2.0, min: 1, max: 3, step: 1, def: 1, short: 'Junk the enemy', text: (n) => `Add ${n} Junk ${s(n, 'card', 'cards')} to the enemy deck` },
};

export const KEYWORDS = {
  singleUse: { name: 'Single Use', text: 'Removed from your deck after you play it.', grossMult: 0.7 },
  keepInHand: { name: 'Keep in Hand', text: 'Stays in your hand at end of turn.', flat: 0.8, conflicts: ['useItOrLoseIt'] },
  startsInHand: { name: 'Starts in Hand', text: 'Always in your opening hand.', flat: 0.5 },
  useItOrLoseIt: { name: 'Use It or Lose It', text: 'Removed if still in hand at end of turn.', grossMult: 0.9, conflicts: ['keepInHand'] },
  playTwice: { name: 'Play Twice', text: 'Its effects happen two times.', playMult: 1.8 },
  chainBonus: { name: 'Bonus After Another Card', text: 'Stronger if you already played a card this turn.', playMult: 1.2, conflicts: ['opener'] },
  opener: { name: 'Opener', text: 'Stronger if it is the first card you play this turn.', playMult: 1.2, conflicts: ['chainBonus'] },
  overload: { name: 'Overload', text: 'Next turn you start with 1 less energy.', grossMult: 0.75 },
};
export const KEYWORD_ORDER = ['singleUse', 'keepInHand', 'startsInHand', 'useItOrLoseIt', 'playTwice', 'chainBonus', 'opener', 'overload'];
export const PERMANENT_KEYWORDS = ['startsInHand', 'keepInHand'];
export const MAX_KEYWORDS = 2;

export const PRICES = {
  loseHP: { name: 'Lose HP', credit: 0.9, min: 1, max: 6, text: (n) => `Lose ${n} HP when you play this.`, short: (n) => `Lose ${n} HP` },
  discardCards: { name: 'Discard Cards', credit: 1.5, min: 1, max: 3, text: (n) => `Discard ${n} ${s(n, 'card', 'cards')} when you play this.`, short: (n) => `Discard ${n} ${s(n, 'card', 'cards')}` },
  addJunk: { name: 'Add Junk Cards', credit: 2.0, min: 1, max: 2, text: (n) => `Add ${n} Junk ${s(n, 'card', 'cards')} to your deck.`, short: (n) => `Add ${n} Junk ${s(n, 'card', 'cards')}` },
  skipDraw: { name: 'Draw Less Next Turn', credit: 1.5, min: 1, max: 2, text: (n) => `You draw ${n} fewer ${s(n, 'card', 'cards')} next turn.`, short: (n) => `Draw ${n} fewer next turn` },
  enemyDraws: { name: 'Enemy Draws Cards', credit: 3.0, min: 1, max: 2, text: (n) => `The enemy draws ${n} ${s(n, 'card', 'cards')}.`, short: (n) => `Enemy draws ${n}` },
};
export const PRICE_ORDER = ['loseHP', 'discardCards', 'skipDraw', 'addJunk', 'enemyDraws'];

export const TRIGGERS = {
  startOfTurn: { text: 'At the start of your turn', rate: 1.0, conditional: false, selfFeed: [] },
  endOfTurn: { text: 'At the end of your turn', rate: 1.0, conditional: false, selfFeed: [] },
  playAttack: { text: 'Every time you play an Attack', rate: 1.2, conditional: true, selfFeed: [] },
  playDefend: { text: 'Every time you play a Defend', rate: 0.9, conditional: true, selfFeed: [] },
  playAnyCard: { text: 'Every time you play a card', rate: 2.8, conditional: false, selfFeed: ['energy', 'nextCostLess', 'handCostLess', 'nextCardTwice'] },
  drawCard: { text: 'Every time you draw a card', rate: 5.5, conditional: false, selfFeed: ['draw', 'cycle', 'recycle'] },
  youTakeDamage: { text: 'When you take damage', rate: 1.0, conditional: true, selfFeed: [] },
  enemyAttacks: { text: 'When the enemy attacks', rate: 1.0, conditional: true, selfFeed: [] },
  enemyPlaysCard: { text: 'When the enemy plays a card', rate: 2.0, conditional: true, selfFeed: [] },
  youGainBlock: { text: 'Every time you gain Block', rate: 1.2, conditional: true, selfFeed: ['block', 'doubleBlock', 'blockPerCard'] },
  youHeal: { text: 'Every time you heal', rate: 1.0, conditional: true, selfFeed: ['heal', 'regen'] },
  youPlayInstant: { text: 'Every time you play an Instant', rate: 0.7, conditional: true, selfFeed: [] },
  youDiscard: { text: 'Every time you discard a card', rate: 0.8, conditional: true, selfFeed: ['cycle'] },
};
export const TRIGGER_ORDER = Object.keys(TRIGGERS);

export const LIFESPANS = {
  turns2: { text: 'Lasts 2 turns', turns: 2 },
  turns3: { text: 'Lasts 3 turns', turns: 3 },
  turns5: { text: 'Lasts 5 turns', turns: 4.5 },
  fight: { text: 'Lasts the whole fight', turns: 5.5 },
  uses3: { text: 'Lasts 3 uses', special: 'uses3' },
};
export const LIFESPAN_ORDER = ['turns2', 'turns3', 'turns5', 'fight', 'uses3'];

export const TYPES = {
  attack: { label: 'Attack', promise: 'Hit the enemy.', mult: 1.0, maxEffects: 3, requires: 'damage', when: 'Your turn', def: () => [{ id: 'damage', amount: 6 }] },
  defend: { label: 'Defend', promise: 'Protect yourself.', mult: 1.0, maxEffects: 3, requires: 'defense', when: 'Your turn', def: () => [{ id: 'block', amount: 5 }] },
  setup: { label: 'Set Up', promise: 'Prepare for later.', mult: 1.0, maxEffects: 3, requires: 'setup', when: 'Your turn only', def: () => [{ id: 'nextCostLess', amount: 2 }] },
  instant: { label: 'Instant', promise: 'Play it any time.', mult: 1.15, maxEffects: 2, requires: null, when: 'Any time', def: () => [{ id: 'heal', amount: 4 }] },
  permanent: { label: 'Permanent', promise: 'Stays and keeps working.', mult: 1.0, maxEffects: 2, requires: null, when: 'Stays on the field', def: () => [{ id: 'draw', amount: 1 }] },
};
export const TYPE_ORDER = ['attack', 'defend', 'setup', 'instant', 'permanent'];

export const INSTANT_FIT = ['block', 'doubleBlock', 'thorns', 'heal', 'stun', 'weaken', 'cancel'];

// Rating knobs
export const MAXES = { budget: 20, focus: 20, synergy: 20, depth: 20, originality: 20 };
export const COST_NAMES = ['Free', 'Cheap', 'Light', 'Mid', 'Heavy', 'Huge'];
export const RATING = {
  budgetFloor: 0.5,
  budgetSpan: 0.45,
  textThreshold: 18,
  textThresholdPermanent: 22,
  loopCap: 59,
  conditionCut: 0.15,
};

export const GRADES = [
  [95, 'A+'], [90, 'A'], [85, 'A-'], [80, 'B+'], [75, 'B'], [70, 'B-'], [65, 'C+'], [60, 'C'], [55, 'C-'],
  [50, 'D+'], [45, 'D'], [40, 'D-'], [35, 'E+'], [30, 'E'], [25, 'E-'], [20, 'F+'], [10, 'F'], [0, 'F-'],
];

// Pair matrix: score for two ids that appear together (order does not matter).
export const PAIRS_RAW = [
  ['block', 'thorns', 5], ['youGainBlock', 'damage', 5], ['block', 'doubleBlock', 4], ['damage', 'expose', 4],
  ['expose', 'damageAll', 4], ['perEnemyCard', 'enemyDraws', 4], ['cycle', 'recycle', 4], ['thorns', 'loseHP', 4],
  ['draw', 'discardCards', 4], ['blockPerCard', 'draw', 4], ['nextCostLess', 'draw', 3], ['handCostLess', 'draw', 3],
  ['nextCostLess', 'perCardPlayed', 4], ['nextAttackDouble', 'expose', 4], ['youTakeDamage', 'damage', 4],
  ['enemyAttacks', 'block', 4], ['youDiscard', 'damage', 4], ['poison', 'weaken', 3], ['stun', 'damage', 3],
  ['nextAttackBonus', 'perCardPlayed', 3], ['doubleBlock', 'thorns', 3], ['playAttack', 'block', 3],
  ['playDefend', 'damage', 3], ['startOfTurn', 'draw', 3], ['endOfTurn', 'block', 3], ['keepCards', 'nextCardTwice', 3],
  ['extraDrawNext', 'keepCards', 4], ['damage', 'weaken', 2],  ['peek', 'cycle', 2],
  ['peek', 'recycle', 2], ['attackBoostFight', 'damage', 2], ['defendBoostFight', 'block', 2], ['playAnyCard', 'damage', 2],
  ['enemyPlaysCard', 'weaken', 2], ['enemyPlaysCard', 'cancel', 2], ['stun', 'expose', 2], ['nextAttackDouble', 'damage', 2],
  ['nextDefendDouble', 'block', 2], ['playAttack', 'nextAttackBonus', 2], ['youGainBlock', 'thorns', 2],
  ['startOfTurn', 'energy', 2], ['endOfTurn', 'heal', 2], ['poison', 'stun', 2], ['draw', 'cycle', -2],
  ['energy', 'cycle', -2], ['damage', 'damageAll', -3], ['addJunk', 'recycle', -3], ['perEnemyCard', 'enemyDiscard', -3],
  ['nextCardTwice', 'energy', -3], ['heal', 'loseHP', -4], ['energy', 'draw', -6],
  // v2 tuning from the sim: themed pairs so each type has several routes to a high Synergy score
  ['damage', 'loseHP', 2], ['poison', 'expose', 3], ['perCardPlayed', 'draw', 3], ['damageAll', 'poison', 2],
  ['block', 'weaken', 4], ['heal', 'weaken', 3], ['blockPerCard', 'keepCards', 3],
  ['cancel', 'draw', 3], ['stun', 'weaken', 3], ['stun', 'block', 3],
  ['nextAttackDouble', 'nextCostLess', 3], ['nextAttackBonus', 'nextAttackDouble', -3], ['extraEnergyNext', 'extraDrawNext', 4],
  ['extraEnergyNext', 'keepCards', 4], ['attackBoostFight', 'nextAttackBonus', 2], ['attackBoostFight', 'perCardPlayed', 3],
  ['defendBoostFight', 'nextDefendDouble', 2], ['defendBoostFight', 'blockPerCard', 3], ['nextCostLess', 'nextCardTwice', 3],
  ['handCostLess', 'perCardPlayed', 4], ['peek', 'draw', 3],
  ['doubleBlock', 'weaken', 2], ['heal', 'doubleBlock', 2], ['weaken', 'thorns', 2], ['stun', 'draw', 3], ['heal', 'draw', 2],
  ['block', 'draw', 3], ['blockPerCard', 'discardCards', 2], ['stun', 'loseHP', 2], ['weaken', 'loseHP', 2], ['cancel', 'loseHP', 2],
  ['keepCards', 'blockPerCard', 3], ['nextAttackDouble', 'perCardPlayed', 2], ['extraDrawNext', 'discardCards', 2],
  ['blockPerCard', 'weaken', 4], ['blockPerCard', 'heal', 2], ['handCostLess', 'nextAttackBonus', 3], ['nextCardTwice', 'nextAttackBonus', 3],
  ['nextDefendDouble', 'blockPerCard', 3], ['extraEnergyNext', 'handCostLess', -3], ['nextCostLess', 'handCostLess', -3],
  ['nextAttackBonus', 'nextCostLess', 4], ['nextAttackBonus', 'expose', 3], ['nextAttackBonus', 'damage', 2], ['keepCards', 'peek', 2],
  ['nextCardTwice', 'handCostLess', 2], ['extraDrawNext', 'peek', 3], ['extraDrawNext', 'nextCostLess', 4], ['attackBoostFight', 'expose', 3],
  ['block', 'heal', 3], ['playAttack', 'poison', 3], ['startOfTurn', 'poison', 2], ['youTakeDamage', 'thorns', 3], ['enemyAttacks', 'weaken', 3],
  // v3 parts
  ['burn', 'poison', -2], ['burn', 'expose', 3], ['burn', 'stun', 2], ['burn', 'startOfTurn', 2], ['burn', 'damageAll', 2],
  ['pierce', 'expose', 3], ['pierce', 'nextAttackBonus', 3], ['pierce', 'attackBoostFight', 3], ['pierce', 'damage', -3], ['pierce', 'block', 2],
  ['execute', 'expose', 4], ['execute', 'poison', 3], ['execute', 'stun', 3], ['execute', 'weaken', 2], ['execute', 'burn', 2],
  ['armor', 'thorns', 4], ['armor', 'heal', 3], ['armor', 'block', -2], ['armor', 'weaken', 3], ['armor', 'enemyAttacks', 4], ['armor', 'youTakeDamage', 3],
  ['regen', 'heal', -3], ['regen', 'weaken', 2], ['regen', 'block', 3], ['regen', 'youTakeDamage', 3], ['regen', 'loseHP', 3], ['regen', 'startOfTurn', 2],
  ['tutor', 'draw', -2], ['tutor', 'nextCostLess', 4], ['tutor', 'nextFree', 4], ['tutor', 'energy', 3], ['tutor', 'keepCards', 3], ['tutor', 'discardCards', 3],
  ['copyLast', 'nextCardTwice', -4], ['copyLast', 'playAttack', 3], ['copyLast', 'nextCostLess', 3], ['copyLast', 'handCostLess', 4], ['copyLast', 'nextFree', 3],
  ['nextFree', 'draw', 3], ['nextFree', 'nextAttackDouble', 4], ['nextFree', 'nextCardTwice', 4], ['nextFree', 'nextCostLess', -4], ['nextFree', 'perCardPlayed', 3],
  ['silence', 'cancel', -3], ['silence', 'stun', 3], ['silence', 'enemyPlaysCard', 3], ['silence', 'weaken', 2], ['silence', 'enemyDiscard', 3],
  ['junkEnemy', 'enemyDiscard', 3], ['junkEnemy', 'perEnemyCard', 3], ['junkEnemy', 'enemyDraws', -4], ['junkEnemy', 'stun', 2],
  ['youHeal', 'block', 3], ['youHeal', 'damage', 4], ['youHeal', 'thorns', 3], ['youHeal', 'draw', 3], ['youHeal', 'burn', 3],
  ['youPlayInstant', 'block', 3], ['youPlayInstant', 'draw', 3], ['youPlayInstant', 'weaken', 3], ['youPlayInstant', 'heal', 2],
  ['skipDraw', 'energy', 3], ['skipDraw', 'extraDrawNext', -3], ['skipDraw', 'draw', -3], ['skipDraw', 'nextFree', 3],
  ['chainBonus', 'nextCostLess', 3], ['chainBonus', 'handCostLess', 3], ['chainBonus', 'copyLast', 3], ['chainBonus', 'perCardPlayed', 3],
  ['opener', 'tutor', 3], ['opener', 'execute', 2], ['opener', 'nextFree', -3], ['opener', 'nextCostLess', 3],
  ['overload', 'energy', 4], ['overload', 'nextFree', 3], ['overload', 'handCostLess', 3], ['overload', 'nextCostLess', 2],
  ['keepInHand', 'tutor', 2], ['keepInHand', 'cancel', 3], ['singleUse', 'perEnemyCard', 2],
];

// Classic reference cards (token sets) for the Originality score.
export const CLASSICS = [
  { name: 'Jab', type: 'attack', tokens: ['damage'] },
  { name: 'Wide Swing', type: 'attack', tokens: ['damageAll'] },
  { name: 'Venom Dart', type: 'attack', tokens: ['poison'] },
  { name: 'Hook', type: 'attack', tokens: ['damage', 'expose'] },
  { name: 'Hammer', type: 'attack', tokens: ['damage', 'singleUse'] },
  { name: 'Pressure', type: 'attack', tokens: ['perCardPlayed'] },
  { name: 'Brace', type: 'defend', tokens: ['block'] },
  { name: 'Thorns', type: 'defend', tokens: ['block', 'thorns'] },
  { name: 'Bandage', type: 'defend', tokens: ['heal'] },
  { name: 'Bulwark', type: 'defend', tokens: ['block', 'keepInHand'] },
  { name: 'Prepare', type: 'setup', tokens: ['nextCostLess'] },
  { name: 'Power Swing', type: 'setup', tokens: ['nextAttackBonus'] },
  { name: 'Planning', type: 'setup', tokens: ['extraDrawNext'] },
  { name: 'Warm Up', type: 'setup', tokens: ['nextAttackDouble'] },
  { name: 'Quick Heal', type: 'instant', tokens: ['heal'] },
  { name: 'Quick Guard', type: 'instant', tokens: ['block'] },
  { name: 'Trip Up', type: 'instant', tokens: ['stun'] },
  { name: 'Cancel', type: 'instant', tokens: ['cancel'] },
  { name: 'Ticker', type: 'permanent', tokens: ['startOfTurn', 'draw'] },
  { name: 'Guard Post', type: 'permanent', tokens: ['startOfTurn', 'block'] },
  { name: 'Spiked Aura', type: 'permanent', tokens: ['enemyAttacks', 'damage'] },
  { name: 'Battery', type: 'permanent', tokens: ['startOfTurn', 'energy'] },
];
