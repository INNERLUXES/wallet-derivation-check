# Method

This document says how the tool reads a wallet configuration and what each check looks at. The tool is an input to a
review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another
wallet. A clean run means only that none of the problems below were found in the file.

## Why the configuration

A wallet app derives every account it shows from one seed, along paths it writes down once: a purpose, a coin type, an
account, a change level and an address index. The user keeps the seed and nothing else. When the app is gone, or the
user moves to another wallet, that wallet derives the paths of BIP-44, BIP-49, BIP-84 and BIP-86 with the coin types of
SLIP-44, and finds the funds only if the app used the same paths. A purpose that does not match the address type, a coin
type off by one, a level hardened where the standard leaves it normal, or an account two after the last one used: each
sends funds to addresses that another wallet, restoring the same seed, does not look at. The funds are still there, and
the user cannot see them.

These choices sit in a configuration long before the app ships, and they cannot change once users hold funds on the
addresses. The tool reads that configuration as a file, so the same check runs on every change, and every finding points
at a line.

## Reading the file

1. The path is resolved against the folder the command runs in. A link, a folder, a device or a pipe is refused; a file
   over 4 MB is refused before it is read; a file with a null byte, or bytes that are not UTF-8 (or UTF-16 with a byte
   order mark), is refused with exit code `2` and no report.
2. The text goes to a JSON reader of the tool's own (`src/json.js`), which keeps the line and column of every value and
   reads strict JSON: a comment, a trailing comma, a key written twice in one object or text after the value is a
   `config-unreadable` finding with the line.
3. Every key and every string of the file is looked at for a seed or a key (`src/secrets.js`). A key named for a seed,
   a mnemonic or a private key, and a string shaped like a mnemonic, an extended private key, a private key in hex or a
   key in WIF, is `secret-in-config`. The value is marked and left out of everything that follows, and no report shows it.
4. The fields are read (`src/config.js`) as docs/inputs.md lists them. A missing field is `field-missing`, a key the tool
   does not read is `field-unknown`, a value of the wrong type or form is `field-invalid`, and two entries of one name
   are `entry-duplicate`. The value is then left out of every check that needs it.
5. The path of each entry is read (`src/path.js`) into its levels: a number with or without the hardened mark, or a
   placeholder. A path that cannot be read is `path-unparsable`, and the other checks of that path are left out.

## The checks of one entry

Each entry is checked on its own (`src/analyze.js`), with the curve of its address type: `ed25519` for the address type
`ed25519`, and secp256k1 for the others.

- The purpose (level 1) against the purpose of the address type: 44 for `p2pkh`, `evm` and `ed25519`, 49 for
  `p2sh-p2wpkh`, 84 for `p2wpkh` and 86 for `p2tr`.
- The coin type (level 2) against the network: 1 on a testnet, and on mainnet the SLIP-44 number of the coin when the
  coin is in the table.
- The hardened marks: on secp256k1, the purpose, the coin type and the account must be hardened and, on a path of five
  levels, the change and the address index must not be; on ed25519, every level must be hardened.
- The change (level 4) of a five-level secp256k1 path: 0 or 1.
- The number of levels: five on secp256k1, at least three on ed25519.
- The gap limit, when one is given: at least 20.
- The coin against the address type: a Bitcoin script type, an EVM address or an ed25519 key, by the family of the coin
  in the table.

## The checks across entries

- Every path is compared with the paths of the entries before it. Two paths can name the same key when they have the
  same number of levels, the same hardened marks, and at each level the same index or a placeholder on either side. The
  later entry is reported once, with the first entry it meets.
- The entries are grouped by purpose, coin type and network. In a group with no `{account}` placeholder, the accounts
  written as numbers must run from 0 with no gap; the first account after a gap is reported.

## The checks

Each check says whether it is documented or a best practice. A documented check rests on BIP-32, BIP-44, BIP-49,
BIP-84, BIP-86, SLIP-44 or SLIP-10. A best practice check is the tool's own choice; its message says so, and so does
`--list-checks`. [rules-and-sources.md](rules-and-sources.md) lists the pages and the points of each page behind each
check.

| Check | Looks at | Level |
| --- | --- | --- |
| `path-unparsable` | the notation of each path | error |
| `path-depth` | the number of levels: five on secp256k1, at least three on ed25519 | warning |
| `purpose-mismatch` | level 1 against the purpose of the address type | error |
| `coin-type-mismatch` | on mainnet, level 2 against the SLIP-44 number of a coin of the table | error |
| `testnet-coin-on-mainnet` | on mainnet, level 2 equal to 1 | error |
| `mainnet-coin-on-testnet` | on testnet, level 2 other than 1 | warning |
| `level-not-hardened` | on secp256k1, levels 1 to 3 without the hardened mark | error |
| `level-hardened` | on a five-level secp256k1 path, levels 4 and 5 with the hardened mark | error |
| `change-out-of-range` | on a five-level secp256k1 path, a number above 1 at level 4 | error |
| `ed25519-unhardened` | on ed25519, any level without the hardened mark | error |
| `account-gap` | the accounts of one purpose, coin type and network: not 0, 1, 2 and so on | warning |
| `gap-limit-low` | `gapLimit` below 20 | warning |
| `path-duplicate` | two entries whose paths can name the same key | warning |
| `address-type-family` | the address type against the family of a coin of the table | error |
| `coin-not-in-table` | a coin the table does not hold | info |
| `secret-in-config` | every key and string: a seed or a key | error |
| `entry-duplicate` | the names of the entries, without case and outer spaces | error |
| `field-invalid` | each value: its type and form | error |
| `field-unknown` | each key: not one the tool reads | warning |
| `field-missing` | each object: the fields it needs | error |
| `config-unreadable` | the file: not JSON, or not an object | error |

### Why some levels are what they are

- `purpose-mismatch`, `coin-type-mismatch`, `testnet-coin-on-mainnet`, `level-not-hardened`, `level-hardened` and
  `change-out-of-range` are errors: each makes the app derive keys that a wallet following the pages does not derive
  from the same seed, so funds sent to them are out of sight after a restore.
- `ed25519-unhardened` is an error: SLIP-10 does not define a normal child of an ed25519 key, so a wallet that follows
  it cannot derive the path at all.
- `secret-in-config` is an error: a seed or a key in a configuration file is exposed to everyone who can read the
  repository and its pipeline.
- `address-type-family` is an error and a best practice. The pages register numbers and purposes, not which address
  types a coin takes; the families of the table are the tool's own, but an EVM address on a Bitcoin coin is never what
  a wallet for that coin shows.
- `mainnet-coin-on-testnet` is a warning: SLIP-44 keeps coin type 1 for testnets, but some EVM wallets keep the mainnet
  coin type on test networks on purpose.
- `path-depth` is a warning: wallets for some chains derive paths of other lengths on purpose, and the team has to say
  whether the wallets its users restore in do the same.
- `account-gap` is a warning: BIP-44 discovery stops at the first account with no history, but an app that only ever
  shows its own accounts can still reach them.
- `gap-limit-low` is a warning: a low gap limit hides funds only when a seed from another wallet is restored in the app.
- `path-duplicate` is a warning and a best practice: one key on two entries is sometimes meant, such as one EVM address
  on two networks, and the team says so.
- `coin-not-in-table` is a note: the table is short on purpose, and a coin out of it is checked by hand.

## Findings

Every finding has `id`, `severity`, `message`, `file`, `line` and `column`, `at` (`file:line`), the `entry` it is about
when there is one, `fix`, and with `--explain` the points of the pages behind it. They are sorted errors first, then by
line. `--min-severity` hides the findings below a level and says how many; a hidden finding still counts for the result.
The result is `FAIL` when a finding is at or above `--fail-on` (default `error`) and `PASS` otherwise.

After the findings, the text and markdown reports list the entries: name, coin, network, address type, gap limit and the
path in one notation, with an apostrophe for every hardened level. The JSON report holds the same table; SARIF has no
place for it.
