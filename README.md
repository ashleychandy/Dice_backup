# GAMA Dice

A blockchain-based Dice game running on the XDC Network.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The production build will create a `dist` directory with optimized files ready for deployment. This includes minified JavaScript bundles, compressed assets, and an index.html file.

## Features

- Decentralized Dice game on XDC blockchain
- Real-time game statistics and history
- Responsive design with Tailwind CSS
- Interactive animations with Framer Motion


## Environment Variables

Create a `.env` file in the root directory with these variables:

```
# XDC Mainnet
VITE_TOKEN_ADDRESS=<mainnet-token-contract-address>
VITE_DICE_ADDRESS=<mainnet-dice-contract-address>
VITE_XDC_MAINNET_RPC=https://rpc.xinfin.network

# XDC Testnet (Apothem)
VITE_APOTHEM_TOKEN_ADDRESS=<testnet-token-contract-address>
VITE_APOTHEM_DICE_ADDRESS=<testnet-dice-contract-address>
VITE_XDC_APOTHEM_RPC=https://rpc.apothem.network
```

## Development

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Analyze bundle
npm run analyze
```
