import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { truncateAddress } from '../../utils/formatting';

const WalletStatus = () => {
  const {
    account,
    chainId,
    isWalletConnected,
    isNetworkSupported,
    loadingStates,
    handleSwitchNetwork,
  } = useWallet();

  if (loadingStates.provider) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white">
        <div className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white/80 animate-spin"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  if (!isWalletConnected) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white/70">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Not connected</span>
      </div>
    );
  }

  // Get network details
  const getNetworkDetails = () => {
    if (!chainId) return { name: 'Unknown', color: 'bg-gray-500' };

    switch (chainId) {
      case 50:
        return { name: 'XDC Mainnet', color: 'bg-green-500' };
      case 51:
        return { name: 'Apothem Testnet', color: 'bg-blue-500' };
      default:
        return { name: `Chain ID: ${chainId}`, color: 'bg-red-500' };
    }
  };

  const network = getNetworkDetails();

  if (!isNetworkSupported) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-white">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Unsupported Network: {network.name}</span>
        <button
          onClick={() => handleSwitchNetwork('mainnet')}
          className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 hover:bg-red-500/30 rounded"
        >
          Switch
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-800 rounded-lg text-sm text-white">
      <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
      <span>{network.name}</span>
      <span className="mx-1 text-secondary-400">|</span>
      <span className="text-secondary-300">{truncateAddress(account)}</span>
    </div>
  );
};

export default WalletStatus;
