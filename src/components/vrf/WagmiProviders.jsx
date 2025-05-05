import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '../../config/wagmi';
// eslint-disable-next-line no-unused-vars
import { xdc, xdcTestnet } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Wrapper component that provides the wagmi context
 * This prevents the app from breaking if the wagmi config doesn't load properly
 */
const WagmiProviders = ({ children }) => {
  // Create a client for React Query
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
    },
  });

  // Only render the provider if we have a valid config
  if (!wagmiConfig) {
    console.warn('Wagmi config not available - wallet functionality limited');
    return <div>{children}</div>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WagmiProviders;
