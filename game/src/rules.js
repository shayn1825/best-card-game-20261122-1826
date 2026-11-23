// Ember Duel — the rules: pure functions over a game state, no DOM here.
// Element cycle: Ember beats Leaf, Leaf beats Tide, Tide beats Ember.
// Stone is neutral and armoured: its bearer takes 1 less damage from any hit.

import { ELEMENTS } from './deck.js';

export const START_LIFE = 30;
export const HAND_SIZE = 5;
export const MAX_EMBERS = 5;

// A fresh state for a new game. `seed` fixes the decks; `youFirst` is cosmetic.
export function newGame(seed) {
  return {
    seed,
    round: 1,
    youLife: START_LIFE,
    rivalLife: START_LIFE,
    youEmbers: 2,
    rivalEmbers: 2,
    youDeck: null,
    rivalDeck: null,
    youHand: [],
    rivalHand: [],
    youLastEl: null,
    rivalLastEl: null,
    rivalNextEl: null,
    youPlayed: null,
    rivalPlayed: null,
    lastResolve: '',
    log: [],
    over: null,
    stats: { rounds: 0, cardsPlayed: 0, damageDealt: 0, chains: 0 },
  };
}

// Element advantage: +2 when attacker beats defender's element.
export function advantageBonus(attackEl, defendEl) {
  if (!attackEl || !defendEl) return 0;
  return ELEMENTS[attackEl].beats === defendEl ? 2 : 0;
}

// Stone armour: the defender takes 1 less damage when hit by a Stone card
// or while their last played card was Stone.
export function armourReduction(defendEl) {
  return defendEl === 'stone' ? 1 : 0;
}

// Full damage of one card against the opposing card.
// chain: +2 when the attacker plays the same element twice in a row.
export function cardDamage(card, lastEl, opposingCard) {
  let dmg = card.power;
  let chained = false;
  if (lastEl === card.el) {
    dmg += 2;
    chained = true;
  }
  dmg += advantageBonus(card.el, opposingCard ? opposingCard.el : null);
  if (opposingCard) dmg -= armourReduction(opposingCard.el);
  return { damage: Math.max(0, dmg), chained, advantage: advantageBonus(card.el, opposingCard ? opposingCard.el : null) };
}

// Resolve one round: both sides have played a card. Returns a summary line.
// Mutates the state: life totals, last elements, log, stats, over flag.
export function resolveRound(state) {
  const you = state.youPlayed;
  const rival = state.rivalPlayed;
  const toRival = cardDamage(you, state.youLastEl, rival);
  const toYou = cardDamage(rival, state.rivalLastEl, you);
  state.youChained = toRival.chained;
  state.rivalChained = toYou.chained;
  state.rivalLife = Math.max(0, state.rivalLife - toRival.damage);
  state.youLife = Math.max(0, state.youLife - toYou.damage);
  state.youLastEl = you.el;
  state.rivalLastEl = rival.el;
  state.stats.cardsPlayed += 2;
  state.stats.damageDealt += toRival.damage;
  if (toRival.chained) state.stats.chains += 1;
  state.stats.rounds = state.round;
  const bits = [];
  bits.push(`${you.name} hits ${toRival.damage}`);
  if (toRival.advantage > 0) bits.push('element advantage +2');
  if (toRival.chained) bits.push('CHAIN +2');
  bits.push(`· ${rival.name} hits ${toYou.damage}`);
  if (toYou.advantage > 0) bits.push('element advantage +2');
  if (toYou.chained) bits.push('CHAIN +2');
  state.lastResolve = bits.join(' ');
  state.log.unshift(state.lastResolve);
  state.log = state.log.slice(0, 3);
  if (state.rivalLife <= 0 && state.youLife <= 0) state.over = 'draw';
  else if (state.rivalLife <= 0) state.over = 'win';
  else if (state.youLife <= 0) state.over = 'loss';
  return state.lastResolve;
}

// Start the next round: embers grow, hands refill to five, telegraph is set
// by the caller (rival.js). Returns nothing; mutates the state.
export function nextRound(state) {
  state.round += 1;
  state.youEmbers = Math.min(MAX_EMBERS, state.youEmbers + 1);
  state.rivalEmbers = Math.min(MAX_EMBERS, state.rivalEmbers + 1);
  state.youPlayed = null;
  state.rivalPlayed = null;
}

// Draw from a deck into a hand until the hand holds HAND_SIZE cards.
export function drawUp(deck, hand) {
  while (hand.length < HAND_SIZE && deck.length > 0) hand.push(deck.pop());
}

// A card is playable when its cost fits the side's embers.
export function playable(card, embers) {
  return card.cost <= embers;
}
