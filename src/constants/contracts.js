/**
 * Contract addresses for different networks
 * These addresses should be updated when deploying to different networks
 */

// XDC Testnet (Apothem)
export const DICE_CONTRACT_ADDRESS = import.meta.env.VITE_APOTHEM_DICE_ADDRESS;

// XDC Mainnet
export const DICE_CONTRACT_ADDRESS_MAINNET = import.meta.env.VITE_DICE_ADDRESS;

// Local development (fallback to Apothem address if not specified)
export const DICE_CONTRACT_ADDRESS_LOCAL =
  import.meta.env.VITE_LOCAL_DICE_ADDRESS || DICE_CONTRACT_ADDRESS;

// Export the default contract address based on environment
export default DICE_CONTRACT_ADDRESS;
