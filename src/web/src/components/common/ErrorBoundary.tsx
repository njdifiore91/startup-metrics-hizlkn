import React from 'react';
import * as Sentry from '@sentry/react';
import { Card } from './Card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  lastError: Date | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeout: number | null = null;

  static defaultProps = {
    maxRetries: 3,
    resetOnPropsChange: false
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastError: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastError: new Date()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Track error with Sentry
    Sentry.withScope((scope: Sentry.Scope) => {
      scope.setExtras({
        errorInfo,
        retryCount: this.state.retryCount,
        lastError: this.state.lastError
      });
      Sentry.captureException(error);
    });

    // Update state with error details
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry if within maxRetries limit
    if (this.state.retryCount < (this.props.maxRetries || 3)) {
      this.resetTimeout = window.setTimeout(() => {
        this.reset();
      }, Math.min(1000 * Math.pow(2, this.state.retryCount), 10000));
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when props change if enabled
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.reset();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
    }
  }

  reset = (): void => {
    if (this.resetTimeout) {
      window.clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount >= (this.props.maxRetries || 3) ? 0 : this.state.retryCount
    });
  };

  render(): React.ReactNode {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <Card
        elevation="medium"
        role="alert"
        ariaLabel="Error occurred"
        testId="error-boundary-fallback"
      >
        <div style={styles.errorContainer}>
          <h2 style={styles.errorHeading}>
            Something went wrong
          </h2>
          <p style={styles.errorMessage}>
            {error?.message || 'An unexpected error occurred'}
            {process.env.NODE_ENV === 'development' && (
              <span> (Retry attempt {retryCount} of {maxRetries})</span>
            )}
          </p>
          {retryCount < (maxRetries || 3) && (
            <button
              onClick={this.reset}
              style={styles.retryButton}
              aria-label="Retry failed operation"
            >
              Try Again
            </button>
          )}
        </div>
      </Card>
    );
  }
}

const styles = {
  errorContainer: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#0D3330',
    role: 'alert',
    ariaLive: 'polite'
  },
  errorHeading: {
    fontSize: '20px',
    marginBottom: '8px',
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'bold',
    color: '#151e2d'
  },
  errorMessage: {
    fontSize: '14px',
    marginBottom: '16px',
    fontFamily: 'Inter, sans-serif',
    color: '#46608C'
  },
  retryButton: {
    backgroundColor: '#168947',
    color: '#FFFFFF',
    padding: '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: '#0D6635'
    },
    ':focus': {
      outline: '2px solid #46608C',
      outlineOffset: '2px'
    }
  }
};

export default ErrorBoundary;