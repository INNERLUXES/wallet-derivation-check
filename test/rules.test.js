import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEST, BIP44_GAP_LIMIT, RULES, analyzeConfig, checkText, readConfig, readJson } from '../src/index.js';
import { ENTRIES, config, configText, entry, idsOf, lineOf, ofCheck, withEntry } from './helpers.js';

const BTC = (path, type = 'p2wpkh', extra = {}) => entry('Bitcoin', 'bitcoin', 'mainnet', path, type, extra);
const ETH = (path, extra = {}) => entry('Ethereum', 'ethereum', 'mainnet', path, 'evm', extra);
const SOL = (path) => entry('Solana', 'solana', 'mainnet', path, 'ed25519');
// The configuration with one entry replaced: 0 Bitcoin, 1 Ethereum, 2 Solana.
const only = (e, at) => withEntry(e, at);
const BP = /This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10\./;

test('every check has an id, a level, a kind, a summary and a fix, and the ids are unique', () => {
  assert.equal(RULES.length, 21);
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length);
  for (const r of RULES) {
    assert.ok(['error', 'warning', 'info'].includes(r.severity), r.id);
    assert.ok(['documented', 'best practice', 'input'].includes(r.kind), r.id);
    assert.ok(r.summary.length > 20 && r.fix.length > 20, r.id);
  }
});

test('the configuration of the helpers gives no finding, and every finding of a check is at the line of its field', () => {
  assert.deepEqual(idsOf(config()), []);
  const c = only(BTC("m/44'/0'/0'/0/0"), 0);
  assert.equal(ofCheck(c, 'purpose-mismatch')[0].line, lineOf(configText(c), '"path"'));
});

test('path-unparsable: a path that is not BIP-32 notation, with what is wrong, and the other checks of the path left out', () => {
  const c = only(BTC("m/84'/0'/x'/0/0"), 0);
  const f = ofCheck(c, 'path-unparsable');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /^The path "m\/84'\/0'\/x'\/0\/0" of entry Bitcoin has "x'" at level 3, which is not a whole number/);
  assert.deepEqual(idsOf(c), ['path-unparsable']);
  assert.ok(checkText(configText(c)).notes.some((n) => /the path of Bitcoin could not be read, so it was not compared/.test(n)));
  assert.deepEqual(idsOf(only(BTC("m/84'/0'/0'/0/0"), 0)), []);
});

test('path-depth: a secp256k1 path of four or six levels, and an ed25519 path of two; not five, or three for ed25519', () => {
  assert.match(ofCheck(only(BTC("m/84'/0'/0'/0"), 0), 'path-depth')[0].message, /The path m\/84'\/0'\/0'\/0 of entry Bitcoin has 4 levels below m; BIP-44, and BIP-49, BIP-84 and BIP-86 after it, use five/);
  assert.equal(ofCheck(only(BTC("m/84'/0'/0'/0/0/0"), 0), 'path-depth').length, 1);
  assert.match(ofCheck(only(SOL("m/44'/501'"), 2), 'path-depth')[0].message, /has 2 levels below m; BIP-44 puts the purpose, the coin type and the account first/);
  assert.deepEqual(ofCheck(only(SOL("m/44'/501'/0'"), 2), 'path-depth'), []);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0/0"), 0), 'path-depth'), []);
  assert.equal(ofCheck(only(ETH('m'), 1), 'path-depth').length, 1);
});

test('purpose-mismatch: each address type against its purpose, and every type under its own purpose passes', () => {
  const pairs = [['p2pkh', 44], ['p2sh-p2wpkh', 49], ['p2wpkh', 84], ['p2tr', 86]];
  for (const [type, purpose] of pairs) {
    assert.deepEqual(idsOf(only(BTC(`m/${purpose}'/0'/0'/0/0`, type), 0)), [], type);
    for (const [, other] of pairs.filter(([t]) => t !== type)) {
      const f = ofCheck(only(BTC(`m/${other}'/0'/0'/0/0`, type), 0), 'purpose-mismatch');
      assert.equal(f.length, 1, `${type} under ${other}`);
    }
  }
  assert.match(ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2tr'), 0), 'purpose-mismatch')[0].message, /has purpose 84, but the address type p2tr is derived under purpose 86 \(BIP-86\)\. A wallet that restores the seed looks for p2tr addresses under 86' and does not find these\./);
  assert.match(ofCheck(only(ETH("m/0'/60'/0'/0/0"), 1), 'purpose-mismatch')[0].message, /purpose 0, but the address type evm is derived under purpose 44 \(BIP-44\); 0 is none of the purposes 44, 49, 84, 86/);
  assert.equal(ofCheck(only(SOL("m/84'/501'/0'/0'"), 2), 'purpose-mismatch').length, 1);
});

test('coin-type-mismatch: a mainnet coin type that is not the SLIP-44 number of the coin; not the right one, and not a coin out of the table', () => {
  const f = ofCheck(only(ETH("m/44'/61'/0'/0/0"), 1), 'coin-type-mismatch');
  assert.match(f[0].message, /has coin type 61, but SLIP-44 registers Ether as 60\. A wallet that restores the seed looks for Ether under 60' and does not find these addresses\./);
  for (const [coin, n, type] of [['bitcoin', 0, 'p2wpkh'], ['litecoin', 2, 'p2wpkh'], ['dogecoin', 3, 'p2pkh'], ['bitcoin-cash', 145, 'p2pkh'], ['ethereum-classic', 61, 'evm']]) {
    const purpose = type === 'p2wpkh' ? 84 : 44;
    assert.deepEqual(idsOf(only(entry('C', coin, 'mainnet', `m/${purpose}'/${n}'/0'/0/0`, type), 0)), [], coin);
    assert.equal(ofCheck(only(entry('C', coin, 'mainnet', `m/${purpose}'/${n + 7}'/0'/0/0`, type), 0), 'coin-type-mismatch').length, 1, coin);
  }
  assert.deepEqual(idsOf(only(entry('Avalanche', 'avalanche', 'mainnet', "m/44'/9000'/0'/0/0", 'evm'), 1)), ['coin-not-in-table']);
});

test('testnet-coin-on-mainnet and mainnet-coin-on-testnet: coin type 1 on the wrong network, both ways, and the right way passes', () => {
  const main = ofCheck(only(BTC("m/84'/1'/0'/0/0"), 0), 'testnet-coin-on-mainnet');
  assert.match(main[0].message, /Entry Bitcoin is on mainnet, but its path m\/84'\/1'\/0'\/0\/0 has coin type 1, which SLIP-44 keeps for the testnets of all coins\..*a wallet that restores the seed for Bitcoin does not look\./);
  assert.deepEqual(idsOf(only(BTC("m/84'/1'/0'/0/0"), 0)), ['testnet-coin-on-mainnet'], 'not a coin type mismatch too');
  const test = ofCheck(only(entry('Bitcoin', 'bitcoin', 'testnet', "m/84'/0'/0'/0/0", 'p2wpkh'), 0), 'mainnet-coin-on-testnet');
  assert.match(test[0].message, /Entry Bitcoin is on testnet, but its path m\/84'\/0'\/0'\/0\/0 has coin type 0, the mainnet number of Bitcoin, not 1/);
  assert.match(ofCheck(only(entry('Bitcoin', 'bitcoin', 'testnet', "m/84'/5'/0'/0/0", 'p2wpkh'), 0), 'mainnet-coin-on-testnet')[0].message, /has coin type 5, not 1/);
  assert.deepEqual(idsOf(only(entry('Bitcoin', 'bitcoin', 'testnet', "m/84'/1'/0'/0/0", 'p2wpkh'), 0)), []);
  assert.equal(ofCheck(only(entry('Polygon', 'polygon', 'mainnet', "m/44'/1'/0'/0/0", 'evm'), 1), 'testnet-coin-on-mainnet').length, 1, 'a coin out of the table on coin type 1');
});

test('level-not-hardened: the purpose, the coin type or the account without the mark; not the change or the index', () => {
  const f = ofCheck(only(BTC('m/84/0/0/0/0'), 0), 'level-not-hardened');
  assert.match(f[0].message, /derives the purpose, coin type and account without the hardened mark; BIP-44 hardens the purpose, the coin type and the account/);
  assert.match(ofCheck(only(BTC("m/84'/0'/{account}/0/0"), 0), 'level-not-hardened')[0].message, /derives the account without/);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0/0"), 0), 'level-not-hardened'), []);
  assert.deepEqual(ofCheck(only(SOL('m/44/501/0/0'), 2), 'level-not-hardened'), [], 'an ed25519 path has a check of its own');
});

test('level-hardened: a hardened change or address index on a five-level secp256k1 path; not on other depths or on ed25519', () => {
  assert.match(ofCheck(only(BTC("m/84'/0'/0'/0'/0'"), 0), 'level-hardened')[0].message, /derives the change and address index hardened; BIP-44 uses normal derivation for the change and the address index/);
  assert.match(ofCheck(only(BTC("m/84'/0'/0'/0/{index}'"), 0), 'level-hardened')[0].message, /derives the address index hardened/);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0/0"), 0), 'level-hardened'), []);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0'"), 0), 'level-hardened'), []);
  assert.deepEqual(ofCheck(only(SOL("m/44'/501'/0'/0'/0'"), 2), 'level-hardened'), []);
});

test('change-out-of-range: a change of 2 or more on a five-level secp256k1 path; not 0, 1 or {change}', () => {
  const f = ofCheck(only(ETH("m/44'/60'/0'/2/0"), 1), 'change-out-of-range');
  assert.match(f[0].message, /The change level of the path m\/44'\/60'\/0'\/2\/0 of entry Ethereum is 2; BIP-44 uses 0 for the external chain of receiving addresses and 1 for the internal chain of change/);
  for (const ok of ["m/44'/60'/0'/0/0", "m/44'/60'/0'/1/0", "m/44'/60'/0'/{change}/0"]) assert.deepEqual(ofCheck(only(ETH(ok), 1), 'change-out-of-range'), [], ok);
  assert.equal(ofCheck(only(ETH("m/44'/60'/0'/2'/0"), 1), 'change-out-of-range').length, 1, 'hardened too');
});

test('ed25519-unhardened: any level of an ed25519 path without the mark; not a path hardened all through', () => {
  const f = ofCheck(only(SOL("m/44'/501'/0'/0"), 2), 'ed25519-unhardened');
  assert.match(f[0].message, /The path m\/44'\/501'\/0'\/0 of entry Solana is for an ed25519 key, but the change is not hardened; SLIP-10 derives ed25519 keys through hardened levels only/);
  assert.match(ofCheck(only(SOL('m/44/501/0'), 2), 'ed25519-unhardened')[0].message, /the purpose, coin type and account are not hardened/);
  assert.deepEqual(idsOf(only(SOL("m/44'/501'/0'/0'"), 2)), []);
  assert.deepEqual(idsOf(only(SOL("m/44'/501'/{index}'"), 2)), []);
  assert.deepEqual(ofCheck(only(entry('Polygon', 'polygon', 'mainnet', "m/44'/966'/0'/0/0", 'ed25519'), 1), 'ed25519-unhardened').length, 1, 'by the address type, for a coin out of the table');
});

test('account-gap: accounts that skip one or do not start at 0, at the first account after the gap; not with {account} or no gap', () => {
  const two = config({}, [...ENTRIES, ETH("m/44'/60'/2'/0/0")]);
  const f = ofCheck(two, 'account-gap');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(configText(two), "\"m/44'/60'/2'/0/0\""));
  assert.match(f[0].message, /The entries under m\/44'\/60' on mainnet derive accounts 0 and 2, but not account 1: BIP-44 numbers accounts from 0 up/);
  const late = only(ETH("m/44'/60'/3'/0/0"), 1);
  assert.match(ofCheck(late, 'account-gap')[0].message, /derive account 3, but not accounts 0, 1 and 2/);
  assert.match(ofCheck(only(ETH("m/44'/60'/9'/0/0"), 1), 'account-gap')[0].message, /but not accounts 0 to 8/);
  assert.deepEqual(ofCheck(config({}, [...ENTRIES, ETH("m/44'/60'/1'/0/0")]), 'account-gap'), []);
  assert.deepEqual(ofCheck(config({}, [...ENTRIES, entry('Bitcoin 5', 'bitcoin', 'mainnet', "m/84'/0'/5'/0/0", 'p2wpkh')]), 'account-gap'), [], 'the group has {account}');
  assert.deepEqual(ofCheck(config({}, [...ENTRIES, entry('Test', 'ethereum', 'testnet', "m/44'/1'/0'/0/0", 'evm')]), 'account-gap'), [], 'another network is another group');
});

test('gap-limit-low: a gap limit below 20; not 20 or more, and not when none is given', () => {
  const f = ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 19 }), 0), 'gap-limit-low');
  assert.match(f[0].message, /Entry Bitcoin has a gap limit of 19, below the 20 of BIP-44: .* stops after 19 unused addresses in a row/);
  assert.match(ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 1 }), 0), 'gap-limit-low')[0].message, /stops after 1 unused address in a row/);
  assert.equal(ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 0 }), 0), 'gap-limit-low').length, 1);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 20 }), 0), 'gap-limit-low'), []);
  assert.deepEqual(ofCheck(only(BTC("m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 100 }), 0), 'gap-limit-low'), []);
  assert.equal(BIP44_GAP_LIMIT, 20);
});

test('path-duplicate: the same path, and a path a template can name, reported once at the later entry; not a hardened near miss', () => {
  const same = config({}, [...ENTRIES, entry('Polygon', 'polygon', 'mainnet', "m/44'/60'/0'/0/{index}", 'evm')]);
  const f = ofCheck(same, 'path-duplicate');
  assert.equal(f.length, 1);
  assert.equal(f[0].line, lineOf(configText(same), '"path"', 4));
  assert.match(f[0].message, new RegExp(`Entry Polygon derives m/44'/60'/0'/0/\\{index\\}, the same path as entry Ethereum at line ${lineOf(configText(same), '"path"', 2)}, so the two derive one key\\.`));
  assert.match(f[0].message, BP);
  const overlap = config({}, [...ENTRIES, entry('Litecoin', 'litecoin', 'mainnet', "m/84'/0'/3'/1/7", 'p2wpkh')]);
  assert.match(ofCheck(overlap, 'path-duplicate')[0].message, /Entry Litecoin derives m\/84'\/0'\/3'\/1\/7, and entry Bitcoin at line \d+ derives m\/84'\/0'\/\{account\}'\/\{change\}\/\{index\}; the two can name the same key\. One key then holds Bitcoin and Litecoin\./);
  assert.deepEqual(ofCheck(config({}, [...ENTRIES, entry('Other', 'ethereum', 'mainnet', "m/44'/60'/0'/0/{index}'", 'evm')]), 'path-duplicate'), []);
  const three = config({}, [...ENTRIES, entry('A', 'polygon', 'mainnet', "m/44'/60'/0'/0/{index}", 'evm'), entry('B', 'polygon', 'mainnet', "m/44'/60'/0'/0/1", 'evm')]);
  assert.equal(ofCheck(three, 'path-duplicate').length, 2, 'each later entry once');
});

test('address-type-family: an address type of another family than the coin; not one of its own family, nor a coin out of the table', () => {
  const f = ofCheck(only(entry('Ethereum', 'ethereum', 'mainnet', "m/84'/60'/0'/0/0", 'p2wpkh'), 1), 'address-type-family');
  assert.match(f[0].message, /Entry Ethereum is Ether, which takes EVM account addresses \(evm\), but its addressType is p2wpkh, one of the Bitcoin script types/);
  assert.match(f[0].message, BP);
  assert.equal(ofCheck(only(entry('Bitcoin', 'bitcoin', 'mainnet', "m/44'/0'/0'/0'/0'", 'ed25519'), 0), 'address-type-family').length, 1);
  assert.deepEqual(ofCheck(config(), 'address-type-family'), []);
  assert.deepEqual(ofCheck(only(entry('Tron', 'tron', 'mainnet', "m/44'/195'/0'/0/0", 'p2pkh'), 1), 'address-type-family'), []);
});

test('coin-not-in-table: a coin the table does not hold, by name; not a name or a symbol of the table', () => {
  const f = ofCheck(only(entry('Tron', 'tron', 'mainnet', "m/44'/195'/0'/0/0", 'evm'), 1), 'coin-not-in-table');
  assert.match(f[0].message, /The coin "tron" of entry Tron is not in the tool's table \(bitcoin, litecoin, dogecoin, ethereum, ethereum-classic, bitcoin-cash, solana\)/);
  assert.match(f[0].message, BP);
  assert.deepEqual(idsOf(only(entry('Ethereum', 'ETH', 'mainnet', "m/44'/60'/0'/0/0", 'evm'), 1)), []);
});

test('the best practice checks say so in their message; the documented ones do not', () => {
  const r = checkText(configText(config({}, [ENTRIES[0], entry('Ethereum', 'ethereum', 'mainnet', "m/44'/61'/0'/2/0", 'p2wpkh'), entry('Polygon', 'polygon', 'mainnet', "m/44'/61'/0'/2/0", 'evm'), ENTRIES[2]])));
  for (const f of r.findings) {
    const kind = RULES.find((x) => x.id === f.id).kind;
    assert.equal(f.message.includes(BEST), kind === 'best practice', f.id);
  }
  assert.ok(r.findings.length >= 4);
});

test('analyzeConfig: the rows of the table, with the path in one notation and nothing for a path that was not read', () => {
  const { config: c } = readConfig(readJson(configText(config({}, [ENTRIES[0], ETH('m/44h/60h/0h/0/0'), BTC('bad')]))));
  const { rows } = analyzeConfig(c);
  assert.deepEqual(rows.map((r) => r.path), ["m/84'/0'/{account}'/{change}/{index}", "m/44'/60'/0'/0/0", null]);
  assert.deepEqual(rows[0], { entry: 'Bitcoin', coin: 'bitcoin', network: 'mainnet', addressType: 'p2wpkh', path: "m/84'/0'/{account}'/{change}/{index}", gapLimit: 20 });
});
