import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { CONFIG_LIMITS, JSON_LIMITS, PATH_LIMITS, checkText } from '../src/index.js';
import { ENTRIES, allowed, cli, config, configText, entry, run, withFiles } from './helpers.js';

// Each test builds input meant to make the tool slow or to exhaust the stack or the memory, and checks that it ends with
// an answer in good time. The time allowed is four times as long under coverage (NODE_V8_COVERAGE is set only when
// coverage is on).

function timed(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  return { value, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

test('a thousand entries, all compared with each other for shared keys, are checked in good time', () => {
  const many = Array.from({ length: CONFIG_LIMITS.maxEntries }, (_, i) => entry(`E${i}`, 'ethereum', 'mainnet', `m/44'/60'/${i}'/0/{index}`, 'evm'));
  const { value, ms } = timed(() => checkText(configText(config({}, many))));
  assert.equal(value.config.entries.length, CONFIG_LIMITS.maxEntries);
  assert.deepEqual(value.findings, []);
  assert.ok(ms < allowed(10000), `took ${ms} ms`);
  const same = Array.from({ length: CONFIG_LIMITS.maxEntries }, (_, i) => entry(`E${i}`, 'ethereum', 'mainnet', "m/44'/60'/0'/0/{index}", 'evm'));
  const dup = timed(() => checkText(configText(config({}, same))));
  assert.equal(dup.value.findings.filter((f) => f.id === 'path-duplicate').length, CONFIG_LIMITS.maxEntries - 1);
  assert.ok(dup.ms < allowed(10000), `took ${dup.ms} ms`);
});

test('paths of the most levels and the longest text are read in good time, and longer ones are refused', () => {
  const deep = `m${"/0'".repeat(PATH_LIMITS.maxLevels)}`;
  const many = Array.from({ length: 200 }, (_, i) => entry(`E${i}`, 'solana', 'mainnet', deep.replace("m/0'", `m/${i}'`), 'ed25519'));
  const { value, ms } = timed(() => checkText(configText(config({}, many))));
  assert.ok(!value.findings.some((f) => f.id === 'path-unparsable'));
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
  const long = checkText(configText(config({}, [entry('Long', 'bitcoin', 'mainnet', `m/${'1'.repeat(100000)}`, 'p2wpkh'), ENTRIES[1]])));
  assert.match(long.findings.find((f) => f.id === 'path-unparsable').message, /is longer than 1000 characters/);
  assert.ok(long.findings.find((f) => f.id === 'path-unparsable').message.length < 1500);
});

test('deep nesting ends with an error finding at the limit, never a stack overflow, and the secret scan does not recurse', () => {
  const deep = `${'['.repeat(100000)}${']'.repeat(100000)}`;
  const { value } = timed(() => checkText(deep));
  assert.equal(value.findings[0].id, 'config-unreadable');
  assert.match(value.findings[0].message, new RegExp(`nested more than ${JSON_LIMITS.maxDepth} deep`));
  const nested = `{"notes": ${'['.repeat(JSON_LIMITS.maxDepth - 1)}"x"${']'.repeat(JSON_LIMITS.maxDepth - 1)}, "wallet": "w", "entries": []}`;
  const r = checkText(nested);
  assert.ok(r.findings.some((f) => f.id === 'field-invalid' && /notes/.test(f.message)));
  const keyed = `{"seed": ${'{"a": '.repeat(JSON_LIMITS.maxDepth - 1)}1${'}'.repeat(JSON_LIMITS.maxDepth - 1)}}`;
  assert.equal(checkText(keyed).findings.filter((f) => f.id === 'secret-in-config').length, 1);
});

test('numbers with very many digits or a huge exponent are refused as a field, not worked out', () => {
  const huge = config({}, [entry('Bitcoin', 'bitcoin', 'mainnet', "m/84'/0'/0'/0/0", 'p2wpkh', { gapLimit: 1e300 }), ENTRIES[1]]);
  const text = configText(huge).replace('1e+300', `1${'0'.repeat(5000)}`);
  const { value, ms } = timed(() => checkText(text));
  const f = value.findings.find((x) => x.id === 'field-invalid');
  assert.match(f.message, /The gapLimit of entry Bitcoin is the number 1000000000000000000000000000000000000\.\.\./);
  assert.ok(ms < allowed(3000), `took ${ms} ms`);
  assert.ok(checkText('{"wallet": "w", "entries": [{"name": "a", "coin": "bitcoin", "network": "mainnet", "path": "m/0", "addressType": "p2pkh", "gapLimit": 1e999999}]}').findings.some((x) => x.id === 'field-invalid'));
});

test('long strings and long lines are read in good time, and the secret scan stops at a length', () => {
  const long = configText(config({ notes: 'a '.repeat(200000) }, [entry('n'.repeat(200000), 'bitcoin', 'mainnet', "m/84'/0'/0'/0/0", 'p2wpkh'), ENTRIES[1]]));
  const { value, ms } = timed(() => checkText(long));
  assert.deepEqual(value.findings, []);
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
});

test('names such as __proto__, constructor and toString are only names', () => {
  const text = configText(config({}, [entry('__proto__', 'bitcoin', 'mainnet', "m/84'/0'/0'/0/0", 'p2wpkh'), entry('constructor', 'ethereum', 'mainnet', "m/44'/60'/0'/0/0", 'evm'), entry('toString', 'toString', 'mainnet', "m/44'/501'/0'/0'", 'ed25519')])).replace('"wallet": "Test Wallet",', '"wallet": "Test Wallet", "__proto__": {"polluted": 1}, "hasOwnProperty": 2,');
  const { value } = timed(() => checkText(text));
  assert.ok(value.findings.some((f) => f.id === 'field-unknown' && /"__proto__"/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'coin-not-in-table' && /"toString"/.test(f.message)));
  assert.deepEqual(value.config.entries.map((e) => e.name), ['__proto__', 'constructor', 'toString']);
  assert.equal({}.polluted, undefined);
});

test('a run leaves the folder as it was: the tool writes nothing', async () => {
  const files = { 'wallet.json': configText(config()) };
  await withFiles(files, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli(['wallet.json', '--format', 'sarif'], dir);
    await cli(['wallet.json', '--json', '--explain'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
  assert.equal((await run(files, ['wallet.json'])).code, 0);
});
