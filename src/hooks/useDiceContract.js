import { useEffect, useState } from 'react';
import { useWallet } from '../components/wallet/WalletProvider';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/GamaToken.json';

export const useDiceContract = () => {
  const { provider, account } = useWallet();
  const { currentNetwork } = useNetwork();
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!provider || !account || !currentNetwork) {
          setContract(null);
          setTokenContract(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        // Handle both address structures
        const diceAddress =
          currentNetwork.contracts?.dice || currentNetwork.diceAddress;
        const tokenAddress =
          currentNetwork.contracts?.token || currentNetwork.tokenAddress;

        if (!diceAddress) {
          console.warn(
            `Dice contract address not configured for network: ${currentNetwork.name}`
          );
          setError(
            new Error(
              `Dice contract address not configured for network: ${currentNetwork.name}`
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
            diceAddress,
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
        if (tokenAddress) {
          try {
            const token = new ethers.Contract(
              tokenAddress,
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
  }, [provider, account, currentNetwork]);

  // Debug logging on state changes
  useEffect(() => {
    console.log('Contract initialization result:', {
      dice: contract,
      token: tokenContract,
      network: currentNetwork?.name,
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
    });
  }, [contract, tokenContract, currentNetwork, isLoading, error]);

  return {
    contract,
    tokenContract,
    isLoading,
    error,
  };
};
