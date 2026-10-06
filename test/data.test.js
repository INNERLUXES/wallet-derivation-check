import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADDRESS_TYPES, BEST, COINS, HARDENED, POINTS, RULES, SOURCES, TESTNET_COIN_TYPE, flat, grouped, listText, plural, pointPage, safeText, source } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');
const norm = (t) => t.replace(/\s+/g, ' ');

const PLACES = /^https:\/\/github\.com\/(?:bitcoin\/bips|satoshilabs\/slips)\/blob\/master\/(?:bip|slip)-\d{4}\.(?:mediawiki|md)$/;

test('every source has an address in the BIP or SLIP repository, and no number that reads like a year', () => {
  for (const s of SOURCES) {
    assert.match(s.url, PLACES, s.id);
    assert.doesNotMatch(s.url, /(?<!(?:EIP|ERC)[- ]?)\b(?:19|20)\d{2}\b/i, s.id);
    assert.ok(s.title.length > 5);
  }
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
  assert.deepEqual(SOURCES.map((s) => s.id), ['bip-32', 'bip-44', 'bip-49', 'bip-84', 'bip-86', 'slip-44', 'slip-10']);
});

test('every source has a text copy under research/sources that starts with its address, and research/sources.md lists it', async () => {
  const notes = await read('research/sources.md');
  for (const s of SOURCES) {
    const copy = await read(s.file);
    assert.ok(copy.startsWith(`Source: ${s.url}\n`), s.file);
    assert.ok(copy.length > 1500, `${s.file} holds the page`);
    assert.ok(notes.includes(s.url), `research/sources.md lists ${s.id}`);
    assert.ok(notes.includes(s.file), `research/sources.md names ${s.file}`);
  }
});

test('every point belongs to a listed source, is written in a sentence of its own and is not a long quotation of its page', async () => {
  for (const [id, p] of Object.entries(POINTS)) {
    const page = source(p.source);
    assert.ok(page, `${id}: the source ${p.source}`);
    assert.equal(pointPage(id), page);
    assert.ok(p.text.length > 40 && p.text.length < 400, id);
    assert.match(p.text, /\.$/, id);
    const copy = norm(await read(page.file));
    // No run of 12 words of the point appears word for word in its page.
    const words = norm(p.text).split(' ');
    for (let i = 0; i + 12 <= words.length; i += 1) assert.ok(!copy.includes(words.slice(i, i + 12).join(' ')), `${id} quotes its page`);
  }
});

test('every point is used by a rule, and every basis of a rule is a point', () => {
  const used = new Set(RULES.flatMap((r) => r.basis));
  for (const id of Object.keys(POINTS)) assert.ok(used.has(id), `${id} is not used by a rule`);
  for (const id of used) assert.ok(Object.hasOwn(POINTS, id), `${id} is not a point`);
});

test('docs/rules-and-sources.md lists every page with its copy and every check with its level, kind and points', async () => {
  const doc = await read('docs/rules-and-sources.md');
  for (const s of SOURCES) assert.ok(doc.includes(s.url) && doc.includes(s.file), s.id);
  for (const r of RULES) {
    const section = doc.split(/^## /m).find((p) => p.startsWith(`${r.id}\n`));
    assert.ok(section, r.id);
    assert.ok(section.includes(`- Level: ${r.severity}`), r.id);
    assert.ok(section.includes('- Cannot see: '), r.id);
    for (const b of r.basis) assert.ok(section.includes(POINTS[b].text), `${r.id}: ${b}`);
    if (r.kind === 'best practice') assert.ok(norm(section).includes(BEST), r.id);
    if (r.own) assert.ok(section.includes(r.own), `${r.id}: its own choice`);
  }
});

test('the documented checks name a page, the best practice checks say what is their own choice, and the input checks rest on no page', () => {
  for (const r of RULES.filter((x) => x.kind === 'documented')) assert.ok(r.basis.length > 0, r.id);
  for (const r of RULES.filter((x) => x.kind === 'best practice')) assert.ok(r.own && r.own.includes(BEST), `${r.id} says what is its own choice`);
  for (const r of RULES.filter((x) => x.kind === 'input')) assert.deepEqual(r.basis, [], r.id);
});

test('the pages say what the documented checks rest on', async () => {
  const bip32 = norm(await read('research/sources/bip-0032-hierarchical-deterministic-wallets.txt'));
  assert.ok(bip32.includes('The hardened child keys use indices 2<sup>31</sup> through 2<sup>32</sup>-1.'));
  assert.ok(bip32.includes('a number i<sub>H</sub> represents i+2<sup>31</sup>'));
  assert.ok(bip32.includes('It is only defined for non-hardened child keys.'));
  assert.ok(bip32.includes('knowledge of a parent extended public key plus any non-hardened private key descending from it is equivalent to knowing the parent extended private key'));
  assert.equal(HARDENED, 2 ** 31);
  const bip44 = norm(await read('research/sources/bip-0044-multi-account-hierarchy.txt'));
  assert.ok(bip44.includes("m / purpose' / coin_type' / account' / change / address_index"));
  assert.ok(bip44.includes("Purpose is a constant set to 44' (or 0x8000002C)"));
  assert.equal(bip44.split('Hardened derivation is used at this level.').length - 1, 3, 'purpose, coin type and account');
  assert.equal(bip44.split('Public derivation is used at this level.').length - 1, 2, 'change and index');
  assert.ok(bip44.includes('Constant 0 is used for external chain and constant 1 for internal chain'));
  assert.ok(bip44.includes('Accounts are numbered from index 0 in sequentially increasing manner.'));
  assert.ok(bip44.includes('if no transactions are found on the external chain, stop discovery'));
  assert.ok(bip44.includes('Address gap limit is currently set to 20.'));
  assert.ok(bip44.includes('avoiding reusing addresses across cryptocoins'));
  assert.ok(norm(await read('research/sources/bip-0049-p2wpkh-nested-in-p2sh.txt')).includes("For the `purpose`-path level it uses `49'`."));
  assert.ok(norm(await read('research/sources/bip-0084-p2wpkh.txt')).includes("For the <code>purpose</code>-path level it uses <code>84'</code>."));
  assert.ok(norm(await read('research/sources/bip-0086-p2tr.txt')).includes("For the <tt>purpose</tt>-path level it uses <tt>86'</tt>."));
  const slip10 = norm(await read('research/sources/slip-0010-universal-private-key-derivation.txt'));
  assert.ok(slip10.includes('For ed25519 and curve25519 only hardened key generation from private parent key to private child key is supported.'));
  const slip44 = await read('research/sources/slip-0044-registered-coin-types.txt');
  assert.ok(slip44.includes('All these constants are used as hardened derivation.'));
  assert.match(slip44, /^\| 1 +\| +\| Testnet \(all coins\) +\|$/m);
  assert.equal(TESTNET_COIN_TYPE, 1);
});

test('every coin of the table is a row of the saved copy of SLIP-44, with its number, symbol and name', async () => {
  const rows = (await read('research/sources/slip-0044-registered-coin-types.txt')).split('\n').filter((l) => l.startsWith('| ')).map((l) => l.split('|').map((c) => c.trim()));
  for (const c of COINS) {
    const row = rows.find((r) => r[1] === String(c.coinType));
    assert.ok(row, c.id);
    assert.equal(row[2], c.symbol, c.id);
    assert.equal(row[3], c.title, c.id);
  }
  assert.ok(ADDRESS_TYPES.every((t) => [44, 49, 84, 86].includes(t.purpose)));
});

test('size helpers: grouped numbers, lists for a sentence and plurals', () => {
  assert.equal(grouped(12345), '12,345');
  assert.equal(listText(['a']), 'a');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(listText(['a', 'b', 'c']), 'a, b and c');
  assert.equal(listText(['a', 'b', 'c', 'd', 'e'], 3), 'a, b, c and 2 more');
  assert.equal(plural(1, 'line'), '1 line');
  assert.equal(plural(2, 'line'), '2 lines');
  assert.equal(plural(2, 'entry', 'entries'), '2 entries');
});

test('text helpers: safeText replaces control, direction and separator characters and caps the length; flat folds white space', () => {
  const bad = ['a', String.fromCharCode(0x1b), '[31m', String.fromCharCode(0x202e), 'b', String.fromCharCode(0x2028), 'c', String.fromCharCode(7), 'd', String.fromCharCode(0x85), 'e'].join('');
  const out = safeText(bad);
  assert.ok(![...out].some((c) => c.charCodeAt(0) < 32 || [0x202e, 0x2028, 0x85].includes(c.charCodeAt(0))));
  assert.equal(safeText('x'.repeat(50), 10), 'xxxxxxx...');
  assert.equal(safeText('short', 10), 'short');
  assert.equal(flat('  a \n  b\t c '), 'a b c');
});
