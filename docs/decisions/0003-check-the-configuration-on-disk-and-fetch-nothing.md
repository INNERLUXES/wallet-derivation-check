# 3. Check the configuration on disk, and fetch nothing

## Status

Accepted

## Context

Some facts about a wallet live elsewhere: the live list of SLIP-44, the addresses a node sees, the transaction history
that account discovery and the gap limit depend on. A check could download SLIP-44 on every run, derive addresses from
a test seed and ask a node about them, or run the wallet app and watch what it derives. Each would need the network and
often a key or a seed, would make the result depend on the state of a server, and would let a file in a pull request
make the pipeline reach an address it names.

What a team needs first, before the wallet ships, is a list of what is wrong in the paths and where: the purpose, the
coin type, the hardened levels and the gap limit, as the configuration writes them.

## Decision

1. The tool reads the one file it is given, and nothing else. It fetches nothing, calls no node or chain, needs no key
   or seed, derives no key, runs no program and calls no service.
2. The rules the checks apply are listed in docs/method.md, and the public pages each documented check rests on are
   named in src/data.js and research/sources.md, each fetched and read before it was listed, with a copy of its text
   under research/sources; the tool never looks them up while it runs.
3. The table of coins in src/coins.js is short and kept to coins whose SLIP-44 number was read in the saved copy; a test
   checks every row against it. A coin out of the table is a note, never a guess.
4. The tool lists what to look at and what to change; it changes nothing.

## Consequences

- The result depends only on the file, and a run needs no network access, no secret and no node.
- A coin registered in SLIP-44 after the copy was saved is a note until the table is updated in a release, with a test.
- Whether the app derives what its configuration says is for the team to make sure; docs/secure-defaults.md says to keep
  one configuration as the source of the paths.
