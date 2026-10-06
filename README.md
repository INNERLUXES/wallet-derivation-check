# wallet-derivation-check

Wallet derivation check. Give it the configuration of the accounts a crypto wallet app derives from one seed, as a JSON
file: for each entry the coin, the network, the derivation path (such as `m/84'/0'/0'/0/0`, or a template with
`{account}`, `{change}` and `{index}`), the address type the app shows (p2pkh, p2sh-p2wpkh, p2wpkh, p2tr, an EVM address
or an ed25519 key) and the gap limit. It reads the file and lists the problems to fix before the wallet ships, so that
funds are not sent to addresses users cannot recover in other wallets: paths that cannot be parsed, a purpose that does
not match the address type, a coin type that is not the SLIP-44 number of the coin, testnet and mainnet coin types
swapped, levels hardened or not hardened against BIP-44, change levels other than 0 and 1, ed25519 paths with unhardened
levels, two entries that derive the same key, gaps in the accounts that stop account discovery and gap limits below 20.
Every finding has its id, level, message and file and line, and the run exits with a code a pipeline can act on.

**It is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can
be recovered in another wallet.** It is not an auditor. It reads one file only: it never reads or asks for a seed or a
key, fetches nothing, runs nothing, calls no chain or node and reads no clock, so it does not see the code that derives
the keys, the addresses it produces or the wallets your users will restore their seed in; the checks are a heuristic.
A clean run means only that none of the problems of its checks were found in the file, and the team still has to test
the derivation of the app against known test vectors before it ships.

A user of a wallet keeps one thing: the seed. Every account the app shows is derived from it along a path, and when the
user restores the seed in another wallet, that wallet derives the paths of BIP-44, BIP-49, BIP-84 and BIP-86 with the
coin types of SLIP-44 (https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki). If the app used another path,
the funds are still on the chain, but the other wallet does not look there. A purpose of 84 on a P2SH-wrapped address,
a coin type off by one, a change level hardened, an account opened two after the last one used, or a Solana path with a
normal level that SLIP-10 does not define: each is easy to write and costly to find after users hold funds on it. This
tool reads the configuration on every change and points at the line.

- **One check per problem.** Twenty-one checks, each with what it looks at, what it cannot see, the public pages it
  rests on and what to change. Each check is either documented (in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or
  SLIP-10) or a best practice of this tool, and its message says which.
- **Never a seed.** The tool needs no seed and no key. A key named for one, or a value shaped like a mnemonic, an
  extended private key, a private key in hex or a key in WIF, is an error, and its value is never shown in any report.
- **Paths as the BIPs write them.** Hardened levels with `'`, `h` or `H`, spaces around slashes, and placeholders for
  the levels the app counts up; a path two wallets could read differently is a finding, never a guess.
- **A JSON reader of its own.** It keeps the line and column of every value, so a finding points at the line of the
  entry or the field; what the configuration does not say is listed as a finding, never taken for a value that is fine.
- Reports as text, markdown, JSON and SARIF, with an exit code for a pipeline: `0` no finding at or above the
  `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 127
pass 125
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link or a device (a link to a configuration file, and `/dev/null` named as a file); they are guarded with
`process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs the same tests
with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/wallet-derivation-check.git
cd wallet-derivation-check
node bin/wallet-derivation-check.js examples/bad/wallet.json
```

Or without a clone, in your own project:

```
npx --yes github:INNERLUXES/wallet-derivation-check wallet/derivation.json
```

`examples/` holds two made-up configurations. `examples/bad/wallet.json` holds a finding of nearly every check: a key
named `seedPhrase`, a P2SH-wrapped SegWit entry under purpose 84 that shares its keys with the native SegWit entry, a
gap limit of 5, a Taproot entry on mainnet with the testnet coin type, a testnet entry with the mainnet coin type, a path
with a placeholder the tool does not know, Litecoin under the coin type of Dogecoin, a misspelt key, a purpose without
the hardened mark, a path of three levels, an EVM account opened after a gap with a hardened address index, an EVM
network on the key of another, a change level of 2, a Solana path with a normal level, a Solana coin with an EVM address
type, two entries of one name and an entry with no address type and a network the tool does not know.
`examples/good/wallet.json` passes at error and warning level: Bitcoin under all four purposes with placeholders,
Bitcoin on testnet, Litecoin, an EVM account and Solana with every level hardened, and the one note it still shows is
a coin that is not in the tool's table.

## Usage

```
wallet-derivation-check <wallet.json> [options]
```

```
--format <name>           text, markdown, json or sarif (default: text)
--json                    the same as --format json
--min-severity <level>    the lowest level of a finding that is shown: info, warning, error (default: info)
--fail-on <level>         the lowest level of a finding that fails the run: info, warning, error (default: error)
--explain                 show the points of the pages behind each finding (text, markdown and JSON)
--list-checks             list the checks with their level and kind, and exit
--help                    show the usage
--version                 show the version
```

Name one file: the configuration. [docs/inputs.md](docs/inputs.md) lists every field. The path in the report is
relative to the folder you run the command in, with forward slashes on every system, followed by the line.

A short configuration looks like this:

```json
{
  "wallet": "Harbor Example Wallet",
  "entries": [
    { "name": "Bitcoin", "coin": "bitcoin", "network": "mainnet", "path": "m/84'/0'/{account}'/{change}/{index}", "addressType": "p2wpkh", "gapLimit": 20 },
    { "name": "Ethereum", "coin": "ethereum", "network": "mainnet", "path": "m/44'/60'/0'/0/{index}", "addressType": "evm" },
    { "name": "Solana", "coin": "solana", "network": "mainnet", "path": "m/44'/501'/{account}'/0'", "addressType": "ed25519" }
  ]
}
```

The report of the bad example starts with what was read, the findings in one line, and the checks with the number of
findings of each; then the findings, errors first, each with what to change:

```
wallet-derivation-check: examples/bad/wallet.json
file: 130 lines, 3,155 bytes
wallet: Lantern Example Wallet; 17 entries on 9 coins (bitcoin, litecoin, dogecoin, bitcoin-cash, ethereum, polygon and 3 more); mainnet and testnet
findings: 22 (13 error, 7 warning, 2 info)

Checks (21)

  check                    level    kind           findings
  config-unreadable        error    input          0
  field-missing            error    input          1
  field-unknown            warning  input          1
  field-invalid            error    input          1
  entry-duplicate          error    input          1
  secret-in-config         error    input          1
  path-unparsable          error    documented     1
  path-depth               warning  documented     1
  purpose-mismatch         error    documented     1
  coin-type-mismatch       error    documented     1
  testnet-coin-on-mainnet  error    documented     1
  mainnet-coin-on-testnet  warning  documented     1
  level-not-hardened       error    documented     1
  level-hardened           error    documented     1
  change-out-of-range      error    documented     1
  ed25519-unhardened       error    documented     1
  account-gap              warning  documented     1
  gap-limit-low            warning  documented     1
  path-duplicate           warning  best practice  2
  address-type-family      error    best practice  1
  coin-not-in-table        info     best practice  2
```

A finding names its check, its level, the file and the line of the field and what to change. With `--explain` it also
gives the points of the pages behind it and, for a best practice check, the tool's own choice:

```
  WARNING  account-gap              examples/bad/wallet.json:85
           The entries under m/44'/60' on mainnet derive accounts 0 and 2, but not account 1: BIP-44 numbers accounts from 0 up, and its account discovery stops at the first account with no history, so a wallet that restores the seed may never find account 2 of entry Ethereum account 2.
           fix: Number the accounts from 0 with no gap, or use the placeholder {account} and let the app open accounts in order.
           basis: Accounts are numbered from 0 up; a wallet should not open an account while the one before it has no transactions, and after an import it looks for accounts one by one and stops at the first that has no history. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
```

After the findings come the entries, each with its path in one notation, with an apostrophe for every hardened level:

```
Entries (17)

  entry                  coin              network  type         gap  path
  Bitcoin legacy         bitcoin           mainnet  p2pkh        20   m/44'/0'/0'/0/{index}
  Bitcoin nested segwit  bitcoin           mainnet  p2sh-p2wpkh  20   m/84'/0'/0'/0/{index}
  Bitcoin native segwit  bitcoin           mainnet  p2wpkh       5    m/84'/0'/{account}'/{change}/{index}
  Bitcoin taproot        bitcoin           mainnet  p2tr         20   m/86'/1'/0'/0/{index}
  Bitcoin test           bitcoin           testnet  p2sh-p2wpkh  -    m/49'/0'/0'/0/{index}
  Bitcoin vault          bitcoin           mainnet  p2wpkh       -    (not read)
  Litecoin               litecoin          mainnet  p2wpkh       -    m/84'/3'/0'/0/{index}
  Dogecoin               dogecoin          mainnet  p2pkh        -    m/44/3'/0'/0/{index}
  Bitcoin Cash           bitcoin-cash      mainnet  p2pkh        -    m/44'/145'/0'
  Ethereum account 0     ethereum          mainnet  evm          -    m/44'/60'/0'/0/0
  Ethereum account 2     ethereum          mainnet  evm          -    m/44'/60'/2'/0/0'
  Polygon                polygon           mainnet  evm          -    m/44'/60'/0'/0/0
  Ether Classic          ethereum-classic  mainnet  evm          -    m/44'/61'/0'/2/0
  Solana                 solana            mainnet  ed25519      -    m/44'/501'/0'/0
  Solana as EVM          solana            mainnet  evm          -    m/44'/501'/1'/0/0
  SOLANA                 solana            mainnet  ed25519      -    m/44'/501'/2'/0'
  Tron                   tron              -        -            -    m/44'/195'/0'/0/{index}
```

The end of the report holds the notes, the notice and the result:

```
  Tron                   tron              -        -            -    m/44'/195'/0'/0/{index}

note: the path of Bitcoin vault could not be read, so it was not compared with the other entries for shared keys and account gaps

This report is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another wallet.

RESULT: FAIL - 13 findings at or above error (13 error, 7 warning, 2 info)
```

The good example passes:

```
  Solana                 solana     mainnet  ed25519      -    m/44'/501'/{account}'/0'

This report is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another wallet.

RESULT: PASS - no finding at or above error (1 info)
```

## How the configuration is read

1. The path is resolved against the folder you run the command in. A link, a folder, a device or a file over 4 MB is
   refused, and so is a file that is not UTF-8 (or UTF-16 with a byte order mark) or holds a null byte, with exit code
   `2` and no report.
2. The JSON reader of the tool reads the file with the line and column of every value. It reads strict JSON and refuses
   a key written twice in one object.
3. Every key and every string is looked at for a seed or a key. One that is found is an error at its line, and its
   value is left out of everything that follows and never shown.
4. The fields of the configuration and of each entry are read with their lines. A key the tool does not read is a
   `field-unknown` finding; a missing field and a value of the wrong type are findings of their own, and that value is
   left out of the checks that need it.
5. The path of each entry is read into its levels, and checked against its address type, its coin and its network; then
   the entries are compared with each other for shared keys and gaps in the accounts.

[docs/method.md](docs/method.md) says what each check reads, and [docs/inputs.md](docs/inputs.md) lists the fields, the
coins, the address types and the notation of a path.

## What it checks

| Check | Level | Kind | What it reports |
| --- | --- | --- | --- |
| `path-unparsable` | error | documented | a path that is not m and levels below 2^31 with an optional hardened mark, or a placeholder in its place |
| `path-depth` | warning | documented | a secp256k1 path without the five levels of BIP-44, or an ed25519 path with fewer than three |
| `purpose-mismatch` | error | documented | a purpose other than 44 (p2pkh, evm, ed25519), 49 (p2sh-p2wpkh), 84 (p2wpkh) or 86 (p2tr) for the address type |
| `coin-type-mismatch` | error | documented | on mainnet, a coin type that is not the SLIP-44 number of the coin |
| `testnet-coin-on-mainnet` | error | documented | coin type 1, the testnet of all coins, on a mainnet entry |
| `mainnet-coin-on-testnet` | warning | documented | a coin type other than 1 on a testnet entry |
| `level-not-hardened` | error | documented | a purpose, coin type or account without the hardened mark on a secp256k1 path |
| `level-hardened` | error | documented | a hardened change or address index on a five-level secp256k1 path |
| `change-out-of-range` | error | documented | a change level other than 0 or 1 |
| `ed25519-unhardened` | error | documented | any level of an ed25519 path without the hardened mark, which SLIP-10 does not define |
| `account-gap` | warning | documented | accounts of one purpose, coin type and network with a gap, which stops BIP-44 account discovery |
| `gap-limit-low` | warning | documented | a gap limit below the 20 of BIP-44 |
| `path-duplicate` | warning | best practice | two entries whose paths can name the same key |
| `address-type-family` | error | best practice | an address type of another family than the coin: a Bitcoin script type on an EVM coin, and so on |
| `coin-not-in-table` | info | best practice | a coin out of the tool's short table, whose coin type is then checked by hand |
| `secret-in-config` | error | input | a key named for a seed or a key, or a value shaped like one; its value is never shown |
| `entry-duplicate` | error | input | two entries of one name |
| `field-invalid` | error | input | a value of the wrong type or form, a network or an address type the tool does not know |
| `field-unknown` | warning | input | a key the tool does not read, often a misspelt one |
| `field-missing` | error | input | a field the checks need |
| `config-unreadable` | error | input | a file that is not JSON, or holds no configuration object |

A documented check rests on BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. A best practice check is this
tool's own choice, and its message says "a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84,
BIP-86, SLIP-44 or SLIP-10". `--list-checks` shows the kind of each check. Some of the levels are worth a word:

- `mainnet-coin-on-testnet` is a warning. SLIP-44 keeps coin type 1 for testnets, but some EVM wallets keep coin type
  60 on test networks on purpose; record that choice and keep the warning in view.
- `path-duplicate` is a warning and a best practice. One key on two entries is sometimes meant, such as one EVM address
  on Ethereum and on another EVM network; the finding asks the team to say so.
- `address-type-family` is an error and a best practice. The pages do not say which address types a coin takes, but an
  EVM address on a Bitcoin coin is never what a wallet for that coin shows.
- `coin-not-in-table` is a note. The table holds only coins whose number was read in the saved copy of SLIP-44.

## What is not checked

[docs/limits.md](docs/limits.md) lists what the tool cannot see. Among them: whether the app derives what the
configuration says, the addresses themselves (test them against known test vectors), the paths of other wallets that do
not follow the BIPs, coins out of the table, accounts opened at run time, and seeds or keys in a shape the search does
not know.

## Formats

`--format text` (the default) is for a terminal. `--format markdown` is a report for a job summary or a pull request,
with a table of findings and the table of entries. `--format json` writes every finding with its `id`, `severity`,
`message`, `file`, `line`, `column`, `entry` and `fix`, the table of entries, and with `--explain` the points of the
pages. `--format sarif` writes SARIF 2.1.0, with the checks as rules, the configuration as the artifact and a result for
each finding with its line and column, for code scanning; the table of entries has no place in it. The saved output of
the examples is in [examples/output](examples/output).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | no finding at or above the `--fail-on` level (default `error`) |
| `1` | a finding at or above it |
| `2` | a usage error, or an input error such as a path that does not exist, a link or a folder, or a file that is not text or is too large; there is no report |

Findings below `--min-severity` are not shown, and still count for the result.

## Limits

The tool reads one file; it fetches nothing and connects to nothing. A run reports the problems of docs/method.md that
the file holds. [docs/limits.md](docs/limits.md) lists what it cannot see, with the size limits: 4 MB for a file,
objects and arrays nested up to 1,000 deep, 1,000 entries and paths of up to 255 levels and 1,000 characters.
[docs/threat-model.md](docs/threat-model.md) lists the risks of reading a file from a pull request and their controls,
and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | reads the file, looks for seeds and keys, reads the configuration, runs the checks and builds the report of the run |
| `src/files.js` | the bounded reading of a file by its byte order mark, with no link followed |
| `src/json.js` | the JSON reader: lines and columns, keys written twice, limits, a stack of its own |
| `src/secrets.js` | the search for seeds and keys by the name of a key and the shape of a value, which marks them so that no report shows them |
| `src/config.js` | the fields of the configuration and of each entry, and the input checks |
| `src/path.js` | the notation of a path, its levels and placeholders, and whether two paths can name the same key |
| `src/coins.js` | the coins with their SLIP-44 numbers, and the address types with their purposes |
| `src/analyze.js` | the checks on each entry and across the entries |
| `src/rules.js` | the checks, their levels and kinds, and the result |
| `src/report.js`, `src/text.js`, `src/size.js` | the text, markdown, JSON and SARIF output, the cleaning of text from the input and number formats |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `research/sources/` | text copies of the pages, as they were read |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

The documented checks rest on BIP-32, BIP-44, BIP-49, BIP-84 and BIP-86 in the bitcoin/bips repository and on SLIP-44
and SLIP-10 in the satoshilabs/slips repository, nothing else. Each page was read before it was listed, a text copy of
it is kept in [research/sources](research/sources), and [research/sources.md](research/sources.md) has a note on each
and lists the lines the copies leave out. [docs/rules-and-sources.md](docs/rules-and-sources.md) lists every check with
the points of the pages it rests on, what it cannot see and what to change. Where a check is a best practice and not a
rule in the pages, it says so.

- BIP-32, Hierarchical Deterministic Wallets: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki
- BIP-44, Multi-Account Hierarchy for Deterministic Wallets: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
- BIP-49, Derivation scheme for P2WPKH-nested-in-P2SH based accounts: https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
- BIP-84, Derivation scheme for P2WPKH based accounts: https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki
- BIP-86, Key Derivation for Single Key P2TR Outputs: https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki
- SLIP-0044, Registered coin types for BIP-0044: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
- SLIP-0010, Universal private key derivation from master private key: https://github.com/satoshilabs/slips/blob/master/slip-0010.md

## Background

The derivation paths of a wallet are settled before its first release, and they stay with every user for as long as
the user keeps the seed. They are read line by line when a team prepares a wallet for release, adds a chain to it, or
brings in engineers to build the app, its key handling and its tests. How such work is staffed and carried out is
described on the page [Cryptocurrency Wallet Development Services](https://innerluxes.dev/blockchain/cryptocurrency-wallet).

## License

MIT
