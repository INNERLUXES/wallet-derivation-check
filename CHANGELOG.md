# Changes

## 1.0.0

First release.

- Reads the configuration of the accounts a crypto wallet app derives from one seed, as JSON, and lists the problems to
  fix before the wallet ships, with file and line, as an input to a review: not a security audit and not a guarantee
  that every address can be recovered in another wallet. It never reads or asks for a seed or a key, reads the file,
  fetches nothing, runs nothing, calls no chain or node, follows no symbolic link and reads no clock.
- Reads the wallet name and its entries, each with a name, a coin (by name or symbol), a network (`mainnet` or
  `testnet`), a derivation path, an address type (`p2pkh`, `p2sh-p2wpkh`, `p2wpkh`, `p2tr`, `evm` or `ed25519`) and an
  optional gap limit. A path is read as BIP-32 and BIP-44 write it, with `'`, `h` or `H` for a hardened level, spaces
  around slashes, and the placeholders `{account}`, `{change}` and `{index}`.
- A strict JSON reader with no dependency and no recursion, with the line and column of every value, a key written
  twice as an error, and limits of size, nesting, values and string length.
- A search for seeds and keys before anything else is read: a key named for a seed, a mnemonic or a private key, and a
  value shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is an error whose value
  is left out of every check and never shown.
- Twenty-one checks in three levels, each documented or a best practice of the tool and saying which: a path that
  cannot be parsed (`path-unparsable`), a path without the five levels of BIP-44 (`path-depth`), a purpose that does not
  match the address type (`purpose-mismatch`), a coin type that is not the SLIP-44 number of the coin
  (`coin-type-mismatch`), the testnet coin type on mainnet (`testnet-coin-on-mainnet`) or a mainnet coin type on testnet
  (`mainnet-coin-on-testnet`), a purpose, coin type or account without the hardened mark (`level-not-hardened`), a
  hardened change or address index (`level-hardened`), a change level other than 0 or 1 (`change-out-of-range`), an
  unhardened level on an ed25519 path (`ed25519-unhardened`), a gap in the accounts (`account-gap`), a gap limit below
  20 (`gap-limit-low`), two entries that can derive one key (`path-duplicate`), an address type of another family than
  the coin (`address-type-family`) and a coin out of the table (`coin-not-in-table`); and six checks about the input
  (`config-unreadable`, `field-missing`, `field-unknown`, `field-invalid`, `entry-duplicate`, `secret-in-config`).
- A table of the entries with each path in one notation, in every format but SARIF.
- Reports as text, markdown, JSON and SARIF 2.1.0; every finding has its id, severity, message, file, line and column;
  `--min-severity`, `--fail-on`, `--explain` with the points of the pages behind each finding, and `--list-checks`. Exit
  code `0` when no finding is at or above the fail-on level, `1` when one is, `2` for a usage or input error, with no
  result.
- Plain text copies of the public pages the documented checks rest on, under research/sources, with a note on each page.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
