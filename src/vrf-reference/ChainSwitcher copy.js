import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { xdc, xdcTestnet } from '../../constants/chains';
import useWallet from '../../hooks/WalletContext';

const ChainSwitcher = () => {
  const { chain, switchNetwork } = useWallet();
  const [isPending, setIsPending] = useState(false);
  const chainId = chain?.id;

  // Determine which chain is currently active
  const isXdcMainnet = chainId === xdc.id;
  const isXdcTestnet = chainId === xdcTestnet.id;
  const showUnsupported = !isXdcMainnet && !isXdcTestnet;

  // Colors based on active chain
  const getButtonClass = isActive =>
    isActive
      ? 'bg-[#22AD74] text-white hover:bg-[#22AD74]/90'
      : 'bg-gray-700 text-gray-200 hover:bg-gray-600';

  // Handle switching to XDC mainnet
  const handleSwitchToMainnet = async () => {
    if (!isXdcMainnet && !isPending) {
      // Clear localStorage items
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.reconnected');

      try {
        setIsPending(true);
        // Switch chain
        await switchNetwork(xdc.id);
      } catch (error) {
        console.error('Failed to switch network:', error);
      } finally {
        setIsPending(false);
      }
    }
  };

  // Handle switching to Apothem testnet
  const handleSwitchToTestnet = async () => {
    if (!isXdcTestnet && !isPending) {
      // Clear localStorage items
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.reconnected');

      try {
        setIsPending(true);
        // Switch chain
        await switchNetwork(xdcTestnet.id);
      } catch (error) {
        console.error('Failed to switch network:', error);
      } finally {
        setIsPending(false);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-800 rounded-lg mb-4">
      <div className="text-white font-medium mb-2 sm:mb-0 sm:mr-4 flex items-center">
        Network:
      </div>
      <div className="flex gap-2">
        <motion.button
          onClick={handleSwitchToMainnet}
          disabled={isXdcMainnet || isPending}
          className={`px-4 py-2 rounded-lg transition-colors ${getButtonClass(
            isXdcMainnet
          )} ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          whileHover={!isXdcMainnet && !isPending ? { scale: 1.03 } : {}}
          whileTap={!isXdcMainnet && !isPending ? { scale: 0.98 } : {}}
        >
          {isXdcMainnet ? '✓ XDC Mainnet' : 'XDC Mainnet'}
        </motion.button>

        <motion.button
          onClick={handleSwitchToTestnet}
          disabled={isXdcTestnet || isPending}
          className={`px-4 py-2 rounded-lg transition-colors ${getButtonClass(
            isXdcTestnet
          )} ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
          whileHover={!isXdcTestnet && !isPending ? { scale: 1.03 } : {}}
          whileTap={!isXdcTestnet && !isPending ? { scale: 0.98 } : {}}
        >
          {isXdcTestnet ? '✓ Apothem Testnet' : 'Apothem Testnet'}
        </motion.button>

        {showUnsupported && (
          <div className="text-red-400 font-medium flex items-center">
            Unsupported Network ({chainId})
          </div>
        )}
      </div>
    </div>
  );
};

export default ChainSwitcher;
