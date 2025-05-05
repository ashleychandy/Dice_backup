import { useEffect, useState } from 'react';
import { useWallet } from './useWallet';
import { ethers } from 'ethers';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/Token.json';
import {
  DICE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
} from '../constants/contracts';

export const useDiceContract = () => {
  const { provider, account, chainId } = useWallet();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!provider || !account) {
          setContract(null);
          setTokenContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (!DICE_CONTRACT_ADDRESS) {
          console.warn('Dice contract address not configured for this network');
          setError(
            new Error(
              `Dice contract address not configured for chainId: ${chainId}`
            )
          );
          setContract(null);
          setIsLoading(false);
          return;
        }

        if (!TokenABI?.abi) {
          console.warn('Token ABI not found');
          setError(new Error('Token ABI not available'));
          setIsLoading(false);
          return;
        }

        const signer = provider.getSigner
          ? await provider.getSigner()
          : provider;

        // Initialize dice contract
        try {
          const diceContract = new ethers.Contract(
            DICE_CONTRACT_ADDRESS,
            DiceABI.abi,
            signer
          );
          setContract(diceContract);
        } catch (diceError) {
          console.error('Error initializing dice contract:', diceError);
          setError(
            new Error(
              `Dice contract initialization failed: ${diceError.message}`
            )
          );
          setContract(null);
        }

        // Initialize token contract if address is available
        if (TOKEN_CONTRACT_ADDRESS) {
          try {
            const token = new ethers.Contract(
              TOKEN_CONTRACT_ADDRESS,
              TokenABI.abi,
              signer
            );
            setTokenContract(token);
          } catch (tokenError) {
            console.error('Error initializing token contract:', tokenError);
            setTokenContract(null);
          }
        }
      } catch (err) {
        console.error('Contract initialization error:', err);
        setError(err);
        setContract(null);
        setTokenContract(null);
      } finally {
        setIsLoading(false);
      }
    };

    initContracts();
  }, [provider, account, chainId]);

  // Debug logging on state changes
  useEffect(() => {
    console.log('Contract state updated:', {
      hasDiceContract: !!contract,
      hasTokenContract: !!tokenContract,
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
    });
  }, [contract, tokenContract, isLoading, error]);

  return {
    contract,
    tokenContract,
    isLoading,
    error,
  };
};
