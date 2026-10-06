// Shared test helpers: configurations built inline, checked in memory or written into a temporary folder that is removed
// after the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux, macOS and
// Windows. The line a test expects is found with lineOf(), which counts lines the way the reader does, so a test never
// holds a line number worked out by hand for one system only. No test reads the clock, the time zone or the locale.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkText, main } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'wallet-derivation-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The line (from 1) of the n-th place where needle starts in text.
export function lineOf(text, needle, n = 1) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return text.slice(0, at).split('\n').length;
}

// An entry; extra adds fields, and a field set to undefined is left out.
export function entry(name, coin, network, path, addressType, extra = {}) {
  const out = { name, coin, network, path, addressType, ...extra };
  for (const [k, v] of Object.entries(out)) if (v === undefined) delete out[k];
  return out;
}

// Three entries that pass every check: Bitcoin native SegWit with placeholders, an Ethereum account and Solana with
// every level hardened.
export const ENTRIES = [
  entry('Bitcoin', 'bitcoin', 'mainnet', "m/84'/0'/{account}'/{change}/{index}", 'p2wpkh', { gapLimit: 20 }),
  entry('Ethereum', 'ethereum', 'mainnet', "m/44'/60'/0'/0/{index}", 'evm'),
  entry('Solana', 'solana', 'mainnet', "m/44'/501'/{account}'/0'", 'ed25519')
];

// A configuration with every field the checks need; over replaces fields, and a field set to undefined is left out.
export function config(over = {}, entries = ENTRIES) {
  const out = { wallet: 'Test Wallet', entries, ...over };
  for (const [k, v] of Object.entries(out)) if (v === undefined) delete out[k];
  return out;
}

// The configuration with one entry replaced by another, or added when at is past the end.
export const withEntry = (e, at = ENTRIES.length) => config({}, [...ENTRIES.slice(0, at), e, ...ENTRIES.slice(at + 1)]);

export const configText = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

// The findings of a configuration given as an object, through the reader and the checks.
export const findingsOf = (obj) => checkText(configText(obj)).findings;

// The ids of the findings of a configuration.
export const idsOf = (obj) => findingsOf(obj).map((f) => f.id);

// The findings of one check.
export const ofCheck = (obj, id) => findingsOf(obj).filter((f) => f.id === id);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// Writes the files and runs the command line in the folder.
export async function run(files, args) {
  return withFiles(files, (dir) => cli(args, dir));
}

// A clean configuration, and one whose Bitcoin entry is p2wpkh under purpose 44, for the command line tests.
export const GOOD = configText(config());
export const BAD = configText(withEntry(entry('Bitcoin', 'bitcoin', 'mainnet', "m/44'/0'/{account}'/{change}/{index}", 'p2wpkh', { gapLimit: 20 }), 0));

// The time a hostile test may take: four times as long when the runner collects coverage, which sets NODE_V8_COVERAGE.
export const allowed = (ms) => (process.env.NODE_V8_COVERAGE ? ms * 4 : ms);
