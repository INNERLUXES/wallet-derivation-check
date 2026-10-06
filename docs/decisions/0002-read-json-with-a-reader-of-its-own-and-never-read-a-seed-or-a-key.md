# 2. Read JSON with a reader of its own, and never read a seed or a key

## Status

Accepted

## Context

The facts the checks need sit in the configuration: for each entry the coin, the network, the derivation path, the
address type and the gap limit. `JSON.parse` would read them, but it keeps no line and column, so a finding could not
point at the line of an entry; it takes the last of two values written under one key without a word; and it builds
objects whose keys come from the file.

A wallet configuration sits next to the code that holds the keys, and a careless file can hold a seed: a test mnemonic
pasted next to the paths, an extended private key under a key named `xprv`, a private key left in a notes field. A
tool that reads such a file and echoes its values in a report would copy the secret into a pipeline log, a pull request
comment or a SARIF upload, where many more people can read it.

A configuration that is not complete (an entry with no address type, a misspelt gap limit) would also be read as if it
were, and a check could take a value it never saw for one that is fine.

## Decision

1. The file is read by src/json.js, a reader of the tool's own for strict JSON, with the line and column of every value,
   a key written twice as an error, and limits of nesting, values and string length. It does not recurse.
2. The tool never asks for a seed, a mnemonic or a key, and never derives a key: it checks the notation of the paths.
   Before the configuration is read, src/secrets.js walks every key and every string of the file. A key named for a
   seed or a key, and a string shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF,
   is a `secret-in-config` error at its line. The value is marked, the configuration reader leaves it out as if it were
   not there, and no report and no error message shows it, in any format.
3. Every field the checks need and the file does not give, every key the tool does not read and every value of the
   wrong type is returned with its line and shown as a finding. A check never takes a value it did not read for one
   that is fine, and an entry whose path could not be read is named in a note.
4. A file that is not JSON, or not an object, stops with one `config-unreadable` finding and a line; the tool does not
   guess at the rest of the file.
5. The checks are a heuristic over the configuration as written, and every report says so; docs/method.md says what each
   check reads and docs/limits.md what it cannot see. The result is an input to a review before the wallet ships: not a
   security audit and not a guarantee that every address can be recovered in another wallet.

## Consequences

- The tool needs no install and no network, and the same file gives the same report on Linux, Windows and macOS.
- A finding points at the line of the field or the entry.
- A seed or a key in the file fails the run and is never copied into the output. The shapes are loose, so a value that
  only looks like a secret is reported too; that is the safe side.
- Configurations in YAML or TOML, and paths built in code, are not read (docs/limits.md).
