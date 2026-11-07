// Host-side loader for Rebel Forge. Framework-free, so a React page, a plain page, or the demo can all use it.
// It implements the failsafes from the design doc: Skip, a 4000 ms mount failsafe, ?rr=off, bots skip the game,
// and a remembered visit. Losing, quitting or failing to load never blocks the page.

const FLAG_OFF = ['forge', 'rr']; // ?forge=off and ?rr=off both skip the game

function safeStorage() {
  try { const s = window.localStorage; s.getItem('rf_probe'); return s; } catch (e) { return null; }
}

// Decide whether to play or skip, and why. Pure apart from reading its inputs.
export function decideMode({ search = '', storage = null, storageKey = 'rf_opened', webdriver = false } = {}) {
  const qs = new URLSearchParams(search);
  const card = qs.get('card');
  const force = qs.get('forge') === 'force' || qs.get('rr') === 'force';
  if (FLAG_OFF.some((k) => qs.get(k) === 'off')) return { mode: 'skip', reason: 'off', card: null };
  if (force) return { mode: 'play', reason: 'force', card };
  if (webdriver === true) return { mode: 'skip', reason: 'bot', card: null };
  let opened = false;
  try { opened = !!storage && storage.getItem(storageKey) === '1'; } catch (e) { opened = false; }
  if (opened && !card) return { mode: 'skip', reason: 'returning', card: null };
  return { mode: 'play', reason: card ? 'card' : 'first', card };
}

/**
 * bootForge({
 *   mountEl,                     // element the game renders into
 *   brand, theme, onEvent,       // passed through to the game
 *   onReveal(stage),             // 'kind' | 'effects' | 'forge'  (Kind step done, Effects step done, card forged)
 *   onRevealAll(),               // open everything now (skip, failsafe, shared card, returning visitor)
 *   onCollapse(reason),          // game is gone: 'skip' | 'enter' | 'timeout' | 'error' | 'off' | 'bot' | 'returning'
 *   onEnter(),                   // the player pressed "Enter the site"
 *   loadGame, storageKey, failsafeMs, search, storage, webdriver   // optional overrides, mostly for tests
 * }) -> { begin(opts), start(cardCode), collapse(reason), destroy(), game }
 */
export function bootForge(o) {
  const storageKey = o.storageKey || 'rf_opened';
  const failsafeMs = o.failsafeMs || 4000;
  const storage = o.storage !== undefined ? o.storage : safeStorage();
  const loadGame = o.loadGame || (() => import('./ui/forge.js'));
  let game = null;
  let attempt = 0;
  let timer = 0;

  const remember = () => { try { if (storage) storage.setItem(storageKey, '1'); } catch (e) { /* private mode */ } };
  const stopGame = () => { if (game) { try { game.destroy(); } catch (e) { /* ignore */ } game = null; } };

  function collapse(reason) {
    clearTimeout(timer);
    attempt++; // anything still loading is abandoned and must never mount
    stopGame();
    if (o.onRevealAll) o.onRevealAll();
    if (o.onCollapse) o.onCollapse(reason);
  }

  function start(cardCode) {
    const mine = ++attempt;
    clearTimeout(timer);
    timer = setTimeout(() => { if (!game && mine === attempt) collapse('timeout'); }, failsafeMs);
    loadGame().then((m) => {
      if (mine !== attempt) return;
      clearTimeout(timer);
      const initial = cardCode ? m.decodeCard(cardCode) : null;
      game = m.mount(o.mountEl, {
        initialCard: initial,
        invalidCard: !!cardCode && !initial,
        brand: o.brand,
        theme: o.theme,
        onEvent: o.onEvent,
        onReveal: o.onReveal,
        onSkip: () => { remember(); collapse('skip'); },
        onEnter: () => { remember(); collapse('enter'); if (o.onEnter) o.onEnter(); },
      });
      if (initial && o.onRevealAll) o.onRevealAll();
    }).catch(() => { if (mine === attempt) collapse('error'); });
  }

  function begin(opts = {}) {
    const decision = opts.forcePlay
      ? { mode: 'play', reason: 'button', card: null }
      : decideMode({ search: o.search !== undefined ? o.search : window.location.search, storage, storageKey, webdriver: o.webdriver !== undefined ? o.webdriver : navigator.webdriver });
    if (decision.mode === 'skip') collapse(decision.reason); else start(decision.card);
    return decision;
  }

  return { begin, start, collapse, destroy() { attempt++; clearTimeout(timer); stopGame(); }, get game() { return game; } };
}
