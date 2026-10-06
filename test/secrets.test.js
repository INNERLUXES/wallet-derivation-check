import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_KEYS, checkText, findSecrets, isSecretKey, readJson, secretShape } from '../src/index.js';
import { ENTRIES, config, configText, entry, ofCheck, run } from './helpers.js';

// Shapes built from repeated characters, so that no file of the repository holds anything that could be a real seed or
// key.
const MNEMONIC = Array.from({ length: 12 }, () => 'lantern').join(' ');
const MNEMONIC_24 = Array.from({ length: 24 }, (_, i) => (i % 2 ? 'harbor' : 'lantern')).join(' ');
const XPRV = `x${'prv'}${'9'.repeat(107)}`;
const HEX = `0x${'ab'.repeat(32)}`;
const WIF = `5${'H'.repeat(50)}`;

test('secretShape: a mnemonic of 12 to 24 words, an extended private key, a key in hex and a key in WIF', () => {
  assert.equal(secretShape(MNEMONIC), 'a mnemonic');
  assert.equal(secretShape(MNEMONIC_24), 'a mnemonic');
  assert.equal(secretShape(`  ${MNEMONIC}  `), 'a mnemonic');
  assert.equal(secretShape(XPRV), 'an extended private key');
  assert.equal(secretShape(`t${'prv'}${'8'.repeat(107)}`), 'an extended private key');
  assert.equal(secretShape(HEX), 'a private key in hex');
  assert.equal(secretShape(HEX.slice(2)), 'a private key in hex');
  assert.equal(secretShape(WIF), 'a private key in WIF');
  assert.equal(secretShape(`K${'z'.repeat(51)}`), 'a private key in WIF');
});

test('secretShape: near misses are not secrets', () => {
  for (const ok of [Array.from({ length: 11 }, () => 'lantern').join(' '), Array.from({ length: 13 }, () => 'lantern').join(' '), `${MNEMONIC.slice(0, -1)}N`, 'A made-up configuration for the examples, with no seed and no key.', `x${'pub'}${'9'.repeat(107)}`, `0x${'ab'.repeat(31)}`, `0x${'ab'.repeat(20)}`, `5${'H'.repeat(40)}`, `5${'0'.repeat(50)}`, "m/84'/0'/0'/0/0", 'bitcoin', '']) assert.equal(secretShape(ok), null, ok);
});

test('isSecretKey: names of seeds and keys in any case and with any separator, and near misses', () => {
  for (const k of ['mnemonic', 'Mnemonic', 'seedPhrase', 'seed_phrase', 'SEED-WORDS', 'privateKey', 'private_key', 'xprv', 'wif', 'secret', 'passphrase', 'recoveryPhrase']) assert.ok(isSecretKey(k), k);
  for (const k of ['name', 'path', 'gapLimit', 'seeded', 'privacy', 'notes', 'publicKey']) assert.ok(!isSecretKey(k), k);
  assert.ok(SECRET_KEYS.includes('mnemonic'));
});

test('secret-in-config: a key named for a seed, at its line, with the value never shown in any format', async () => {
  const text = configText(config({ mnemonic: MNEMONIC }));
  const f = ofCheck(config({ mnemonic: MNEMONIC }), 'secret-in-config');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /The configuration holds the key "mnemonic", which names a seed, a mnemonic or a private key\. The tool never reads one, and the value is not shown\./);
  assert.equal(f[0].line, text.split('\n').findIndex((l) => l.includes('"mnemonic"')) + 1);
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const r = await run({ 'w.json': text }, ['w.json', '--format', format]);
    assert.equal(r.code, 1, format);
    assert.ok(!r.out.includes('lantern'), format);
  }
  assert.ok(!findSecrets(readJson(configText(config()))).length, 'a clean configuration has none');
});

test('secret-in-config: a value shaped like a key under any field, the field left out of the checks and never echoed', async () => {
  for (const [shape, value] of [['a mnemonic', MNEMONIC], ['an extended private key', XPRV], ['a private key in hex', HEX], ['a private key in WIF', WIF]]) {
    const c = config({}, [entry(value, 'bitcoin', 'mainnet', value, 'p2wpkh', { notes: value }), ENTRIES[1]]);
    const r = checkText(configText(c));
    const secrets = r.findings.filter((f) => f.id === 'secret-in-config');
    assert.equal(secrets.length, 3, shape);
    assert.match(secrets[0].message, new RegExp(`is shaped like ${shape}\\. The tool never reads a seed or a key, and the value is not shown\\.`));
    assert.match(secrets[1].message, /^The value of "path" is shaped like/);
    assert.ok(!r.findings.some((f) => f.message.includes(value)), shape);
    assert.ok(!r.findings.some((f) => f.id === 'field-missing' || f.id === 'path-unparsable'), `${shape}: the field is there, but not read`);
    assert.equal(r.analysis.rows[0].entry, 'entry 1');
    const out = await run({ 'w.json': configText(c) }, ['w.json', '--json', '--explain']);
    assert.ok(!out.out.includes(value), shape);
  }
});

test('secret-in-config: a key shaped like a mnemonic is not shown, and a secret in a list or under a secret key is reported once', () => {
  const r = checkText(configText(config({ [MNEMONIC]: 1, extra: [HEX], privateKey: { nested: XPRV } })));
  const secrets = r.findings.filter((f) => f.id === 'secret-in-config');
  assert.equal(secrets.length, 3);
  assert.ok(secrets.some((f) => /a key shaped like a mnemonic/.test(f.message)));
  assert.ok(secrets.some((f) => /^The value of "extra" is shaped like a private key in hex/.test(f.message)));
  assert.ok(secrets.some((f) => /the key "privateKey"/.test(f.message)));
  assert.ok(!r.findings.some((f) => f.message.includes('lantern') || f.message.includes(HEX) || f.message.includes(XPRV)));
  assert.ok(r.findings.some((f) => f.id === 'field-unknown' && /"extra"/.test(f.message)), 'a list under an unknown key is still an unknown key');
  assert.ok(!r.findings.some((f) => f.id === 'field-unknown' && /privateKey|lantern/.test(f.message)));
});

test('secret-in-config: a secret value under a field that must be a number is not described', () => {
  const c = config({}, [entry('Bitcoin', 'bitcoin', 'mainnet', "m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: HEX }), ENTRIES[1]]);
  const r = checkText(configText(c));
  assert.deepEqual(r.findings.map((f) => f.id), ['secret-in-config']);
});
