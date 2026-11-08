import type { CardDesign } from './engine/index.js';

export type CollapseReason = 'skip' | 'enter' | 'timeout' | 'error' | 'off' | 'bot' | 'returning';
export type ForgeStage = 'kind' | 'effects' | 'forge';

export interface GameHandle {
  destroy(): void;
  setTheme(theme?: 'light' | 'dark'): void;
  focus(): void;
  state(): unknown;
  dispatch(action: { type: string; [k: string]: unknown }): void;
}

export interface Decision {
  mode: 'play' | 'skip';
  reason: 'off' | 'force' | 'bot' | 'returning' | 'card' | 'first' | 'button';
  card: string | null;
}

export function decideMode(input?: {
  search?: string;
  storage?: { getItem(k: string): string | null } | null;
  storageKey?: string;
  webdriver?: boolean;
}): Decision;

export interface BootOptions {
  mountEl: HTMLElement;
  brand?: string;
  theme?: 'light' | 'dark';
  onEvent?: (name: string, props: Record<string, unknown>) => void;
  onReveal?: (stage: ForgeStage) => void;
  onForged?: (design: any, rating: any) => void;
  onRevealAll?: () => void;
  onCollapse?: (reason: CollapseReason) => void;
  onEnter?: () => void;
  storageKey?: string;
  failsafeMs?: number;
  /** Test hooks */
  loadGame?: () => Promise<unknown>;
  search?: string;
  storage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null;
  webdriver?: boolean;
}

export interface Controller {
  begin(opts?: { forcePlay?: boolean }): Decision;
  start(cardCode?: string | null): void;
  collapse(reason: CollapseReason): void;
  destroy(): void;
  readonly game: GameHandle | null;
}

export function bootForge(options: BootOptions): Controller;
export type { CardDesign };
