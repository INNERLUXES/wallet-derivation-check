# Rules and sources

Every check of the tool, with what it looks at, the points of the public pages it rests on, what it cannot see, and what to change. The points are in this project's own words and are the ones the reports show with `--explain`; each page was fetched and read before it was listed, and a copy of its text is kept under [research/sources](../research/sources) so that a point can be checked against the page it came from. [../research/sources.md](../research/sources.md) has a note on each page.

The tool is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another wallet. A check that is a best practice of this tool says so in its message; it is not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10.

## The pages

- BIP-32: Hierarchical Deterministic Wallets: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki (copy: `research/sources/bip-0032-hierarchical-deterministic-wallets.txt`)
- BIP-44: Multi-Account Hierarchy for Deterministic Wallets: https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki (copy: `research/sources/bip-0044-multi-account-hierarchy.txt`)
- BIP-49: Derivation scheme for P2WPKH-nested-in-P2SH based accounts: https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki (copy: `research/sources/bip-0049-p2wpkh-nested-in-p2sh.txt`)
- BIP-84: Derivation scheme for P2WPKH based accounts: https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki (copy: `research/sources/bip-0084-p2wpkh.txt`)
- BIP-86: Key Derivation for Single Key P2TR Outputs: https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki (copy: `research/sources/bip-0086-p2tr.txt`)
- SLIP-0044: Registered coin types for BIP-0044: https://github.com/satoshilabs/slips/blob/master/slip-0044.md (copy: `research/sources/slip-0044-registered-coin-types.txt`)
- SLIP-0010: Universal private key derivation from master private key: https://github.com/satoshilabs/slips/blob/master/slip-0010.md (copy: `research/sources/slip-0010-universal-private-key-derivation.txt`)

## config-unreadable

- Level: error
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: the file is not JSON the reader can follow, or its top level is not an object, so no configuration was read.
- Cannot see: It stops at the first place that is not JSON, or at a top level that is not an object, so nothing in that file is checked.
- What to change: Write the configuration as one JSON object (docs/inputs.md), and fix the line named.
- Points of the pages: none; this check is about the configuration file itself.

## field-missing

- Level: error
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: a field the checks need is not in the configuration: the wallet name or the entries, or the name, coin, network, path or addressType of an entry.
- Cannot see: It names the field and the object that lacks it; it does not guess the value, and the checks that need the field do not run for that entry.
- What to change: Add the field named; docs/inputs.md lists what each part of the configuration needs.
- Points of the pages: none; this check is about the configuration file itself.

## field-unknown

- Level: warning
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: a key the tool does not read, often a misspelt one; its value was left out of every check.
- Cannot see: It cannot tell what a misspelt key was meant to say; it names a known key when one is close, and the value is left out of every check.
- What to change: Correct the spelling to a key of docs/inputs.md, or remove the key.
- Points of the pages: none; this check is about the configuration file itself.

## field-invalid

- Level: error
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: a value of the wrong type or form: a number where text belongs, a network other than mainnet or testnet, an address type the tool does not know, or a gap limit that is not a whole number.
- Cannot see: It names the value and the form it needs; the value is left out of the checks that need it.
- What to change: Write the value as docs/inputs.md shows: text for the name, coin, network, path and addressType, and a whole number for gapLimit.
- Points of the pages: none; this check is about the configuration file itself.

## entry-duplicate

- Level: error
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: two entries share a name (compared without case and outer spaces), so a reader cannot tell which line a finding comes from.
- Cannot see: It compares names without case and outer spaces; two names that differ in other ways, such as Bitcoin and Bitcoin 2, are two entries.
- What to change: Give each entry a name of its own, or merge the two.
- Points of the pages: none; this check is about the configuration file itself.

## secret-in-config

- Level: error
- Kind: a problem with the configuration file itself; it has no setting to lower
- Looks at: the configuration holds a key named for a seed, a mnemonic or a private key, or a value shaped like one; the tool never reads it and never shows it.
- Cannot see: It knows a seed or a key by the name of its key or by its shape: a mnemonic of 12 to 24 lowercase English words, an extended private key, 64 hex digits or a WIF key. A seed in another language, split over several fields, encrypted or encoded another way is not caught, and a value of one of those shapes that is not a secret is reported all the same.
- What to change: Remove the seed or the key from the file and from the history of the repository, and treat it as exposed: move the funds it holds to a new seed. The configuration lists paths only.
- Points of the pages: none; this check is about the configuration file itself.

## path-unparsable

- Level: error
- Kind: documented
- Looks at: the path is not m followed by levels that are each a whole number below 2^31 with an optional hardened mark, or a placeholder {account}, {change} or {index} in its place.
- Cannot see: It reads the notation of the path, not what the app does with it. A path the app builds in code, outside the configuration, is not seen.
- What to change: Write the path as BIP-32 and BIP-44 do, such as m/84'/0'/0'/0/0, or with placeholders, such as m/84'/0'/{account}'/{change}/{index}.
- Points of the pages:
  - Every key has 2^31 normal and 2^31 hardened children; a hardened index i stands for i + 2^31, and a path names one child index per level below the master key m. (BIP-32: Hierarchical Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
  - BIP-44 puts five levels below the master key, in this order: purpose, coin type, account, change and address index. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## path-depth

- Level: warning
- Kind: documented
- Looks at: a secp256k1 path that does not have the five levels of BIP-44 (purpose, coin type, account, change and address index), or an ed25519 path with fewer than three.
- Cannot see: It counts the levels; it cannot tell whether the wallets the users restore their seed in derive a shorter or longer path of their own. Paths of the ed25519 type are only held to three levels, because wallets for ed25519 chains differ in the levels below the account.
- What to change: Give the path the five levels of BIP-44, or confirm that the wallets the users restore their seed in derive the same shorter or longer path.
- Points of the pages:
  - BIP-44 puts five levels below the master key, in this order: purpose, coin type, account, change and address index. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## purpose-mismatch

- Level: error
- Kind: documented
- Looks at: the purpose (level 1) is not the one the address type is derived under: 44 for p2pkh, evm and ed25519, 49 for p2sh-p2wpkh, 84 for p2wpkh and 86 for p2tr.
- Cannot see: It compares the purpose with the address type given in the entry; whether the app shows that address type is not seen. The purposes of other schemes, such as 48 for multisig, are reported as not matching.
- What to change: Change the purpose to the one of the address type, or the address type to the one of the purpose.
- Points of the pages:
  - The first level of a BIP-44 path is the purpose 44, hardened, and it says that the tree below it follows BIP-44. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
  - BIP-49 keeps the levels of BIP-44 and changes only the purpose, to 49, for P2WPKH nested in P2SH, so that a wallet that reads the P2PKH accounts of BIP-44 does not show these accounts by mistake. (BIP-49: Derivation scheme for P2WPKH-nested-in-P2SH based accounts, https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki)
  - BIP-84 keeps the levels of BIP-44 and BIP-49 and sets the purpose to 84 for native SegWit P2WPKH accounts. (BIP-84: Derivation scheme for P2WPKH based accounts, https://github.com/bitcoin/bips/blob/master/bip-0084.mediawiki)
  - BIP-86 keeps the levels of BIP-44, BIP-49 and BIP-84 and sets the purpose to 86 for single key Taproot (P2TR) accounts, so that a seed backup alone is enough to find them. (BIP-86: Key Derivation for Single Key P2TR Outputs, https://github.com/bitcoin/bips/blob/master/bip-0086.mediawiki)

## coin-type-mismatch

- Level: error
- Kind: documented
- Looks at: on mainnet, the coin type (level 2) is not the number SLIP-44 registers for the coin.
- Cannot see: It knows only the coins of its short table; for another coin the coin type is checked only against the testnet number. It does not read the live SLIP-44 list.
- What to change: Change the coin type to the SLIP-44 number of the coin.
- Points of the pages:
  - SLIP-44 is the register of coin types for level 2 of a BIP-44 path, each used hardened: 0 for Bitcoin, 2 for Litecoin, 3 for Dogecoin, 60 for Ether, 61 for Ether Classic, 145 for Bitcoin Cash and 501 for Solana, among many more. (SLIP-0044: Registered coin types for BIP-0044, https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
  - The coin type level puts each coin in a subtree of its own, so that one seed can hold many coins without the same addresses serving two of them; SLIP-44 keeps the list of numbers. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## testnet-coin-on-mainnet

- Level: error
- Kind: documented
- Looks at: a mainnet entry uses coin type 1, which SLIP-44 keeps for the testnets of all coins.
- Cannot see: It reads the network the entry names; an entry with the wrong network written in it is checked against that network.
- What to change: Use the SLIP-44 number of the coin on mainnet, and coin type 1 only for a testnet entry.
- Points of the pages:
  - SLIP-44 keeps coin type 1 for the testnets of every coin, not for one coin of its own. (SLIP-0044: Registered coin types for BIP-0044, https://github.com/satoshilabs/slips/blob/master/slip-0044.md)

## mainnet-coin-on-testnet

- Level: warning
- Kind: documented
- Looks at: a testnet entry uses a coin type other than 1, so its keys are the keys of a mainnet subtree.
- Cannot see: It applies the rule of SLIP-44 to every coin. Some EVM wallets keep coin type 60 on test networks on purpose; the finding is a warning so that such a choice can be recorded.
- What to change: Use coin type 1 for testnet entries, or confirm that the app and the wallets it must match keep the mainnet coin type on this test network.
- Points of the pages:
  - SLIP-44 keeps coin type 1 for the testnets of every coin, not for one coin of its own. (SLIP-0044: Registered coin types for BIP-0044, https://github.com/satoshilabs/slips/blob/master/slip-0044.md)

## level-not-hardened

- Level: error
- Kind: documented
- Looks at: on a secp256k1 path, the purpose, the coin type or the account is not hardened.
- Cannot see: It reads the hardened marks of the first three levels of a secp256k1 path, whatever the purpose; an address type it does not know is not checked.
- What to change: Harden the purpose, the coin type and the account with ' or h, as in m/44'/0'/0'/0/0.
- Points of the pages:
  - In a BIP-44 path the purpose, the coin type and the account are hardened levels, and the change and the address index use public, that is normal, derivation. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
  - A hardened child can only come from the private key of its parent, while a normal child can also come from the extended public key; a parent extended public key together with one normal child private key gives away the parent private key. (BIP-32: Hierarchical Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)

## level-hardened

- Level: error
- Kind: documented
- Looks at: on a five-level secp256k1 path, the change or the address index is hardened, where BIP-44 uses normal derivation.
- Cannot see: It looks only at five-level secp256k1 paths, where the change and the address index sit at levels 4 and 5.
- What to change: Remove the hardened mark from the change and the address index.
- Points of the pages:
  - In a BIP-44 path the purpose, the coin type and the account are hardened levels, and the change and the address index use public, that is normal, derivation. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
  - A hardened child can only come from the private key of its parent, while a normal child can also come from the extended public key; a parent extended public key together with one normal child private key gives away the parent private key. (BIP-32: Hierarchical Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)

## change-out-of-range

- Level: error
- Kind: documented
- Looks at: on a five-level secp256k1 path, the change level is a number other than 0 (receiving) or 1 (change).
- Cannot see: It looks only at five-level secp256k1 paths with a number at level 4; a placeholder {change} is taken to stand for 0 and 1.
- What to change: Use 0 for receiving addresses and 1 for change addresses, or the placeholder {change}.
- Points of the pages:
  - The change level holds 0 for the external chain, the addresses handed out to receive payments, and 1 for the internal chain, the addresses that take the change of a transaction. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## ed25519-unhardened

- Level: error
- Kind: documented
- Looks at: a path of the ed25519 address type has a level that is not hardened, which SLIP-10 does not define for ed25519.
- Cannot see: It knows an ed25519 path by the address type ed25519, not by the coin; an ed25519 chain written with another address type is not checked.
- What to change: Harden every level of an ed25519 path, as in m/44'/501'/0'/0'.
- Points of the pages:
  - SLIP-10 derives ed25519 keys with hardened children only, from a private parent key to a private child key; a normal child of an ed25519 key is not defined. (SLIP-0010: Universal private key derivation from master private key, https://github.com/satoshilabs/slips/blob/master/slip-0010.md)

## account-gap

- Level: warning
- Kind: documented
- Looks at: entries of one purpose, coin type and network derive accounts with a gap, or not from account 0, so BIP-44 account discovery stops before the later ones.
- Cannot see: It compares the accounts written as numbers in the entries of one purpose, coin type and network; a group that has the placeholder {account} is left out, because the app opens those accounts in order. Accounts opened at run time are not seen.
- What to change: Number the accounts from 0 with no gap, or use the placeholder {account} and let the app open accounts in order.
- Points of the pages:
  - Accounts are numbered from 0 up; a wallet should not open an account while the one before it has no transactions, and after an import it looks for accounts one by one and stops at the first that has no history. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## gap-limit-low

- Level: warning
- Kind: documented
- Looks at: the gap limit of an entry is below the 20 of BIP-44.
- Cannot see: It reads gapLimit when the entry gives one; an entry without it is not checked, and the gap limit the app uses in code is not seen.
- What to change: Set gapLimit to 20 or more, so that a seed restored from another wallet shows every address that wallet handed out.
- Points of the pages:
  - BIP-44 sets the address gap limit at 20: once a wallet meets 20 unused addresses in a row on an external chain, it takes the chain to end there and looks no further. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## path-duplicate

- Level: warning
- Kind: a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10
- Looks at: two entries derive the same path, or paths that can name the same key, so one key serves both.
- Cannot see: It compares the paths of the entries with each other; a placeholder stands for every index, so a template and a fixed path can overlap. Whether two entries are meant to share a key, such as one EVM address on two networks, is for the team to say.
- What to change: Give each entry a path of its own, or confirm that the two are meant to share one key, such as one EVM address on two networks.
- The tool's own choice: warning when two entries can derive one key is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10; BIP-44 gives each coin a subtree of its own, and an app may still share one key on purpose.
- Points of the pages:
  - The coin type level puts each coin in a subtree of its own, so that one seed can hold many coins without the same addresses serving two of them; SLIP-44 keeps the list of numbers. (BIP-44: Multi-Account Hierarchy for Deterministic Wallets, https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

## address-type-family

- Level: error
- Kind: a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10
- Looks at: the address type is not of the family of the coin in the tool's table: a Bitcoin script type on an EVM coin or on Solana, an EVM address on a Bitcoin coin, and so on.
- Cannot see: It knows the family of the coins of its short table only; a coin out of the table is not checked.
- What to change: Choose an address type of the family of the coin, or correct the coin.
- The tool's own choice: the families of the table of coins are a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10; the pages register numbers and purposes, not which address types a coin takes.
- Points of the pages: none; the families of the coins are the tool's own table.

## coin-not-in-table

- Level: info
- Kind: a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10
- Looks at: the coin is not in the tool's short table of coins whose SLIP-44 number was read in the saved copy, so its coin type and its family were not checked.
- Cannot see: It says only that the coin is not in the table; the coin may well be registered in SLIP-44 under the number the path gives.
- What to change: Check the coin type of the coin in SLIP-44 by hand, or name the coin as the table does (docs/inputs.md).
- The tool's own choice: keeping the table of coins short is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10; SLIP-44 registers many more coins than the tool checks.
- Points of the pages:
  - SLIP-44 is the register of coin types for level 2 of a BIP-44 path, each used hardened: 0 for Bitcoin, 2 for Litecoin, 3 for Dogecoin, 60 for Ether, 61 for Ether Classic, 145 for Bitcoin Cash and 501 for Solana, among many more. (SLIP-0044: Registered coin types for BIP-0044, https://github.com/satoshilabs/slips/blob/master/slip-0044.md)
