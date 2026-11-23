// Ember Duel — the Rival: an opponent whose choices you can read and counter.
// One job only: what the Rival telegraphs, and which card it plays.
// The telegraph is honest: the Rival announces its next element a round ahead,
// so the player can answer it with the element that beats it.

import { ELEMENTS } from './deck.js';
import { playable } from './rules.js';

// The element that beats a given element (Stone has no counter).
export function counterOf(el) {
  for (const key of Object.keys(ELEMENTS)) {
    if (ELEMENTS[key].beats === el) return key;
  }
  return null;
}

// Pick the Rival's telegraphed element for the next round: it favours the
// element that beats the player's last card, so a careless player is punished
// and a thinking player can counter it. Seeded choice, never random at runtime.
export function pickTelegraph(state, rng) {
  const options = ['ember', 'tide', 'leaf', 'stone'];
  const counter = state.youLastEl ? counterOf(state.youLastEl) : null;
  if (counter && rng() < 0.6) return counter;
  return options[Math.floor(rng() * options.length)];
}

// The Rival plays its strongest affordable card of the telegraphed element;
// if it holds none, its strongest affordable card of any element.
export function rivalPlay(state) {
  const hand = state.rivalHand;
  const affordable = hand.filter((c) => playable(c, state.rivalEmbers));
  if (affordable.length === 0) return null;
  const telegraphed = affordable.filter((c) => c.el === state.rivalNextEl);
  const pool = telegraphed.length > 0 ? telegraphed : affordable;
  let best = pool[0];
  for (const card of pool) {
    if (card.power > best.power) best = card;
  }
  state.rivalHand = hand.filter((c) => c.uid !== best.uid);
  state.rivalEmbers -= best.cost;
  return best;
}
