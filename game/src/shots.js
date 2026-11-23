// Ember Duel — the screenshot scenes behind ?shot=table|title|win|loss.
// Each scene plays the real rules forward from a fresh deck for a fixed seed,
// steered by a simple script (always the strongest affordable card), so the
// frame is what a real game looks like and the same seed gives the same frame.

import { buildDeck, makeRng } from './deck.js';
import { newGame, drawUp, resolveRound, nextRound, playable, cardDamage } from './rules.js';
import { pickTelegraph, rivalPlay } from './rival.js';
import { renderTable, renderCycle, renderEnd, showScreen } from './render.js';

// The scripted player: strongest affordable card — but it banks embers when
// it holds a 3-cost bomb it cannot afford yet, so big cards do get played.
function scriptedPick(state) {
  const affordable = state.youHand.filter((c) => playable(c, state.youEmbers));
  if (affordable.length === 0) return null;
  const hasBomb = state.youHand.some((c) => c.cost === 3);
  if (hasBomb && state.youEmbers < 3) {
    let cheapest = affordable[0];
    for (const card of affordable) {
      if (card.cost < cheapest.cost) cheapest = card;
    }
    return cheapest;
  }
  let best = affordable[0];
  for (const card of affordable) {
    if (card.power > best.power) best = card;
  }
  return best;
}

// One full round, exactly as the live game plays it (no timers here).
// With advance=false the round resolves but the next round does not start,
// so the played cards stay on the table for the screenshot.
function playScriptedRound(state, rng, advance = true) {
  const card = scriptedPick(state);
  if (!card) return false;
  state.youEmbers -= card.cost;
  state.youHand = state.youHand.filter((c) => c.uid !== card.uid);
  state.youPlayed = card;
  let rival = rivalPlay(state);
  if (!rival) {
    drawUp(state.rivalDeck, state.rivalHand);
    rival = rivalPlay(state);
  }
  if (!rival) {
    const hit = cardDamage(card, state.youLastEl, null);
    state.rivalLife = Math.max(0, state.rivalLife - hit.damage);
    state.youLastEl = card.el;
    state.stats.cardsPlayed += 1;
    state.stats.damageDealt += hit.damage;
    state.stats.rounds = state.round;
    state.lastResolve = `${card.name} hits ${hit.damage} — the Rival passes, no ember to play.`;
    state.log.unshift(state.lastResolve);
    state.log = state.log.slice(0, 3);
    if (state.rivalLife <= 0) state.over = 'win';
  } else {
    state.rivalPlayed = rival;
    resolveRound(state);
  }
  if (!state.over && advance) {
    nextRound(state);
    drawUp(state.youDeck, state.youHand);
    drawUp(state.rivalDeck, state.rivalHand);
    state.rivalNextEl = pickTelegraph(state, rng);
  }
  return true;
}

function freshState(seed) {
  const state = newGame(seed);
  state.youDeck = buildDeck(seed);
  state.rivalDeck = buildDeck(seed + 7);
  drawUp(state.youDeck, state.youHand);
  drawUp(state.rivalDeck, state.rivalHand);
  return state;
}

export function runShot(shot, seed) {
  if (shot === 'title') {
    renderCycle();
    showScreen('screen-title');
    return;
  }
  const state = freshState(seed);
  const rng = makeRng(seed + 101);
  state.rivalNextEl = pickTelegraph(state, rng);
  showScreen('screen-table');

  if (shot === 'table') {
    // Three rounds in, so the arena shows a real clash with a chain in it.
    // The last round does not advance: the played pair stays on the table.
    for (let i = 0; i < 2 && !state.over; i += 1) playScriptedRound(state, rng);
    if (!state.over) playScriptedRound(state, rng, false);
    drawUp(state.youDeck, state.youHand);
    drawUp(state.rivalDeck, state.rivalHand);
    renderTable(state, () => {}, true);
    return;
  }

  if (shot === 'win' || shot === 'loss') {
    const want = shot;
    for (let i = 0; i < 12 && !state.over; i += 1) {
      if (i >= 9) {
        if (want === 'win') state.rivalLife = Math.min(state.rivalLife, 1);
        else state.youLife = Math.min(state.youLife, 1);
      }
      playScriptedRound(state, rng);
    }
    if (state.over !== want) {
      // The scripted game went the other way: force the ending the shot needs.
      if (want === 'win') {
        state.rivalLife = 0;
        state.over = 'win';
      } else {
        state.youLife = 0;
        state.over = 'loss';
      }
    }
    renderEnd(want, state);
    showScreen(want === 'win' ? 'screen-win' : 'screen-loss');
    return;
  }

  // Unknown shot: the table, as a safe default.
  renderTable(state, () => {}, true);
}
