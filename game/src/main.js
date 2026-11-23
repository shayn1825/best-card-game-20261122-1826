// Ember Duel — the boot and the input: title, clicks, keys, and the round flow.
// One job only: wire the game together and run it in the browser.

import { buildDeck, makeRng } from './deck.js';
import { newGame, drawUp, resolveRound, nextRound, playable, cardDamage } from './rules.js';
import { pickTelegraph, rivalPlay } from './rival.js';
import { renderTable, renderCycle, renderEnd, showScreen } from './render.js';
import { runShot } from './shots.js';

let state = null;
let rng = null;
let locked = false;

function startGame(seed) {
  state = newGame(seed);
  rng = makeRng(seed + 101);
  state.youDeck = buildDeck(seed);
  state.rivalDeck = buildDeck(seed + 7);
  drawUp(state.youDeck, state.youHand);
  drawUp(state.rivalDeck, state.rivalHand);
  state.rivalNextEl = pickTelegraph(state, rng);
  locked = false;
  showScreen('screen-table');
  renderTable(state, playCard, locked);
}

function endRound() {
  if (state.over === 'win') {
    renderEnd('win', state);
    showScreen('screen-win');
    return;
  }
  if (state.over === 'loss' || state.over === 'draw') {
    renderEnd('loss', state);
    showScreen('screen-loss');
    return;
  }
  locked = true;
  renderTable(state, playCard, locked);
  window.setTimeout(() => {
    nextRound(state);
    drawUp(state.youDeck, state.youHand);
    drawUp(state.rivalDeck, state.rivalHand);
    state.rivalNextEl = pickTelegraph(state, rng);
    locked = false;
    renderTable(state, playCard, locked);
  }, 900);
}

function playCard(index) {
  if (locked || !state || state.over) return;
  const card = state.youHand[index];
  if (!card || !playable(card, state.youEmbers)) return;
  locked = true;
  state.youEmbers -= card.cost;
  state.youHand = state.youHand.filter((c) => c.uid !== card.uid);
  state.youPlayed = card;

  let rival = rivalPlay(state);
  if (!rival) {
    // The Rival cannot afford a card: it draws two and tries once more.
    drawUp(state.rivalDeck, state.rivalHand);
    drawUp(state.rivalDeck, state.rivalHand);
    rival = rivalPlay(state);
  }
  if (!rival) {
    // Still nothing: the Rival passes and takes the hit unanswered.
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
  renderTable(state, playCard, locked);
  window.setTimeout(endRound, 1100);
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    runShot(shot, Number(params.get('seed') || 7));
    return;
  }
  renderCycle();
  showScreen('screen-title');
  document.getElementById('btn-play').addEventListener('click', () => startGame(Date.now() % 100000));
  for (const btn of document.querySelectorAll('[data-again]')) {
    btn.addEventListener('click', () => startGame(Date.now() % 100000));
  }
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !document.getElementById('screen-title').classList.contains('hidden')) {
      startGame(Date.now() % 100000);
      return;
    }
    if (event.key >= '1' && event.key <= '5' && state && !locked) {
      playCard(Number(event.key) - 1);
    }
  });
}

boot();
