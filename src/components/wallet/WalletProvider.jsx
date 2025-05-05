import React, { createContext, useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { xdc, xdcTestnet } from 'wagmi/chains';

// Custom hooks
import { useNotification } from '../../contexts/NotificationContext.jsx';
import { NETWORK_CONFIG } from '../../config';
import { checkRpcHealth } from '../../utils/walletUtils';

// ABIs
import DiceABI from '../../contracts/abi/Dice.json';
import TokenABI from '../../contracts/abi/GamaToken.json';

// Create context
const WalletContext = createContext(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  // Use wagmi hooks for wallet functionality
  const _queryClient = useQueryClient();
  const { address: account, isConnected: isWalletConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { addToast } = useNotification();
  const [networkHealth, setNetworkHealth] = React.useState({
    mainnet: { checked: false, ok: false },
    apothem: { checked: false, ok: false },
  });

  // Create contracts state
  const [contracts, setContracts] = React.useState({ token: null, dice: null });
  const [isLoading, setIsLoading] = React.useState(false);

  // Create contracts based on the current network
  useEffect(() => {
    if (!account || !chainId) return;

    const networkKey =
      chainId === 50 ? 'mainnet' : chainId === 51 ? 'apothem' : null;
    if (!networkKey) return;

    const tokenAddress = NETWORK_CONFIG[networkKey]?.contracts?.token;
    const diceAddress = NETWORK_CONFIG[networkKey]?.contracts?.dice;

    if (!tokenAddress || !diceAddress) {
      console.warn(`Contract addresses not configured for ${networkKey}`);
      return;
    }

    // In wagmi v2, we don't create contract objects directly - we use hooks
    // Store the addresses and ABIs for use with hooks
    setContracts({
      token: {
        address: tokenAddress,
        abi: TokenABI.abi,
      },
      dice: {
        address: diceAddress,
        abi: DiceABI.abi,
      },
    });
  }, [account, chainId]);

  // Debug logging for wallet state
  useEffect(() => {
    console.log('Wallet State (wagmi):', {
      account: account || 'Not connected',
      chainId: chainId || 'Unknown',
      isWalletConnected: isWalletConnected || false,
    });
  }, [account, chainId, isWalletConnected]);

  // Check RPC endpoints health
  useEffect(() => {
    const checkEndpointsHealth = async () => {
      try {
        // Check mainnet
        const mainnetUrl = NETWORK_CONFIG.mainnet.rpcUrl;
        const mainnetHealth = await checkRpcHealth(mainnetUrl);

        // Check testnet
        const apothemUrl = NETWORK_CONFIG.apothem.rpcUrl;
        const apothemHealth = await checkRpcHealth(apothemUrl);

        setNetworkHealth({
          mainnet: {
            checked: true,
            ok: mainnetHealth.ok,
            error: mainnetHealth.error,
          },
          apothem: {
            checked: true,
            ok: apothemHealth.ok,
            error: apothemHealth.error,
          },
        });

        // Show warnings if RPC endpoints are down
        if (!mainnetHealth.ok && !apothemHealth.ok) {
          console.error('Both RPC endpoints are not responding:', {
            mainnet: mainnetHealth.error,
            apothem: apothemHealth.error,
          });

          addToast(
            'XDC network RPC endpoints are not responding. Please try again later or check your internet connection.',
            'error'
          );
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
      } catch (error) {
        console.error('Error checking RPC health:', error);
      }
    };

    checkEndpointsHealth();
  }, [addToast]);

  // Handler for switching networks
  const handleSwitchNetwork = async networkType => {
    setIsLoading(true);
    try {
      if (networkType === 'mainnet') {
        await switchChain({ chainId: xdc.id });
      } else if (networkType === 'apothem') {
        await switchChain({ chainId: xdcTestnet.id });
      }
    } catch (error) {
      console.error('Error switching network:', error);
      addToast(`Failed to switch network: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced error handler that shows meaningful messages
  const handleErrorWithToast = (error, context = '') => {
    console.error(`Wallet error in ${context}:`, error);

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
      (error?.message && error.message.includes('rejected'))
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
        error.message.includes('disconnect'))
    ) {
      addToast(
        'Network connection issue. Please check your connection and try again.',
        'error'
      );
      return;
    }

    // Contract-related errors
    if (error?.message && error.message.includes('execution reverted')) {
      addToast(
        'Transaction reverted by the contract. This may be due to game rules or contract restrictions.',
        'error'
      );
      return;
    }

    // Unknown errors
    addToast(error?.message || 'An unknown error occurred', 'error');
  };

  // Safe contract access methods
  const getTokenContract = () => {
    if (!contracts?.token) {
      console.warn('Token contract not available');
      return null;
    }
    return contracts.token;
  };

  const getDiceContract = () => {
    if (!contracts?.dice) {
      console.warn('Dice contract not available');
      return null;
    }
    return contracts.dice;
  };

  // Create wallet state object
  const walletState = {
    account,
    chainId,
    isWalletConnected,
    isLoading,
    networkHealth,
    contracts,
    handleLogout: disconnect,
    handleSwitchNetwork,
    connectWallet: () => {}, // Empty function since connection is handled by RainbowKit
    getTokenContract,
    getDiceContract,
    handleErrorWithToast,
  };

  return (
    <WalletContext.Provider value={walletState}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
