import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HARDENED, LEVEL_NAMES, PATH_LIMITS, PLACEHOLDERS, formatPath, levelName, parsePath, pathsOverlap } from '../src/index.js';

const levels = (text) => {
  const r = parsePath(text);
  assert.equal(r.error, undefined, `${text}: ${r.error}`);
  return r.levels;
};

test('parsePath: the five levels of a BIP-44 path, with the hardened marks', () => {
  const l = levels("m/44'/0'/0'/0/0");
  assert.deepEqual(l.map((x) => [x.index, x.hardened]), [[44, true], [0, true], [0, true], [0, false], [0, false]]);
  assert.ok(l.every((x) => x.placeholder === null));
  assert.equal(HARDENED, 2147483648);
});

test('parsePath: h and H mark a hardened level as an apostrophe does, and spaces around a slash are allowed', () => {
  assert.equal(formatPath(levels('m/84h/0H/0h/1/7')), "m/84'/0'/0'/1/7");
  assert.equal(formatPath(levels("m / 44' / 0' / 1' / 0 / 1")), "m/44'/0'/1'/0/1");
  assert.equal(formatPath(levels('m')), 'm');
});

test('parsePath: the placeholders {account}, {change} and {index}, in their places', () => {
  const l = levels("m/84'/0'/{account}'/{change}/{index}");
  assert.deepEqual(l.slice(2).map((x) => [x.placeholder, x.hardened]), [['account', true], ['change', false], ['index', false]]);
  assert.equal(formatPath(l), "m/84'/0'/{account}'/{change}/{index}");
  assert.equal(formatPath(levels("m/44'/501'/{index}'")), "m/44'/501'/{index}'");
  assert.equal(formatPath(levels("m/44'/501'/{account}'/0'")), "m/44'/501'/{account}'/0'");
  assert.deepEqual(PLACEHOLDERS, ['account', 'change', 'index']);
});

test('parsePath: what is not a path, each with what is wrong', () => {
  const fails = (text, pattern) => assert.match(parsePath(text).error ?? '', pattern, text);
  fails("M/44'/0'", /starts with M, the form of a path of public keys/);
  fails("44'/0'", /does not start with m/);
  fails('', /does not start with m/);
  fails("m/44'//0'", /has an empty level 2/);
  fails("m/44'/", /has an empty level 2/);
  fails("m/44'/0'/2147483648'/0/0", /has 2147483648 at level 3, past 2147483647/);
  fails("m/44'/01'/0'", /has 01' at level 2, a number written with a leading zero/);
  fails("m/44'/-1'/0'", /has "-1'" at level 2, which is not a whole number/);
  fails("m/44''/0'", /has "44''" at level 1/);
  fails("m/44'/0'/1.5'", /not a whole number/);
  fails("m/44'/0'/{wallet}'/0/0", /names \{wallet\} at level 3; the placeholders are/);
  fails("m/44'/0'/{account}'/{account}/0", /names \{account\} twice/);
  fails("m/44'/{account}'/0'/0/0", /has \{account\} at level 2; the account is level 3/);
  fails("m/44'/0'/0'/0/{change}", /has \{change\} at level 5; the change is level 4/);
  fails("m/44'/0'/0'/{index}/0", /has \{index\} at level 4; the address index is the last level/);
  fails("m/44'/{index}", /has \{index\} at level 2; the address index is the last level, from level 3 on/);
  assert.equal(parsePath("m/44'/0'/2147483647'/0/0").error, undefined, 'the largest index');
});

test('parsePath: the limits of length and of levels', () => {
  assert.match(parsePath(`m${'/0'.repeat(PATH_LIMITS.maxLevels + 1)}`).error, /more than 255 levels/);
  assert.equal(parsePath(`m${'/0'.repeat(PATH_LIMITS.maxLevels)}`).error, undefined);
  assert.match(parsePath(`m/${'1'.repeat(PATH_LIMITS.maxLength)}`).error, /longer than 1000 characters/);
});

test('levelName: the names of the levels of BIP-44, and a number past them', () => {
  assert.deepEqual(LEVEL_NAMES, ['purpose', 'coin type', 'account', 'change', 'address index']);
  assert.equal(levelName(1), 'purpose');
  assert.equal(levelName(5), 'address index');
  assert.equal(levelName(6), 'level 6');
});

test('pathsOverlap: the same path, a placeholder against a number, and near misses on the hardened mark and the depth', () => {
  const p = (t) => levels(t);
  assert.ok(pathsOverlap(p("m/44'/60'/0'/0/0"), p('m/44h/60h/0h/0/0')));
  assert.ok(pathsOverlap(p("m/44'/60'/0'/0/{index}"), p("m/44'/60'/0'/0/3")));
  assert.ok(pathsOverlap(p("m/84'/0'/{account}'/{change}/{index}"), p("m/84'/0'/5'/1/9")));
  assert.ok(!pathsOverlap(p("m/44'/60'/0'/0/0"), p("m/44'/60'/0'/0/0'")), 'one level hardened');
  assert.ok(!pathsOverlap(p("m/44'/60'/0'/0/0"), p("m/44'/60'/0'/0")), 'another depth');
  assert.ok(!pathsOverlap(p("m/44'/60'/0'/0/0"), p("m/44'/60'/1'/0/0")), 'another account');
});
