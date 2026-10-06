// The checks. Each has an id that stays the same once released (pipelines and other tools read it from the JSON, SARIF
// and markdown output), a severity, a kind, what it looks at, what to change and the points of the public pages it rests
// on (src/data.js).
//
// kind 'documented'     the rule is in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10, and the message says
//                       which
// kind 'best practice'  the idea is this tool's own choice, and the message says so
// kind 'input'          a problem with the configuration file itself; these never get lower

import { LEVELS } from './data.js';

export const BEST = 'a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10';

export const RULES = [
  { id: 'config-unreadable', severity: 'error', kind: 'input', summary: 'the file is not JSON the reader can follow, or its top level is not an object, so no configuration was read', fix: 'Write the configuration as one JSON object (docs/inputs.md), and fix the line named.', basis: [] },
  { id: 'field-missing', severity: 'error', kind: 'input', summary: 'a field the checks need is not in the configuration: the wallet name or the entries, or the name, coin, network, path or addressType of an entry', fix: 'Add the field named; docs/inputs.md lists what each part of the configuration needs.', basis: [] },
  { id: 'field-unknown', severity: 'warning', kind: 'input', summary: 'a key the tool does not read, often a misspelt one; its value was left out of every check', fix: 'Correct the spelling to a key of docs/inputs.md, or remove the key.', basis: [] },
  { id: 'field-invalid', severity: 'error', kind: 'input', summary: 'a value of the wrong type or form: a number where text belongs, a network other than mainnet or testnet, an address type the tool does not know, or a gap limit that is not a whole number', fix: 'Write the value as docs/inputs.md shows: text for the name, coin, network, path and addressType, and a whole number for gapLimit.', basis: [] },
  { id: 'entry-duplicate', severity: 'error', kind: 'input', summary: 'two entries share a name (compared without case and outer spaces), so a reader cannot tell which line a finding comes from', fix: 'Give each entry a name of its own, or merge the two.', basis: [] },
  { id: 'secret-in-config', severity: 'error', kind: 'input', summary: 'the configuration holds a key named for a seed, a mnemonic or a private key, or a value shaped like one; the tool never reads it and never shows it', fix: 'Remove the seed or the key from the file and from the history of the repository, and treat it as exposed: move the funds it holds to a new seed. The configuration lists paths only.', basis: [] },
  { id: 'path-unparsable', severity: 'error', kind: 'documented', summary: 'the path is not m followed by levels that are each a whole number below 2^31 with an optional hardened mark, or a placeholder {account}, {change} or {index} in its place', fix: "Write the path as BIP-32 and BIP-44 do, such as m/84'/0'/0'/0/0, or with placeholders, such as m/84'/0'/{account}'/{change}/{index}.", basis: ['bip32-index', 'bip44-levels'] },
  { id: 'path-depth', severity: 'warning', kind: 'documented', summary: 'a secp256k1 path that does not have the five levels of BIP-44 (purpose, coin type, account, change and address index), or an ed25519 path with fewer than three', fix: 'Give the path the five levels of BIP-44, or confirm that the wallets the users restore their seed in derive the same shorter or longer path.', basis: ['bip44-levels'] },
  { id: 'purpose-mismatch', severity: 'error', kind: 'documented', summary: 'the purpose (level 1) is not the one the address type is derived under: 44 for p2pkh, evm and ed25519, 49 for p2sh-p2wpkh, 84 for p2wpkh and 86 for p2tr', fix: 'Change the purpose to the one of the address type, or the address type to the one of the purpose.', basis: ['bip44-purpose', 'bip49-purpose', 'bip84-purpose', 'bip86-purpose'] },
  { id: 'coin-type-mismatch', severity: 'error', kind: 'documented', summary: 'on mainnet, the coin type (level 2) is not the number SLIP-44 registers for the coin', fix: 'Change the coin type to the SLIP-44 number of the coin.', basis: ['slip44-numbers', 'bip44-coin-type'] },
  { id: 'testnet-coin-on-mainnet', severity: 'error', kind: 'documented', summary: 'a mainnet entry uses coin type 1, which SLIP-44 keeps for the testnets of all coins', fix: 'Use the SLIP-44 number of the coin on mainnet, and coin type 1 only for a testnet entry.', basis: ['slip44-testnet'] },
  { id: 'mainnet-coin-on-testnet', severity: 'warning', kind: 'documented', summary: 'a testnet entry uses a coin type other than 1, so its keys are the keys of a mainnet subtree', fix: 'Use coin type 1 for testnet entries, or confirm that the app and the wallets it must match keep the mainnet coin type on this test network.', basis: ['slip44-testnet'] },
  { id: 'level-not-hardened', severity: 'error', kind: 'documented', summary: 'on a secp256k1 path, the purpose, the coin type or the account is not hardened', fix: "Harden the purpose, the coin type and the account with ' or h, as in m/44'/0'/0'/0/0.", basis: ['bip44-hardening', 'bip32-hardened-public'] },
  { id: 'level-hardened', severity: 'error', kind: 'documented', summary: 'on a five-level secp256k1 path, the change or the address index is hardened, where BIP-44 uses normal derivation', fix: 'Remove the hardened mark from the change and the address index.', basis: ['bip44-hardening', 'bip32-hardened-public'] },
  { id: 'change-out-of-range', severity: 'error', kind: 'documented', summary: 'on a five-level secp256k1 path, the change level is a number other than 0 (receiving) or 1 (change)', fix: 'Use 0 for receiving addresses and 1 for change addresses, or the placeholder {change}.', basis: ['bip44-change'] },
  { id: 'ed25519-unhardened', severity: 'error', kind: 'documented', summary: 'a path of the ed25519 address type has a level that is not hardened, which SLIP-10 does not define for ed25519', fix: "Harden every level of an ed25519 path, as in m/44'/501'/0'/0'.", basis: ['slip10-ed25519'] },
  { id: 'account-gap', severity: 'warning', kind: 'documented', summary: 'entries of one purpose, coin type and network derive accounts with a gap, or not from account 0, so BIP-44 account discovery stops before the later ones', fix: 'Number the accounts from 0 with no gap, or use the placeholder {account} and let the app open accounts in order.', basis: ['bip44-discovery'] },
  { id: 'gap-limit-low', severity: 'warning', kind: 'documented', summary: 'the gap limit of an entry is below the 20 of BIP-44', fix: 'Set gapLimit to 20 or more, so that a seed restored from another wallet shows every address that wallet handed out.', basis: ['bip44-gap-limit'] },
  { id: 'path-duplicate', severity: 'warning', kind: 'best practice', summary: 'two entries derive the same path, or paths that can name the same key, so one key serves both', fix: 'Give each entry a path of its own, or confirm that the two are meant to share one key, such as one EVM address on two networks.', basis: ['bip44-coin-type'], own: `warning when two entries can derive one key is ${BEST}; BIP-44 gives each coin a subtree of its own, and an app may still share one key on purpose` },
  { id: 'address-type-family', severity: 'error', kind: 'best practice', summary: 'the address type is not of the family of the coin in the tool\'s table: a Bitcoin script type on an EVM coin or on Solana, an EVM address on a Bitcoin coin, and so on', fix: 'Choose an address type of the family of the coin, or correct the coin.', basis: [], own: `the families of the table of coins are ${BEST}; the pages register numbers and purposes, not which address types a coin takes` },
  { id: 'coin-not-in-table', severity: 'info', kind: 'best practice', summary: 'the coin is not in the tool\'s short table of coins whose SLIP-44 number was read in the saved copy, so its coin type and its family were not checked', fix: 'Check the coin type of the coin in SLIP-44 by hand, or name the coin as the table does (docs/inputs.md).', basis: ['slip44-numbers'], own: `keeping the table of coins short is ${BEST}; SLIP-44 registers many more coins than the tool checks` }
];

export const ruleById = (id) => RULES.find((r) => r.id === id);

export const atOrAbove = (level, floor) => LEVELS.indexOf(level) >= LEVELS.indexOf(floor);

// The result of a run: pass unless a finding is at or above the fail-on level.
export function decide(byLevel, failOn) {
  const failing = LEVELS.filter((l) => atOrAbove(l, failOn)).reduce((n, l) => n + (byLevel[l] ?? 0), 0);
  const total = LEVELS.reduce((n, l) => n + (byLevel[l] ?? 0), 0);
  const parts = ['error', 'warning', 'info'].filter((l) => byLevel[l]).map((l) => `${byLevel[l]} ${l}`);
  const detail = parts.length ? ` (${parts.join(', ')})` : '';
  if (failing > 0) return { pass: false, failOn, text: `FAIL - ${failing} ${failing === 1 ? 'finding' : 'findings'} at or above ${failOn}${detail}` };
  return { pass: true, failOn, text: `PASS - no finding at or above ${failOn}${total ? detail : ''}` };
}
