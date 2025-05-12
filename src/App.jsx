import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Layout from './components/layout/Layout.jsx';
import WalletProvider, {
  useWallet,
} from './components/wallet/WalletProvider.jsx';
import ErrorBoundary from './components/error/ErrorBoundary.jsx';

// Import directly instead of using lazy loading to avoid potential issues
import AppRoutes from './components/routes/AppRoutes.jsx';

// Utils
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { NetworkProvider } from './contexts/NetworkContext.jsx';
import { PollingProvider } from './services/pollingService.jsx';
import { useDiceContract } from './hooks/useDiceContract.js';

/**
 * Main App component
 * Sets up the global providers and layout structure
 */
function App() {
  // Configure React Query client with defaults - no caching
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 0, // Always consider data stale immediately
        cacheTime: 0, // Don't cache data at all
      },
    },
  });

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <Router>
            <WalletProvider>
              <NetworkProvider>
                <PollingProviderWrapper>
                  <Layout>
                    <AppRoutes />
                  </Layout>
                </PollingProviderWrapper>
              </NetworkProvider>
            </WalletProvider>
          </Router>
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Wrapper component for the PollingProvider to have access to wallet and contract
function PollingProviderWrapper({ children }) {
  const { contract } = useDiceContract();
  const { account } = useWallet();

  return (
    <PollingProvider diceContract={contract} account={account}>
      {children}
    </PollingProvider>
  );
}

export default App;
