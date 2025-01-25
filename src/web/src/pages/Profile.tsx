/**
 * Profile Page Component
 * Displays user profile information and settings
 * @version 1.0.0
 */

import React, { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Analytics } from 'analytics';
import styled from '@emotion/styled';
import { Card } from '@/components/common/Card';
import { UserSettings } from '@/components/user/UserSettings';
import { useAuth } from '@/hooks/useAuth';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Analytics configuration
const analytics = Analytics({
  app: 'startup-metrics-platform',
  version: '1.0.0',
  debug: import.meta.env.NODE_ENV === 'development',
});

// Styled Components
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  min-height: calc(100vh - 200px); // Account for header and footer
`;

const PageHeader = styled.header`
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PageTitle = styled.h1`
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
`;

const ErrorContainer = styled.div`
  background-color: var(--color-error-bg);
  color: var(--color-error);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  svg {
    color: var(--color-error);
    font-size: 20px;
  }
`;

const ContentContainer = styled(Card)`
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  background: var(--color-surface);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  gap: var(--spacing-md);
  color: var(--color-text-secondary);
`;

/**
 * Profile page component with user information and settings
 */
const Profile: React.FC = React.memo(() => {
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Handle profile errors
  const handleError = useCallback(
    (error: Error) => {
      const errorMessage = error?.message || 'An unexpected error occurred';
      setError(errorMessage);
      
      try {
        analytics.track('profile_error', {
          error: errorMessage,
          userId: user?.id,
          timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        });
      } catch (analyticsError) {
        console.error('Failed to track error:', analyticsError);
      }
    },
    [user]
  );

  // Show loading state
  if (isLoading) {
    return (
      <PageContainer>
        <LoadingContainer role="status" aria-live="polite">
          <LoadingSpinner size="48px" color="var(--color-primary)" />
          <span>Loading...</span>
        </LoadingContainer>
      </PageContainer>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PageContainer role="main" aria-labelledby="profile-title">
      {/* Page Header */}
      <PageHeader>
        <PageTitle id="profile-title">
          My Profile
        </PageTitle>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <ErrorContainer role="alert" aria-live="polite">
          <ErrorIcon />
          <span>{error}</span>
        </ErrorContainer>
      )}

      {/* Profile Content */}
      <ContentContainer elevation="medium">
        <UserSettings className="profile-content" onError={handleError} />
      </ContentContainer>
    </PageContainer>
  );
});

// Display name for debugging
Profile.displayName = 'Profile';

export default Profile; 