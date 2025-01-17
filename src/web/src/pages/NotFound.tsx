import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { analytics } from '@segment/analytics-next';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';

// Styled components with theme integration and fallbacks
const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: ${({ theme }) => theme.spacing?.xl || '2rem'};
  text-align: center;
  background-color: var(--color-background);
  transition: all var(--transition-fast);

  @media (max-width: ${({ theme }) => theme.breakpoints?.mobile || '768px'}) {
    padding: ${({ theme }) => theme.spacing?.lg || '1.5rem'};
  }
`;

const ErrorCode = styled.h1`
  font-size: ${({ theme }) => theme.typography?.h1 || '3rem'};
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: ${({ theme }) => theme.spacing?.md || '1rem'};
  font-family: var(--font-family-primary);
  animation: fadeIn 0.5s ease-in;

  @media (max-width: ${({ theme }) => theme.breakpoints?.mobile || '768px'}) {
    font-size: ${({ theme }) => theme.typography?.h2 || '2.5rem'};
  }
`;

const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.typography?.h3 || '1.5rem'};
  color: var(--color-text);
  margin-bottom: ${({ theme }) => theme.spacing?.xl || '2rem'};
  font-family: var(--font-family-primary);
  max-width: 600px;
  line-height: 1.5;

  @media (max-width: ${({ theme }) => theme.breakpoints?.mobile || '768px'}) {
    font-size: ${({ theme }) => theme.typography?.body1 || '1rem'};
  }
`;

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
      timestamp: new Date().toISOString()
    });
  }, []);

  // Handle navigation with error tracking
  const handleBackToDashboard = useCallback(async () => {
    try {
      analytics.track('404_recovery_attempt', {
        action: 'navigate_to_dashboard',
        timestamp: new Date().toISOString()
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Navigation failed:', error);
      analytics.track('404_recovery_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }, [navigate]);

  return (
    <Layout>
      <NotFoundContainer role="main" aria-labelledby="error-title">
        <ErrorCode id="error-title" tabIndex={0}>
          404
        </ErrorCode>
        <ErrorMessage>
          The page you're looking for doesn't exist or has been moved.
        </ErrorMessage>
        <Button
          variant="primary"
          size="large"
          onClick={handleBackToDashboard}
          ariaLabel="Return to dashboard"
          role="link"
        >
          Return to Dashboard
        </Button>
      </NotFoundContainer>
    </Layout>
  );
});

// Display name for debugging
NotFound.displayName = 'NotFound';

export default NotFound;