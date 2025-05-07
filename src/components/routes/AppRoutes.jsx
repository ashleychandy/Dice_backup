import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DicePage from '../../pages/Dice.jsx';
import { useWallet } from '../wallet/WalletProvider';
import { useNotification } from '../../contexts/NotificationContext.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { NETWORK_CONFIG } from '../../config/index.js';

const AppRoutes = () => {
  const {
    contracts,
    account,
    handleErrorWithToast,
    isWalletConnected,
    chainId,
    isLoading: walletLoading,
  } = useWallet();
  const { addToast } = useNotification();
  const [networkName, setNetworkName] = useState(null);
  const [contractCheckDone, setContractCheckDone] = useState(false);

  // Determine current network based on chainId
  useEffect(() => {
    if (!chainId) {
      setNetworkName(null);
      return;
    }

    if (chainId === 50) {
      setNetworkName('mainnet');
    } else if (chainId === 51) {
      setNetworkName('apothem');
    } else {
      setNetworkName('unknown');
      if (account) {
        addToast(`Unknown network with chainId: ${chainId}`, 'warning');
      }
    }
  }, [chainId, account, addToast]);

  // Create a properly structured contracts object for the DicePage
  // with safeguards against missing contracts
  const mappedContracts = useMemo(() => {
    // Handle case where contracts is null/undefined
    if (!contracts) {
      console.warn('No contracts available');
      return { token: null, dice: null };
    }

    let diceContract = null;
    let tokenContract = null;

    // Handle different contract structure formats
    if (contracts?.tokenContract) {
      tokenContract = contracts.tokenContract;
    } else if (contracts?.token) {
      tokenContract = contracts.token;
    }

    if (contracts?.diceContract) {
      diceContract = contracts.diceContract;
    } else if (contracts?.dice) {
      diceContract = contracts.dice;
    }

    // Add the placeBet method to the dice contract if it has playDice but not placeBet
    if (
      diceContract &&
      typeof diceContract.playDice === 'function' &&
      typeof diceContract.placeBet !== 'function'
    ) {
      console.log('Adding placeBet method to dice contract in AppRoutes');
      diceContract.placeBet = diceContract.playDice.bind(diceContract);
    }

    // Add the playDice method to the dice contract if it has placeBet but not playDice
    if (
      diceContract &&
      typeof diceContract.placeBet === 'function' &&
      typeof diceContract.playDice !== 'function'
    ) {
      console.log('Adding playDice method to dice contract in AppRoutes');
      diceContract.playDice = diceContract.placeBet.bind(diceContract);
    }

    return {
      token: tokenContract,
      dice: diceContract,
    };
  }, [contracts]);

  // Function to check contracts and display appropriate warning
  const checkContracts = useCallback(() => {
    if (!isWalletConnected && account) {
      // Don't show warnings if wallet is intentionally not connected
      return;
    }

    if (walletLoading) {
      // Don't show warnings while wallet is still loading
      return;
    }

    // Show warning if no contracts are available
    if (!mappedContracts.token && !mappedContracts.dice) {
      console.warn('No token or dice contracts available');

      if (account && !contractCheckDone) {
        // Show network-specific error message
        if (networkName === 'unknown') {
          addToast(
            'Contracts not available. Please switch to XDC Mainnet or Apothem Testnet.',
            'error'
          );
        } else if (networkName) {
          addToast(
            `Contracts not available on ${networkName}. Please check your wallet connection.`,
            'warning'
          );
        } else {
          addToast(
            'Contracts not available. Please check your wallet and network connection.',
            'warning'
          );
        }

        setContractCheckDone(true);
      }
      return;
    }

    // Show specific warnings for missing contracts
    if (!mappedContracts.token && mappedContracts.dice) {
      console.warn('Token contract not available');
      if (account && !contractCheckDone) {
        addToast(
          'Token contract not available. Some features may not work.',
          'warning'
        );
        setContractCheckDone(true);
      }
    }

    if (mappedContracts.token && !mappedContracts.dice) {
      console.warn('Dice contract not available');
      if (account && !contractCheckDone) {
        addToast(
          'Dice contract not available. Game features will not work.',
          'error'
        );
        setContractCheckDone(true);
      }
    }

    // If we have both contracts, reset the check flag
    if (mappedContracts.token && mappedContracts.dice) {
      setContractCheckDone(false);
    }
  }, [
    mappedContracts,
    account,
    isWalletConnected,
    networkName,
    walletLoading,
    contractCheckDone,
    addToast,
  ]);

  // Check contracts whenever they change or when wallet connects
  useEffect(() => {
    // Add small delay to avoid UI flash and let other components initialize
    const timer = setTimeout(() => {
      checkContracts();
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    mappedContracts,
    account,
    isWalletConnected,
    chainId,
    walletLoading,
    networkName,
    checkContracts,
  ]);

  // Check if the contracts match the current network
  useEffect(() => {
    if (!networkName || !account || !isWalletConnected) {
      return;
    }

    // Skip for unknown networks
    if (networkName === 'unknown') {
      return;
    }

    // Check if the expected contract addresses match the current network
    if (NETWORK_CONFIG?.[networkName]?.contracts) {
      const expectedDiceAddress = NETWORK_CONFIG[networkName].contracts.dice;
      const expectedTokenAddress = NETWORK_CONFIG[networkName].contracts.token;

      const currentDiceAddress =
        mappedContracts.dice?.address || mappedContracts.dice?.target;
      const currentTokenAddress =
        mappedContracts.token?.address || mappedContracts.token?.target;

      // If we have expected addresses but they don't match the current contract addresses
      if (
        expectedDiceAddress &&
        currentDiceAddress &&
        expectedDiceAddress.toLowerCase() !== currentDiceAddress.toLowerCase()
      ) {
        addToast(
          "Dice contract address doesn't match the current network. Please check your wallet connection.",
          'warning'
        );
      }

      if (
        expectedTokenAddress &&
        currentTokenAddress &&
        expectedTokenAddress.toLowerCase() !== currentTokenAddress.toLowerCase()
      ) {
        addToast(
          "Token contract address doesn't match the current network. Please check your wallet connection.",
          'warning'
        );
      }
    }
  }, [networkName, mappedContracts, account, isWalletConnected, addToast]);

  // Render a loading state if wallet is connecting but contracts aren't ready
  if (
    walletLoading ||
    (isWalletConnected &&
      account &&
      !mappedContracts.dice &&
      !mappedContracts.token &&
      !contractCheckDone)
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
        <p className="mt-4 text-lg text-secondary-600">
          {walletLoading
            ? 'Connecting to wallet...'
            : 'Loading game contracts...'}
        </p>
        {networkName && (
          <p className="mt-2 text-sm text-secondary-400">
            Network:{' '}
            {networkName === 'mainnet'
              ? 'XDC Mainnet'
              : networkName === 'apothem'
                ? 'XDC Apothem Testnet'
                : networkName}
          </p>
        )}
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
            networkName={networkName}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
