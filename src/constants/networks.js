/**
 * Network configurations and constants
 * @deprecated Use src/config/index.js instead
 */

import {
  NETWORK_CONFIG,
  SUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORK,
} from '../config';

// Export networks from central config for backward compatibility
export const NETWORKS = NETWORK_CONFIG;
export { SUPPORTED_CHAIN_IDS, DEFAULT_NETWORK };

/**
 * Get network information by chain ID
 * @param {number} chainId - The chain ID
 * @returns {Object|null} - Network information or null if not found
 */
export const getNetworkByChainId = chainId => {
  if (!chainId) return null;

  return (
    Object.values(NETWORKS).find(
      network => network.chainId === Number(chainId)
    ) || null
  );
};

/**
 * Format address for display
 * @param {string} address - The address to format
 * @returns {string} - Formatted address
 */
export const formatAddress = address => {
  if (!address) return '';
  if (address.length < 10) return address;

  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

export default {
  NETWORKS,
  SUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORK,
  getNetworkByChainId,
  formatAddress,
};
