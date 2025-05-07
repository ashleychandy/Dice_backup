import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useContractData } from './useContractData';
import { useDiceContract } from './useDiceContract';
import wsService from '../services/websocket/WebSocketService';
import { useWallet } from '../components/wallet/WalletProvider';
import { useNotification } from '../contexts/NotificationContext';
import DiceABI from '../contracts/abi/Dice.json';

export interface GameState {
  isActive: boolean;
  selectedNumber: number;
  betAmount: string;
  result: number | null;
  status: 'idle' | 'playing' | 'completed' | 'error';
  timestamp: number;
  transactionHash?: string;
}

interface GameStateHook {
  gameState: GameState;
  betHistory: any[];
  userBalance: string;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  placeBet: (number: number, amount: string) => Promise<void>;
  refreshState: () => Promise<void>;
}

const INITIAL_GAME_STATE: GameState = {
  isActive: false,
  selectedNumber: 0,
  betAmount: '0',
  result: null,
  status: 'idle',
  timestamp: Date.now(),
};

// Define query keys as constants to ensure consistency
const QUERY_KEYS = {
  gameState: (account: string) => ['gameState', account],
  betHistory: (account: string) => ['betHistory', account],
  userBalance: (account: string) => ['userBalance', account],
};

export const useGameState = (): GameStateHook => {
  const { contract: diceContract } = useDiceContract();
  const { account, isWalletConnected } = useWallet();
  const { addToast } = useNotification();
  const queryClient = useQueryClient();
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Use the new useContractData hook for real-time data
  const {
    data: currentGameState,
    isLoading: isGameStateLoading,
    isFetching: isGameStateFetching,
    error: gameStateError,
  } = useContractData('getGameState', [account], {
    enabled: Boolean(account && isWalletConnected),
    refetchInterval: 3000, // Polling fallback
  });

  const { data: betHistory, isLoading: isBetHistoryLoading } = useContractData(
    'getBetHistory',
    [account],
    {
      enabled: Boolean(account && isWalletConnected),
    }
  );

  const { data: userBalance, isLoading: isBalanceLoading } = useContractData(
    'getUserBalance',
    [account],
    {
      enabled: Boolean(account && isWalletConnected),
    }
  );

  // Initialize WebSocket connection
  useEffect(() => {
    if (!diceContract || !account) return;

    const initializeWebSocket = async () => {
      try {
        await wsService.connect();

        // Subscribe to contract events
        await wsService.subscribeToContract(diceContract.address, DiceABI.abi, [
          'GameStarted',
          'GameEnded',
          'GameRecovered',
          'BetPlaced',
        ]);

        setIsWebSocketConnected(true);
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setIsWebSocketConnected(false);
      }
    };

    initializeWebSocket();

    // Cleanup
    return () => {
      wsService.disconnect();
      setIsWebSocketConnected(false);
    };
  }, [diceContract, account]);

  // Efficient query invalidation helper
  const invalidateQueries = useCallback(
    async (queryKeys: string[][]) => {
      await Promise.all(
        queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
      );
    },
    [queryClient]
  );

  // Handle WebSocket events
  useEffect(() => {
    if (!isWebSocketConnected || !account) return;

    const handleGameEvent = async (event: any) => {
      console.log('Game event received:', event);

      const queries = new Set<string[]>();

      // Determine which queries to invalidate based on event type
      switch (event.eventName) {
        case 'GameStarted':
          queries.add(QUERY_KEYS.gameState(account));
          break;
        case 'GameEnded':
          queries.add(QUERY_KEYS.gameState(account));
          queries.add(QUERY_KEYS.betHistory(account));
          queries.add(QUERY_KEYS.userBalance(account));

          // Show result notification
          const result = event.args[1]?.toString();
          if (result) {
            addToast(`Game ended! Result: ${result}`, 'success');
          }
          break;
        case 'GameRecovered':
          queries.add(QUERY_KEYS.gameState(account));
          queries.add(QUERY_KEYS.betHistory(account));
          queries.add(QUERY_KEYS.userBalance(account));
          addToast('Game recovered successfully', 'success');
          break;
        case 'BetPlaced':
          queries.add(QUERY_KEYS.gameState(account));
          queries.add(QUERY_KEYS.userBalance(account));
          break;
      }

      // Invalidate all affected queries at once
      await invalidateQueries(Array.from(queries));
    };

    // Subscribe to events
    wsService.on('GameStarted', handleGameEvent);
    wsService.on('GameEnded', handleGameEvent);
    wsService.on('GameRecovered', handleGameEvent);
    wsService.on('BetPlaced', handleGameEvent);

    return () => {
      wsService.removeAllListeners('GameStarted');
      wsService.removeAllListeners('GameEnded');
      wsService.removeAllListeners('GameRecovered');
      wsService.removeAllListeners('BetPlaced');
    };
  }, [isWebSocketConnected, account, invalidateQueries, addToast]);

  // Place bet function
  const placeBet = useCallback(
    async (number: number, amount: string) => {
      if (!diceContract || !account) {
        throw new Error('Contract or wallet not connected');
      }

      try {
        const tx = await diceContract.playDice(number, amount);
        addToast('Bet placed! Waiting for confirmation...', 'info');

        const receipt = await tx.wait();

        // Invalidate affected queries after bet placement
        await invalidateQueries([
          QUERY_KEYS.gameState(account),
          QUERY_KEYS.userBalance(account),
        ]);

        return receipt;
      } catch (error: any) {
        console.error('Error placing bet:', error);
        addToast(error.message || 'Failed to place bet', 'error');
        throw error;
      }
    },
    [diceContract, account, addToast, invalidateQueries]
  );

  // Refresh all state
  const refreshState = useCallback(async () => {
    if (!account) return;

    await invalidateQueries([
      QUERY_KEYS.gameState(account),
      QUERY_KEYS.betHistory(account),
      QUERY_KEYS.userBalance(account),
    ]);
  }, [account, invalidateQueries]);

  return {
    gameState: currentGameState || INITIAL_GAME_STATE,
    betHistory: betHistory || [],
    userBalance: userBalance || '0',
    isLoading: isGameStateLoading || isBetHistoryLoading || isBalanceLoading,
    isFetching: isGameStateFetching,
    error: gameStateError,
    placeBet,
    refreshState,
  };
};
