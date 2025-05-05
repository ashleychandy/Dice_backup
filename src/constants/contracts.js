/**
 * Contract addresses for different networks
 * These addresses should be updated when deploying to different networks
 */

// XDC Testnet (Apothem)
export const DICE_CONTRACT_ADDRESS_APOTHEM = import.meta.env
  .VITE_APOTHEM_DICE_ADDRESS;
export const TOKEN_CONTRACT_ADDRESS_APOTHEM = import.meta.env
  .VITE_APOTHEM_TOKEN_ADDRESS;

// XDC Mainnet
export const DICE_CONTRACT_ADDRESS_MAINNET = import.meta.env.VITE_DICE_ADDRESS;
export const TOKEN_CONTRACT_ADDRESS_MAINNET = import.meta.env
  .VITE_TOKEN_ADDRESS;

// Local development (fallback to Apothem address if not specified)
export const DICE_CONTRACT_ADDRESS_LOCAL =
  import.meta.env.VITE_LOCAL_DICE_ADDRESS || DICE_CONTRACT_ADDRESS_APOTHEM;
export const TOKEN_CONTRACT_ADDRESS_LOCAL =
  import.meta.env.VITE_LOCAL_TOKEN_ADDRESS || TOKEN_CONTRACT_ADDRESS_APOTHEM;

// Default addresses based on environment
export const DICE_CONTRACT_ADDRESS =
  import.meta.env.VITE_NETWORK === 'mainnet'
    ? DICE_CONTRACT_ADDRESS_MAINNET
    : DICE_CONTRACT_ADDRESS_APOTHEM;

export const TOKEN_CONTRACT_ADDRESS =
  import.meta.env.VITE_NETWORK === 'mainnet'
    ? TOKEN_CONTRACT_ADDRESS_MAINNET
    : TOKEN_CONTRACT_ADDRESS_APOTHEM;
