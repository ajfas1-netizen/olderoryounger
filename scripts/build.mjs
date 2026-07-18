// Builds dist/before-my-time.html: a single self-contained file with the card data inlined.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const cards = readFileSync(new URL('data/cards.js', root), 'utf8');

const out = html.replace(
  '<script src="data/cards.js"></script>',
  '<script>\n' + cards + '\n</script>'
).replace('<link rel="manifest" href="manifest.json">', '');

mkdirSync(new URL('dist', root), { recursive: true });
writeFileSync(new URL('dist/before-my-time.html', root), out);
console.log('Built dist/before-my-time.html (' + Math.round(out.length / 1024) + ' KB)');
