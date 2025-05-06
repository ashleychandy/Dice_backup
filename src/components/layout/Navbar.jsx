import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NetworkSwitcher from '../ui/NetworkSwitcher';
import { useWallet } from '../wallet/WalletProvider';
import { useNetwork } from '../../contexts/NetworkContext';

const Navbar = () => {
  const { account, handleLogout, connectWallet } = useWallet();
  const { currentNetwork } = useNetwork();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="px-4 sm:px-6 border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
        <div className="flex items-center">
          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-semibold text-[#22AD74]"
          >
            Dice
          </a>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <a
            href="https://app.xspswap.finance/#/swap?outputCurrency=0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-[#22AD74] transition-all duration-300"
          >
            Buy
          </a>

          <div className="h-3 w-px bg-gray-200"></div>

          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-[#22AD74] transition-all duration-300"
          >
            Home
          </a>

          <div className="h-3 w-px bg-gray-200"></div>

          {account ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 rounded-md text-sm bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors flex items-center gap-2"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: currentNetwork?.color || '#22AD74',
                  }}
                ></div>
                <span className="text-gray-700 text-sm">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu with Network Switcher */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-56 rounded-md bg-white shadow-sm border border-gray-100 overflow-hidden z-50"
                  >
                    {/* Network Section */}
                    <div className="p-2 border-b border-gray-100/80">
                      <div className="text-xs text-gray-500 mb-2 font-medium">
                        NETWORK
                      </div>
                      <NetworkSwitcher isInDropdown={true} />
                    </div>

                    {/* Actions Section */}
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          handleLogout();
                          setDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50/70 rounded-md flex items-center gap-2 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="px-4 py-1.5 rounded-md bg-[#22AD74] text-white text-sm hover:bg-[#22AD74]/90 transition-all"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </>
              ) : (
                'Connect'
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
