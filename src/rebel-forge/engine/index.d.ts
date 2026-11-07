// Public types for the pure engine. Section 4 of the design doc, plus the result shapes.
export type CardType = 'attack' | 'defend' | 'setup' | 'instant' | 'permanent';
export type Family = 'damage' | 'defense' | 'cards' | 'setup' | 'disrupt';

export type EffectId =
  | 'damage' | 'damageAll' | 'poison' | 'perEnemyCard' | 'perCardPlayed'
  | 'block' | 'doubleBlock' | 'thorns' | 'heal' | 'blockPerCard'
  | 'draw' | 'peek' | 'cycle' | 'recycle' | 'enemyDiscard' | 'energy'
  | 'nextCostLess' | 'handCostLess' | 'nextAttackBonus' | 'nextAttackDouble' | 'nextDefendDouble'
  | 'nextCardTwice' | 'extraDrawNext' | 'extraEnergyNext' | 'attackBoostFight' | 'defendBoostFight' | 'keepCards'
  | 'stun' | 'expose' | 'weaken' | 'cancel';

export type KeywordId = 'singleUse' | 'keepInHand' | 'startsInHand' | 'useItOrLoseIt' | 'playTwice' | 'chainBonus';
export type PriceId = 'loseHP' | 'discardCards' | 'addJunk' | 'enemyDraws';
export type TriggerId =
  | 'startOfTurn' | 'endOfTurn' | 'playAttack' | 'playDefend' | 'playAnyCard' | 'drawCard'
  | 'youTakeDamage' | 'enemyAttacks' | 'enemyPlaysCard' | 'youGainBlock' | 'youDiscard';
export type LifespanId = 'turns2' | 'turns3' | 'turns5' | 'fight' | 'uses3';

export interface EffectPick { id: EffectId; amount: number }

export interface CardDesign {
  type: CardType;
  effects: EffectPick[];
  keywords: KeywordId[];
  price: { id: PriceId; amount: number } | null;
  permanent?: { trigger: TriggerId; lifespan: LifespanId; oncePerTurn: boolean } | null;
  name: string;
}

/** A card mid-build: no type yet, and `auto` marks the starting effect that adding another effect will swap out. */
export type DraftDesign = Omit<CardDesign, 'type'> & { type: CardType | null; auto?: EffectId | null };

export interface ValidationError { code: string; text: string }

export interface Rating {
  valid: boolean;
  errors: ValidationError[];
  power: { perTrigger: number; base: number; gross: number; keywordCut: number; pricePP: number; flats: number; net: number };
  /** 0 to 5, or null when over budget */
  cost: number | null;
  efficiency: number | null;
  parts: { budget: number; focus: number; synergy: number; tension: number; originality: number } | null;
  raw?: number;
  total: number;
  grade: string | null;
  /** 59 when the loop-risk cap applied */
  cap: number | null;
  reasons: Record<string, string>;
}

export const FLAGS: { permanent: boolean };
export const MAX_NET: number;
export function ceiling(cost: number): number;

export function rate(design: CardDesign | DraftDesign): Rating;
export function validate(design: CardDesign | DraftDesign): ValidationError[];
export function computeNet(design: CardDesign | DraftDesign): Rating['power'];
export function costFor(net: number): number | null;
export function gradeFor(total: number): string;

export function encode(design: CardDesign): string;
export function decode(code: string): CardDesign | null;
export function cleanName(raw: string): string;
export function suggestName(design: CardDesign | DraftDesign): string;

export function renderCardText(design: CardDesign | DraftDesign): {
  effects: string[]; keywords: string[]; price: string | null; when?: string | null; life?: string | null; once?: string | null;
};

export function coachHint(design: CardDesign | DraftDesign): string;
export function bestSingleStep(design: CardDesign | DraftDesign): { gain: number; label: string; design: CardDesign; rating: Rating } | null;

export function seededRng(seed: string | number): () => number;
