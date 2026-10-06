# Inputs

The tool takes one path: the wallet configuration, a JSON file. There is no configuration file of the tool itself, no
environment variable and no standard input; the options are on the command line. The tool never asks for a seed, a
mnemonic or a key, and needs none.

```
wallet-derivation-check <wallet.json> [--format text|markdown|json|sarif] [--json] [--min-severity <level>]
                        [--fail-on <level>] [--explain] [--list-checks]
```

| Option | Meaning |
| --- | --- |
| `--format <name>` | `text` (default), `markdown`, `json` or `sarif` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | the lowest level shown: `info` (default), `warning` or `error` |
| `--fail-on <level>` | the lowest level that fails the run: `info`, `warning` or `error` (default) |
| `--explain` | add the points of the pages behind each finding to the text, markdown and JSON reports |
| `--list-checks` | list the checks with their level and kind, in text, markdown or JSON, and exit |
| `--help`, `--version` | the usage, the version |

Every option that takes a value takes it once. A value may not start with `--`. `-` (standard input) and an address
such as `https://...` are refused. A folder is refused: name the file. Two paths are a usage error.

## The configuration

The configuration is one JSON object. Every key is read with its line, and a key that is not in the lists below is a
`field-unknown` finding.

| Field | Needed | Read as |
| --- | --- | --- |
| `wallet` | yes | the name of the wallet app, text |
| `entries` | yes | a list of entries, at least one; each is an account or a chain the app derives from the seed |
| `notes` | no | text, not read by any check |

## An entry

| Field | Needed | Read as |
| --- | --- | --- |
| `name` | yes | text; two entries may not share a name (compared without case and outer spaces) |
| `coin` | yes | the coin, by the name or the symbol of the table below, in any case; another name is a note (`coin-not-in-table`) |
| `network` | yes | `mainnet` or `testnet`, in any case |
| `path` | yes | the derivation path, text; see below |
| `addressType` | yes | `p2pkh`, `p2sh-p2wpkh`, `p2wpkh`, `p2tr`, `evm` or `ed25519` |
| `gapLimit` | no | the gap limit of the app for this entry, a whole number from 0 to 1,000,000 written as a number |
| `notes` | no | text, not read by any check |

No field holds a seed, a mnemonic, an extended private key or a private key. A key named for one (`mnemonic`, `seed`,
`seedPhrase`, `privateKey`, `xprv`, `wif`, `secret`, `passphrase` and their kin, in any case and with any separator)
and a string shaped like one, under any key, is a `secret-in-config` error; its value is never shown.

## The coins

The table holds only coins whose SLIP-44 number was read in the saved copy of SLIP-44, and test/data.test.js checks each
row against it.

| Name | Symbol | SLIP-44 coin type | Family |
| --- | --- | --- | --- |
| `bitcoin` | `BTC` | 0 | Bitcoin script types |
| `litecoin` | `LTC` | 2 | Bitcoin script types |
| `dogecoin` | `DOGE` | 3 | Bitcoin script types |
| `ethereum` | `ETH` | 60 | EVM |
| `ethereum-classic` | `ETC` | 61 | EVM |
| `bitcoin-cash` | `BCH` | 145 | Bitcoin script types |
| `solana` | `SOL` | 501 | ed25519 |

Every testnet uses coin type 1.

## The address types

| Address type | Purpose | Page | Family | Curve |
| --- | --- | --- | --- | --- |
| `p2pkh` | 44 | BIP-44 | Bitcoin script types | secp256k1 |
| `p2sh-p2wpkh` | 49 | BIP-49 | Bitcoin script types | secp256k1 |
| `p2wpkh` | 84 | BIP-84 | Bitcoin script types | secp256k1 |
| `p2tr` | 86 | BIP-86 | Bitcoin script types | secp256k1 |
| `evm` | 44 | BIP-44 | EVM | secp256k1 |
| `ed25519` | 44 | BIP-44 | ed25519 | ed25519 |

The curve of an entry comes from its address type: `ed25519` is checked against SLIP-10, every other type against the
hardened levels of BIP-44.

## The path

A path is written as BIP-32 and BIP-44 write it: `m`, then one level per child, separated by `/`.

- A level is a whole number from 0 to 2147483647 (2^31 - 1), written without a leading zero.
- A hardened level has a mark after the number: an apostrophe (`44'`), `h` or `H`. The reports write it with an
  apostrophe.
- Spaces around a slash are allowed, as BIP-44 writes its examples: `m / 44' / 0' / 0' / 0 / 0`.
- Three placeholders stand for a level the app counts up: `{account}` at level 3, `{change}` at level 4 and `{index}`
  at the last level, from level 3 on. Each may carry the hardened mark: `{account}'`. A placeholder stands for every
  index when two paths are compared.
- A path starts with `m`, the master private key. `M`, the form of a path of public keys, is refused.
- A path has at most 255 levels and 1,000 characters.

Examples:

```
m/44'/0'/0'/0/0                          the first receiving address of the first Bitcoin account (p2pkh)
m/84'/0'/{account}'/{change}/{index}     every native SegWit address of every account (p2wpkh)
m/44'/60'/0'/0/{index}                   the addresses of the first EVM account
m/44'/501'/{account}'/0'                 a Solana key per account, every level hardened (ed25519)
```

## What stops the reading

| Problem | Result |
| --- | --- |
| a file that is not strict JSON (a comment, a trailing comma, a single quote, a key written twice in one object, text after the value), or is nested past the limits | one `config-unreadable` finding with the line and column, and nothing else is checked |
| JSON whose top level is not an object | one `config-unreadable` finding |
| a field missing, of the wrong type or unknown | a finding with the line; that value is left out of the checks that need it |
| a path that cannot be read | a `path-unparsable` finding; the other checks of that path are left out, and a note says which entries were not compared with the others |
| a seed or a key | a `secret-in-config` finding with the line; the value is left out of every check and never shown |

Line ends may be LF, CRLF or CR, and the file may be UTF-8 with or without a byte order mark or UTF-16 with one; the same
findings are written for each.

## Output paths

The path shown in a report is relative to the folder the command runs in, with forward slashes on every system, and the
whole path when the file is outside that folder. A finding is `file:line`: the line of the field it is about, or of the
object that lacks a field. The JSON, markdown and SARIF reports also carry the column.
