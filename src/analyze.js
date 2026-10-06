// The checks on a configuration that was read: the path of each entry against its address type, its coin and its
// network, the hardened levels, the change level and the gap limit, and then the entries against each other for paths
// that name the same key and for gaps in the accounts. Each finding names the line of the field it is about.

import { COINS, FAMILIES, PURPOSES, TESTNET_COIN_TYPE } from './coins.js';
import { cut } from './config.js';
import { formatPath, levelName, parsePath, pathsOverlap } from './path.js';
import { BEST } from './rules.js';
import { listText, plural } from './size.js';

const BP = `This is ${BEST}.`;
const at = (e) => ({ line: e.line, column: e.column });

// The BIP-44 gap limit.
export const BIP44_GAP_LIMIT = 20;

// The checks of a configuration: { findings, notes, rows }. rows holds each entry as the table of the report shows it.
export function analyzeConfig(config) {
  const findings = [];
  const notes = [];
  const add = (id, where, message, entry) => findings.push({ id, line: where.line, column: where.column, message, entry: entry?.title ?? null });
  const unreadable = [];

  for (const e of config.entries) {
    e.levels = null;
    if (e.pathText !== null) {
      const parsed = parsePath(e.pathText);
      if (parsed.error) {
        add('path-unparsable', at(e.pathEntry), `The path "${cut(e.pathText)}" of entry ${e.title} ${cut(parsed.error, 300)}. BIP-32 writes a path as m and one index per level, each below 2^31 with a mark when it is hardened; the tool also reads {account}, {change} and {index} in place of a level. The other checks of the path were not made for this entry.`, e);
        unreadable.push(e.title);
      } else e.levels = parsed.levels;
    }

    if (e.coin && e.addressType && e.coin.family !== e.addressType.family) {
      add('address-type-family', at(e.addressTypeEntry), `Entry ${e.title} is ${e.coin.title}, which takes ${FAMILIES[e.coin.family]}, but its addressType is ${e.addressType.id}, one of ${FAMILIES[e.addressType.family]}; a wallet for ${e.coin.title} would not show this address. ${BP}`, e);
    }
    if (e.coinText !== null && e.coin === null) {
      add('coin-not-in-table', at(e.coinEntry), `The coin "${cut(e.coinText)}" of entry ${e.title} is not in the tool's table (${COINS.map((c) => c.id).join(', ')}), so its coin type was checked only against the testnet number and its address type against no family. ${BP}`, e);
    }
    if (e.gapLimit !== null && e.gapLimit < BIP44_GAP_LIMIT) {
      add('gap-limit-low', at(e.gapLimitEntry), `Entry ${e.title} has a gap limit of ${e.gapLimit}, below the ${BIP44_GAP_LIMIT} of BIP-44: when a seed from a wallet that hands out addresses up to that gap is restored here, the app stops after ${plural(e.gapLimit, 'unused address', 'unused addresses')} in a row and does not show the funds on the addresses after them.`, e);
    }
    if (e.levels === null) continue;

    const levels = e.levels;
    const p = formatPath(levels);
    const depth = levels.length;
    const curve = e.addressType?.curve ?? null;
    const type = e.addressType;

    if (curve === 'ed25519' && depth < 3) {
      add('path-depth', at(e.pathEntry), `The path ${p} of entry ${e.title} has ${plural(depth, 'level')} below m; BIP-44 puts the purpose, the coin type and the account first, so this path has no account a wallet can find.`, e);
    } else if (curve === 'secp256k1' && depth !== 5) {
      add('path-depth', at(e.pathEntry), `The path ${p} of entry ${e.title} has ${plural(depth, 'level')} below m; BIP-44, and BIP-49, BIP-84 and BIP-86 after it, use five: purpose, coin type, account, change and address index. A wallet that restores the seed under them does not look at this path.`, e);
    }

    if (depth >= 1 && type && levels[0].index !== type.purpose) {
      const known = PURPOSES.includes(levels[0].index) ? '' : `; ${levels[0].index} is none of the purposes ${PURPOSES.join(', ')}`;
      add('purpose-mismatch', at(e.pathEntry), `The path ${p} of entry ${e.title} has purpose ${levels[0].index}, but the address type ${type.id} is derived under purpose ${type.purpose} (${type.page})${known}. A wallet that restores the seed looks for ${type.id} addresses under ${type.purpose}' and does not find these.`, e);
    }

    if (depth >= 2) {
      const ct = levels[1].index;
      if (e.network === 'mainnet' && ct === TESTNET_COIN_TYPE) {
        add('testnet-coin-on-mainnet', at(e.pathEntry), `Entry ${e.title} is on mainnet, but its path ${p} has coin type 1, which SLIP-44 keeps for the testnets of all coins. Mainnet funds sent to these addresses sit in the testnet subtree, where a wallet that restores the seed for ${e.coin ? e.coin.title : 'the coin'} does not look.`, e);
      } else if (e.network === 'testnet' && ct !== TESTNET_COIN_TYPE) {
        const same = e.coin && ct === e.coin.coinType ? `, the mainnet number of ${e.coin.title}` : '';
        add('mainnet-coin-on-testnet', at(e.pathEntry), `Entry ${e.title} is on testnet, but its path ${p} has coin type ${ct}${same}, not 1, which SLIP-44 keeps for the testnets of all coins; the test keys are then keys of a mainnet subtree, and one key can hold coins of both networks.`, e);
      } else if (e.network !== 'testnet' && e.coin && ct !== TESTNET_COIN_TYPE && ct !== e.coin.coinType) {
        add('coin-type-mismatch', at(e.pathEntry), `The path ${p} of entry ${e.title} has coin type ${ct}, but SLIP-44 registers ${e.coin.title} as ${e.coin.coinType}. A wallet that restores the seed looks for ${e.coin.title} under ${e.coin.coinType}' and does not find these addresses.`, e);
      }
    }

    if (curve === 'ed25519') {
      const soft = levels.map((l, i) => (l.hardened ? null : levelName(i + 1))).filter(Boolean);
      if (soft.length) add('ed25519-unhardened', at(e.pathEntry), `The path ${p} of entry ${e.title} is for an ed25519 key, but the ${listText(soft, 5)} ${soft.length === 1 ? 'is' : 'are'} not hardened; SLIP-10 derives ed25519 keys through hardened levels only, so a wallet that follows it cannot derive this path at all.`, e);
    } else if (curve === 'secp256k1') {
      const soft = levels.slice(0, 3).map((l, i) => (l.hardened ? null : levelName(i + 1))).filter(Boolean);
      if (soft.length) add('level-not-hardened', at(e.pathEntry), `The path ${p} of entry ${e.title} derives the ${listText(soft)} without the hardened mark; BIP-44 hardens the purpose, the coin type and the account. A wallet that restores the seed derives other keys, and an extended public key above them with one leaked child private key gives away the parent private key.`, e);
      if (depth === 5) {
        const hard = levels.slice(3).map((l, i) => (l.hardened ? levelName(i + 4) : null)).filter(Boolean);
        if (hard.length) add('level-hardened', at(e.pathEntry), `The path ${p} of entry ${e.title} derives the ${listText(hard)} hardened; BIP-44 uses normal derivation for the change and the address index. A wallet that restores the seed derives other keys, and the extended public key of the account cannot give these addresses to a watch-only wallet.`, e);
        const change = levels[3];
        if (change.index !== null && change.index > 1) add('change-out-of-range', at(e.pathEntry), `The change level of the path ${p} of entry ${e.title} is ${change.index}; BIP-44 uses 0 for the external chain of receiving addresses and 1 for the internal chain of change, and a wallet that restores the seed looks at no other.`, e);
      }
    }
  }

  // Paths that can name the same key: each entry against the ones before it, reported once at the later one.
  const readable = config.entries.filter((e) => e.levels !== null);
  for (let j = 1; j < readable.length; j += 1) {
    const b = readable[j];
    for (let i = 0; i < j; i += 1) {
      const a = readable[i];
      if (!pathsOverlap(a.levels, b.levels)) continue;
      const pa = formatPath(a.levels);
      const pb = formatPath(b.levels);
      const how = pa === pb ? `the same path as entry ${a.title} at line ${a.pathEntry.line}, so the two derive one key` : `and entry ${a.title} at line ${a.pathEntry.line} derives ${pa}; the two can name the same key`;
      const coins = a.coin && b.coin && a.coin.id !== b.coin.id ? ` One key then holds ${a.coin.title} and ${b.coin.title}.` : '';
      add('path-duplicate', at(b.pathEntry), `Entry ${b.title} derives ${pb}, ${how}.${coins} BIP-44 gives each coin a subtree of its own so that keys are not shared; if the two entries are meant to share one key, such as one EVM address on two networks, record that choice. ${BP}`, b);
      break;
    }
  }

  // Gaps in the accounts of one purpose, coin type and network. A group with the placeholder {account} is left out: the
  // app opens its accounts in order.
  const groups = new Map();
  for (const e of readable) {
    const l = e.levels;
    if (l.length < 3 || l[0].index === null || l[1].index === null) continue;
    const key = `${formatPath(l.slice(0, 2))} ${e.network ?? '-'}`;
    if (!groups.has(key)) groups.set(key, { prefix: formatPath(l.slice(0, 2)), network: e.network, entries: [], template: false });
    const g = groups.get(key);
    if (l[2].placeholder !== null) g.template = true;
    else g.entries.push(e);
  }
  for (const g of groups.values()) {
    if (g.template || g.entries.length === 0) continue;
    const used = [...new Set(g.entries.map((e) => e.levels[2].index))].sort((x, y) => x - y);
    const gap = used.findIndex((n, i) => n !== i);
    if (gap < 0) continue;
    const next = used[gap];
    const missing = next - gap === 1 ? `account ${gap}` : next - gap <= 3 ? `accounts ${listText(Array.from({ length: next - gap }, (_, k) => String(gap + k)))}` : `accounts ${gap} to ${next - 1}`;
    const first = g.entries.filter((e) => e.levels[2].index === next).sort((x, y) => x.pathEntry.line - y.pathEntry.line)[0];
    const net = g.network ? ` on ${g.network}` : '';
    add('account-gap', at(first.pathEntry), `The entries under ${g.prefix}${net} derive ${used.length === 1 ? 'account' : 'accounts'} ${listText(used.map(String), 6)}, but not ${missing}: BIP-44 numbers accounts from 0 up, and its account discovery stops at the first account with no history, so a wallet that restores the seed may never find account ${next} of entry ${first.title}.`, first);
  }

  if (unreadable.length) notes.push(`the ${unreadable.length === 1 ? 'path' : 'paths'} of ${listText(unreadable)} could not be read, so ${unreadable.length === 1 ? 'it was' : 'they were'} not compared with the other entries for shared keys and account gaps`);

  const rows = config.entries.map((e) => ({
    entry: e.title,
    coin: e.coin ? e.coin.id : e.coinText,
    network: e.network,
    addressType: e.addressType ? e.addressType.id : null,
    path: e.levels ? formatPath(e.levels) : null,
    gapLimit: e.gapLimit
  }));
  return { findings, notes, rows };
}
