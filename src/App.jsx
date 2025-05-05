import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Layout from './components/layout/Layout.jsx';
import WalletProvider from './components/wallet/WalletProvider.jsx';
import ErrorBoundary from './components/error/ErrorBoundary.jsx';

// Import directly instead of using lazy loading to avoid potential issues
import AppRoutes from './components/routes/AppRoutes.jsx';

// Utils
import { NotificationProvider } from './contexts/NotificationContext.jsx';

/**
 * Environment variable to enable wagmi
 * This can be controlled via .env file
 * .env: VITE_USE_WAGMI=true|false
 */
const USE_WAGMI = import.meta.env.VITE_USE_WAGMI === 'true';

/**
 * Main App component
 * Sets up the global providers and layout structure
 */
function App() {
  // Configure React Query client with defaults
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 10000,
      },
    },
  });

  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <Router>
            <WalletProvider>
              <Layout useWagmi={USE_WAGMI}>
                <AppRoutes />
              </Layout>
            </WalletProvider>
          </Router>
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
