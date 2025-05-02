import { useEffect, useState } from 'react';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';
import DiceABI from '../contracts/abi/Dice.json';
import { DICE_CONTRACT_ADDRESS } from '../constants/contracts';

export const useDiceContract = () => {
  const { provider, account } = useWallet();
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContract = async () => {
      try {
        // Debug logging
        console.log('Initializing dice contract with:', {
          provider: !!provider,
          account,
          contractAddress: DICE_CONTRACT_ADDRESS,
        });

        if (!provider || !account) {
          console.log('Provider or account not available:', {
            provider: !!provider,
            account,
          });
          setContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (!DICE_CONTRACT_ADDRESS) {
          console.error('Dice contract address not configured');
          setError(new Error('Dice contract address not configured'));
          setContract(null);
          setIsLoading(false);
          return;
        }

        const signer = await provider.getSigner();
        console.log('Got signer for account:', account);

        const diceContract = new ethers.Contract(
          DICE_CONTRACT_ADDRESS,
          DiceABI.abi,
          signer
        );

        console.log('Dice contract initialized:', {
          address: diceContract.target,
          hasGetBetHistory: DiceABI.abi.some(
            item => item.name === 'getBetHistory'
          ),
        });

        setContract(diceContract);
        setError(null);
      } catch (err) {
        console.error('Error initializing dice contract:', err);
        setError(err);
        setContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContract();
  }, [provider, account]);

  // Debug logging on state changes
  useEffect(() => {
    console.log('Dice contract state updated:', {
      hasContract: !!contract,
      isLoading,
      hasError: !!error,
    });
  }, [contract, isLoading, error]);

  return {
    contract,
    isLoading,
    error,
  };
};
