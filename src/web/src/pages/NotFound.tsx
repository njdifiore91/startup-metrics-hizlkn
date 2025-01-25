import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { AnalyticsBrowser } from '@segment/analytics-next';
import Button from '../components/common/Button';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Styled components with CSS variables
const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: var(--color-background-light);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color-light);

  @media (max-width: 768px) {
    padding: var(--spacing-lg);
  }
`;

const ErrorCode = styled.h1`
  font-size: 8rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
  font-family: var(--font-family-primary);
  animation: fadeIn 0.5s ease-in;
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 6rem;
  }
`;

const ErrorMessage = styled.p`
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
  font-family: var(--font-family-primary);
  max-width: 600px;
  line-height: var(--line-height-normal);

  @media (max-width: 768px) {
    font-size: var(--font-size-md);
  }
`;

const StyledButton = styled(Button)`
  background-color: var(--color-primary);
  color: white;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  border-radius: var(--border-radius-md);
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-primary-dark);
  }
`;

const analytics = AnalyticsBrowser.load({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

/**
 * Enhanced 404 Not Found page component with analytics and accessibility features
 */
const NotFound: React.FC = React.memo(() => {
  const navigate = useNavigate();

  // Track 404 occurrence
  useEffect(() => {
    analytics.track('404_error', {
      path: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // Handle navigation with error tracking
  const handleBackToDashboard = useCallback(async () => {
    try {
      analytics.track('404_recovery_attempt', {
        action: 'navigate_to_dashboard',
        timestamp: new Date().toISOString(),
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Navigation failed:', error);
      analytics.track('404_recovery_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }, [navigate]);

  return (
    <ErrorBoundary>
      <NotFoundContainer role="main" aria-labelledby="error-title">
        <ContentContainer>
          <ErrorCode id="error-title" tabIndex={0}>
            404
          </ErrorCode>
          <ErrorMessage>The page you're looking for doesn't exist or has been moved.</ErrorMessage>
          <StyledButton
            variant="primary"
            size="large"
            onClick={handleBackToDashboard}
            ariaLabel="Return to dashboard"
            role="link"
          >
            Return to Dashboard
          </StyledButton>
        </ContentContainer>
      </NotFoundContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
NotFound.displayName = 'NotFound';

export default NotFound;
