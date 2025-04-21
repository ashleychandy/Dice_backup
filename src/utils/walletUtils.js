import { ethers } from 'ethers';
import {
  NETWORK_CONFIG,
  SUPPORTED_CHAIN_IDS,
  DEFAULT_NETWORK,
} from '../config';
import DiceABI from '../contracts/abi/Dice.json';
import TokenABI from '../contracts/abi/GamaToken.json';

export const validateNetwork = async provider => {
  const network = await provider.getNetwork();
  const currentChainId = Number(network.chainId);

  if (!SUPPORTED_CHAIN_IDS.includes(currentChainId)) {
    throw new Error(
      `Please switch to a supported network. Connected to chain ID: ${currentChainId}`
    );
  }

  const currentNetwork = Object.values(NETWORK_CONFIG).find(
    n => n.chainId === currentChainId
  );
  if (!currentNetwork) throw new Error('Network configuration not found');

  try {
    await provider.getBlockNumber();
  } catch (rpcError) {
    throw new Error(`Failed to connect to ${currentNetwork.name}`);
  }

  return currentChainId;
};

export const initializeContracts = async (
  provider,
  account,
  setContracts,
  setLoadingStates,
  handleError
) => {
  try {
    const network = await provider.getNetwork();
    const currentChainId =
      typeof network.chainId === 'bigint'
        ? Number(network.chainId)
        : Number(network.chainId);

    const networkKey = Object.keys(NETWORK_CONFIG).find(
      key => NETWORK_CONFIG[key].chainId === currentChainId
    );

    const networkConfig = NETWORK_CONFIG[networkKey];

    if (!networkConfig) {
      throw new Error(
        `Unsupported network. Connected to chain ID: ${currentChainId}. Supported chain IDs: ${SUPPORTED_CHAIN_IDS.join(
          ', '
        )}`
      );
    }

    // Get signer for the connected account
    const signer = await provider.getSigner(account);

    const tokenContract = new ethers.Contract(
      networkConfig.contracts.token,
      TokenABI.abi,
      signer // Use signer instead of provider
    );

    const diceContract = new ethers.Contract(
      networkConfig.contracts.dice,
      DiceABI.abi,
      signer // Use signer instead of provider
    );

    if (setContracts) {
      setContracts({
        token: tokenContract,
        dice: diceContract,
      });
    }

    if (setLoadingStates) {
      setLoadingStates(prev => ({ ...prev, contracts: false }));
    }

    return { tokenContract, diceContract };
  } catch (error) {
    if (handleError) {
      handleError(error, 'initializeContracts');
    }
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }
    if (setLoadingStates) {
      setLoadingStates(prev => ({ ...prev, contracts: false }));
    }
    return null;
  }
};

export const switchNetwork = async (
  networkType,
  setLoadingStates,
  setContracts,
  account,
  setProvider,
  validateNetwork,
  initializeContracts,
  addToast,
  handleError
) => {
  if (!window.ethereum) return;

  const network = NETWORK_CONFIG[networkType || DEFAULT_NETWORK];
  const chainIdHex = `0x${network.chainId.toString(16)}`;

  try {
    if (setLoadingStates) {
      setLoadingStates(prev => ({ ...prev, wallet: true }));
    }
    // Clear contracts during network switch
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }

    // Create a promise that resolves when the network change is complete
    const networkSwitchPromise = new Promise((resolve, reject) => {
      // Set a timeout for network switch
      const timeoutId = setTimeout(() => {
        reject(new Error('Network switch timeout'));
      }, 10000); // 10 second timeout

      // Listen for chain change
      const chainChangeHandler = newChainId => {
        const newChainIdNumber = parseInt(newChainId);
        if (newChainIdNumber === network.chainId) {
          clearTimeout(timeoutId);
          window.ethereum.removeListener('chainChanged', chainChangeHandler);
          resolve();
        }
      };

      window.ethereum.on('chainChanged', chainChangeHandler);
    });

    // Request the network switch
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              nativeCurrency: {
                name: 'XDC',
                symbol: 'XDC',
                decimals: 18,
              },
            },
          ],
        });
      } else {
        throw switchError;
      }
    }

    // Wait for the network switch to complete
    await networkSwitchPromise;

    // After successful switch, reinitialize if we have an account
    if (account) {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      if (setProvider) {
        setProvider(newProvider);
      }
      await validateNetwork(newProvider);
      await initializeContracts(newProvider, account);
    }

    if (addToast) {
      addToast(`Successfully switched to ${network.name}`, 'success');
    }
  } catch (error) {
    if (handleError) {
      handleError(error, 'switchNetwork');
    }
    // Reset contracts and provider on error
    if (setContracts) {
      setContracts({ token: null, dice: null });
    }
    if (setProvider) {
      setProvider(null);
    }
    throw error;
  } finally {
    if (setLoadingStates) {
      setLoadingStates(prev => ({ ...prev, wallet: false }));
    }
  }
};
