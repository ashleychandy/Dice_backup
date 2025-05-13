import React, { useState } from 'react';
import Navbar from './Navbar';
import NetworkWarning from '../ui/NetworkWarning';
import { useWallet } from '../wallet/WalletProvider';
import { useNetwork } from '../../contexts/NetworkContext';
import { VrfStatusGlobal, VrfRecoveryModal } from '../vrf';

const Layout = ({ children, showNetworkWarning = true }) => {
  const { account, chainId } = useWallet();
  const { currentNetwork } = useNetwork();
  const [isVrfModalOpen, setIsVrfModalOpen] = useState(false);

  // Check if we're on a supported network
  const isUnsupportedNetwork =
    chainId &&
    chainId !== 50 && // XDC Mainnet
    chainId !== 51; // Apothem Testnet

  // Handler to open the VRF recovery modal
  const handleOpenRecovery = () => {
    setIsVrfModalOpen(true);
  };

  return (
    <div className="min-h-screen relative bg-white">
      {/* Pure white background with no image or overlay */}

      <div className="relative z-10 flex flex-col">
        {showNetworkWarning && isUnsupportedNetwork && <NetworkWarning />}

        <Navbar account={account} chainId={chainId} />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Global VRF Status Notification */}
        <VrfStatusGlobal onOpenRecovery={handleOpenRecovery} />
      </div>

      {/* VRF Recovery Modal */}
      <VrfRecoveryModal
        isOpen={isVrfModalOpen}
        onClose={() => setIsVrfModalOpen(false)}
      />
    </div>
  );
};

export default Layout;
