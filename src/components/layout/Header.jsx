import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import { useWallet } from '../../contexts/WalletContext';
import { truncateAddress } from '../../utils/formatting';
import ConnectWalletButton from '../wallet/ConnectWalletButton';
import WalletStatus from '../wallet/WalletStatus';

const NetworkWarning = ({ onSwitchNetwork }) => (
  <div className="bg-gaming-error/90 text-white px-4 py-2 text-center">
    <p>
      Please switch to XDC Network (Chain ID: 50) or Apothem Testnet (Chain ID:
      51)
    </p>
    <div className="flex justify-center gap-4 mt-2">
      <Button
        size="sm"
        onClick={() => onSwitchNetwork('mainnet')}
        className="bg-white/20 hover:bg-white/30"
      >
        Switch to XDC Mainnet
      </Button>
      <Button
        size="sm"
        onClick={() => onSwitchNetwork('apothem')}
        className="bg-white/20 hover:bg-white/30"
      >
        Switch to Apothem Testnet
      </Button>
    </div>
  </div>
);

const Header = () => {
  const {
    account,
    chainId,
    isNetworkSupported,
    handleLogout,
    handleSwitchNetwork,
    isConnecting,
  } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Determine the current network
  const getNetworkName = () => {
    if (!chainId) return null;

    switch (chainId) {
      case 50:
        return { name: 'XDC Mainnet', color: 'text-green-400' };
      case 51:
        return { name: 'Apothem Testnet', color: 'text-blue-400' };
      default:
        return { name: `Chain ID: ${chainId}`, color: 'text-red-400' };
    }
  };

  const network = getNetworkName();

  return (
    <>
      {!isNetworkSupported && account && (
        <NetworkWarning onSwitchNetwork={handleSwitchNetwork} />
      )}

      <header className="bg-secondary-900 border-b border-secondary-800 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img
              src="/assets/gama-logo.svg"
              alt="GAMA Logo"
              className="w-8 h-8 mr-2"
            />
            <span className="text-xl font-bold text-white">GAMA Dice</span>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Display wallet status for mobile and desktop */}
            <div className="hidden md:block">
              <WalletStatus />
            </div>

            {account ? (
              <div className="relative">
                <button
                  onClick={toggleDropdown}
                  className="flex items-center bg-secondary-800 hover:bg-secondary-700 
                            transition-colors duration-300 rounded-xl py-2 px-4 text-white"
                >
                  {network && (
                    <span className={`text-xs mr-2 ${network.color}`}>
                      {network.name}
                    </span>
                  )}
                  <span className="mr-2">{truncateAddress(account)}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-48 bg-secondary-800 rounded-xl shadow-xl border border-secondary-700 z-50"
                    >
                      {chainId === 50 ? (
                        <button
                          onClick={() => {
                            handleSwitchNetwork('apothem');
                            closeDropdown();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-secondary-700 transition-colors rounded-t-xl text-white/90"
                        >
                          Switch to Apothem Testnet
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleSwitchNetwork('mainnet');
                            closeDropdown();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-secondary-700 transition-colors rounded-t-xl text-white/90"
                        >
                          Switch to XDC Mainnet
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleLogout();
                          closeDropdown();
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-secondary-700 transition-colors rounded-b-xl text-white/90"
                      >
                        Disconnect Wallet
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <ConnectWalletButton />
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
