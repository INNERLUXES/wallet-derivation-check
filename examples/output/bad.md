# wallet-derivation-check: examples/bad/wallet.json

- File: 130 lines, 3,155 bytes
- Wallet: Lantern Example Wallet; 17 entries on 9 coins \(bitcoin, litecoin, dogecoin, bitcoin-cash, ethereum, polygon and 3 more\); mainnet and testnet
- Findings: 22 \(13 error, 7 warning, 2 info\)
- Result: **FAIL - 13 findings at or above error \(13 error, 7 warning, 2 info\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| error | secret-in-config | examples/bad/wallet.json:4 | The configuration holds the key "seedPhrase", which names a seed, a mnemonic or a private key. The tool never reads one, and the value is not shown. Fix: Remove the seed or the key from the file and from the history of the repository, and treat it as exposed: move the funds it holds to a new seed. The configuration lists paths only. |
| error | purpose-mismatch | examples/bad/wallet.json:18 | The path m/84'/0'/0'/0/\{index\} of entry Bitcoin nested segwit has purpose 84, but the address type p2sh-p2wpkh is derived under purpose 49 \(BIP-49\). A wallet that restores the seed looks for p2sh-p2wpkh addresses under 49' and does not find these. Fix: Change the purpose to the one of the address type, or the address type to the one of the purpose. |
| error | testnet-coin-on-mainnet | examples/bad/wallet.json:34 | Entry Bitcoin taproot is on mainnet, but its path m/86'/1'/0'/0/\{index\} has coin type 1, which SLIP-44 keeps for the testnets of all coins. Mainnet funds sent to these addresses sit in the testnet subtree, where a wallet that restores the seed for Bitcoin does not look. Fix: Use the SLIP-44 number of the coin on mainnet, and coin type 1 only for a testnet entry. |
| error | path-unparsable | examples/bad/wallet.json:49 | The path "m/84'/0'/\{wallet\}'/0/0" of entry Bitcoin vault names \{wallet\} at level 3; the placeholders are \{account\}, \{change\} and \{index\}. BIP-32 writes a path as m and one index per level, each below 2^31 with a mark when it is hardened; the tool also reads \{account\}, \{change\} and \{index\} in place of a level. The other checks of the path were not made for this entry. Fix: Write the path as BIP-32 and BIP-44 do, such as m/84'/0'/0'/0/0, or with placeholders, such as m/84'/0'/\{account\}'/\{change\}/\{index\}. |
| error | coin-type-mismatch | examples/bad/wallet.json:56 | The path m/84'/3'/0'/0/\{index\} of entry Litecoin has coin type 3, but SLIP-44 registers Litecoin as 2. A wallet that restores the seed looks for Litecoin under 2' and does not find these addresses. Fix: Change the coin type to the SLIP-44 number of the coin. |
| error | level-not-hardened | examples/bad/wallet.json:64 | The path m/44/3'/0'/0/\{index\} of entry Dogecoin derives the purpose without the hardened mark; BIP-44 hardens the purpose, the coin type and the account. A wallet that restores the seed derives other keys, and an extended public key above them with one leaked child private key gives away the parent private key. Fix: Harden the purpose, the coin type and the account with ' or h, as in m/44'/0'/0'/0/0. |
| error | level-hardened | examples/bad/wallet.json:85 | The path m/44'/60'/2'/0/0' of entry Ethereum account 2 derives the address index hardened; BIP-44 uses normal derivation for the change and the address index. A wallet that restores the seed derives other keys, and the extended public key of the account cannot give these addresses to a watch-only wallet. Fix: Remove the hardened mark from the change and the address index. |
| error | change-out-of-range | examples/bad/wallet.json:99 | The change level of the path m/44'/61'/0'/2/0 of entry Ether Classic is 2; BIP-44 uses 0 for the external chain of receiving addresses and 1 for the internal chain of change, and a wallet that restores the seed looks at no other. Fix: Use 0 for receiving addresses and 1 for change addresses, or the placeholder \{change\}. |
| error | ed25519-unhardened | examples/bad/wallet.json:106 | The path m/44'/501'/0'/0 of entry Solana is for an ed25519 key, but the change is not hardened; SLIP-10 derives ed25519 keys through hardened levels only, so a wallet that follows it cannot derive this path at all. Fix: Harden every level of an ed25519 path, as in m/44'/501'/0'/0'. |
| error | address-type-family | examples/bad/wallet.json:114 | Entry Solana as EVM is Solana, which takes ed25519 keys \(ed25519\), but its addressType is evm, one of EVM account addresses \(evm\); a wallet for Solana would not show this address. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Choose an address type of the family of the coin, or correct the coin. |
| error | entry-duplicate | examples/bad/wallet.json:117 | Entry 16 is named SOLANA, as is entry 14 at line 103; a finding cannot be traced to one of them. Fix: Give each entry a name of its own, or merge the two. |
| error | field-missing | examples/bad/wallet.json:123 | Entry 17 has no addressType. Fix: Add the field named; docs/inputs.md lists what each part of the configuration needs. |
| error | field-invalid | examples/bad/wallet.json:126 | The network of entry Tron is "main"; it must be mainnet or testnet. Fix: Write the value as docs/inputs.md shows: text for the name, coin, network, path and addressType, and a whole number for gapLimit. |
| warning | path-duplicate | examples/bad/wallet.json:26 | Entry Bitcoin native segwit derives m/84'/0'/\{account\}'/\{change\}/\{index\}, and entry Bitcoin nested segwit at line 18 derives m/84'/0'/0'/0/\{index\}; the two can name the same key. BIP-44 gives each coin a subtree of its own so that keys are not shared; if the two entries are meant to share one key, such as one EVM address on two networks, record that choice. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Give each entry a path of its own, or confirm that the two are meant to share one key, such as one EVM address on two networks. |
| warning | gap-limit-low | examples/bad/wallet.json:28 | Entry Bitcoin native segwit has a gap limit of 5, below the 20 of BIP-44: when a seed from a wallet that hands out addresses up to that gap is restored here, the app stops after 5 unused addresses in a row and does not show the funds on the addresses after them. Fix: Set gapLimit to 20 or more, so that a seed restored from another wallet shows every address that wallet handed out. |
| warning | mainnet-coin-on-testnet | examples/bad/wallet.json:42 | Entry Bitcoin test is on testnet, but its path m/49'/0'/0'/0/\{index\} has coin type 0, the mainnet number of Bitcoin, not 1, which SLIP-44 keeps for the testnets of all coins; the test keys are then keys of a mainnet subtree, and one key can hold coins of both networks. Fix: Use coin type 1 for testnet entries, or confirm that the app and the wallets it must match keep the mainnet coin type on this test network. |
| warning | field-unknown | examples/bad/wallet.json:58 | The key "gaplimit" of entry 7 is not one the tool reads, so its value was left out of every check. Did you mean "gapLimit"? The keys of entry 7 are name, coin, network, path, addressType, gapLimit, notes. Fix: Correct the spelling to a key of docs/inputs.md, or remove the key. |
| warning | path-depth | examples/bad/wallet.json:71 | The path m/44'/145'/0' of entry Bitcoin Cash has 3 levels below m; BIP-44, and BIP-49, BIP-84 and BIP-86 after it, use five: purpose, coin type, account, change and address index. A wallet that restores the seed under them does not look at this path. Fix: Give the path the five levels of BIP-44, or confirm that the wallets the users restore their seed in derive the same shorter or longer path. |
| warning | account-gap | examples/bad/wallet.json:85 | The entries under m/44'/60' on mainnet derive accounts 0 and 2, but not account 1: BIP-44 numbers accounts from 0 up, and its account discovery stops at the first account with no history, so a wallet that restores the seed may never find account 2 of entry Ethereum account 2. Fix: Number the accounts from 0 with no gap, or use the placeholder \{account\} and let the app open accounts in order. |
| warning | path-duplicate | examples/bad/wallet.json:92 | Entry Polygon derives m/44'/60'/0'/0/0, the same path as entry Ethereum account 0 at line 78, so the two derive one key. BIP-44 gives each coin a subtree of its own so that keys are not shared; if the two entries are meant to share one key, such as one EVM address on two networks, record that choice. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Give each entry a path of its own, or confirm that the two are meant to share one key, such as one EVM address on two networks. |
| info | coin-not-in-table | examples/bad/wallet.json:90 | The coin "polygon" of entry Polygon is not in the tool's table \(bitcoin, litecoin, dogecoin, ethereum, ethereum-classic, bitcoin-cash, solana\), so its coin type was checked only against the testnet number and its address type against no family. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Check the coin type of the coin in SLIP-44 by hand, or name the coin as the table does \(docs/inputs.md\). |
| info | coin-not-in-table | examples/bad/wallet.json:125 | The coin "tron" of entry Tron is not in the tool's table \(bitcoin, litecoin, dogecoin, ethereum, ethereum-classic, bitcoin-cash, solana\), so its coin type was checked only against the testnet number and its address type against no family. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Check the coin type of the coin in SLIP-44 by hand, or name the coin as the table does \(docs/inputs.md\). |

## Entries (17)

| Entry | Coin | Network | Type | Gap | Path |
| --- | --- | --- | --- | ---: | --- |
| Bitcoin legacy | bitcoin | mainnet | p2pkh | 20 | m/44'/0'/0'/0/\{index\} |
| Bitcoin nested segwit | bitcoin | mainnet | p2sh-p2wpkh | 20 | m/84'/0'/0'/0/\{index\} |
| Bitcoin native segwit | bitcoin | mainnet | p2wpkh | 5 | m/84'/0'/\{account\}'/\{change\}/\{index\} |
| Bitcoin taproot | bitcoin | mainnet | p2tr | 20 | m/86'/1'/0'/0/\{index\} |
| Bitcoin test | bitcoin | testnet | p2sh-p2wpkh | - | m/49'/0'/0'/0/\{index\} |
| Bitcoin vault | bitcoin | mainnet | p2wpkh | - | \(not read\) |
| Litecoin | litecoin | mainnet | p2wpkh | - | m/84'/3'/0'/0/\{index\} |
| Dogecoin | dogecoin | mainnet | p2pkh | - | m/44/3'/0'/0/\{index\} |
| Bitcoin Cash | bitcoin-cash | mainnet | p2pkh | - | m/44'/145'/0' |
| Ethereum account 0 | ethereum | mainnet | evm | - | m/44'/60'/0'/0/0 |
| Ethereum account 2 | ethereum | mainnet | evm | - | m/44'/60'/2'/0/0' |
| Polygon | polygon | mainnet | evm | - | m/44'/60'/0'/0/0 |
| Ether Classic | ethereum-classic | mainnet | evm | - | m/44'/61'/0'/2/0 |
| Solana | solana | mainnet | ed25519 | - | m/44'/501'/0'/0 |
| Solana as EVM | solana | mainnet | evm | - | m/44'/501'/1'/0/0 |
| SOLANA | solana | mainnet | ed25519 | - | m/44'/501'/2'/0' |
| Tron | tron | - | - | - | m/44'/195'/0'/0/\{index\} |

Note: the path of Bitcoin vault could not be read, so it was not compared with the other entries for shared keys and account gaps

This report is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another wallet.
