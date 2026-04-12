import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Import utilities and hooks
import { useWallet } from '../components/wallet/WalletProvider';
import { usePollingService } from '../services/pollingService.jsx';
import { checkAndApproveToken } from '../utils/contractUtils';
import { handleContractError } from '../utils/errorHandling';
import { useContractState } from './useContractState';
import { useContractStats } from './useContractStats';
import { useDiceContract } from './useDiceContract';
import { useErrorHandler } from './useErrorHandler';
import { useLoadingState } from './useLoadingState';
import { useRequestTracking } from './useRequestTracking';

// Custom hook for bet state management
const useBetState = (initialBetAmount = '1000000000000000000') => {
  // Store betAmount as string to avoid serialization issues
  const [betAmount, setBetAmountRaw] = useState(initialBetAmount);
  const [chosenNumber, setChosenNumber] = useState(1);
  const lastBetAmountRef = useRef(initialBetAmount);

  const setBetAmount = useCallback(amount => {
    // Convert to string regardless of input type
    let amountStr;
    try {
      if (typeof amount === 'bigint') {
        amountStr = amount.toString();
      } else if (typeof amount === 'object' && amount.toString) {
        amountStr = amount.toString();
      } else if (amount === null || amount === undefined) {
        amountStr = '0';
      } else {
        amountStr = String(amount);
      }
    } catch (error) {
      amountStr = '0';
    }

    if (amountStr !== lastBetAmountRef.current) {
      // Immediately update the reference to ensure instant UI feedback
      lastBetAmountRef.current = amountStr;
      // Update state
      setBetAmountRaw(amountStr);
    }
  }, []);

  // Convert to BigInt when needed
  const betAmountBigInt = useMemo(() => {
    try {
      if (!betAmount || betAmount === '') {
        return BigInt(0);
      }
      return BigInt(betAmount);
    } catch (error) {
      return BigInt(0);
    }
  }, [betAmount]);

  // Reset function to clear bet state
  const resetBetState = useCallback(() => {
    setBetAmountRaw(initialBetAmount);
    setChosenNumber(1);
    lastBetAmountRef.current = initialBetAmount;
  }, [initialBetAmount]);

  return {
    betAmount: betAmountBigInt,
    betAmountString: betAmount,
    setBetAmount,
    chosenNumber,
    setChosenNumber,
    resetBetState,
  };
};

// Custom hook for game state management
const useGameState = () => {
  const [gameState, setGameState] = useState({
    isProcessing: false,
    isRolling: false,
    lastResult: null,
  });

  const setProcessingState = useCallback(isProcessing => {
    setGameState(prev => ({ ...prev, isProcessing }));
  }, []);

  const setRollingState = useCallback(isRolling => {
    setGameState(prev => ({ ...prev, isRolling }));
  }, []);

  const setLastResult = useCallback(result => {
    setGameState(prev => ({ ...prev, lastResult: result }));
  }, []);

  // Reset function to clear game state
  const resetGameState = useCallback(() => {
    setGameState({
      isProcessing: false,
      isRolling: false,
      lastResult: null,
    });
  }, []);

  return {
    gameState,
    setProcessingState,
    setRollingState,
    setLastResult,
    resetGameState,
  };
};

// Enhanced safety timeout handler
const setupSafetyTimeout = (timeoutRef, callback, timeoutMs = 60000) => {
  // Clear any existing timeout to prevent memory leaks
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }

  // Set new timeout
  timeoutRef.current = setTimeout(() => {
    timeoutRef.current = null;
    if (typeof callback === 'function') {
      callback();
    }
  }, timeoutMs);

  // Return a function to clear the timeout
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
};

/**
 * Custom hook for Dice game logic
 * @param {Object} contracts - Contract instances
 * @param {String} account - User's account
 * @param {Function} onError - Error handler
 * @param {Function} addToast - Toast notification function
 * @returns {Object} Game state and functions
 */
export const useGameLogic = (contracts, account, onError, addToast) => {
  const queryClient = useQueryClient();
  const operationInProgress = useRef(false);
  const safetyTimeoutRef = useRef(null);
  const DiceTimeoutRef = useRef(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isBetting, withBetting] = useLoadingState(false);
  const [isResolving, withResolving] = useLoadingState(false);
  const handleError = useErrorHandler(onError, addToast);
  const { contract: _contract } = useDiceContract();
  const { account: walletAccount } = useWallet();
  const { gameStatus, refreshData } = usePollingService();
  // Normalize dice contract naming: some parts of the app use `Dice`, others use `dice`
  const diceContract =
    contracts?.Dice ||
    contracts?.dice ||
    contracts?.diceContract ||
    contracts?.DiceContract ||
    null;
  const diceAddress =
    diceContract?.address || diceContract?.target || ethers.ZeroAddress;
  const [isProcessing, _setIsProcessing] = useState(false);
  const [error, _setError] = useState(null);
  const pendingTxRef = useRef(null);
  const previousAccountRef = useRef(walletAccount);

  // Add new hooks
  const { contractState: _contractState } = useContractState();
  const { stats } = useContractStats();
  const { userPendingRequest: _userPendingRequest } = useRequestTracking();
  const balanceQueryKey = useMemo(
    () => ['balance', walletAccount, contracts?.token ? true : false],
    [walletAccount, contracts?.token]
  );

  // Helper to batch multiple query invalidations
  const invalidateQueries = useCallback(
    (types = ['balance']) => {
      types.forEach(type => {
        queryClient.invalidateQueries({ queryKey: [type] });

        if (walletAccount) {
          queryClient.invalidateQueries({ queryKey: [type, walletAccount] });
        }
      });
    },
    [queryClient, walletAccount]
  );

  const fetchBalanceData = useCallback(async () => {
    if (!contracts?.token || !walletAccount) {
      return {
        balance: BigInt(0),
        allowance: BigInt(0),
      };
    }

    try {
      const [balance, tokenAllowance] = await Promise.all([
        contracts.token.balanceOf(walletAccount).catch(_err => {
          return BigInt(0);
        }),
        contracts.token.allowance(walletAccount, diceAddress).catch(_err => {
          return BigInt(0);
        }),
      ]);

      return {
        balance: balance ? BigInt(balance.toString()) : BigInt(0),
        allowance: tokenAllowance
          ? BigInt(tokenAllowance.toString())
          : BigInt(0),
      };
    } catch (_error) {
      return {
        balance: BigInt(0),
        allowance: BigInt(0),
      };
    }
  }, [contracts, walletAccount]);

  // Always invalidate balance data when component mounts or account/contracts change
  useEffect(() => {
    // Invalidate balance data when account or contracts change
    if (walletAccount && contracts?.token) {
      invalidateQueries(['balance']);
    }

    return () => {
      // Clean up safety timeout when component unmounts
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, [contracts, walletAccount, queryClient, invalidateQueries]);

  // Initialize state management hooks
  const {
    betAmount,
    betAmountString,
    setBetAmount,
    chosenNumber,
    setChosenNumber,
    resetBetState,
  } = useBetState();

  const {
    gameState,
    setProcessingState,
    setRollingState,
    setLastResult,
    resetGameState,
  } = useGameState();

  // Add effect to reset state when account changes
  useEffect(() => {
    // Check if account has changed
    if (walletAccount !== previousAccountRef.current) {
      // Reset all game state
      resetGameState();
      resetBetState();

      // Reset operation flags
      operationInProgress.current = false;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      // Reset approval state
      setIsApproving(false);

      // Cancel any pending transactions
      pendingTxRef.current = null;

      // Update the ref to current account
      previousAccountRef.current = walletAccount;

      // Invalidate all relevant queries with a slight delay to ensure provider is updated
      setTimeout(() => {
        invalidateQueries(['balance', 'gameStatus', 'betHistory']);
      }, 500);
    }
  }, [walletAccount, resetGameState, resetBetState, invalidateQueries]);

  // Add effect to detect and handle contract changes
  useEffect(() => {
    // When contracts change (typically after account change), we need to reset states
    if (contracts?.token && diceContract && walletAccount) {
      // Reset operation flags
      operationInProgress.current = false;

      // Reset states to ensure we're working with fresh data
      resetGameState();

      // Invalidate all queries to get fresh data
      invalidateQueries(['balance', 'gameStatus', 'betHistory']);
    }
  }, [contracts, walletAccount, resetGameState, invalidateQueries]);

  // Balance Query with optimized settings
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: balanceQueryKey,
    queryFn: fetchBalanceData,
    enabled: !!contracts?.token && !!walletAccount,
    staleTime: 30000, // Keep data fresh for 30 seconds
    cacheTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once on failure
    refetchInterval: 5000, // Refetch data every 5 seconds
    refetchIntervalInBackground: true, // Continue refetching even when tab is not in focus
    refetchOnWindowFocus: true,
    onError: _error => {
      // Error handled silently
    },
  });

  const syncBalanceData = useCallback(async () => {
    const latestBalanceData = await fetchBalanceData();
    queryClient.setQueryData(balanceQueryKey, latestBalanceData);
    return latestBalanceData;
  }, [balanceQueryKey, fetchBalanceData, queryClient]);

  // Handle approving tokens with optimistic updates
  const handleApproveToken = useCallback(async () => {
    if (!contracts?.token || !diceContract || !walletAccount) {
      const errorMessage = !contracts?.token
        ? 'Token contract not connected'
        : !contracts?.Dice
          ? 'Game contract not connected'
          : 'Wallet not connected';

      addToast(
        `Cannot approve tokens: ${errorMessage}. This may be a network issue.`,
        'error'
      );
      return;
    }

    // Prevent multiple approval attempts
    if (operationInProgress.current || isApproving) {
      addToast('An operation is already in progress', 'warning');
      return;
    }

    operationInProgress.current = true;
    setIsApproving(true);

    // Set local state immediately for better UI feedback
    setProcessingState(true);

    // Setup safety timeout to reset state if the operation takes too long
    const clearSafetyTimeout = setupSafetyTimeout(safetyTimeoutRef, () => {
      operationInProgress.current = false;
      setIsApproving(false);
      setProcessingState(false);
      addToast(
        'The approval operation timed out. This could be due to network congestion or wallet issues.',
        'error'
      );
    });

    try {
      // Get the current network from provider
      let currentChainId;
      try {
        if (window.ethereum) {
          const chainIdHex = await window.ethereum.request({
            method: 'eth_chainId',
          });
          currentChainId = parseInt(chainIdHex, 16);
        }
      } catch (networkError) {
        // Silently handle network error
      }

      // Get the Dice contract address (target for v6 ethers, address for v5)
      const DiceContractAddress = diceAddress;

      // Show initial toast
      addToast('Starting token approval process...', 'info');

      // Call the enhanced token approval function with correct parameters
      // Use maxRetries=2 for up to 3 total attempts (initial + 2 retries)
      const success = await checkAndApproveToken(
        contracts.token,
        DiceContractAddress,
        walletAccount,
        isProcessing => setProcessingState(isProcessing),
        addToast,
        2 // max retries
      );

      if (success) {
        // Force immediate refresh of all data - no caching
        try {
          // Create a small delay to let blockchain state settle
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Refresh balance data directly so approval state updates immediately
          await syncBalanceData();
        } catch (refetchError) {
          // Continue despite refetch error, since approval was successful
        }
      } else {
        // Check if we might be on the wrong network
        let networkIssue = false;

        try {
          if (window.ethereum) {
            const newChainIdHex = await window.ethereum.request({
              method: 'eth_chainId',
            });
            const newChainId = parseInt(newChainIdHex, 16);

            // If chain ID changed during the operation, it was likely a network issue
            if (currentChainId && newChainId !== currentChainId) {
              networkIssue = true;
              addToast(
                'Network appears to have changed during approval. Please ensure you stay on the same network throughout the operation.',
                'warning'
              );
            }
          }
        } catch (networkCheckError) {
          // Silently handle network check error
        }

        if (!networkIssue) {
          // If approval failed, show a detailed error message
          addToast(
            'Token approval failed. This could be due to network congestion or wallet connection issues. Please try again.',
            'error'
          );
        }
      }
    } catch (error) {
      // Check for network-related errors
      if (
        error.message &&
        (error.message.includes('network') ||
          error.message.includes('chain') ||
          error.message.includes('connect') ||
          error.message.includes('metadata') ||
          error.message.includes('provider'))
      ) {
        addToast(
          'Network connection issue detected. Please check your wallet connection and make sure you are on the correct XDC network.',
          'error'
        );
      } else {
        handleError(error, 'handleApproveToken');
      }
    } finally {
      // Clean up resources and reset state
      clearSafetyTimeout();
      operationInProgress.current = false;
      setIsApproving(false);
      setProcessingState(false);
    }
  }, [
    contracts,
    walletAccount,
    handleError,
    addToast,
    isApproving,
    setProcessingState,
    syncBalanceData,
  ]);

  // Validate bet amount against contract limits
  const _validateBetAmount = useCallback(
    amount => {
      if (!stats?.maxBetAmount) return false;

      try {
        const maxBet = BigInt(stats.maxBetAmount);
        return amount <= maxBet;
      } catch (error) {
        return false;
      }
    },
    [stats]
  );

  // Handle placing a bet with improved error handling and race condition prevention
  const handlePlaceBet = useCallback(async () => {
    if (!diceContract || !walletAccount) {
      addToast({
        title: 'Connection Error',
        description: 'Cannot place bet: wallet or contract connection issue',
        type: 'error',
      });
      return;
    }

    // Ensure we're using up-to-date contract instances
    if (walletAccount && diceContract?.signer) {
      const currentSigner = await diceContract.signer
        .getAddress()
        .catch(() => null);

      // If signer doesn't match current wallet account, we need to reinitialize
      if (
        currentSigner &&
        currentSigner.toLowerCase() !== walletAccount.toLowerCase()
      ) {
        addToast({
          title: 'Updating Connection',
          description: 'Detected account mismatch, updating connection...',
          type: 'info',
        });

        // Force wallet state to update - this will cause a reinitialization
        window.dispatchEvent(new CustomEvent('xdc_wallet_reset'));

        // Wait a moment for state to update before proceeding
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh page data
        invalidateQueries(['balance']);

        // Retry placing bet after a short delay
        setTimeout(() => handlePlaceBet(), 2000);
        return;
      }
    }

    // Validate that a number is chosen
    if (chosenNumber === null || chosenNumber === undefined) {
      addToast({
        title: 'Invalid Input',
        description: 'Please select a number first',
        type: 'warning',
      });
      return;
    }

    // Ensure chosenNumber is between 1-6
    if (chosenNumber < 1 || chosenNumber > 6) {
      addToast({
        title: 'Invalid Input',
        description: 'Please select a valid number between 1 and 6',
        type: 'warning',
      });
      return;
    }

    if (betAmount <= BigInt(0)) {
      addToast({
        title: 'Invalid Input',
        description: 'Please enter a valid bet amount',
        type: 'warning',
      });
      return;
    }

    // Prevent multiple betting attempts
    if (operationInProgress.current || isBetting) {
      addToast({
        title: 'Operation in Progress',
        description: 'A game is already in progress',
        type: 'warning',
      });
      return;
    }

    // Set the operation flag immediately to prevent multiple clicks
    operationInProgress.current = true;

    // Update UI state immediately to show processing
    setProcessingState(true);

    try {
      await withBetting(async () => {
        // Update UI state to show rolling animation
        setRollingState(true);

        // Clear any existing timeout
        if (DiceTimeoutRef.current) {
          clearTimeout(DiceTimeoutRef.current);
          DiceTimeoutRef.current = null;
        }

        // Setup safety timeout
        const clearSafetyTimeout = setupSafetyTimeout(
          safetyTimeoutRef,
          () => {
            operationInProgress.current = false;
            setProcessingState(false);
            setRollingState(false);
            addToast({
              title: 'Operation Timeout',
              description: 'The bet operation timed out. Please try again.',
              type: 'error',
            });
          },
          90000
        );

        try {
          // Check contract availability
          if (!diceContract || typeof diceContract.playDice !== 'function') {
            throw new Error('Dice contract is not properly initialized');
          }

          // Balance verification with fresh data
          if (
            !balanceData?.balance ||
            balanceData.balance < betAmount * BigInt(2)
          ) {
            try {
              const currentBalance =
                await contracts.token.balanceOf(walletAccount);
              const currentBalanceBigInt = BigInt(currentBalance.toString());
              const betAmountBigInt = BigInt(betAmount.toString());

              if (currentBalanceBigInt < betAmountBigInt) {
                throw new Error(
                  "You don't have enough tokens for this bet amount."
                );
              }
            } catch (balanceError) {
              handleContractError(balanceError, addToast);
              clearSafetyTimeout();
              return;
            }
          }

          // Show notification
          addToast({
            title: 'Placing Bet',
            description: 'Placing your bet...',
            type: 'info',
          });

          // Add transaction options
          const txOptions = {};

          // Place bet
          let tx;
          try {
            // Call the DiceCoin function with the chosen side (1=HEADS, 2=TAILS) and bet amount
            tx = await diceContract.playDice(
              chosenNumber,
              betAmount,
              txOptions
            );
            pendingTxRef.current = tx;

            // Show pending notification
            addToast({
              title: 'Bet Placed',
              description: 'Bet placed! Waiting for confirmation...',
              type: 'info',
            });
          } catch (txError) {
            handleContractError(txError, addToast);
            clearSafetyTimeout();
            operationInProgress.current = false;
            setProcessingState(false);
            setRollingState(false);
            return;
          }

          // Wait for transaction confirmation
          try {
            const receipt = await tx.wait();

            // Update queries and state
            invalidateQueries(['balance', 'gameStatus', 'betHistory']);

            // Set last result for animation
            setLastResult({
              txHash: receipt.hash,
              timestamp: Date.now(),
              isPending: true,
              vrfPending: true,
            });

            // We're still processing because we're waiting for VRF callback
            // Don't reset operationInProgress flag here

            // Setup a polling mechanism to check for VRF result
            const pollForVrfResult = async () => {
              try {
                // Check game status from contract
                const gameStatus =
                  await diceContract.getGameStatus(walletAccount);

                if (gameStatus.pendingResolution) {
                  operationInProgress.current = false;
                  setProcessingState(false);
                  setRollingState(false);
                  clearSafetyTimeout();
                  await refreshData();
                  addToast({
                    title: 'Result Ready',
                    description:
                      'VRF has completed. Click Resolve Game to reveal the outcome.',
                    type: 'success',
                  });
                  return;
                }

                // If the game is completed, reset processing state
                if (!gameStatus.isActive || gameStatus.isCompleted) {
                  operationInProgress.current = false;
                  setProcessingState(false);
                  setRollingState(false);
                  clearSafetyTimeout();
                  await refreshData();
                  addToast({
                    title: 'Game Completed',
                    description: 'Your game has been completed!',
                    type: 'success',
                  });
                  return;
                }

                // If still active and not completed, check again in a few seconds
                DiceTimeoutRef.current = setTimeout(pollForVrfResult, 5000);
              } catch (error) {
                // In case of error, reset processing state to allow new bets
                operationInProgress.current = false;
                setProcessingState(false);
                setRollingState(false);
                clearSafetyTimeout();
              }
            };

            // Start polling for VRF result
            DiceTimeoutRef.current = setTimeout(pollForVrfResult, 5000);
          } catch (confirmError) {
            handleContractError(confirmError, addToast);
            clearSafetyTimeout();
            operationInProgress.current = false;
            setProcessingState(false);
            setRollingState(false);
          }
        } catch (error) {
          // Handle any other errors
          handleError(error);
          clearSafetyTimeout();
          operationInProgress.current = false;
          setProcessingState(false);
          setRollingState(false);
        }
      });
    } catch (error) {
      handleError(error);
      // Reset operation flag if the overall try-catch fails
      operationInProgress.current = false;
      setProcessingState(false);
      setRollingState(false);
    }
  }, [
    contracts,
    walletAccount,
    chosenNumber,
    betAmount,
    balanceData,
    isBetting,
    refreshData,
    addToast,
    invalidateQueries,
    handleError,
    withBetting,
    setLastResult,
    setProcessingState,
    setRollingState,
  ]);

  const handleResolveGame = useCallback(async () => {
    if (!diceContract || !walletAccount) {
      addToast({
        title: 'Connection Error',
        description: 'Cannot resolve game: wallet or contract connection issue',
        type: 'error',
      });
      return;
    }

    if (!gameStatus?.pendingResolution) {
      addToast({
        title: 'No Result Ready',
        description: 'There is no fulfilled game waiting to be resolved.',
        type: 'warning',
      });
      return;
    }

    if (operationInProgress.current || isBetting || isResolving) {
      addToast({
        title: 'Operation in Progress',
        description: 'Please wait for the current action to finish.',
        type: 'warning',
      });
      return;
    }

    operationInProgress.current = true;
    setProcessingState(true);

    try {
      await withResolving(async () => {
        addToast({
          title: 'Resolving Result',
          description: 'Submitting the resolve transaction...',
          type: 'info',
        });

        const tx = await diceContract.resolveGame(walletAccount);
        pendingTxRef.current = tx;

        const receipt = await tx.wait();
        const resolvedStatus = await diceContract
          .getGameStatus(walletAccount)
          .catch(() => null);

        if (resolvedStatus?.isCompleted) {
          setLastResult({
            txHash: receipt.hash,
            timestamp: Number(resolvedStatus.lastPlayTimestamp || 0),
            chosenNumber: Number(resolvedStatus.chosenSide || 0),
            rolledNumber: Number(resolvedStatus.result || 0),
            amount: resolvedStatus.amount?.toString?.() || '0',
            payout: resolvedStatus.payout?.toString?.() || '0',
            isWin: Boolean(resolvedStatus.isWin),
            isPending: false,
            vrfPending: false,
            awaitingResolution: false,
          });
        }

        invalidateQueries([
          'balance',
          'gameStatus',
          'betHistory',
          'gameHistory',
        ]);
        await refreshData();

        addToast({
          title: 'Game Resolved',
          description: 'Your Dice result has been revealed.',
          type: 'success',
        });
      });
    } catch (resolveError) {
      handleContractError(resolveError, addToast);
    } finally {
      pendingTxRef.current = null;
      operationInProgress.current = false;
      setProcessingState(false);
      setRollingState(false);
    }
  }, [
    contracts,
    walletAccount,
    gameStatus?.pendingResolution,
    isBetting,
    isResolving,
    addToast,
    withResolving,
    invalidateQueries,
    refreshData,
    setLastResult,
    setProcessingState,
    setRollingState,
  ]);

  // Derived state from balance data
  const hasNoTokens = useMemo(() => {
    try {
      // User has no tokens if balance exists and is zero
      return (
        balanceData?.balance !== undefined &&
        BigInt(balanceData.balance.toString()) <= BigInt(0)
      );
    } catch (error) {
      return true; // Assume no tokens on error
    }
  }, [balanceData]);

  const needsApproval = useMemo(() => {
    try {
      // If we don't have balance data yet, we can't determine if approval is needed
      if (!balanceData) {
        return false;
      }

      // Convert to BigInt with safe fallbacks
      const balanceBigInt = balanceData.balance
        ? BigInt(balanceData.balance.toString())
        : BigInt(0);
      const allowanceBigInt = balanceData.allowance
        ? BigInt(balanceData.allowance.toString())
        : BigInt(0);
      const betAmountBigInt = BigInt(betAmount.toString());

      // If balance is zero, no need to approve (can't bet anyway)
      if (balanceBigInt <= BigInt(0)) {
        return false;
      }

      // Check if allowance is less than bet amount
      const needsApproval = allowanceBigInt < betAmountBigInt;

      return needsApproval;
    } catch (error) {
      return false; // Assume no approval needed on error
    }
  }, [balanceData, betAmount]);

  // Keep approval state in sync even when approval happens outside this UI.
  // Some providers miss token Approval events, so we also poll allowance directly.
  useEffect(() => {
    let cancelled = false;

    const DiceContractAddress =
      contracts?.Dice?.address || contracts?.Dice?.target || null;

    const syncExternalApprovalState = async () => {
      if (cancelled) return;
      if (!contracts?.token || !walletAccount || !DiceContractAddress) return;

      try {
        const cachedBalanceData = queryClient.getQueryData(balanceQueryKey);
        const latestBalanceData = await fetchBalanceData();

        const cachedAllowance = cachedBalanceData?.allowance
          ? BigInt(cachedBalanceData.allowance.toString())
          : null;
        const cachedBalance = cachedBalanceData?.balance
          ? BigInt(cachedBalanceData.balance.toString())
          : null;

        if (
          cachedAllowance !== latestBalanceData.allowance ||
          cachedBalance !== latestBalanceData.balance
        ) {
          queryClient.setQueryData(balanceQueryKey, latestBalanceData);
        }
      } catch (_err) {
        // ignore errors while polling
      }
    };

    syncExternalApprovalState();

    const intervalId = setInterval(syncExternalApprovalState, 4000);
    const handleWindowFocus = () => {
      syncExternalApprovalState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncExternalApprovalState();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    balanceQueryKey,
    contracts,
    fetchBalanceData,
    queryClient,
    walletAccount,
  ]);

  // Cancel any pending operation when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (pendingTxRef.current) {
        pendingTxRef.current = null;
      }

      if (operationInProgress.current) {
        operationInProgress.current = false;
      }

      // Clean up safety timeout
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      // Clean up coin Dice timeout
      if (DiceTimeoutRef.current) {
        clearTimeout(DiceTimeoutRef.current);
        DiceTimeoutRef.current = null;
      }
    };
  }, []);

  // When bet is placed, immediately update UI with the result
  useEffect(() => {
    if (gameState.lastResult) {
      // After result is known, immediately refresh all data
      invalidateQueries(['balance', 'gameHistory', 'gameStats']);
    }
  }, [gameState.lastResult, invalidateQueries]);

  // Add a function to check for VRF results in history
  const _checkVrfResultInHistory = async txHash => {
    try {
      // Only proceed if we still have a pending VRF
      const currentResult = queryClient.getQueryData(['lastResult']);
      if (!currentResult || !currentResult.vrfPending) {
        return;
      }

      // Fetch the latest history data
      await queryClient.invalidateQueries(['gameHistory']);
      const historyData = queryClient.getQueryData(['gameHistory']);

      if (historyData && historyData.length > 0) {
        // Find a matching transaction in history
        const matchingGame = historyData.find(
          game =>
            game.txHash === txHash ||
            (game.timestamp &&
              currentResult.timestamp &&
              Math.abs(game.timestamp - currentResult.timestamp) < 60)
        );

        if (
          matchingGame &&
          matchingGame.rolledNumber >= 1 &&
          matchingGame.rolledNumber <= 6
        ) {
          // Create a complete result with the VRF data
          const completeResult = {
            ...currentResult,
            rolledNumber: matchingGame.rolledNumber,
            payout: BigInt(matchingGame.payout || '0'),
            isWin: matchingGame.isWin,
            vrfComplete: true,
            vrfPending: false,
            isPending: false,
          };

          // Update the game state with the complete result
          setLastResult(completeResult);

          // IMPORTANT: Explicitly stop rolling animation when VRF result is found
          setRollingState(false);

          // Show a notification
          if (completeResult.isWin) {
            addToast(`🎉 VRF completed - You won!`, 'success');
          } else {
            addToast(`VRF completed - Better luck next time!`, 'info');
          }

          // Force refresh all data
          invalidateQueries(['balance', 'gameHistory', 'gameStats']);
        } else {
          // If still not found, schedule another check in a few seconds (max 5 retries)
          if (!currentResult.vrfRetryCount || currentResult.vrfRetryCount < 5) {
            // Update retry count
            setLastResult(prev => ({
              ...prev,
              vrfRetryCount: (prev.vrfRetryCount || 0) + 1,
            }));

            setTimeout(() => _checkVrfResultInHistory(txHash), 5000);
          } else {
            // After max retries, mark the VRF as complete but with unknown result
            setLastResult(prev => ({
              ...prev,
              vrfComplete: true,
              vrfPending: false,
              isPending: false,
              vrfTimedOut: true,
            }));

            // Stop the rolling animation
            setRollingState(false);

            addToast(
              'Unable to retrieve VRF result. Please check your history.',
              'warning'
            );
          }
        }
      } else {
        // If no history data, retry
        setTimeout(() => _checkVrfResultInHistory(txHash), 5000);
      }
    } catch (error) {
      // On error, make sure we stop the animation after a few retries
      const currentResult = queryClient.getQueryData(['lastResult']);
      if (currentResult && currentResult.vrfRetryCount >= 3) {
        setRollingState(false);
      }
    }
  };

  // Return all the necessary state and functions
  return {
    chosenNumber,
    betAmount,
    betAmountString,
    gameState,
    balanceData: {
      balance: balanceData?.balance || BigInt(0),
      allowance: balanceData?.allowance || BigInt(0),
    },
    balanceLoading,
    hasNoTokens,
    needsApproval,
    isApproving,
    isBetting,
    isResolving,
    isProcessing,
    error,
    setChosenNumber,
    setBetAmount,
    handleApproveToken,
    handlePlaceBet,
    handleResolveGame,
    invalidateQueries,
  };
};

export default useGameLogic;
