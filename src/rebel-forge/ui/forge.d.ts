import type { CardDesign } from '../engine/index.js';
import type { GameHandle, ForgeStage } from '../host.js';

export interface MountOptions {
  /** A decoded, validated card. Opens straight to the result screen. */
  initialCard?: CardDesign | null;
  /** Show "That card is not valid" and a blank forge. */
  invalidCard?: boolean;
  brand?: string;
  theme?: 'light' | 'dark';
  onEvent?: (name: string, props: Record<string, unknown>) => void;
  onReveal?: (stage: ForgeStage) => void;
  onForged?: (design: any, rating: any) => void;
  onSkip?: () => void;
  onEnter?: () => void;
}

export function mount(root: HTMLElement, options?: MountOptions): GameHandle;
/** Decode a ?card= share code. Returns null for anything invalid. */
export function decodeCard(code: string): CardDesign | null;
