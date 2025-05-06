import React from 'react';
import Navbar from './Navbar';
import NetworkWarning from '../ui/NetworkWarning';
import { useWallet } from '../wallet/WalletProvider';
import { useNetwork } from '../../contexts/NetworkContext';

const Layout = ({ children, showNetworkWarning = true }) => {
  const { account, chainId } = useWallet();
  const { currentNetwork } = useNetwork();

  // Check if we're on a supported network
  const isUnsupportedNetwork =
    chainId &&
    chainId !== 50 && // XDC Mainnet
    chainId !== 51; // Apothem Testnet

  return (
    <div className="min-h-screen relative bg-white">
      {/* Pure white background with no image or overlay */}

      <div className="relative z-10 flex flex-col">
        {showNetworkWarning && isUnsupportedNetwork && <NetworkWarning />}

        <Navbar account={account} chainId={chainId} />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
