import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, USAGE, VERSION, buildReport, checkText, decide, parseArgs, toSarif } from '../src/index.js';
import { BAD, ENTRIES, GOOD, cli, config, configText, entry, run } from './helpers.js';

const FILES = { 'good.json': GOOD, 'bad.json': BAD };
const ch = (...codes) => String.fromCharCode(...codes);
// A configuration with an error, a warning and a note: a purpose that does not match, a low gap limit and a coin out of
// the table.
const MIXED = configText(config({}, [entry('Bitcoin', 'bitcoin', 'mainnet', "m/44'/0'/{account}'/{change}/{index}", 'p2wpkh', { gapLimit: 10 }), ENTRIES[1], ENTRIES[2], entry('Tron', 'tron', 'mainnet', "m/44'/195'/0'/0/{index}", 'evm')]));
const NOTE = configText(config({}, [...ENTRIES, entry('Tron', 'tron', 'mainnet', "m/44'/195'/0'/0/{index}", 'evm')]));

test('exit codes: 0 for a pass, 1 for a finding at or above the fail-on level, 2 for a usage or input error', async () => {
  assert.equal((await run(FILES, ['good.json'])).code, 0);
  assert.equal((await run(FILES, ['bad.json'])).code, 1);
  assert.equal((await run(FILES, ['nothing.json'])).code, 2);
  assert.equal((await run(FILES, [])).code, 2);
  assert.equal((await run(FILES, ['good.json', 'bad.json'])).code, 2);
  assert.equal((await run(FILES, ['bad.json', '--bogus'])).code, 2);
});

test('--fail-on: a note fails the run at info and passes at warning and error', async () => {
  const note = { 'n.json': NOTE };
  assert.equal((await run(note, ['n.json'])).code, 0);
  assert.equal((await run(note, ['n.json', '--fail-on', 'warning'])).code, 0);
  assert.equal((await run(note, ['n.json', '--fail-on', 'info'])).code, 1);
  assert.equal((await run(FILES, ['good.json', '--fail-on', 'info'])).code, 0, 'the good configuration has no finding at any level');
});

test('--min-severity hides findings below it and says how many, and a hidden finding still counts for the result', async () => {
  const r = await run({ 'm.json': MIXED }, ['m.json', '--min-severity', 'error']);
  assert.match(r.out, /findings: 1 \(1 error\); 2 below error not shown\n/);
  const info = await run({ 'n.json': NOTE }, ['n.json', '--min-severity', 'warning', '--fail-on', 'info']);
  assert.match(info.out, /findings: 0; 1 below warning not shown/);
  assert.equal(info.code, 1);
});

test('the text report names the file, the wallet, the checks table, each finding with its line and fix, the entries, and ends with the notice and the result', async () => {
  const r = await run(FILES, ['bad.json']);
  assert.match(r.out, /^wallet-derivation-check: bad\.json\n/);
  assert.match(r.out, /\nfile: \d+ lines, [\d,]+ bytes\n/);
  assert.match(r.out, /\nwallet: Test Wallet; 3 entries on 3 coins \(bitcoin, ethereum and solana\); mainnet\n/);
  assert.match(r.out, /\nfindings: 1 \(1 error\)\n/);
  assert.match(r.out, /ERROR {4}purpose-mismatch {9}bad\.json:\d+\n/);
  assert.match(r.out, /fix: Change the purpose to the one of the address type/);
  assert.match(r.out, /\nChecks \(21\)\n/);
  assert.match(r.out, /\nEntries \(3\)\n\n {2}entry {5}coin {6}network {2}type {5}gap {2}path\n {2}Bitcoin {3}bitcoin {3}mainnet {2}p2wpkh {3}20 {3}m\/44'\/0'\/\{account\}'\/\{change\}\/\{index\}\n/);
  assert.match(r.out, /not a guarantee that every address can be recovered in another wallet\.\n\nRESULT: FAIL - 1 finding at or above error/);
  assert.ok(r.out.endsWith('\n'));
  assert.match((await run(FILES, ['good.json'])).out, /Findings \(0\)\n\n {2}none\n/);
});

test('--explain adds the points of the pages to the text report, and the own choice of a best practice', async () => {
  const r = await run(FILES, ['bad.json', '--explain']);
  assert.match(r.out, /basis: .*\(BIP-49: Derivation scheme for P2WPKH-nested-in-P2SH based accounts, https:\/\/github\.com\/bitcoin\/bips\/blob\/master\/bip-0049\.mediawiki\)/);
  assert.doesNotMatch((await run(FILES, ['bad.json'])).out, /basis:/);
  const note = await run({ 'n.json': NOTE }, ['n.json', '--explain']);
  assert.match(note.out, /the tool's own choice: keeping the table of coins short is a best practice of this tool/);
});

test('the JSON report has the id, severity, message, file, line, column and entry of every finding, and the table of entries', async () => {
  const report = JSON.parse((await run(FILES, ['bad.json', '--json'])).out);
  assert.equal(report.tool, 'wallet-derivation-check');
  assert.equal(report.version, VERSION);
  assert.equal(report.input.file, 'bad.json');
  assert.deepEqual(report.wallet, { name: 'Test Wallet', entries: 3, coins: ['bitcoin', 'ethereum', 'solana'], networks: ['mainnet'] });
  const f = report.findings[0];
  assert.equal(f.id, 'purpose-mismatch');
  assert.equal(f.severity, 'error');
  assert.equal(f.file, 'bad.json');
  assert.equal(f.at, `bad.json:${f.line}`);
  assert.equal(typeof f.column, 'number');
  assert.equal(f.entry, 'Bitcoin');
  assert.equal(f.basis, undefined, 'the basis only with --explain');
  assert.ok(JSON.parse((await run(FILES, ['bad.json', '--json', '--explain'])).out).findings[0].basis.length > 0);
  assert.equal(report.result.pass, false);
  assert.equal(report.rules.length, RULES.length);
  assert.deepEqual(report.table[1], { entry: 'Ethereum', coin: 'ethereum', network: 'mainnet', addressType: 'evm', path: "m/44'/60'/0'/0/{index}", gapLimit: null });
  assert.deepEqual(report.config, { minSeverity: 'info', failOn: 'error' });
});

test('--json and --format json are the same, and --json with another format is a usage error', async () => {
  assert.equal((await run(FILES, ['good.json', '--json'])).out, (await run(FILES, ['good.json', '--format', 'json'])).out);
  const r = await run(FILES, ['good.json', '--json', '--format', 'text']);
  assert.equal(r.code, 2);
  assert.match(r.err, /two formats/);
});

test('the markdown report has a findings table and the table of entries, and escapes what markdown gives a meaning to', async () => {
  const r = await run(FILES, ['bad.json', '--format', 'markdown']);
  assert.match(r.out, /^# wallet-derivation-check: bad\.json\n/);
  assert.match(r.out, /\| Level \| Check \| Where \| Message \|/);
  assert.match(r.out, /\| error \| purpose-mismatch \| bad\.json:\d+ \|/);
  assert.match(r.out, /- Result: \*\*FAIL - 1 finding at or above error/);
  assert.match(r.out, /\| Entry \| Coin \| Network \| Type \| Gap \| Path \|\n\| --- \| --- \| --- \| --- \| ---: \| --- \|\n\| Bitcoin \| bitcoin \| mainnet \| p2wpkh \| 20 \| m\/44'\/0'\/\\\{account\\\}'\/\\\{change\\\}\/\\\{index\\\} \|/);
  assert.match((await run(FILES, ['good.json', '--format', 'markdown'])).out, /## Findings\n\nNone\./);
  const hostile = { 'p.json': configText(config({}, [entry('[x](http://a.test)|<b>', 'bitcoin', 'mainnet', "m/44'/0'/0'/0/0", 'p2wpkh'), ENTRIES[1]])) };
  const out = (await run(hostile, ['p.json', '--format', 'markdown', '--explain'])).out;
  assert.ok(!out.includes('[x](http'), 'a link written in an entry name is escaped');
  assert.ok(out.includes('\\[x\\]\\(http'));
  assert.match(out, /## Basis\n\n### purpose-mismatch\n/);
  const input = (await run({ 'p.json': configText(config({ zz: 1 })) }, ['p.json', '--format', 'markdown', '--explain'])).out;
  assert.match(input, /### field-unknown\n\n- A problem with the configuration file itself; it rests on no page\./);
});

test('the SARIF report is SARIF 2.1.0 with the checks as rules, the configuration as the artifact, and a result for every finding', async () => {
  const sarif = JSON.parse((await run(FILES, ['bad.json', '--format', 'sarif'])).out);
  assert.equal(sarif.version, '2.1.0');
  assert.match(sarif.$schema, /sarif-2\.1\.0/);
  const run0 = sarif.runs[0];
  assert.equal(run0.tool.driver.name, 'wallet-derivation-check');
  assert.equal(run0.tool.driver.rules.length, RULES.length);
  assert.deepEqual(run0.artifacts.map((a) => a.location.uri), ['bad.json']);
  const p = run0.results.find((x) => x.ruleId === 'purpose-mismatch');
  assert.equal(p.level, 'error');
  assert.equal(run0.tool.driver.rules[p.ruleIndex].id, 'purpose-mismatch');
  const loc = p.locations[0].physicalLocation;
  assert.equal(loc.artifactLocation.uri, 'bad.json');
  assert.equal(loc.artifactLocation.index, 0);
  assert.ok(loc.region.startLine >= 1 && loc.region.startColumn >= 1);
  assert.equal(p.properties.entry, 'Bitcoin');
  assert.equal(run0.properties.sources.length, 7);
});

test('SARIF levels: error, warning and info are error, warning and note', async () => {
  const sarif = JSON.parse((await run({ 'm.json': MIXED }, ['m.json', '--format', 'sarif'])).out);
  const levels = Object.fromEntries(sarif.runs[0].results.map((x) => [x.ruleId, x.level]));
  assert.equal(levels['purpose-mismatch'], 'error');
  assert.equal(levels['gap-limit-low'], 'warning');
  assert.equal(levels['coin-not-in-table'], 'note');
});

test('--explain has no place in the SARIF report and is a usage error there', async () => {
  const r = await run(FILES, ['good.json', '--format', 'sarif', '--explain']);
  assert.equal(r.code, 2);
  assert.match(r.err, /sarif format has no place/);
});

test('--list-checks lists every check with its level and kind, in text, markdown and JSON, and needs no file', async () => {
  const text = await cli(['--list-checks'], process.cwd());
  assert.equal(text.code, 0);
  for (const r of RULES) assert.ok(text.out.includes(r.id), r.id);
  assert.match(text.out, /path-duplicate +warning +best practice/);
  assert.match(text.out, /purpose-mismatch +error +documented/);
  const md = await cli(['--list-checks', '--format', 'markdown'], process.cwd());
  assert.match(md.out, /\| coin-type-mismatch \| error \| documented \|/);
  const json = JSON.parse((await cli(['--list-checks', '--json'], process.cwd())).out);
  assert.equal(json.length, RULES.length);
  assert.equal((await cli(['--list-checks', '--format', 'sarif'], process.cwd())).code, 2);
});

test('--help, --version and usage errors', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const option of ['--format', '--json', '--min-severity', '--fail-on', '--explain', '--list-checks', '--help', '--version']) assert.ok(USAGE.includes(option), option);
  assert.equal((await cli(['--version'], process.cwd())).out, `${VERSION}\n`);
  const bad = [['a', 'b'], ['--format'], ['--format', 'xml', 'a'], ['--fail-on', 'high', 'a'], ['--min-severity', 'low', 'a'], ['a', '--fail-on', 'error', '--fail-on', 'info'], ['https://example.test/wallet.json'], ['-'], ['a', '--format', '-']];
  for (const b of bad) {
    const r = await cli(b, process.cwd());
    assert.equal(r.code, 2, b.join(' '));
    assert.match(r.err, /^wallet-derivation-check: /);
  }
});

test('parseArgs: values may not look like flags, a flag given twice is an error, and -h and -v are short forms', () => {
  assert.throws(() => parseArgs(['a', '--format', '--json']), /needs a value/);
  assert.throws(() => parseArgs(['a', '--format', 'json', '--format', 'text']), /given twice/);
  assert.throws(() => parseArgs(['a', '--format', '-']), /standard input/);
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['-v']).version, true);
  assert.equal(parseArgs(['a']).format, 'text');
});

test('decide: pass and fail texts, with the counts', () => {
  assert.equal(decide({ error: 0, warning: 0, info: 0 }, 'error').text, 'PASS - no finding at or above error');
  assert.equal(decide({ error: 0, warning: 2, info: 1 }, 'error').text, 'PASS - no finding at or above error (2 warning, 1 info)');
  assert.equal(decide({ error: 1, warning: 2, info: 1 }, 'error').text, 'FAIL - 1 finding at or above error (1 error, 2 warning, 1 info)');
  assert.equal(decide({ error: 1, warning: 2, info: 1 }, 'warning').text, 'FAIL - 3 findings at or above warning (1 error, 2 warning, 1 info)');
});

test('text from the file is cleaned: control characters, escapes and direction controls in a wallet, an entry, a coin and a path', async () => {
  const dirty = (s) => `${s}${ch(0x1b)}[31m${ch(0x202e)}${ch(0x2028)}x${ch(0x07)}`;
  const c = config({ wallet: dirty('w') }, [entry(dirty('n'), dirty('c'), 'mainnet', dirty('m/0'), 'p2pkh'), entry(dirty('e'), 'ethereum', dirty('main'), "m/44'/60'/0'/0/0", dirty('t'))]);
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const r = await run({ 'p.json': configText(c) }, ['p.json', '--format', format]);
    assert.ok(r.out.length > 100, format);
    assert.ok(![...r.out].some((x) => [0x1b, 0x07, 0x202e, 0x2028].includes(x.charCodeAt(0))), format);
  }
});

test('the same findings are written for LF, CRLF and CR line ends, and for UTF-16', async () => {
  const at = async (text) => JSON.parse((await run({ 'p.json': text }, ['p.json', '--json'])).out).findings.map((f) => `${f.id}:${f.line}:${f.column}`);
  const base = await at(MIXED);
  assert.equal(base.length, 3);
  for (const sep of ['\r\n', '\r']) assert.deepEqual(await at(MIXED.split('\n').join(sep)), base);
  assert.deepEqual(await at(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(MIXED, 'utf16le')])), base);
});

test('toSarif is deterministic and the report object is the same for the same input', async () => {
  const a = (await run(FILES, ['bad.json', '--format', 'sarif'])).out;
  const b = (await run(FILES, ['bad.json', '--format', 'sarif'])).out;
  assert.equal(a, b);
  assert.equal(typeof toSarif, 'function');
  const r1 = buildReport({ file: { file: 'w.json', bytes: 1, lines: 1 }, checked: checkText(BAD), version: '0' });
  const r2 = buildReport({ file: { file: 'w.json', bytes: 1, lines: 1 }, checked: checkText(BAD), version: '0' });
  assert.deepEqual(r1, r2);
});

test('a file that is JSON but no configuration gives a report with no wallet and no table', async () => {
  const r = await run({ 'p.json': '[]\n' }, ['p.json']);
  assert.equal(r.code, 1);
  assert.match(r.out, /\nwallet: no configuration was read\n/);
  assert.doesNotMatch(r.out, /Entries \(/);
  assert.match(r.out, /note: the configuration was not checked, because the file holds no configuration object/);
  const json = JSON.parse((await run({ 'p.json': '[]\n' }, ['p.json', '--json'])).out);
  assert.equal(json.wallet, null);
  assert.equal(json.table, null);
  const notJson = await run({ 'p.json': '{"wallet": 1,,}' }, ['p.json']);
  assert.match(notJson.out, /note: the configuration was not checked, because the file is not JSON the reader can follow/);
});
