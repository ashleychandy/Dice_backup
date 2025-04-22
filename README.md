# XDC Dice Game

A decentralized dice game running on the XDC blockchain.

## Project Structure

```
src/
├── assets/           # Static assets like images, fonts, etc.
├── components/       # React components
│   ├── dice/         # Dice game specific components
│   ├── error/        # Error handling components
│   ├── layout/       # Layout components
│   ├── routes/       # Routing components
│   ├── ui/           # Generic UI components
│   └── wallet/       # Wallet connection components
├── config/           # Application configuration
├── constants/        # Constants and enums
├── contexts/         # React contexts
├── contracts/        # Smart contract ABIs and interfaces
│   └── abi/          # Contract ABIs
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # Application services
└── utils/            # Utility functions
```

## Recent Improvements

- **Code Organization**: Implemented a more modular structure with custom hooks
- **Error Handling**: Added comprehensive error handling with ErrorBoundary
- **Performance**: Added code splitting, React Query optimizations, and bundle chunking
- **Configuration**: Centralized configuration management
- **Development Tools**: Added ESLint, Prettier, and bundle analysis

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (see Environment Variables section)

3. Run development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run analyze` - Analyze bundle size

## Environment Variables

Create a `.env` file with the following variables:

```
# RPC endpoints
VITE_XDC_MAINNET_RPC=https://rpc.xinfin.network
VITE_XDC_APOTHEM_RPC=https://rpc.apothem.network

# Contract addresses - REQUIRED for the application to function properly
VITE_TOKEN_ADDRESS=your_mainnet_token_address
VITE_DICE_ADDRESS=your_mainnet_dice_address
VITE_APOTHEM_TOKEN_ADDRESS=your_testnet_token_address
VITE_APOTHEM_DICE_ADDRESS=your_testnet_dice_address

# Optional - only needed for contract deployment scripts
PRIVATE_KEY=your_private_key_for_deployment
```

> **IMPORTANT**: The application will not function correctly without properly configured contract addresses. Make sure to deploy the contracts and update the environment variables with the actual contract addresses before using the application.
