import { useState, useCallback, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNotification } from '../contexts/NotificationContext';

// Contract initialization states
const INIT_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  ERROR: 'error',
};

// Contract error types
const CONTRACT_ERRORS = {
  MISSING_PARAMS: 'MISSING_PARAMS',
  NO_CODE: 'NO_CODE',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  CONNECTION_TEST_FAILED: 'CONNECTION_TEST_FAILED',
  INVALID_CONFIG: 'INVALID_CONFIG',
  RETRY_FAILED: 'RETRY_FAILED',
  BATCH_INIT_FAILED: 'BATCH_INIT_FAILED',
};

/**
 * Hook for managing contract initialization with caching and retry mechanisms
 */
export const useContractInitialization = () => {
  const [state, setState] = useState({
    status: INIT_STATES.IDLE,
    error: null,
    errorType: null,
    failedContracts: [],
  });

  const { addToast } = useNotification();
  const contractCache = useRef(new Map());
  const initializationPromises = useRef(new Map());

  // Clear contract cache
  const clearCache = useCallback(() => {
    contractCache.current.clear();
    initializationPromises.current.clear();
    setState(prev => ({
      ...prev,
      status: INIT_STATES.IDLE,
      error: null,
      errorType: null,
      failedContracts: [],
    }));
  }, []);

  // Retry mechanism for contract calls
  const withRetry = useCallback(
    async (operation, maxRetries = 3, delay = 1000) => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt} failed:`, error);

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
          }
        }
      }

      throw {
        type: CONTRACT_ERRORS.RETRY_FAILED,
        message: lastError.message || 'Operation failed after multiple retries',
        originalError: lastError,
      };
    },
    []
  );

  // Initialize contract with caching
  const initializeContract = useCallback(
    async (address, abi, provider, options = { cache: true, retry: true }) => {
      if (!address || !abi || !provider) {
        const error = {
          type: CONTRACT_ERRORS.MISSING_PARAMS,
          message: 'Missing required parameters for contract initialization',
        };
        setState(prev => ({
          ...prev,
          status: INIT_STATES.ERROR,
          error: error.message,
          errorType: error.type,
        }));
        throw error;
      }

      const cacheKey = `${address}-${provider.network?.chainId}`;

      // Check cache first
      if (options.cache && contractCache.current.has(cacheKey)) {
        return contractCache.current.get(cacheKey);
      }

      // Check if initialization is already in progress
      if (initializationPromises.current.has(cacheKey)) {
        return initializationPromises.current.get(cacheKey);
      }

      const initPromise = (async () => {
        try {
          setState(prev => ({
            ...prev,
            status: INIT_STATES.INITIALIZING,
            error: null,
            errorType: null,
          }));

          const initOperation = async () => {
            // Get signer if available
            const signer = provider.getSigner
              ? await provider.getSigner()
              : provider;

            // Create contract instance
            const contract = new ethers.Contract(address, abi, signer);

            // Verify contract code exists at address
            const code = await provider.getCode(address);
            if (code === '0x') {
              throw {
                type: CONTRACT_ERRORS.NO_CODE,
                message: `No contract found at address ${address}`,
              };
            }

            // Test contract connection
            try {
              // Try to call a view function if available
              const functions = Object.keys(contract.interface.functions);
              const viewFunction = functions.find(
                f => contract.interface.functions[f].stateMutability === 'view'
              );

              if (viewFunction) {
                await contract[viewFunction]();
              }
            } catch (error) {
              console.warn('Contract connection test failed:', error);
              throw {
                type: CONTRACT_ERRORS.CONNECTION_TEST_FAILED,
                message: `Contract connection test failed: ${error.message}`,
                originalError: error,
              };
            }

            return contract;
          };

          // Initialize with retry if enabled
          const contract = options.retry
            ? await withRetry(initOperation)
            : await initOperation();

          // Cache the contract instance
          if (options.cache) {
            contractCache.current.set(cacheKey, contract);
          }

          setState(prev => ({
            ...prev,
            status: INIT_STATES.INITIALIZED,
            error: null,
            errorType: null,
          }));

          return contract;
        } catch (error) {
          console.error('Contract initialization error:', error);
          const enhancedError = {
            type: error.type || CONTRACT_ERRORS.INITIALIZATION_FAILED,
            message: error.message || 'Failed to initialize contract',
            originalError: error,
          };

          setState(prev => ({
            ...prev,
            status: INIT_STATES.ERROR,
            error: enhancedError.message,
            errorType: enhancedError.type,
          }));

          throw enhancedError;
        } finally {
          initializationPromises.current.delete(cacheKey);
        }
      })();

      initializationPromises.current.set(cacheKey, initPromise);
      return initPromise;
    },
    [withRetry]
  );

  // Initialize multiple contracts
  const initializeContracts = useCallback(
    async (
      contractConfigs,
      provider,
      options = { cache: true, retry: true }
    ) => {
      if (!Array.isArray(contractConfigs)) {
        const error = {
          type: CONTRACT_ERRORS.INVALID_CONFIG,
          message: 'Contract configs must be an array',
        };
        setState(prev => ({
          ...prev,
          status: INIT_STATES.ERROR,
          error: error.message,
          errorType: error.type,
        }));
        throw error;
      }

      try {
        setState(prev => ({
          ...prev,
          status: INIT_STATES.INITIALIZING,
          error: null,
          errorType: null,
          failedContracts: [],
        }));

        const contracts = await Promise.all(
          contractConfigs.map(async ({ name, address, abi }) => {
            try {
              const contract = await initializeContract(
                address,
                abi,
                provider,
                options
              );
              return { name, contract };
            } catch (error) {
              console.error(`Failed to initialize ${name} contract:`, error);
              return {
                name,
                contract: null,
                error: {
                  type: error.type || CONTRACT_ERRORS.INITIALIZATION_FAILED,
                  message: error.message,
                  originalError: error,
                },
              };
            }
          })
        );

        const results = contracts.reduce((acc, { name, contract, error }) => {
          acc[name] = contract;
          if (error) {
            acc.errors = [...(acc.errors || []), { name, ...error }];
          }
          return acc;
        }, {});

        if (results.errors?.length) {
          const failedContracts = results.errors.map(error => ({
            name: error.name,
            error: error,
          }));

          setState(prev => ({
            ...prev,
            status: INIT_STATES.ERROR,
            error: 'Some contracts failed to initialize',
            errorType: CONTRACT_ERRORS.BATCH_INIT_FAILED,
            failedContracts,
          }));

          addToast(
            `Failed to initialize contracts: ${failedContracts.map(f => f.name).join(', ')}`,
            'warning'
          );
        } else {
          setState(prev => ({
            ...prev,
            status: INIT_STATES.INITIALIZED,
            error: null,
            errorType: null,
            failedContracts: [],
          }));
        }

        return results;
      } catch (error) {
        console.error('Contract initialization error:', error);
        const enhancedError = {
          type: error.type || CONTRACT_ERRORS.BATCH_INIT_FAILED,
          message: error.message || 'Failed to initialize contracts',
          originalError: error,
        };

        setState(prev => ({
          ...prev,
          status: INIT_STATES.ERROR,
          error: enhancedError.message,
          errorType: enhancedError.type,
        }));

        throw enhancedError;
      }
    },
    [initializeContract, addToast]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    initializeContract,
    initializeContracts,
    clearCache,
    status: state.status,
    error: state.error,
    errorType: state.errorType,
    failedContracts: state.failedContracts,
    isInitializing: state.status === INIT_STATES.INITIALIZING,
    isInitialized: state.status === INIT_STATES.INITIALIZED,
    hasError: state.status === INIT_STATES.ERROR,
    CONTRACT_ERRORS, // Export error types for external use
  };
};
