import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { xdc, xdcTestnet } from 'wagmi/chains';
import { WagmiProviders } from '../vrf/index.jsx';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Custom connect button that maintains app styling
const CustomConnectButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
        // Unused variables
        openChainModal: _openChainModal,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="px-6 py-2 rounded-lg bg-[#22AD74] text-white border border-[#22AD74]/20 hover:bg-[#22AD74]/90 transition-all duration-300 flex items-center gap-2"
                  >
                    Connect
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="px-4 py-2 rounded-lg text-sm bg-[#22AD74]/5 border border-[#22AD74]/20 hover:bg-[#22AD74]/10 transition-colors flex items-center gap-2"
                >
                  <span className="text-gray-900">
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-600"
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
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};

const WagmiNavbarContent = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Use wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

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

  // Handle network switching with specific network types
  const handleSwitchNetwork = async networkType => {
    try {
      if (networkType === 'mainnet') {
        await switchChain({ chainId: xdc.id });
      } else if (networkType === 'apothem') {
        await switchChain({ chainId: xdcTestnet.id });
      }
    } catch (error) {
      console.error('Error switching network:', error);
    }
  };

  return (
    <header className="px-6 border-b border-[#22AD74]/20 bg-white sticky top-0 z-50 shadow-sm w-full">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
        <div className="flex items-center">
          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 hover:opacity-90 transition-all duration-300 group"
          >
            <img
              src="/assets/gama-logo.svg"
              alt="GAMA Logo"
              className="h-8 sm:h-9 group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl sm:text-2xl font-bold text-[#22AD74] bg-gradient-to-r from-[#22AD74] to-[#22AD74]/70 text-transparent bg-clip-text group-hover:to-[#22AD74] transition-all duration-300">
              Dice
            </span>
          </a>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() =>
              window.open(
                'https://app.xspswap.finance/#/swap?outputCurrency=0x678adf7955d8f6dcaa9e2fcc1c5ba70bccc464e6',
                '_blank'
              )
            }
            className="text-gray-600 hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5"
          >
            Buy GAMA
          </button>

          <div className="h-4 w-px bg-gray-200"></div>

          <a
            href="https://gamacoin.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-[#22AD74] transition-all duration-300 flex items-center gap-2 font-medium hover:-translate-y-0.5"
          >
            Home
          </a>

          <div className="h-4 w-px bg-gray-200"></div>

          {/* Use RainbowKit's ConnectButton */}
          <CustomConnectButton />

          {/* Custom wallet menu implementation (alternative to the above) */}
          {false && isConnected && address && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-4 py-2 rounded-lg text-sm bg-[#22AD74]/5 border border-[#22AD74]/20 hover:bg-[#22AD74]/10 transition-colors flex items-center gap-2"
              >
                <span className="text-gray-900">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
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

              {/* Dropdown Menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-lg border border-gray-200 py-1 z-50"
                  >
                    <button
                      onClick={() => {
                        handleSwitchNetwork('mainnet');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-[#22AD74]/5 flex items-center gap-2"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          chainId === xdc.id ? 'bg-[#22AD74]' : 'bg-gray-300'
                        }`}
                      />
                      Switch to Mainnet
                    </button>
                    <button
                      onClick={() => {
                        handleSwitchNetwork('apothem');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-[#22AD74]/5 flex items-center gap-2"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          chainId === xdcTestnet.id
                            ? 'bg-[#22AD74]'
                            : 'bg-gray-300'
                        }`}
                      />
                      Switch to Testnet
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                      onClick={() => {
                        disconnect();
                        setDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Wrap the Navbar component with the WagmiProviders
const WagmiNavbar = () => (
  <WagmiProviders>
    <WagmiNavbarContent />
  </WagmiProviders>
);

export default WagmiNavbar;
