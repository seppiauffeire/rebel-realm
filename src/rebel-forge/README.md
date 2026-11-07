# Rebel Forge: drop-in package

The hero card designer from `rebel-forge-design.md` (v2), packaged to move into the Rebel Realm site.

- No dependencies. Nothing to `npm install`. React is only needed for the optional wrapper.
- Client only. Every module is safe to import on the server (tested), and the DOM is touched only after mount.
- Removing it is deleting the folder. The only things it writes to the page are `localStorage` keys `rf_opened` and `rf_sound`.

## What is in the folder

```
rebel-forge/
  react/RebelForge.tsx   React 19 component (use this)
  host.js, host.d.ts     failsafes: Skip, 4000 ms mount timeout, ?rr=off, bot skip, remembered visit
  forge.css              all game styles, tokens are --rf-*, everything is namespaced rf-
  ui/                    the game (vanilla DOM + Web Animations API), with types in forge.d.ts
  engine/                pure rules engine: balance tables, power, cost, rating, coach, codec, reducer. Types in index.d.ts
  demo.html              standalone page that mounts the game with no framework, shows every host callback
  tests/ sim/            47 tests, the balance simulation, the WCAG contrast check
```

## 1. Put it in

Copy the folder to `src/rebel-forge/` (any path works, the imports are relative).

```tsx
import RebelForge from '@/rebel-forge/react/RebelForge';

<RebelForge
  brand="Rebel Realm"
  storageKey="rr_opened"
  onReveal={(stage) => { /* 'kind' | 'effects' | 'forge' */ }}
  onRevealAll={() => { /* open everything */ }}
  onCollapse={(reason) => { /* show your normal hero */ }}
  onEnter={() => { /* scroll to the page */ }}
  onEvent={(name, props) => track(name, props)}
/>
```

Next.js: the component already starts with `'use client'`. Importing `forge.css` from a component works in the App Router; in the Pages Router move that import into `_app`.

## 2. Connect it to RevealProvider / Sealable

The game reports progress; your reveal system decides what opens. The mapping from the doc (section 11):

| Callback | When it fires | Open |
|---|---|---|
| `onReveal('kind')` | Kind step finished | Navigation |
| `onReveal('effects')` | Effects step finished | Headline |
| `onReveal('forge')` | Card forged | Tagline and CTA |
| `onRevealAll()` | Skip, 4000 ms failsafe, shared `?card=` link, returning visitor, bot, `?rr=off` | Everything |
| `onCollapse(reason)` | Game is gone | Render your normal hero |

Reveal never depends on the score. A bad card still opens the page. Keep sealed content in the DOM with `inert`, as you already do.

The failsafes are enforced in `host.js`, not in your page, so you cannot forget one:

| Case | Result |
|---|---|
| `?rr=off` or `?forge=off` | Skipped, `onCollapse('off')` |
| `navigator.webdriver` (bots) | Skipped, `onCollapse('bot')`. Add `?rr=force` to test with an automated browser |
| Returning visitor (`rr_opened`) | Skipped, `onCollapse('returning')`. A shared `?card=` link still opens |
| Game fails to load | `onCollapse('error')` |
| Game takes longer than 4000 ms | `onCollapse('timeout')`. A chunk that arrives late is ignored and never mounts |
| Visitor presses Skip (or Esc, then Enter) | Remembered, `onCollapse('skip')` |
| Visitor presses "Enter the site" | Remembered, `onCollapse('enter')`, then `onEnter()` |

Set `storageKey="rr_opened"` to match the key the doc names.

## 3. Hero layout

The game renders at its natural height. For the single `h-dvh` hero, give the game the space left under your header and headline. Two CSS variables control its size, so you can tune it for the 1366x768 `vh` media query without editing the stylesheet:

```css
.your-hero {
  --rf-card-w: clamp(210px, calc((100dvh - 320px) * .714), 300px); /* desktop card width, card is 5:7 */
  --rf-card-w-sm: min(60vw, 230px);                                   /* phone card width */
  --rf-panel-min: clamp(300px, calc(100dvh - 280px), 520px);          /* right panel minimum height */
}
```

`320px` and `280px` stand for "everything else on screen" (nav, headline, padding). Adjust to your layout.

## 4. Look and feel

Colors, fonts and the card surface are all tokens. Override them on any ancestor:

```css
.your-hero {
  --rf-attack: #E5484D;  --rf-defend: #3E8EF7;  --rf-setup: #F5A524;
  --rf-instant: #A855F7; --rf-permanent: #22C55E;
  --rf-card-bg: #0f0f13; --rf-ink: #f4f1ea; --rf-dim: #a8a39a; --rf-paper: #15151a;
  --rf-display: 'Your Display Font', sans-serif; --rf-body: 'Your Body Font', sans-serif; --rf-mono: 'Your Mono', monospace;
}
```

**Themes.** Light tokens apply when `body` or `html` has class `light`, when `html` has `data-theme="light"`, or when you pass `theme="light"`. If your theme toggle uses something else, either add one of those hooks or define the light values yourself.

**If you change colors, run `npm run contrast`.** It checks every text, shape and control-outline pair against WCAG (4.5:1 text, 3:1 shapes) in both themes. It uses the token values written at the top of `tests/contrast.mjs`, so update those too.

Fonts: the defaults are Syne, Figtree and JetBrains Mono. Load whatever you override them with.

## 5. Analytics

Pass `onEvent`. With none, events go to `window.gtag('event', ...)` when it exists. Events carry no personal data and never the card name:

`rf_start`, `rf_type_set {type}`, `rf_effect_added {id}`, `rf_trigger_set {id}`, `rf_lifespan_set {id}`, `rf_keyword_toggled {id}`, `rf_price_set {id}`, `rf_forged {type, score, grade, cost, effects_count}`, `rf_share`, `rf_download`, `rf_skip {step}`, `rf_enter_site`.

## 6. Balance

Every number is in `engine/balance.js`.

```bash
npm test          # 47 tests: the doc's fixtures, cost edges, validation, codec, coach, reducer, failsafes, server-render safety
npm run sim       # about a minute: score distributions, proof A+ is reachable for every type, concentration check
npm run contrast  # WCAG check of every color pair in both themes
```

What the sim found, and what changed from the doc's numbers:

- **Fixture B in the doc is stale.** Its own formulas give 92 / A, not 99 / A+. The test pins the formula value.
- **A+ was not fairly reachable.** Every type's best cards collapsed into block + thorns + Lose HP. I added 58 themed pair rows (105 total) and softened Use It or Lose It to x0.90, which was a free shortcut to the Tension sweet spot. A+ is now reachable for all 5 types with hundreds to thousands of distinct designs each.
- **Still over the doc's 60% line:** Defend `block` (67%, the type's identity effect) and Setup `draw` (about 60%).
- Defaults score 51 to 57 per type. The loop-risk cap works.

## 7. Differences from the doc

| Doc | This package | Why |
|---|---|---|
| React, Framer Motion, GSAP, TypeScript | Framework-free JS, Web Animations API and CSS, with `.d.ts` types and a React wrapper | It was built for a static site with no build step. The engine/UI split and the pure engine are as specified. Porting the UI to GSAP is possible but not needed |
| Engine in `.ts` | `.js` with `.d.ts` | Same reason. `engine/index.d.ts` has the doc's types |
| Starting effect on every type | Kept, but it is a placeholder: adding another effect swaps it out unless the card still needs it (Attack needs a Damage effect). Editing its number makes it the player's | A starting effect the player did not choose should not stay on the card |

## 8. Before launch

- **Legal and trademark** (doc section 20): clear "Rebel Forge" as a feature name. The package never names another game. `export.mjs` fails if it finds one in the shipped code.
- **Not verified in the environment it was built in:** Lighthouse, real touch devices, screen readers (VoiceOver, TalkBack), and the clipboard and Web Share paths on real devices. Tap targets, ARIA roles, the live region and reduced motion were checked by measurement and code.
- **Goal Rush TCG:** nothing in this package mentions or hints at it.
