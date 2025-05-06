import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from './WalletProvider';
import Button from '../ui/Button';
import { DEFAULT_NETWORK, NETWORK_CONFIG } from '../../config';

const WalletOption = ({ name, icon, onClick, disabled }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`flex items-center gap-3 w-full p-4 rounded-xl border transition-colors ${
      disabled
        ? 'bg-secondary-800/50 border-secondary-700/50 cursor-not-allowed'
        : 'bg-secondary-800 border-secondary-700 hover:bg-secondary-700'
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    <img src={icon} alt={`${name} icon`} className="w-6 h-6" />
    <span className="text-white">{name}</span>
  </motion.button>
);

const ConnectWalletButton = () => {
  const { connectWallet, isConnecting } = useWallet();
  const [showOptions, setShowOptions] = useState(false);

  const handleConnectMetamask = () => {
    connectWallet();
    setShowOptions(false);
  };

  const toggleOptions = () => {
    setShowOptions(prev => !prev);
  };

  // Get default network information
  const defaultNetwork = NETWORK_CONFIG[DEFAULT_NETWORK];

  // Add paths to your wallet icons
  const walletIcons = {
    metamask: '/assets/wallets/metamask.svg',
    xdc: '/assets/wallets/xdc.svg',
    xfi: '/assets/wallets/xfi.svg',
    trustwallet: '/assets/wallets/trustwallet.svg',
  };

  // If you don't have the icons, you can use these URLs temporarily
  const fallbackIcons = {
    metamask:
      'https://cdn.iconscout.com/icon/free/png-256/free-metamask-2728406-2261817.png',
    xdc: 'https://xinfin.org/assets/images/brand-assets/xdc-icon.png',
    xfi: 'https://xinfin.org/assets/images/brand-assets/xdc-icon.png',
    trustwallet:
      'https://trustwallet.com/assets/images/media/assets/trust-wallet-icon.svg',
  };

  return (
    <div className="relative">
      <Button
        onClick={toggleOptions}
        isLoading={isConnecting}
        variant="primary"
        className="relative z-10"
      >
        Connect Wallet
      </Button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 p-4 w-80 bg-secondary-900 rounded-xl shadow-xl border border-secondary-700 z-50"
          >
            <h3 className="font-medium text-white mb-2">Connect Wallet</h3>
            <div className="p-2 bg-blue-900/30 border border-blue-500/30 rounded-lg mb-4">
              <p className="text-xs text-blue-100">
                <span className="font-bold">Note:</span> Please ensure your
                wallet is set to
                <span className="font-bold text-blue-300">
                  {' '}
                  {defaultNetwork.name} (Chain ID: {defaultNetwork.chainId})
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <WalletOption
                name="MetaMask"
                icon={walletIcons.metamask || fallbackIcons.metamask}
                onClick={handleConnectMetamask}
                disabled={isConnecting}
              />
              <WalletOption
                name="XDC Wallet"
                icon={walletIcons.xdc || fallbackIcons.xdc}
                onClick={handleConnectMetamask}
                disabled={isConnecting}
              />
              <WalletOption
                name="XFi Wallet"
                icon={walletIcons.xfi || fallbackIcons.xfi}
                onClick={handleConnectMetamask}
                disabled={isConnecting}
              />
              <WalletOption
                name="Trust Wallet"
                icon={walletIcons.trustwallet || fallbackIcons.trustwallet}
                onClick={handleConnectMetamask}
                disabled={isConnecting}
              />
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              By connecting, you agree to the Terms of Service
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectWalletButton;
