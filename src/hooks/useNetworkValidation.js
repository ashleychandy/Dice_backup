import { useState, useCallback } from 'react';
import { SUPPORTED_CHAIN_IDS, NETWORK_CONFIGS } from '../config';
import { useNotification } from '../contexts/NotificationContext';

// Network validation error types
const NETWORK_ERRORS = {
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_NETWORK_NAME: 'INVALID_NETWORK_NAME',
  RPC_ERROR: 'RPC_ERROR',
  SWITCH_REJECTED: 'SWITCH_REJECTED',
  ADD_CHAIN_REJECTED: 'ADD_CHAIN_REJECTED',
  SWITCH_FAILED: 'SWITCH_FAILED',
};

/**
 * Hook for handling network validation and switching
 */
export const useNetworkValidation = () => {
  const [state, setState] = useState({
    isValidating: false,
    error: null,
    errorType: null,
  });

  const { addToast } = useNotification();

  // Validate network with detailed checks
  const validateNetwork = useCallback(async (provider, chainId) => {
    if (!provider) {
      const error = {
        type: NETWORK_ERRORS.INVALID_PROVIDER,
        message: 'Provider is required for network validation',
      };
      setState(prev => ({
        ...prev,
        error: error.message,
        errorType: error.type,
      }));
      throw error;
    }

    try {
      setState(prev => ({
        ...prev,
        isValidating: true,
        error: null,
        errorType: null,
      }));

      // Check if network is supported
      if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
        throw {
          type: NETWORK_ERRORS.UNSUPPORTED_NETWORK,
          message: `Network ID ${chainId} is not supported`,
        };
      }

      // Get network details
      const network = await provider.getNetwork();
      const networkConfig = NETWORK_CONFIGS[chainId];

      if (!networkConfig) {
        throw {
          type: NETWORK_ERRORS.MISSING_CONFIG,
          message: `Network configuration not found for chain ID ${chainId}`,
        };
      }

      // Validate network name
      if (
        network.name &&
        !network.name.toLowerCase().includes(networkConfig.name.toLowerCase())
      ) {
        throw {
          type: NETWORK_ERRORS.INVALID_NETWORK_NAME,
          message: `Invalid network name: ${network.name}`,
        };
      }

      // Check if network is operational
      try {
        await provider.getBlockNumber();
      } catch (error) {
        throw {
          type: NETWORK_ERRORS.RPC_ERROR,
          message: 'Network is not responding to RPC calls',
          originalError: error,
        };
      }

      setState(prev => ({
        ...prev,
        isValidating: false,
        error: null,
        errorType: null,
      }));

      return { isValid: true, network: networkConfig };
    } catch (error) {
      console.error('Network validation error:', error);
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: error.message,
        errorType: error.type || NETWORK_ERRORS.RPC_ERROR,
      }));
      return { isValid: false, error: error.message, errorType: error.type };
    }
  }, []);

  // Switch network with retry mechanism
  const switchNetwork = useCallback(
    async (provider, targetChainId) => {
      if (!provider || !provider.request) {
        const error = {
          type: NETWORK_ERRORS.INVALID_PROVIDER,
          message: 'Invalid provider for network switching',
        };
        setState(prev => ({
          ...prev,
          error: error.message,
          errorType: error.type,
        }));
        throw error;
      }

      const networkConfig = NETWORK_CONFIGS[targetChainId];
      if (!networkConfig) {
        const error = {
          type: NETWORK_ERRORS.MISSING_CONFIG,
          message: `Network configuration not found for chain ID ${targetChainId}`,
        };
        setState(prev => ({
          ...prev,
          error: error.message,
          errorType: error.type,
        }));
        throw error;
      }

      try {
        setState(prev => ({
          ...prev,
          isValidating: true,
          error: null,
          errorType: null,
        }));

        // Try switching network
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
        } catch (switchError) {
          // Handle chain not added to wallet
          if (switchError.code === 4902) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: `0x${targetChainId.toString(16)}`,
                    chainName: networkConfig.name,
                    nativeCurrency: networkConfig.nativeCurrency,
                    rpcUrls: networkConfig.rpcUrls,
                    blockExplorerUrls: networkConfig.blockExplorerUrls,
                  },
                ],
              });
            } catch (addError) {
              const error = {
                type: NETWORK_ERRORS.ADD_CHAIN_REJECTED,
                message: `Failed to add network: ${addError.message}`,
                originalError: addError,
              };
              throw error;
            }
          } else if (switchError.code === 4001) {
            throw {
              type: NETWORK_ERRORS.SWITCH_REJECTED,
              message: 'User rejected network switch',
              originalError: switchError,
            };
          } else {
            throw {
              type: NETWORK_ERRORS.SWITCH_FAILED,
              message: switchError.message || 'Failed to switch network',
              originalError: switchError,
            };
          }
        }

        // Validate the new network
        const validation = await validateNetwork(provider, targetChainId);
        if (!validation.isValid) {
          throw {
            type: validation.errorType || NETWORK_ERRORS.SWITCH_FAILED,
            message: `Network switch failed: ${validation.error}`,
          };
        }

        addToast(`Successfully switched to ${networkConfig.name}`, 'success');
        setState(prev => ({
          ...prev,
          isValidating: false,
          error: null,
          errorType: null,
        }));
        return true;
      } catch (error) {
        console.error('Network switch error:', error);
        setState(prev => ({
          ...prev,
          isValidating: false,
          error: error.message,
          errorType: error.type || NETWORK_ERRORS.SWITCH_FAILED,
        }));
        addToast(`Failed to switch network: ${error.message}`, 'error');
        throw error;
      }
    },
    [validateNetwork, addToast]
  );

  // Get current network info
  const getNetworkInfo = useCallback(async provider => {
    try {
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const networkConfig = NETWORK_CONFIGS[chainId];

      return {
        chainId,
        name: networkConfig?.name || network.name,
        isSupported: SUPPORTED_CHAIN_IDS.includes(chainId),
        config: networkConfig,
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      throw error;
    }
  }, []);

  return {
    ...state,
    validateNetwork,
    switchNetwork,
    getNetworkInfo,
    isValidating: state.isValidating,
    errorType: state.errorType,
    NETWORK_ERRORS, // Export error types for external use
  };
};
