import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Layout from './components/layout/Layout.jsx';
import WalletProvider from './components/wallet/WalletProvider.jsx';
import LoadingSpinner from './components/ui/LoadingSpinner.jsx';
import ErrorBoundary from './components/error/ErrorBoundary.jsx';

// Lazy-loaded components
const AppRoutes = lazy(() => import('./components/routes/AppRoutes.jsx'));

// Utils
import { NotificationProvider } from './contexts/NotificationContext.jsx';

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
              <Layout>
                <Suspense
                  fallback={
                    <div className="flex justify-center items-center min-h-[60vh]">
                      <LoadingSpinner size="large" />
                    </div>
                  }
                >
                  <AppRoutes />
                </Suspense>
              </Layout>
            </WalletProvider>
          </Router>
        </NotificationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
