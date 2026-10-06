// Derivation paths. A path is written as BIP-32 and BIP-44 write it: m, then one level per child below the master key,
// each a whole number from 0 to 2^31 - 1 with a mark for a hardened level (an apostrophe, h or H). Spaces around a slash
// are allowed, as BIP-44 writes its examples with them. Three placeholders stand for a level the app counts up:
// {account} at level 3, {change} at level 4 and {index} at the last level, from level 3 on. Nothing is built from the
// text of a path but the list of its levels; no pattern is built from it.

export const PATH_LIMITS = { maxLength: 1000, maxLevels: 255 };

// The first hardened index: a hardened level i is the child i + 2^31.
export const HARDENED = 2 ** 31;

export const PLACEHOLDERS = ['account', 'change', 'index'];

const LEVEL = /^(0|[1-9][0-9]{0,9})(['hH]?)$/;
const LEADING_ZERO = /^0[0-9]+['hH]?$/;
const PLACE = /^\{([^{}]*)\}(['hH]?)$/;

// The names of the levels of a BIP-44 path, from level 1.
export const LEVEL_NAMES = ['purpose', 'coin type', 'account', 'change', 'address index'];

// The name of a level, from 1.
export const levelName = (n) => LEVEL_NAMES[n - 1] ?? `level ${n}`;

// The levels of a path: { levels } with each level { index, placeholder, hardened, raw }, or { error } with what is
// wrong, in words that follow "it". raw is text from the file and must go through safeText before it is shown.
export function parsePath(text, limits = PATH_LIMITS) {
  if (text.length > limits.maxLength) return { error: `is longer than ${limits.maxLength} characters` };
  const parts = text.split('/').map((p) => p.trim());
  if (parts[0] === 'M') return { error: 'starts with M, the form of a path of public keys; a wallet derives its keys from the master private key m' };
  if (parts[0] !== 'm') return { error: 'does not start with m, the master key' };
  if (parts.length - 1 > limits.maxLevels) return { error: `has more than ${limits.maxLevels} levels, the most the depth byte of an extended key can count` };
  const levels = [];
  const seen = new Set();
  for (let n = 1; n < parts.length; n += 1) {
    const raw = parts[n];
    if (raw === '') return { error: `has an empty level ${n}` };
    const m = LEVEL.exec(raw);
    if (m) {
      const index = Number(m[1]);
      if (index >= HARDENED) return { error: `has ${index} at level ${n}, past 2147483647, the largest index that is written with a mark when it is hardened` };
      levels.push({ index, placeholder: null, hardened: m[2] !== '', raw });
      continue;
    }
    if (LEADING_ZERO.test(raw)) return { error: `has ${raw} at level ${n}, a number written with a leading zero, which two wallets may read differently` };
    const p = PLACE.exec(raw);
    if (!p) return { error: `has "${raw}" at level ${n}, which is not a whole number with an optional hardened mark (' or h), nor a placeholder` };
    const name = p[1];
    if (!PLACEHOLDERS.includes(name)) return { error: `names {${name}} at level ${n}; the placeholders are {account}, {change} and {index}` };
    if (seen.has(name)) return { error: `names {${name}} twice` };
    seen.add(name);
    if (name === 'account' && n !== 3) return { error: `has {account} at level ${n}; the account is level 3` };
    if (name === 'change' && n !== 4) return { error: `has {change} at level ${n}; the change is level 4` };
    if (name === 'index' && (n !== parts.length - 1 || n < 3)) return { error: `has {index} at level ${n}; the address index is the last level, from level 3 on` };
    levels.push({ index: null, placeholder: name, hardened: p[2] !== '', raw });
  }
  return { levels };
}

// A path in one notation: m, the levels, and an apostrophe for a hardened level.
export function formatPath(levels) {
  return `m${levels.map((l) => `/${l.placeholder === null ? l.index : `{${l.placeholder}}`}${l.hardened ? "'" : ''}`).join('')}`;
}

// Whether two paths can name the same key: the same depth, the same hardened levels, and at each level the same index,
// or a placeholder on either side, which stands for every index.
export function pathsOverlap(a, b) {
  if (a.length !== b.length) return false;
  return a.every((l, i) => l.hardened === b[i].hardened && (l.placeholder !== null || b[i].placeholder !== null || l.index === b[i].index));
}
