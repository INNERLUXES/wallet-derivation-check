import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/index.js';
import { BAD, EXPECTED, GOOD, GOOD_EXPECTED, UNWANTED, run } from '../tools/example.mjs';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const BAD_FILE = 'examples/bad/wallet.json';
const GOOD_FILE = 'examples/good/wallet.json';

test('examples: the bad configuration fails with the report that is saved in examples/output', async () => {
  const r = await run(BAD);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('bad.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the good configuration passes at error and warning level with the report that is saved', async () => {
  const r = await run(GOOD);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('good.txt'));
  for (const e of GOOD_EXPECTED) assert.ok(r.out.includes(e), e);
  assert.equal((await run([...GOOD, '--fail-on', 'warning'])).code, 0);
  assert.equal((await run([...GOOD, '--fail-on', 'info'])).code, 1);
  assert.doesNotMatch(r.out, /ERROR {4}|WARNING {2}/);
});

test('examples: every output saved in examples/output is the real output, in all four formats for both configurations', async () => {
  const outputs = {
    'bad-explain.txt': [...BAD, '--explain'],
    'bad.md': [...BAD, '--format', 'markdown'],
    'bad-explain.md': [...BAD, '--format', 'markdown', '--explain'],
    'bad.json': [...BAD, '--json', '--explain'],
    'bad.sarif': [...BAD, '--format', 'sarif'],
    'good.md': [...GOOD, '--format', 'markdown'],
    'good.json': [...GOOD, '--json'],
    'good.sarif': [...GOOD, '--format', 'sarif'],
    'checks.txt': ['--list-checks'],
    'checks.json': ['--list-checks', '--format', 'json']
  };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: every check but one fires on the bad configuration, each on the line built for it', async () => {
  const report = JSON.parse((await run([...BAD, '--json'])).out);
  const lines = (await readFile(resolve(root, BAD_FILE), 'utf8')).split('\n');
  const at = (needle, n = 1) => {
    let seen = 0;
    for (let i = 0; i < lines.length; i += 1) if (lines[i].includes(needle) && (seen += 1) === n) return i + 1;
    throw new Error(`${needle} x${n}`);
  };
  const of = (id) => report.findings.filter((f) => f.id === id).map((f) => f.line);
  assert.deepEqual(of('secret-in-config'), [at('"seedPhrase"')]);
  assert.deepEqual(of('purpose-mismatch'), [at(`"m/84'/0'/0'/0/{index}"`)]);
  assert.deepEqual(of('path-duplicate'), [at('"m / 84\''), at(`"m/44'/60'/0'/0/0"`, 2)]);
  assert.deepEqual(of('gap-limit-low'), [at('"gapLimit": 5')]);
  assert.deepEqual(of('testnet-coin-on-mainnet'), [at(`"m/86'/1'`)]);
  assert.deepEqual(of('mainnet-coin-on-testnet'), [at(`"m/49'/0'`)]);
  assert.deepEqual(of('path-unparsable'), [at('{wallet}')]);
  assert.deepEqual(of('coin-type-mismatch'), [at(`"m/84'/3'`)]);
  assert.deepEqual(of('field-unknown'), [at('"gaplimit"')]);
  assert.deepEqual(of('level-not-hardened'), [at('"m/44/3\'')]);
  assert.deepEqual(of('path-depth'), [at(`"m/44'/145'/0'"`)]);
  assert.deepEqual(of('account-gap'), [at(`"m/44'/60'/2'`)]);
  assert.deepEqual(of('level-hardened'), [at(`"m/44'/60'/2'`)]);
  assert.deepEqual(of('coin-not-in-table'), [at('"polygon"'), at('"tron"')]);
  assert.deepEqual(of('change-out-of-range'), [at(`"m/44'/61'`)]);
  assert.deepEqual(of('ed25519-unhardened'), [at(`"m/44'/501'/0'/0"`)]);
  assert.deepEqual(of('address-type-family'), [at('"addressType": "evm"', 5)]);
  assert.deepEqual(of('entry-duplicate'), [at('"name": "SOLANA"')]);
  assert.deepEqual(of('field-missing'), [at('"name": "Tron"') - 1]);
  assert.deepEqual(of('field-invalid'), [at('"network": "main"')]);
  assert.deepEqual(report.rules.filter((r) => r.findings === 0).map((r) => r.id), ['config-unreadable']);
  assert.equal(report.rules.length, RULES.length);
});

test('examples: the good configuration holds one note, and every entry of it is in the table with its path', async () => {
  const report = JSON.parse((await run([...GOOD, '--json'])).out);
  assert.deepEqual(report.findings.map((f) => f.id), ['coin-not-in-table']);
  assert.equal(report.table.length, 9);
  assert.ok(report.table.every((r) => r.path !== null));
  assert.deepEqual(report.wallet.networks, ['mainnet', 'testnet']);
});

test('examples: the same files written with CRLF line ends and as UTF-16 give the same findings', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'wallet-derivation-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    const ids = async () => JSON.parse((await run([...BAD, '--json'], dir)).out).findings.map((f) => `${f.id}:${f.line}:${f.column}`);
    const base = await ids();
    const text = await readFile(resolve(root, BAD_FILE), 'utf8');
    await writeFile(resolve(dir, BAD_FILE), text.split('\n').join('\r\n'));
    assert.deepEqual(await ids(), base);
    await writeFile(resolve(dir, BAD_FILE), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
    assert.deepEqual(await ids(), base);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('examples: the files are plain ASCII with LF line ends, made up, hold no seed or key and no year-like number', async () => {
  for (const f of [BAD_FILE, GOOD_FILE]) {
    const text = await readFile(resolve(root, f), 'utf8');
    assert.ok([...text].every((c) => c.charCodeAt(0) < 128), f);
    assert.ok(!text.includes('\r'), f);
    assert.doesNotMatch(text, /\b(?:19|20)\d{2}\b/, f);
    assert.doesNotThrow(() => JSON.parse(text), f);
    assert.match(text, /"notes": "A made-up configuration for the examples of wallet-derivation-check/, f);
    assert.match(text, /no seed and no key/, f);
  }
  const outputs = ['bad.txt', 'bad.json', 'bad.md', 'bad.sarif', 'bad-explain.txt', 'bad-explain.md'];
  for (const o of outputs) assert.ok(!(await saved(o)).includes('left out on purpose'), `${o} does not show the value under seedPhrase`);
});

test('examples: the sample output of the bad configuration is the one the README shows', async () => {
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const bad = await saved('bad.txt');
  assert.ok(readme.includes(bad.split('\n').slice(0, 29).join('\n')));
  assert.ok(readme.includes(bad.split('\n').slice(-8).join('\n')));
});
