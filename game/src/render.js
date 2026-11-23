// Ember Duel — rendering: the only file that touches the DOM.
// One job only: turn a game state into what the player sees.

import { ELEMENTS, COMBO_TEXT } from './deck.js';
import { START_LIFE, MAX_EMBERS } from './rules.js';
import { counterOf } from './rival.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// One card face. `opts`: key (keyboard number), unplayable, chained, played.
export function cardElement(card, opts = {}) {
  const info = ELEMENTS[card.el];
  const node = el('div', 'card' + (opts.played ? ' played-card' : '') + (opts.unplayable ? ' unplayable' : ''));
  if (opts.key) node.appendChild(el('div', 'key', String(opts.key)));
  if (opts.chained) node.appendChild(el('div', 'chain-badge', 'CHAIN +2'));
  const head = el('div', 'chead');
  head.appendChild(el('div', 'cname', card.name));
  head.appendChild(el('div', 'ccost', String(card.cost)));
  node.appendChild(head);
  const art = el('div', 'cart el-' + card.el, info.glyph);
  art.style.color = '#241503';
  node.appendChild(art);
  const power = el('div', 'cpower', String(card.power));
  power.appendChild(el('small', null, 'POWER'));
  node.appendChild(power);
  node.appendChild(el('div', 'cel', info.name));
  node.appendChild(el('div', 'ccombo', COMBO_TEXT));
  return node;
}

// Thirty life pips, filled for life left.
export function renderLife(container, life) {
  container.textContent = '';
  for (let i = 0; i < START_LIFE; i += 1) {
    container.appendChild(el('div', 'pip' + (i < life ? '' : ' off')));
  }
}

export function renderEmbers(container, embers) {
  container.textContent = '';
  container.appendChild(el('div', 'lbl', 'EMBERS'));
  const dots = el('div', 'dots');
  for (let i = 0; i < MAX_EMBERS; i += 1) {
    dots.appendChild(el('div', 'dot' + (i < embers ? '' : ' off')));
  }
  container.appendChild(dots);
  container.appendChild(el('div', 'lbl', embers + ' / ' + MAX_EMBERS));
}

// The Rival's honest telegraph: what element it will play next, and the counter.
export function renderTelegraph(state) {
  const box = document.getElementById('telegraph');
  box.textContent = '';
  if (!state.rivalNextEl) {
    box.textContent = 'The Rival is thinking…';
    return;
  }
  const info = ELEMENTS[state.rivalNextEl];
  const counter = counterOf(state.rivalNextEl);
  box.appendChild(el('span', null, 'Rival gathers '));
  const sig = el('span', 'sigil sig-' + state.rivalNextEl, info.glyph);
  box.appendChild(sig);
  box.appendChild(el('b', null, ' ' + info.name + ' '));
  if (counter) {
    box.appendChild(el('span', null, '— counter it with '));
    box.appendChild(el('span', 'sigil sig-' + counter, ELEMENTS[counter].glyph));
    box.appendChild(el('b', null, ' ' + ELEMENTS[counter].name));
  } else {
    box.appendChild(el('span', null, '— Stone has no counter, outlast it'));
  }
}

// The title screen's element-cycle diagram.
export function renderCycle() {
  const box = document.getElementById('cycle-diagram');
  if (!box || box.children.length > 0) return;
  for (const key of ['ember', 'leaf', 'tide', 'stone']) {
    const info = ELEMENTS[key];
    const chip = el('div', 'cy');
    chip.appendChild(el('span', 'sigil sig-' + key, info.glyph));
    chip.appendChild(el('b', null, ' ' + info.name));
    chip.appendChild(el('span', null, info.beats ? ' beats ' + ELEMENTS[info.beats].name : ' armoured'));
    box.appendChild(chip);
  }
}

export function showScreen(id) {
  for (const screen of document.querySelectorAll('.screen')) {
    screen.classList.toggle('hidden', screen.id !== id);
  }
}

// Draw the whole table from the state. `onPlay` is called with a hand index
// when the player clicks a card; `locked` disables input while resolving.
export function renderTable(state, onPlay, locked) {
  document.getElementById('round-label').textContent = 'ROUND ' + state.round;
  document.getElementById('turn-label').textContent = locked
    ? 'The cards clash…'
    : 'Your move — play a card';
  renderLife(document.getElementById('rival-life'), state.rivalLife);
  document.getElementById('rival-life-num').textContent = state.rivalLife + ' ❤';
  renderLife(document.getElementById('you-life'), state.youLife);
  document.getElementById('you-life-num').textContent = state.youLife + ' ❤';
  renderTelegraph(state);
  renderEmbers(document.getElementById('embers'), state.youEmbers);

  const rivalHand = document.getElementById('rival-hand');
  rivalHand.textContent = '';
  for (let i = 0; i < state.rivalHand.length; i += 1) {
    rivalHand.appendChild(el('div', 'mini-card'));
  }

  const youSlot = document.getElementById('played-you');
  const rivalSlot = document.getElementById('played-rival');
  for (const slot of [youSlot, rivalSlot]) {
    for (const child of [...slot.children]) {
      if (!child.classList.contains('played-label')) child.remove();
    }
  }
  if (state.youPlayed) youSlot.appendChild(cardElement(state.youPlayed, { played: true, chained: state.youChained }));
  if (state.rivalPlayed) rivalSlot.appendChild(cardElement(state.rivalPlayed, { played: true, chained: state.rivalChained }));
  document.getElementById('resolve-line').textContent = state.lastResolve || 'The table is set. Strike first.';

  const hand = document.getElementById('hand');
  hand.textContent = '';
  state.youHand.forEach((card, index) => {
    const unplayable = locked || card.cost > state.youEmbers;
    const node = cardElement(card, { key: index + 1, unplayable });
    if (!unplayable) node.addEventListener('click', () => onPlay(index));
    hand.appendChild(node);
  });

  const log = document.getElementById('log');
  log.textContent = state.log.length > 0 ? state.log[0] : 'Win the element war: beat the telegraphed element, chain the same element twice.';
}

// Fill an end screen's stats line.
export function renderEnd(kind, state) {
  const stats = `Rounds fought: ${state.stats.rounds} · Cards played: ${state.stats.cardsPlayed} · Damage dealt: ${state.stats.damageDealt} · Chains landed: ${state.stats.chains}`;
  document.getElementById(kind === 'win' ? 'win-stats' : 'loss-stats').textContent = stats;
}
