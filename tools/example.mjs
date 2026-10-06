// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// configurations to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const BAD = ['examples/bad/wallet.json'];
export const GOOD = ['examples/good/wallet.json'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// What the README says of the bad configuration: the counts, a finding of nearly every check, and the result.
export const EXPECTED = [
  'wallet: Lantern Example Wallet; 17 entries on 9 coins (bitcoin, litecoin, dogecoin, bitcoin-cash, ethereum, polygon and 3 more); mainnet and testnet',
  'findings: 22 (13 error, 7 warning, 2 info)',
  'The configuration holds the key "seedPhrase", which names a seed, a mnemonic or a private key. The tool never reads one, and the value is not shown.',
  "has purpose 84, but the address type p2sh-p2wpkh is derived under purpose 49 (BIP-49)",
  "its path m/86'/1'/0'/0/{index} has coin type 1, which SLIP-44 keeps for the testnets of all coins",
  "names {wallet} at level 3; the placeholders are {account}, {change} and {index}",
  'has coin type 3, but SLIP-44 registers Litecoin as 2',
  "The path m/44/3'/0'/0/{index} of entry Dogecoin derives the purpose without the hardened mark",
  "The path m/44'/60'/2'/0/0' of entry Ethereum account 2 derives the address index hardened",
  "The change level of the path m/44'/61'/0'/2/0 of entry Ether Classic is 2",
  "The path m/44'/501'/0'/0 of entry Solana is for an ed25519 key, but the change is not hardened",
  'Entry Solana as EVM is Solana, which takes ed25519 keys (ed25519), but its addressType is evm',
  'Entry 16 is named SOLANA, as is entry 14 at line 103',
  'Entry 17 has no addressType.',
  'The network of entry Tron is "main"; it must be mainnet or testnet.',
  "and entry Bitcoin nested segwit at line 18 derives m/84'/0'/0'/0/{index}; the two can name the same key",
  'Entry Bitcoin native segwit has a gap limit of 5, below the 20 of BIP-44',
  'has coin type 0, the mainnet number of Bitcoin, not 1',
  'Did you mean "gapLimit"?',
  "The path m/44'/145'/0' of entry Bitcoin Cash has 3 levels below m",
  "The entries under m/44'/60' on mainnet derive accounts 0 and 2, but not account 1",
  "Entry Polygon derives m/44'/60'/0'/0/0, the same path as entry Ethereum account 0 at line 78",
  'The coin "polygon" of entry Polygon is not in the tool\'s table',
  'note: the path of Bitcoin vault could not be read',
  'not a security audit and not a guarantee that every address can be recovered in another wallet',
  'RESULT: FAIL - 13 findings at or above error (13 error, 7 warning, 2 info)'
];
// What must not be reported: the check the bad configuration does not hold, a seed it does not hold, and a pass.
export const UNWANTED = ['ERROR    config-unreadable', 'left out on purpose', 'RESULT: PASS'];

// What the README says of the good configuration: one note.
export const GOOD_EXPECTED = [
  'wallet: Harbor Example Wallet; 9 entries on 5 coins (bitcoin, litecoin, ethereum, avalanche and solana); mainnet and testnet',
  'findings: 1 (1 info)',
  'The coin "avalanche" of entry Avalanche C-Chain is not in the tool\'s table',
  'RESULT: PASS - no finding at or above error (1 info)'
];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = await run(BAD);
  process.stdout.write(bad.out);
  expect('bad configuration', bad, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good configuration', good, 0, GOOD_EXPECTED, ['ERROR    ', 'WARNING  ', 'RESULT: FAIL']);
  // The good configuration also passes when warnings fail the run, and fails only when notes do.
  expect('good, fail on warning', await run([...GOOD, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning (1 info)'], []);
  expect('good, fail on info', await run([...GOOD, '--fail-on', 'info']), 1, ['RESULT: FAIL - 1 finding at or above info (1 info)'], []);
  // The bad configuration with only the errors shown still counts the rest.
  expect('bad, errors only', await run([...BAD, '--min-severity', 'error']), 1, ['findings: 13 (13 error); 9 below error not shown'], ['WARNING  ', 'INFO     ']);
  // A file that is not there stops the run with no report.
  expect('missing file', await run(['examples/none/wallet.json']), 2, ['examples/none/wallet.json: does not exist'], [], 'err');

  // The README shows the head of the report of the bad configuration with its table of checks, one finding, the table of
  // entries and the end of the report, and the end of the report of the good configuration.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const lines = bad.out.split('\n');
  const head = lines.slice(0, 29).join('\n');
  if (!readme.includes(head)) problems.push('README: the head of the sample output of the bad configuration differs from a real run');
  const at = lines.findIndex((l) => l.includes('account-gap') && l.includes('examples/bad/wallet.json:85'));
  const sample = lines.slice(at, at + 3).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the sample finding of the account gap differs from a real run');
  const t = lines.findIndex((l) => l.startsWith('Entries ('));
  const table = lines.slice(t, t + 20).join('\n');
  if (t < 0 || !readme.includes(table)) problems.push('README: the table of entries of the bad configuration differs from a real run');
  const tail = lines.slice(-8).join('\n');
  if (!readme.includes(tail)) problems.push('README: the tail of the sample output of the bad configuration differs from a real run');
  const goodTail = good.out.split('\n').slice(-6).join('\n');
  if (!readme.includes(goodTail)) problems.push('README: the tail of the sample output of the good configuration differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/bad.txt'), bad.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const outputs = [
    ['bad-explain.txt', [...BAD, '--explain'], 1],
    ['bad.md', [...BAD, '--format', 'markdown'], 1],
    ['bad-explain.md', [...BAD, '--format', 'markdown', '--explain'], 1],
    ['bad.json', [...BAD, '--json', '--explain'], 1],
    ['bad.sarif', [...BAD, '--format', 'sarif'], 1],
    ['good.md', [...GOOD, '--format', 'markdown'], 0],
    ['good.json', [...GOOD, '--json'], 0],
    ['good.sarif', [...GOOD, '--format', 'sarif'], 0],
    ['checks.txt', ['--list-checks'], 0],
    ['checks.json', ['--list-checks', '--format', 'json'], 0]
  ];
  for (const [name, args, code] of outputs) {
    const r = await run(args);
    if (r.code !== code) problems.push(`${name}: exit code ${r.code}, expected ${code}`);
    await writeFile(resolve(root, 'examples/output', name), r.out);
  }

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
