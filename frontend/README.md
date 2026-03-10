# Vyo Apps - Setup Guide (Testnet)

## Environment Variables

Copy `.env.example` ke `.env.local` dan isi dengan value kamu:

```bash
cp .env.example .env.local
```

Isi file `.env.local`:

```env
# WalletConnect Project ID (Wajib)
# Dapatkan dari https://cloud.walletconnect.com
PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id_here

# Chain Configuration (Optional, default: 84532)
PUBLIC_CHAIN_ID=84532  # Base Sepolia Testnet

# API Base URL (Optional, default: localhost)
PUBLIC_API_BASE_URL=http://localhost:3001/api
```

## Base Sepolia Testnet Resources

- **Faucet**: https://www.coinbase.com/faucets/base-sepolia-faucet
- **Explorer**: https://sepolia.basescan.org
- **Chain ID**: 84532

## Running the Application

### 1. Backend
```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env dengan API keys
pnpm dev
```

### 2. Frontend
```bash
cd frontend
pnpm install
cp .env.example .env.local
# Edit .env.local dengan WalletConnect Project ID
pnpm dev
```

### 3. Smart Contract (Development)
```bash
cd contracts
forge build

# Deploy ke testnet (setelah setup private key)
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

## Wallet Integration

Kita menggunakan **Wagmi** + **WalletConnect** untuk wallet connection:

- **MetaMask**: Injected wallet
- **WalletConnect**: QR code scanner
- **Coinbase Wallet**: Via WalletConnect

### Setup WalletConnect

1. Kunjungi https://cloud.walletconnect.com
2. Buat project baru
3. Copy Project ID
4. Paste ke `.env.local`

## Testnet Contract Addresses

### Base Sepolia
- **USDC**: `0x036CbD53842c5426634e92b0c9D5eB112A4E1D4D`
- **VyoRouter**: `TBD` (Deploy dulu)
- **yoUSD (YO Vault)**: `TBD` (Deploy dulu atau dapatkan dari YO)

### Getting Testnet Funds

1. Dapatkan Base Sepolia ETH dari faucet:
   - https://www.coinbase.com/faucets/base-sepolia-faucet
   - https://sepolia-faucet.pk910.de/

2. Dapatkan Testnet USDC:
   - Gunakan bridge dari Ethereum Sepolia
   - Atau mint dari contract (jika available)

## YO Vault Integration

Smart contract berinteraksi dengan YO Protocol vaults (pada testnet):

**Note**: YO Protocol mungkin belum deploy ke testnet. Jika belum:
- Gunakan mock vaults untuk development
- Deploy vaults sendiri untuk testing
- Atau gunakan mode `DEV_MODE=mock` di backend

## API Endpoints

### Yield API
- `GET /api/yield/total` - Total yield summary
- `GET /api/yield/positions` - yoVault token positions
- `GET /api/yield/vault/:address` - Yield per vault
- `GET /api/yield/optimize` - AI optimization suggestions

### Goals API
- `GET /api/goals` - List user goals
- `POST /api/goals` - Create new goal
- `POST /api/goals/:id/deposit` - Deposit to goal

## Tech Stack

- **Frontend**: Astro + React + Wagmi
- **Backend**: Node.js + Express + pnpm
- **Smart Contract**: Solidity + Foundry
- **Wallet**: WalletConnect + MetaMask
- **Chain**: Base Sepolia Testnet (84532)

## Smart Contract Development

VyoRouter.sol menggunakan:
- Base Sepolia USDC: `0x036CbD53842c5426634e92b0c9D5eB112A4E1D4D`
- YO Vault addresses: TODO (deploy dulu)

### Compile Contract
```bash
cd contracts
forge build
```

### Deploy to Testnet
```bash
# Set private key (jangan commit!)
export PRIVATE_KEY=your_private_key

# Deploy
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

### Verify on Explorer
```bash
forge verify-contract --chain-id 84532 --watch \
  --constructor-args $(cast abi-encode "constructor()") \
  DEPLOYED_CONTRACT_ADDRESS VyoRouter
```

## Troubleshooting

### Wallet tidak connect ke testnet
- Pastikan wallet pilih "Base Sepolia" network
- Tambahkan network manual jika belum ada:
  - Network Name: Base Sepolia
  - RPC URL: https://sepolia.base.org
  - Chain ID: 84532
  - Currency Symbol: ETH
  - Explorer: https://sepolia.basescan.org

### Tidak ada testnet ETH
- Request dari faucet: https://www.coinbase.com/faucets/base-sepolia-faucet
- Atau mint dari contract faucet

### API tidak response
- Pastikan backend running di port 3001
- Check CORS settings di backend

### Contract interaction failed
- Pastikan VyoRouter sudah deploy ke testnet
- Update contract address di `src/lib/wallet.ts`
- Pastikan wallet punya testnet ETH untuk gas

## Switching to Mainnet

Untuk production, ubah ke mainnet:

1. Update `.env.local`:
   ```env
   PUBLIC_CHAIN_ID=8453
   ```

2. Update `src/lib/wallet.ts` dengan mainnet addresses

3. Update backend `.env`:
   ```env
   YO_CHAIN_ID=8453
   ```

4. Deploy contracts ke mainnet (butuh real ETH)
