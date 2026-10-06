# Sources

The public pages the documented checks of this tool are based on, each with a short note in this project's own words on
what the page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. A plain text copy of each page, taken when it was read, is kept in [research/sources](sources) so that a point
can be checked against the page it came from, and the copies are the pages' own words, not this project's. src/data.js
holds the pages and the points the reports show, and test/data.test.js checks that every page in src/data.js is listed
here and has its copy, and that every coin of the table of src/coins.js is a row of the copy of SLIP-44.

The tool reads a wallet configuration and runs nothing; its result is an input to a review before the wallet ships: not
a security audit and not a guarantee that every address can be recovered in another wallet. These notes say what the
pages say so a reader can follow a finding back to its source. The pages were chosen with web addresses that hold no
number that reads like a year: the BIP files of the bitcoin/bips repository and the SLIP files of the satoshilabs/slips
repository, each read as the raw text of the file.

Where a check rests on a statement the pages do not make, it is a best practice of this tool, its message says so, and
the note for the check in [docs/rules-and-sources.md](../docs/rules-and-sources.md) names the choice. No page says which
address types a coin takes, or that two entries of an app must not share a key; those checks are best practices of this
tool.

## What the copies leave out

Each copy is the raw text of the file as it was read, with a two-line header that names its address, and with these
lines left out, so that no copy holds a date or a number that reads like a year, and every copy is plain ASCII
(decision 1 in docs/decisions):

- BIP-32: the line of its header that names the day it was assigned, and the list of dated changes at the top of the
  file with its heading.
- BIP-44, BIP-49, BIP-84 and BIP-86: the line of the header that names the day each was assigned.
- SLIP-10 and SLIP-44: the line of the header that names the day each was created.
- SLIP-44: the rows of the table of registered coin types whose number reads like a year (a coin type of four digits
  that starts with 19 or 20), three rows whose names are written in letters outside ASCII, and three rows whose name
  or symbol holds a word that this project keeps out of every file. None of these rows is a coin of the tool's table, and
  a coin whose number reads like a year cannot be added to it (decision 1).
- BIP-32 and SLIP-10: the sign for "greater than or equal" and "less than or equal" is written as `>=` and `<=`.

## Bitcoin Improvement Proposals

### BIP-32: Hierarchical Deterministic Wallets

https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki

Copy: research/sources/bip-0032-hierarchical-deterministic-wallets.txt

How a tree of keys is derived from one seed. Each key has 2^31 normal and 2^31 hardened children; a hardened index i
stands for i + 2^31, and a path is written as m and one index per level. A hardened child can be derived only from the
private key of its parent; a parent extended public key together with one normal child private key gives away the
parent private key, which is why the account level is hardened. `path-unparsable`, `level-not-hardened` and
`level-hardened` lean on it.

### BIP-44: Multi-Account Hierarchy for Deterministic Wallets

https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki

Copy: research/sources/bip-0044-multi-account-hierarchy.txt

The five levels below m: purpose (44), coin type, account, change and address index. Purpose, coin type and account are
hardened; change and address index use public derivation. The coin type gives each coin its own subtree, with the list
kept in SLIP-44. Change is 0 for the external chain and 1 for the internal chain. Accounts are numbered from 0, a new
account is not opened while the one before it has no history, and account discovery stops at the first account with no
transactions. The address gap limit is 20. `path-unparsable`, `path-depth`, `purpose-mismatch`, `coin-type-mismatch`,
`level-not-hardened`, `level-hardened`, `change-out-of-range`, `account-gap`, `gap-limit-low` and `path-duplicate` lean
on it.

### BIP-49: Derivation scheme for P2WPKH-nested-in-P2SH based accounts

https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki

Copy: research/sources/bip-0049-p2wpkh-nested-in-p2sh.txt

The levels of BIP-44 with the purpose 49 for P2WPKH nested in P2SH, so that a wallet that reads only the P2PKH accounts
of BIP-44 does not show these accounts and miss some of their coins. `purpose-mismatch` leans on it.

### BIP-84: Derivation scheme for P2WPKH based accounts

https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki

Copy: research/sources/bip-0084-p2wpkh.txt

The levels of BIP-44 and BIP-49 with the purpose 84 for native SegWit P2WPKH accounts. `purpose-mismatch` leans on it.

### BIP-86: Key Derivation for Single Key P2TR Outputs

https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki

Copy: research/sources/bip-0086-p2tr.txt

The levels of BIP-44, BIP-49 and BIP-84 with the purpose 86 for single key Taproot (P2TR) outputs, so that a wallet
with only a seed backup can find them. `purpose-mismatch` leans on it.

## SatoshiLabs Improvement Proposals

### SLIP-0044: Registered coin types for BIP-0044

https://github.com/satoshilabs/slips/blob/master/slip-0044.md

Copy: research/sources/slip-0044-registered-coin-types.txt

The register of coin types for level 2 of a BIP-44 path, all used hardened. Coin type 1 is the testnet of all coins.
The tool's table of coins holds seven of its rows: 0 Bitcoin, 2 Litecoin, 3 Dogecoin, 60 Ether, 61 Ether Classic, 145
Bitcoin Cash and 501 Solana. `coin-type-mismatch`, `testnet-coin-on-mainnet`, `mainnet-coin-on-testnet` and
`coin-not-in-table` lean on it.

### SLIP-0010: Universal private key derivation from master private key

https://github.com/satoshilabs/slips/blob/master/slip-0010.md

Copy: research/sources/slip-0010-universal-private-key-derivation.txt

The derivation of BIP-32 for other curves, among them ed25519. For ed25519 and curve25519 only hardened derivation, from
a private parent key to a private child key, is supported; a normal child is not defined. `ed25519-unhardened` leans on
it. The pages of Solana are not used: the checks of an ed25519 path rest on SLIP-10, and the coin type of Solana on
SLIP-44.
