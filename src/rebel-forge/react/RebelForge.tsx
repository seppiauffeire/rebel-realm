'use client';
// React 19 wrapper around the framework-free Rebel Forge game. Client only: it touches the DOM in an effect, never at import time.
import { useEffect, useRef } from 'react';
import { bootForge } from '../host.js';
import type { Controller } from '../host.js';
import '../forge.css';

export type ForgeStage = 'kind' | 'effects' | 'forge';
export type CollapseReason = 'skip' | 'enter' | 'timeout' | 'error' | 'off' | 'bot' | 'returning';

export interface RebelForgeProps {
  /** Shown in the card footer and on the PNG, as "<brand> Forge". Default "Rebel Realm". */
  brand?: string;
  /** Force the light tokens. Without it the game follows body.light, html.light or html[data-theme="light"]. */
  theme?: 'light' | 'dark';
  /** localStorage key that remembers a visit. Default "rf_opened". */
  storageKey?: string;
  /** How long to wait for the game to load before giving up. Default 4000. */
  failsafeMs?: number;
  /** Fires as the visitor progresses: Kind step done, Effects step done, card forged. Map these to your Sealable items. */
  onReveal?: (stage: ForgeStage) => void;
  /** Open everything now: skip, failsafe, shared card, returning visitor, bot, ?rr=off. */
  onRevealAll?: () => void;
  /** The game is gone and the host should show its normal hero. */
  onCollapse?: (reason: CollapseReason) => void;
  /** The visitor pressed "Enter the site". */
  onEnter?: () => void;
  /** Analytics. Events: rf_start, rf_type_set, rf_effect_added, rf_trigger_set, rf_lifespan_set, rf_keyword_toggled,
   *  rf_price_set, rf_forged, rf_share, rf_download, rf_skip, rf_enter_site. No personal data, never the card name. */
  onEvent?: (name: string, props: Record<string, unknown>) => void;
  className?: string;
}

export default function RebelForge(props: RebelForgeProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props; // callbacks stay current without remounting the game
  const ctrl = useRef<Controller | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const c = bootForge({
      mountEl: el,
      brand: latest.current.brand ?? 'Rebel Realm',
      theme: latest.current.theme,
      storageKey: latest.current.storageKey,
      failsafeMs: latest.current.failsafeMs,
      onReveal: (s) => latest.current.onReveal?.(s),
      onRevealAll: () => latest.current.onRevealAll?.(),
      onCollapse: (r) => latest.current.onCollapse?.(r),
      onEnter: () => latest.current.onEnter?.(),
      onEvent: (n, p) => latest.current.onEvent?.(n, p),
    });
    ctrl.current = c;
    c.begin();
    return () => { c.destroy(); ctrl.current = null; }; // StrictMode runs this once in dev, so a remount is safe
  }, []);

  useEffect(() => { ctrl.current?.game?.setTheme(props.theme); }, [props.theme]);

  return <div ref={host} className={props.className} data-rebel-forge />;
}
