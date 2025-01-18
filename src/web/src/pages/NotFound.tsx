import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { analytics } from '@segment/analytics-next';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';

// Styled components with theme integration
const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 2rem;
  text-align: center;
  background-color: var(--color-background);
  transition: all var(--transition-fast);

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const ErrorCode = styled.h1`
  font-size: 3rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: 1rem;
  font-family: var(--font-family-primary);
  animation: fadeIn 0.5s ease-in;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const ErrorMessage = styled.p`
  font-size: 1.5rem;
  color: var(--color-text);
  margin-bottom: 2rem;
  font-family: var(--font-family-primary);
  max-width: 600px;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 1.125rem;
  }
`;

/**
 * Enhanced 404 Not Found page component with analytics and accessibility features
 */
const NotFound: React.FC = React.memo(() => {
  const navigate = useNavigate();

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