import React, { useMemo, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DicePage from '../../pages/Dice.jsx';
import { useWallet } from '../wallet/WalletProvider';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';

const AppRoutes = () => {
  const {
    contracts,
    account,
    handleErrorWithToast,
    isWalletConnected,
    chainId,
  } = useWallet();
  const { addToast } = useNotification();

  // Create a properly structured contracts object for the DicePage
  // with safeguards against missing contracts
  const mappedContracts = useMemo(() => {
    // Handle case where contracts is null/undefined
    if (!contracts) {
      console.warn('No contracts available');
      return { token: null, dice: null };
    }

    // Handle different contract structure formats
    if (contracts?.tokenContract || contracts?.diceContract) {
      return {
        token: contracts.tokenContract || null,
        dice: contracts.diceContract || null,
      };
    }

    if (contracts?.token || contracts?.dice) {
      return {
        token: contracts.token || null,
        dice: contracts.dice || null,
      };
    }

    // Fallback for empty contracts object
    console.warn('Unknown contract structure:', contracts);
    return { token: null, dice: null };
  }, [contracts]);

  // Function to check contracts and display appropriate warning
  const checkContracts = () => {
    if (!isWalletConnected && account) {
      // Don't show warnings if wallet is intentionally not connected
      return;
    }

    // Show warning if no contracts are available
    if (!mappedContracts.token && !mappedContracts.dice) {
      console.warn('No token or dice contracts available');

      if (account) {
        setTimeout(() => {
          addToast(
            'Contracts not available. Please check your wallet and network connection.',
            'warning'
          );
        }, 1000);
      }
      return;
    }

    // Show specific warnings for missing contracts
    if (!mappedContracts.token && mappedContracts.dice) {
      console.warn('Token contract not available');
      if (account) {
        addToast(
          'Token contract not available. Some features may not work.',
          'warning'
        );
      }
    }

    if (mappedContracts.token && !mappedContracts.dice) {
      console.warn('Dice contract not available');
      if (account) {
        addToast(
          'Dice contract not available. Game features will not work.',
          'error'
        );
      }
    }
  };

  // Check contracts whenever they change or when wallet connects
  useEffect(() => {
    // Add small delay to avoid UI flash and let other components initialize
    const timer = setTimeout(() => {
      checkContracts();
    }, 1500);

    return () => clearTimeout(timer);
  }, [mappedContracts, account, isWalletConnected, chainId]);

  // Render a loading state if wallet is connecting but contracts aren't ready
  if (
    isWalletConnected &&
    account &&
    !mappedContracts.dice &&
    !mappedContracts.token
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-lg text-secondary-600">
          Loading game contracts...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DicePage
            contracts={mappedContracts}
            account={account}
            onError={handleErrorWithToast}
            addToast={addToast}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
