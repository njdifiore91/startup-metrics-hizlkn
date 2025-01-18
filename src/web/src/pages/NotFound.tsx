import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';

// Styled components with theme integration
const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background-color: var(--color-background);
  transition: all var(--transition-fast);

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.lg};
  }
`;

const ErrorCode = styled.h1`
  font-size: ${({ theme }) => theme.typography.h1};
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-family: var(--font-family-primary);
  animation: fadeIn 0.5s ease-in;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ theme }) => theme.typography.h2};
  }
`;

const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.h3};
  color: var(--color-text);
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  font-family: var(--font-family-primary);
  max-width: 600px;
  line-height: 1.5;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    font-size: ${({ theme }) => theme.typography.body1};
  }
`;

/**
 * Enhanced 404 Not Found page component with accessibility features
 */
const NotFound: React.FC = React.memo(() => {
  const navigate = useNavigate();

  // Handle navigation
  const handleBackToDashboard = useCallback(async () => {
    try {
      navigate('/dashboard');
    } catch (error) {
      console.error('Navigation failed:', error);
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