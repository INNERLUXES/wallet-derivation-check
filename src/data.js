// The public pages the checks rest on, and the points of each page that the reports show, written in this project's own
// words. A page is named by its address; a copy of its text, read before it was listed, is kept under research/sources.
// research/sources.md lists every page with a note, docs/rules-and-sources.md lists every rule with its points, and
// test/data.test.js checks the three against each other.

export const LEVELS = ['info', 'warning', 'error'];

export const NOT_A = 'not a security audit and not a guarantee that every address can be recovered in another wallet';

export const NOTICE = `This report is an input to a review before the wallet ships: ${NOT_A}.`;

const BIPS = 'https://github.com/bitcoin/bips/blob/master';
const SLIPS = 'https://github.com/satoshilabs/slips/blob/master';

export const SOURCES = [
  { id: 'bip-32', title: 'BIP-32: Hierarchical Deterministic Wallets', url: `${BIPS}/bip-0032.mediawiki`, file: 'research/sources/bip-0032-hierarchical-deterministic-wallets.txt' },
  { id: 'bip-44', title: 'BIP-44: Multi-Account Hierarchy for Deterministic Wallets', url: `${BIPS}/bip-0044.mediawiki`, file: 'research/sources/bip-0044-multi-account-hierarchy.txt' },
  { id: 'bip-49', title: 'BIP-49: Derivation scheme for P2WPKH-nested-in-P2SH based accounts', url: `${BIPS}/bip-0049.mediawiki`, file: 'research/sources/bip-0049-p2wpkh-nested-in-p2sh.txt' },
  { id: 'bip-84', title: 'BIP-84: Derivation scheme for P2WPKH based accounts', url: `${BIPS}/bip-0084.mediawiki`, file: 'research/sources/bip-0084-p2wpkh.txt' },
  { id: 'bip-86', title: 'BIP-86: Key Derivation for Single Key P2TR Outputs', url: `${BIPS}/bip-0086.mediawiki`, file: 'research/sources/bip-0086-p2tr.txt' },
  { id: 'slip-44', title: 'SLIP-0044: Registered coin types for BIP-0044', url: `${SLIPS}/slip-0044.md`, file: 'research/sources/slip-0044-registered-coin-types.txt' },
  { id: 'slip-10', title: 'SLIP-0010: Universal private key derivation from master private key', url: `${SLIPS}/slip-0010.md`, file: 'research/sources/slip-0010-universal-private-key-derivation.txt' }
];

// Points: id -> { source, text }.
export const POINTS = {
  'bip32-index': { source: 'bip-32', text: 'Every key has 2^31 normal and 2^31 hardened children; a hardened index i stands for i + 2^31, and a path names one child index per level below the master key m.' },
  'bip32-hardened-public': { source: 'bip-32', text: 'A hardened child can only come from the private key of its parent, while a normal child can also come from the extended public key; a parent extended public key together with one normal child private key gives away the parent private key.' },
  'bip44-levels': { source: 'bip-44', text: 'BIP-44 puts five levels below the master key, in this order: purpose, coin type, account, change and address index.' },
  'bip44-hardening': { source: 'bip-44', text: 'In a BIP-44 path the purpose, the coin type and the account are hardened levels, and the change and the address index use public, that is normal, derivation.' },
  'bip44-purpose': { source: 'bip-44', text: 'The first level of a BIP-44 path is the purpose 44, hardened, and it says that the tree below it follows BIP-44.' },
  'bip44-coin-type': { source: 'bip-44', text: 'The coin type level puts each coin in a subtree of its own, so that one seed can hold many coins without the same addresses serving two of them; SLIP-44 keeps the list of numbers.' },
  'bip44-change': { source: 'bip-44', text: 'The change level holds 0 for the external chain, the addresses handed out to receive payments, and 1 for the internal chain, the addresses that take the change of a transaction.' },
  'bip44-discovery': { source: 'bip-44', text: 'Accounts are numbered from 0 up; a wallet should not open an account while the one before it has no transactions, and after an import it looks for accounts one by one and stops at the first that has no history.' },
  'bip44-gap-limit': { source: 'bip-44', text: 'BIP-44 sets the address gap limit at 20: once a wallet meets 20 unused addresses in a row on an external chain, it takes the chain to end there and looks no further.' },
  'bip49-purpose': { source: 'bip-49', text: 'BIP-49 keeps the levels of BIP-44 and changes only the purpose, to 49, for P2WPKH nested in P2SH, so that a wallet that reads the P2PKH accounts of BIP-44 does not show these accounts by mistake.' },
  'bip84-purpose': { source: 'bip-84', text: 'BIP-84 keeps the levels of BIP-44 and BIP-49 and sets the purpose to 84 for native SegWit P2WPKH accounts.' },
  'bip86-purpose': { source: 'bip-86', text: 'BIP-86 keeps the levels of BIP-44, BIP-49 and BIP-84 and sets the purpose to 86 for single key Taproot (P2TR) accounts, so that a seed backup alone is enough to find them.' },
  'slip44-numbers': { source: 'slip-44', text: 'SLIP-44 is the register of coin types for level 2 of a BIP-44 path, each used hardened: 0 for Bitcoin, 2 for Litecoin, 3 for Dogecoin, 60 for Ether, 61 for Ether Classic, 145 for Bitcoin Cash and 501 for Solana, among many more.' },
  'slip44-testnet': { source: 'slip-44', text: 'SLIP-44 keeps coin type 1 for the testnets of every coin, not for one coin of its own.' },
  'slip10-ed25519': { source: 'slip-10', text: 'SLIP-10 derives ed25519 keys with hardened children only, from a private parent key to a private child key; a normal child of an ed25519 key is not defined.' }
};

export const source = (id) => SOURCES.find((s) => s.id === id);
export const pointPage = (id) => source(POINTS[id].source);
