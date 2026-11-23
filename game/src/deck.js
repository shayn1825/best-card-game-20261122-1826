// Ember Duel — the deck: every card in the game, and a seeded shuffle.
// One job only: what the cards are and how a deck is dealt from them.

export const ELEMENTS = {
  ember: { name: 'EMBER', color: '#ff5a3c', glyph: '▲', beats: 'leaf', weakTo: 'tide' },
  tide: { name: 'TIDE', color: '#5fb4ff', glyph: '●', beats: 'ember', weakTo: 'leaf' },
  leaf: { name: 'LEAF', color: '#7ddc5f', glyph: '◆', beats: 'tide', weakTo: 'ember' },
  stone: { name: 'STONE', color: '#e8b64c', glyph: '■', beats: null, weakTo: null },
};

// Twelve unique cards. Each appears twice in a 24-card deck.
// cost = embers to play it, power = damage it deals.
export const CARD_DEFS = [
  { id: 'cinder-fox', name: 'Cinder Fox', el: 'ember', cost: 2, power: 4 },
  { id: 'ash-phoenix', name: 'Ash Phoenix', el: 'ember', cost: 3, power: 6 },
  { id: 'spark-imp', name: 'Spark Imp', el: 'ember', cost: 1, power: 2 },
  { id: 'tide-serpent', name: 'Tide Serpent', el: 'tide', cost: 2, power: 4 },
  { id: 'coral-knight', name: 'Coral Knight', el: 'tide', cost: 3, power: 5 },
  { id: 'foam-sprite', name: 'Foam Sprite', el: 'tide', cost: 1, power: 2 },
  { id: 'thorn-wolf', name: 'Thorn Wolf', el: 'leaf', cost: 2, power: 4 },
  { id: 'grove-ancient', name: 'Grove Ancient', el: 'leaf', cost: 3, power: 6 },
  { id: 'seedling', name: 'Seedling', el: 'leaf', cost: 1, power: 2 },
  { id: 'granite-golem', name: 'Granite Golem', el: 'stone', cost: 3, power: 5 },
  { id: 'pebble-scout', name: 'Pebble Scout', el: 'stone', cost: 1, power: 3 },
  { id: 'quarry-drake', name: 'Quarry Drake', el: 'stone', cost: 2, power: 4 },
];

export const COMBO_TEXT = 'Chain: +2 if your last card shares this element';

// A small deterministic RNG (mulberry32) so a seed always deals the same game.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a fresh 24-card deck (two copies of each card) and shuffle it by seed.
export function buildDeck(seed) {
  const rng = makeRng(seed);
  const cards = [];
  for (const def of CARD_DEFS) {
    cards.push({ ...def, uid: def.id + '-a' });
    cards.push({ ...def, uid: def.id + '-b' });
  }
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
