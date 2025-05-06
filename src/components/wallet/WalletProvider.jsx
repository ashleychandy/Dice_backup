import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';

// Custom hooks
import useWalletImplementation from '../../hooks/useWallet';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import { NETWORK_CONFIG, DEFAULT_NETWORK } from '../../config';
import { checkRpcHealth, getAvailableProvider } from '../../utils/walletUtils';

// Constants
const WALLET_STORAGE_KEY = 'xdc_dice_wallet_connection';
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Create context
export const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Use our custom hook for all wallet functionality
  const queryClient = useQueryClient();
  const walletState = useWalletImplementation(queryClient);
  const { addToast } = useNotification();
  const [networkHealth, setNetworkHealth] = useState({
    mainnet: { checked: false, ok: false },
    apothem: { checked: false, ok: false },
  });
  const [connectionDetails, setConnectionDetails] = useState({
    lastConnected: null,
    preferredProvider: null,
    autoConnect: false,
  });
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // Store connection details when wallet connects
  useEffect(() => {
    if (walletState.account && !isAutoConnecting) {
      const provider = getAvailableProvider();
      const providerName = provider?.isMetaMask
        ? 'metamask'
        : provider?.isXDCPay
          ? 'xdcpay'
          : 'unknown';

      // Save connection details to localStorage
      const connectionInfo = {
        lastConnected: Date.now(),
        preferredProvider: providerName,
        autoConnect: true,
        lastNetwork: walletState.chainId,
      };

      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(connectionInfo));
      setConnectionDetails(connectionInfo);
    }
  }, [walletState.account, walletState.chainId, isAutoConnecting]);

  // Auto-connect on initial load if previously connected
  useEffect(() => {
    const attemptAutoConnect = async () => {
      try {
        const savedConnection = localStorage.getItem(WALLET_STORAGE_KEY);
        if (!savedConnection) return;

        const connectionInfo = JSON.parse(savedConnection);
        setConnectionDetails(connectionInfo);

        // Only auto-connect if opted in and within the last 6 hours
        const sixHoursMs = 6 * 60 * 60 * 1000;
        const isRecent = Date.now() - connectionInfo.lastConnected < sixHoursMs;

        if (connectionInfo.autoConnect && isRecent && !walletState.account) {
          setIsAutoConnecting(true);

          // Set timeout to prevent hanging
          const timeoutId = setTimeout(() => {
            setIsAutoConnecting(false);
            console.warn('Auto-connect timed out');
          }, CONNECTION_TIMEOUT);

          try {
            await walletState.connectWallet();
            clearTimeout(timeoutId);
          } catch (error) {
            clearTimeout(timeoutId);
            console.warn('Auto-connect failed:', error);
            // Don't show toast for auto-connect failures
          }

          setIsAutoConnecting(false);
        }
      } catch (error) {
        console.error('Error during auto-connect:', error);
        setIsAutoConnecting(false);
      }
    };

    if (!walletState.account && !isAutoConnecting) {
      attemptAutoConnect();
    }
  }, [walletState.connectWallet]);

  // Debug logging for wallet state (production: only log on state changes)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Wallet State:', {
        account: walletState.account || 'Not connected',
        chainId: walletState.chainId || 'Unknown',
        tokenContract:
          walletState.contracts?.token?.target || 'Not initialized',
        diceContract: walletState.contracts?.dice?.target || 'Not initialized',
        isWalletConnected: walletState.isWalletConnected || false,
      });
    }
  }, [
    walletState.account,
    walletState.chainId,
    walletState.contracts?.token,
    walletState.contracts?.dice,
  ]);

  // Check RPC endpoints health
  const checkEndpointsHealth = useCallback(async () => {
    try {
      // Check mainnet
      const mainnetUrl = NETWORK_CONFIG.mainnet.rpcUrl;
      const mainnetHealth = await checkRpcHealth(mainnetUrl);

      // Check testnet
      const apothemUrl = NETWORK_CONFIG.apothem.rpcUrl;
      const apothemHealth = await checkRpcHealth(apothemUrl);

      const newHealthState = {
        mainnet: {
          checked: true,
          ok: mainnetHealth.ok,
          error: mainnetHealth.error,
          latency: mainnetHealth.latency,
        },
        apothem: {
          checked: true,
          ok: apothemHealth.ok,
          error: apothemHealth.error,
          latency: apothemHealth.latency,
        },
      };

      setNetworkHealth(newHealthState);

      // Show warnings if RPC endpoints are down
      if (!mainnetHealth.ok && !apothemHealth.ok) {
        console.error('Both RPC endpoints are not responding:', {
          mainnet: mainnetHealth.error,
          apothem: apothemHealth.error,
        });

        if (
          mainnetHealth.error?.includes('blocked by CORS policy') ||
          apothemHealth.error?.includes('blocked by CORS policy')
        ) {
          addToast(
            'Network connection issues detected (CORS error). This is a browser security restriction. Try using a browser extension like CORS Unblock or run the app with the correct proxy settings.',
            'error'
          );
        } else {
          addToast(
            'XDC network RPC endpoints are not responding. Please try again later or check your internet connection.',
            'error'
          );
        }
      } else if (!mainnetHealth.ok) {
        console.warn(
          'Mainnet RPC endpoint is not responding:',
          mainnetHealth.error
        );
      } else if (!apothemHealth.ok) {
        console.warn(
          'Apothem RPC endpoint is not responding:',
          apothemHealth.error
        );
      }

      return newHealthState;
    } catch (error) {
      console.error('Error checking RPC health:', error);
      return null;
    }
  }, [addToast]);

  useEffect(() => {
    checkEndpointsHealth();

    // Set up periodic health check every 5 minutes
    const healthCheckInterval = setInterval(
      () => {
        checkEndpointsHealth();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(healthCheckInterval);
  }, [checkEndpointsHealth]);

  // Check if contract addresses are properly configured
  useEffect(() => {
    // Check mainnet configuration
    const mainnetConfig = NETWORK_CONFIG?.mainnet;
    if (!mainnetConfig?.contracts?.dice) {
      console.warn('Mainnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'mainnet') {
        addToast(
          'Mainnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }

    // Check testnet configuration
    const testnetConfig = NETWORK_CONFIG?.apothem;
    if (!testnetConfig?.contracts?.dice) {
      console.warn('Testnet Dice contract address is not configured');
      if (DEFAULT_NETWORK === 'apothem') {
        addToast(
          'Testnet Dice contract is not configured. Some features may not work.',
          'warning'
        );
      }
    }
  }, [addToast]);

  // Get the configured network for a given chain ID
  const getNetworkForChainId = useCallback(chainId => {
    if (!chainId) return null;

    const networkId = Number(chainId);
    if (networkId === 50) return NETWORK_CONFIG.mainnet;
    if (networkId === 51) return NETWORK_CONFIG.apothem;
    return null;
  }, []);

  // Format account address with optional length control
  const formatAddress = useCallback((address, start = 6, end = 4) => {
    if (!address) return '';
    if (address.length < start + end + 3) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  }, []);

  // Get token balance for current account
  const getTokenBalance = useCallback(async () => {
    if (!walletState.account || !walletState.contracts?.token) {
      return { balance: ethers.parseEther('0'), formatted: '0' };
    }

    try {
      const tokenContract = walletState.contracts.token;
      const balance = await tokenContract.balanceOf(walletState.account);
      const formatted = ethers.formatEther(balance);

      return {
        balance,
        formatted: parseFloat(formatted).toFixed(6),
        raw: balance,
      };
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return { balance: ethers.parseEther('0'), formatted: '0' };
    }
  }, [walletState.account, walletState.contracts?.token]);

  // Get native XDC balance
  const getXDCBalance = useCallback(async () => {
    if (!walletState.account || !walletState.provider) {
      return { balance: ethers.parseEther('0'), formatted: '0' };
    }

    try {
      const balance = await walletState.provider.getBalance(
        walletState.account
      );
      const formatted = ethers.formatEther(balance);

      return {
        balance,
        formatted: parseFloat(formatted).toFixed(6),
        raw: balance,
      };
    } catch (error) {
      console.error('Error fetching XDC balance:', error);
      return { balance: ethers.parseEther('0'), formatted: '0' };
    }
  }, [walletState.account, walletState.provider]);

  // Clear connection details and disconnect
  const disconnectAndClear = useCallback(async () => {
    try {
      // Remove auto-connect preference
      localStorage.removeItem(WALLET_STORAGE_KEY);
      setConnectionDetails({
        lastConnected: null,
        preferredProvider: null,
        autoConnect: false,
      });

      // Call the original logout function
      await walletState.handleLogout();

      addToast('Wallet disconnected and auto-connect disabled', 'success');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      addToast('Error disconnecting wallet', 'error');
    }
  }, [walletState.handleLogout, addToast]);

  // Enhanced error handler that shows meaningful messages
  const handleErrorWithToast = useCallback(
    (error, context = '') => {
      console.error(`Wallet error in ${context}:`, error);

      // CORS-related errors
      if (error?.message && error.message.includes('CORS')) {
        addToast(
          'Network connection blocked by browser security (CORS). Please use a CORS proxy or browser extension.',
          'error'
        );
        return;
      }

      // Handle missing revert data errors (common RPC issue)
      if (error?.message && error.message.includes('missing revert data')) {
        addToast(
          'Network connection error: Unable to read blockchain data. This usually indicates an RPC endpoint issue. Try refreshing the page or switching to a different network.',
          'error'
        );
        return;
      }

      // User-denied transaction
      if (
        error?.code === 4001 ||
        (error?.message &&
          (error.message.includes('rejected') ||
            error.message.includes('denied') ||
            error.message.includes('cancelled')))
      ) {
        addToast('Transaction rejected by user', 'warning');
        return;
      }

      // Gas-related errors
      if (error?.message && error.message.includes('insufficient funds')) {
        addToast('Insufficient XDC for gas fees', 'error');
        return;
      }

      // Network errors
      if (
        error?.message &&
        (error.message.includes('network') ||
          error.message.includes('disconnect') ||
          error.message.includes('unreachable') ||
          error.message.includes('timeout'))
      ) {
        addToast(
          'Network connection issue. Please check your connection and try again.',
          'error'
        );
        return;
      }

      // Contract-related errors
      if (error?.message && error.message.includes('execution reverted')) {
        // Try to extract the custom error message if available
        const revertMsgMatch = error.message.match(
          /reverted: (.*?)(?:\r|\n|$)/
        );
        const customMessage = revertMsgMatch ? revertMsgMatch[1] : null;

        addToast(
          customMessage ||
            'Transaction reverted by the contract. This may be due to game rules or contract restrictions.',
          'error'
        );
        return;
      }

      // Rate limiting or RPC issues
      if (
        error?.message &&
        (error.message.includes('rate limit') ||
          error.message.includes('too many requests') ||
          error.message.includes('429') ||
          error.message.includes('server error') ||
          error.message.includes('503') ||
          error.message.includes('500'))
      ) {
        addToast(
          'RPC service is busy or rate limited. Please try again in a few moments.',
          'warning'
        );
        return;
      }

      // Unknown errors
      addToast(error?.message || 'An unknown error occurred', 'error');
    },
    [addToast]
  );

  // Create a memoized enhanced state object
  const enhancedWalletState = useMemo(() => {
    return {
      ...walletState,
      // Add network health information
      networkHealth,
      refreshNetworkHealth: checkEndpointsHealth,
      // Account formatting
      formatAddress,
      // Connection details
      connectionDetails,
      isAutoConnecting,
      // Enhanced disconnection
      disconnectAndClear,
      // Balance utilities
      getTokenBalance,
      getXDCBalance,
      // Network utilities
      getNetworkForChainId,
      // Add safe contract access methods
      getTokenContract: () => {
        if (!walletState.contracts?.token) {
          console.warn('Token contract not available');
          return null;
        }
        return walletState.contracts.token;
      },
      getDiceContract: () => {
        if (!walletState.contracts?.dice) {
          console.warn('Dice contract not available');
          return null;
        }
        return walletState.contracts.dice;
      },
      // Enhanced error handler
      handleErrorWithToast,
    };
  }, [
    walletState,
    networkHealth,
    checkEndpointsHealth,
    formatAddress,
    connectionDetails,
    isAutoConnecting,
    disconnectAndClear,
    getTokenBalance,
    getXDCBalance,
    getNetworkForChainId,
    handleErrorWithToast,
  ]);

  return (
    <WalletContext.Provider value={enhancedWalletState}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
