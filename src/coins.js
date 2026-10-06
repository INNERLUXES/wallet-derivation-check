// The coins and address types the tool knows. The table of coins is kept short on purpose: it holds only coins whose
// coin type was read in the saved copy of SLIP-44 (research/sources/slip-0044-registered-coin-types.txt), and
// test/data.test.js checks every row against that copy. A coin that is not in the table is a note, and its coin type is
// then checked only for the testnet number.

// family: the address types a coin of the family takes. bitcoin: the script types of BIP-44, BIP-49, BIP-84 and BIP-86;
// evm: an account address of an EVM chain; ed25519: an ed25519 key, as on Solana.
export const COINS = [
  { id: 'bitcoin', symbol: 'BTC', title: 'Bitcoin', coinType: 0, family: 'bitcoin' },
  { id: 'litecoin', symbol: 'LTC', title: 'Litecoin', coinType: 2, family: 'bitcoin' },
  { id: 'dogecoin', symbol: 'DOGE', title: 'Dogecoin', coinType: 3, family: 'bitcoin' },
  { id: 'ethereum', symbol: 'ETH', title: 'Ether', coinType: 60, family: 'evm' },
  { id: 'ethereum-classic', symbol: 'ETC', title: 'Ether Classic', coinType: 61, family: 'evm' },
  { id: 'bitcoin-cash', symbol: 'BCH', title: 'Bitcoin Cash', coinType: 145, family: 'bitcoin' },
  { id: 'solana', symbol: 'SOL', title: 'Solana', coinType: 501, family: 'ed25519' }
];

// The coin type SLIP-44 keeps for the testnets of all coins.
export const TESTNET_COIN_TYPE = 1;

// The address types: the purpose each is derived under, the page that sets it, its family and its curve.
export const ADDRESS_TYPES = [
  { id: 'p2pkh', purpose: 44, page: 'BIP-44', family: 'bitcoin', curve: 'secp256k1' },
  { id: 'p2sh-p2wpkh', purpose: 49, page: 'BIP-49', family: 'bitcoin', curve: 'secp256k1' },
  { id: 'p2wpkh', purpose: 84, page: 'BIP-84', family: 'bitcoin', curve: 'secp256k1' },
  { id: 'p2tr', purpose: 86, page: 'BIP-86', family: 'bitcoin', curve: 'secp256k1' },
  { id: 'evm', purpose: 44, page: 'BIP-44', family: 'evm', curve: 'secp256k1' },
  { id: 'ed25519', purpose: 44, page: 'BIP-44', family: 'ed25519', curve: 'ed25519' }
];

// The purposes of BIP-44, BIP-49, BIP-84 and BIP-86, whose paths have five levels.
export const PURPOSES = [44, 49, 84, 86];

export const NETWORKS = ['mainnet', 'testnet'];

export const FAMILIES = {
  bitcoin: 'the Bitcoin script types (p2pkh, p2sh-p2wpkh, p2wpkh, p2tr)',
  evm: 'EVM account addresses (evm)',
  ed25519: 'ed25519 keys (ed25519)'
};

const norm = (text) => text.trim().toLowerCase();

// The coin of the table a name or a symbol stands for, or null.
export const coinOf = (text) => COINS.find((c) => c.id === norm(text) || c.symbol.toLowerCase() === norm(text)) ?? null;

// The address type of a name, or null.
export const addressTypeOf = (text) => ADDRESS_TYPES.find((t) => t.id === norm(text)) ?? null;
