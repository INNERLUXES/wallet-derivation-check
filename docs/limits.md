# Limits

The tool is not an auditor. It reads one wallet configuration, and its result is an input to a review before the wallet
ships: not a security audit and not a guarantee that every address can be recovered in another wallet. A clean run
means only that none of the problems in [method.md](method.md) were found in the file.

## What it cannot see

- **The app.** It reads the configuration, not the code that derives the keys. Whether the app derives the paths the
  configuration names, with the curve and the encoding of the address type, is for the team and the reviewers of the
  code to make sure. A path built in code, outside the configuration, is not seen.
- **The keys and the addresses.** It never reads a seed and never derives a key or an address, so it cannot compare an
  address with the one another wallet derives. Test vectors from a known test seed, run in the test suite of the app,
  are the way to check that.
- **Other wallets.** It checks the paths against BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 and SLIP-10. A wallet
  that derives other paths of its own (a different number of levels for one chain, a coin type of its own, a scheme
  such as purpose 48 for multisig) is not known to the tool; such paths are reported as not matching, and the team says
  whether the wallets its users restore in do the same.
- **Coins out of the table.** The table holds seven coins whose SLIP-44 number was read in the saved copy. Another coin
  is a note, and its coin type is checked only against the testnet number.
- **The history.** Account discovery and the gap limit depend on which addresses have been used. The tool reads the
  configuration only: an account the app opens at run time, or a gap the users make by hand, is not seen.
- **Every seed and every key.** The search for seeds and keys knows them by the name of their key and by their shape: a
  mnemonic of 12 to 24 lowercase English words, an extended private key, 64 hex digits or a key in WIF. A seed in
  another language, split over fields, encrypted or encoded another way is not caught. A clean run does not say that the
  repository holds no secret.
- **What a misspelt key meant.** A key the tool does not read is reported and left out. A misspelt `gapLimit` makes an
  entry look as if it had none; read the `field-unknown` findings first.

## What the reader does not read

[inputs.md](inputs.md) lists the fields. A file that is not strict JSON is one `config-unreadable` finding, and nothing
else is checked. A value that is missing, of the wrong type or a seed is a finding, and the checks that need it leave it
out: a clean run says nothing about that part. YAML, TOML, comments and paths written as lists of numbers are not read.

## Size limits

| Limit | Value |
| --- | --- |
| file size | 4 MB |
| nesting of objects and arrays | 1,000 levels |
| values (nodes) in a file | 2,000,000 |
| a string | 1,000,000 characters |
| entries | 1,000; the rest are not read |
| a path | 1,000 characters and 255 levels |
| a gap limit | 1,000,000 |
| a text the search for seeds looks at | 4,000 characters |

Input past a limit is a `config-unreadable`, `field-invalid` or `path-unparsable` finding or, for the file size, an
input error with exit code `2`. The tool never passes a run because something could not be read.

## What a run does not do

It never reads or asks for a seed or a key, fetches nothing and connects to nothing, calls no chain or node, derives no
key, runs no program, evaluates nothing it reads, reads no clock and no locale, follows no symbolic link and writes
nothing to disk. [threat-model.md](threat-model.md) lists the risks of reading a file from a pull request and their
controls.
