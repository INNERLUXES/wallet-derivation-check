# wallet-derivation-check: examples/good/wallet.json

- File: 75 lines, 1,898 bytes
- Wallet: Harbor Example Wallet; 9 entries on 5 coins \(bitcoin, litecoin, ethereum, avalanche and solana\); mainnet and testnet
- Findings: 1 \(1 info\)
- Result: **PASS - no finding at or above error \(1 info\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| info | coin-not-in-table | examples/good/wallet.json:62 | The coin "avalanche" of entry Avalanche C-Chain is not in the tool's table \(bitcoin, litecoin, dogecoin, ethereum, ethereum-classic, bitcoin-cash, solana\), so its coin type was checked only against the testnet number and its address type against no family. This is a best practice of this tool, not a rule in BIP-32, BIP-44, BIP-49, BIP-84, BIP-86, SLIP-44 or SLIP-10. Fix: Check the coin type of the coin in SLIP-44 by hand, or name the coin as the table does \(docs/inputs.md\). |

## Entries (9)

| Entry | Coin | Network | Type | Gap | Path |
| --- | --- | --- | --- | ---: | --- |
| Bitcoin legacy | bitcoin | mainnet | p2pkh | 20 | m/44'/0'/\{account\}'/\{change\}/\{index\} |
| Bitcoin nested segwit | bitcoin | mainnet | p2sh-p2wpkh | 20 | m/49'/0'/\{account\}'/\{change\}/\{index\} |
| Bitcoin native segwit | bitcoin | mainnet | p2wpkh | 20 | m/84'/0'/\{account\}'/\{change\}/\{index\} |
| Bitcoin taproot | bitcoin | mainnet | p2tr | 20 | m/86'/0'/\{account\}'/\{change\}/\{index\} |
| Bitcoin testnet | bitcoin | testnet | p2wpkh | 20 | m/84'/1'/\{account\}'/\{change\}/\{index\} |
| Litecoin | litecoin | mainnet | p2wpkh | 20 | m/84'/2'/\{account\}'/\{change\}/\{index\} |
| Ethereum | ethereum | mainnet | evm | - | m/44'/60'/0'/0/\{index\} |
| Avalanche C-Chain | avalanche | mainnet | evm | - | m/44'/9000'/0'/0/\{index\} |
| Solana | solana | mainnet | ed25519 | - | m/44'/501'/\{account\}'/0' |

This report is an input to a review before the wallet ships: not a security audit and not a guarantee that every address can be recovered in another wallet.
