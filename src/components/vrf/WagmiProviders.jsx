import React from 'react';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '../../config/wagmi';
import { xdc, xdcTestnet } from 'wagmi/chains';

/**
 * Wrapper component that provides the wagmi context only when needed
 * This prevents the app from breaking if the wagmi config doesn't load properly
 */
const WagmiProviders = ({ children }) => {
  // Only render the provider if we have a valid config
  if (!wagmiConfig) {
    console.warn('Wagmi config not available - VRF functionality limited');
    return children;
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={[xdc, xdcTestnet]}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default WagmiProviders;
