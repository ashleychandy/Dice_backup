import React, { Component } from 'react';

/**
 * Error Boundary component that catches JavaScript errors in its child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Update state with error info
    this.setState({ errorInfo });

    // If onError prop is provided, call it
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.state.errorInfo)
      ) : (
        <div className="error-boundary solid-panel p-8 text-center my-8">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Something went wrong
          </h2>
          <p className="text-secondary-400 mb-4">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gaming px-6 py-2 mt-4"
          >
            Refresh Page
          </button>
          {this.props.showDetails && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-secondary-400 text-sm">
                Error Details
              </summary>
              <pre className="mt-2 p-4 bg-black/20 rounded text-red-400 text-xs overflow-auto">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
