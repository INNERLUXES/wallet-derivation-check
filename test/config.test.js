import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADDRESS_TYPES, COINS, CONFIG_LIMITS, ENTRY_KEYS, FAMILIES, NETWORKS, PURPOSES, TESTNET_COIN_TYPE, TOP_KEYS, addressTypeOf, checkText, coinOf, readConfig, readJson, suggestKey } from '../src/index.js';
import { ENTRIES, config, configText, entry, idsOf, lineOf, ofCheck, withEntry } from './helpers.js';

test('readConfig: the wallet and its entries, with the coin, network, address type and gap limit of each', () => {
  const { config: c, findings } = readConfig(readJson(configText(config({ notes: 'made up' }))));
  assert.deepEqual(findings, []);
  assert.equal(c.wallet, 'Test Wallet');
  assert.deepEqual(c.entries.map((e) => [e.name, e.coin.id, e.network, e.addressType.id, e.gapLimit]), [['Bitcoin', 'bitcoin', 'mainnet', 'p2wpkh', 20], ['Ethereum', 'ethereum', 'mainnet', 'evm', null], ['Solana', 'solana', 'mainnet', 'ed25519', null]]);
  assert.equal(c.entries[0].pathText, "m/84'/0'/{account}'/{change}/{index}");
});

test('the lists of keys, networks, purposes, coins and address types', () => {
  assert.deepEqual(TOP_KEYS, ['wallet', 'entries', 'notes']);
  assert.deepEqual(ENTRY_KEYS, ['name', 'coin', 'network', 'path', 'addressType', 'gapLimit', 'notes']);
  assert.deepEqual(NETWORKS, ['mainnet', 'testnet']);
  assert.deepEqual(PURPOSES, [44, 49, 84, 86]);
  assert.equal(TESTNET_COIN_TYPE, 1);
  assert.deepEqual(ADDRESS_TYPES.map((t) => `${t.id}:${t.purpose}`), ['p2pkh:44', 'p2sh-p2wpkh:49', 'p2wpkh:84', 'p2tr:86', 'evm:44', 'ed25519:44']);
  for (const c of COINS) assert.ok(Object.hasOwn(FAMILIES, c.family), c.id);
  assert.equal(new Set(COINS.map((c) => c.coinType)).size, COINS.length);
  assert.equal(CONFIG_LIMITS.maxEntries, 1000);
});

test('coinOf and addressTypeOf: by name or symbol, in any case and with outer spaces', () => {
  assert.equal(coinOf('Bitcoin').coinType, 0);
  assert.equal(coinOf(' btc ').id, 'bitcoin');
  assert.equal(coinOf('SOL').coinType, 501);
  assert.equal(coinOf('polygon'), null);
  assert.equal(addressTypeOf('P2WPKH').purpose, 84);
  assert.equal(addressTypeOf('segwit'), null);
});

test('config-unreadable: text that is not JSON and JSON that is not an object; not an object with fields missing', () => {
  for (const text of ['{"wallet": "a",}', '[1, 2]', '"wallet"', '{"a": 1, "a": 2}']) {
    const r = checkText(text);
    assert.deepEqual(r.findings.map((f) => f.id), ['config-unreadable'], text);
    assert.equal(r.config, null);
  }
  assert.match(checkText('[]').findings[0].message, /The file holds a list, not a wallet configuration/);
  assert.ok(!checkText('{}').findings.some((f) => f.id === 'config-unreadable'));
  assert.match(checkText('{"a": 1,\n "b": }').findings[0].message, /at line 2, column 7/);
});

test('field-missing: every field the checks need, at the line of the object that lacks it', () => {
  assert.equal(ofCheck(config({ wallet: undefined }), 'field-missing').length, 1);
  assert.match(ofCheck(config({ entries: undefined }), 'field-missing')[0].message, /has no entries/);
  assert.match(ofCheck(config({}, []), 'field-missing')[0].message, /an empty list; give at least one entry/);
  for (const key of ['name', 'coin', 'network', 'path', 'addressType']) {
    const e = { ...ENTRIES[1] };
    delete e[key];
    const c = withEntry(e, 1);
    const f = ofCheck(c, 'field-missing');
    assert.equal(f.length, 1, key);
    assert.equal(f[0].message, `Entry 2 has no ${key}.`);
    assert.equal(f[0].line, lineOf(configText(c), '\n    {', 2) + 1);
  }
  assert.deepEqual(idsOf(withEntry({ ...ENTRIES[0], gapLimit: undefined }, 0)), [], 'the gap limit is not needed');
});

test('field-unknown: a key the tool does not read, with the key it is probably meant to be', () => {
  const f = ofCheck(config({ wallets: 'x' }), 'field-unknown');
  assert.match(f[0].message, /The key "wallets" of the configuration is not one the tool reads.*Did you mean "wallet"\?/);
  const g = ofCheck(withEntry({ ...ENTRIES[1], AddressType: 'evm' }, 1), 'field-unknown');
  assert.match(g[0].message, /The key "AddressType" of entry 2 .*Did you mean "addressType"\?/);
  assert.match(ofCheck(config({ zz: 1 }), 'field-unknown')[0].message, /reads, so its value was left out of every check\. The keys of the configuration are wallet, entries, notes\./);
  assert.equal(suggestKey('gaplimit', ENTRY_KEYS), 'gapLimit');
  assert.equal(suggestKey('pa', ENTRY_KEYS), null);
  assert.equal(suggestKey('coins', ENTRY_KEYS), 'coin');
});

test('field-invalid: values of the wrong type or form, each named; near misses pass', () => {
  const msg = (e) => ofCheck(withEntry(e, 1), 'field-invalid').map((f) => f.message);
  assert.match(msg({ ...ENTRIES[1], network: 'main' })[0], /The network of entry Ethereum is "main"; it must be mainnet or testnet\./);
  assert.deepEqual(msg({ ...ENTRIES[1], network: ' Mainnet ' }), [], 'case and outer spaces are fine');
  assert.match(msg({ ...ENTRIES[1], addressType: 'segwit' })[0], /The addressType of entry Ethereum is "segwit", not one the tool knows; it must be one of p2pkh, p2sh-p2wpkh, p2wpkh, p2tr, evm, ed25519\./);
  assert.match(msg({ ...ENTRIES[1], path: 44 })[0], /The path of entry Ethereum is the number 44; it must be text\./);
  assert.match(msg({ ...ENTRIES[1], name: '  ' })[0], /The name of entry 2 is empty\./);
  assert.match(msg({ ...ENTRIES[1], gapLimit: 20.5 })[0], /The gapLimit of entry Ethereum is the number 20\.5; it must be a whole number from 0 to 1000000\./);
  assert.match(msg({ ...ENTRIES[1], gapLimit: '20' })[0], /is text; it must be a whole number/);
  assert.match(msg({ ...ENTRIES[1], gapLimit: 1000001 })[0], /the number 1000001/);
  assert.match(msg({ ...ENTRIES[1], gapLimit: -1 })[0], /the number -1/);
  assert.deepEqual(msg({ ...ENTRIES[1], gapLimit: 1000000 }), []);
  assert.match(msg({ ...ENTRIES[1], notes: 3 })[0], /The notes of entry Ethereum are the number 3; they must be text\./);
  assert.match(ofCheck(config({ notes: [] }), 'field-invalid')[0].message, /The notes of the configuration are a list/);
  assert.match(ofCheck(config({ entries: {} }), 'field-invalid')[0].message, /The entries of the configuration are an object; they must be a list of objects\./);
  assert.match(ofCheck(config({}, [...ENTRIES, 'x']), 'field-invalid')[0].message, /Entry 4 of the entries is text; an entry is an object/);
  assert.match(ofCheck(config({ wallet: true }), 'field-invalid')[0].message, /The wallet of the configuration is true; it must be text\./);
  assert.match(ofCheck(config({}, [...ENTRIES, `m${'1'.repeat(60)}`]), 'field-invalid')[0].message, /is text/);
});

test('field-invalid: more entries than the limit; only the first are read', () => {
  const many = Array.from({ length: CONFIG_LIMITS.maxEntries + 2 }, (_, i) => entry(`E${i}`, 'ethereum', 'mainnet', `m/44'/60'/0'/0/${i}`, 'evm'));
  const r = checkText(configText(config({}, many)));
  assert.ok(r.findings.some((f) => f.id === 'field-invalid' && /1002 entries, more than the limit of 1000; only the first 1000 were read/.test(f.message)));
  assert.equal(r.config.entries.length, CONFIG_LIMITS.maxEntries);
});

test('entry-duplicate: two entries of one name, compared without case and outer spaces, at the line of the second name', () => {
  const c = config({}, [...ENTRIES, entry(' solana ', 'solana', 'mainnet', "m/44'/501'/{account}'/1'", 'ed25519')]);
  const f = ofCheck(c, 'entry-duplicate');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(configText(c), '" solana "'));
  assert.match(f[0].message, new RegExp(`Entry 4 is named  solana , as is entry 3 at line ${lineOf(configText(c), '"Solana"')}`));
  assert.deepEqual(ofCheck(config({}, [...ENTRIES, entry('Solana 2', 'solana', 'mainnet', "m/44'/501'/{account}'/1'", 'ed25519')]), 'entry-duplicate'), []);
});
