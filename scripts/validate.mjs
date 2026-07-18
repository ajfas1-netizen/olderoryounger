// Deck validator: duplicates, year sanity, category balance, sleeper coverage, field completeness.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../data/cards.js', import.meta.url), 'utf8');
const ctx = vm.createContext({});
const { CARDS, CATEGORIES } = vm.runInContext(src + ';({ CARDS, CATEGORIES })', ctx);

let errors = 0;
const err = (m) => { console.error('ERROR:', m); errors++; };

const seen = new Map();
for (const c of CARDS) {
  if (!c.t || !c.c || !c.y || !c.f) err(`incomplete card: ${JSON.stringify(c).slice(0, 80)}`);
  if (!CATEGORIES[c.c]) err(`unknown category '${c.c}' on ${c.t}`);
  if (c.y < 1880 || c.y > 2005) err(`suspicious year ${c.y} on ${c.t}`);
  if (seen.has(c.t)) err(`duplicate title: ${c.t}`);
  seen.set(c.t, true);
}

const byCat = {};
let sleepers = 0;
for (const c of CARDS) {
  byCat[c.c] = (byCat[c.c] || 0) + 1;
  if (c.s) sleepers++;
}

console.log(`\nDeck: ${CARDS.length} cards, ${sleepers} sleepers (${Math.round(100 * sleepers / CARDS.length)}%)`);
console.log('By category:');
for (const [k, v] of Object.entries(byCat)) console.log(`  ${CATEGORIES[k].padEnd(16)} ${v}`);
const years = CARDS.map(c => c.y).sort((a, b) => a - b);
console.log(`Year range: ${years[0]} to ${years[years.length - 1]}`);

// decade histogram
const dec = {};
for (const y of years) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; }
console.log('By decade:');
for (const [d, n] of Object.entries(dec)) console.log(`  ${d}s ${'#'.repeat(Math.ceil(n / 3))} ${n}`);

if (errors) { console.error(`\n${errors} error(s).`); process.exit(1); }
console.log('\nOK: deck is valid.');
