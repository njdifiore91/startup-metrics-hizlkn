/**
 * Settings Page Component
 * Provides secure, role-based interface for managing user preferences and account settings
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Analytics } from 'analytics';
import Layout from '../components/layout/Layout';
import { UserSettings } from '../components/user/UserSettings';
import { useAuth } from '../hooks/useAuth';

// Analytics configuration
const analytics = Analytics({
  app: 'startup-metrics-platform',
  version: '1.0.0',
  debug: import.meta.env.NODE_ENV === 'development',
});

type StylesType = {
  [key: string]: React.CSSProperties;
};

interface AnalyticsEvent {
  page: string;
  userId?: string;
  timestamp: string;
  error?: string;
}

// Styles for the settings page
const styles: StylesType = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'var(--spacing-lg)',
    position: 'relative' as const,
  },
  header: {
    marginBottom: 'var(--spacing-xl)',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 'var(--spacing-md)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-text-primary)',
    margin: 0,
  },
  errorContainer: {
    backgroundColor: 'var(--color-error-bg)',
    padding: 'var(--spacing-md)',
    borderRadius: 'var(--border-radius-md)',
    marginBottom: 'var(--spacing-lg)',
  },
};

/**
 * Settings page component with enhanced security and role-based access
 */
const Settings: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { user, isLoading, validateSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);

  // Track page view
  useEffect(() => {
    const trackPageView = async () => {
      try {
        await analytics.track('page_view', {
          page: 'settings',
          userId: user?.id,
          timestamp: new Date().toISOString(),
        } satisfies AnalyticsEvent);
      } catch (err) {
        console.error('Failed to track page view:', err);
      }
    };

    trackPageView();
  }, [user]);

  // Validate session on mount and periodically
  useEffect(() => {
    const checkSession = async () => {
      try {
        const isValid = await validateSession();
        setIsSessionValid(isValid);
        if (!isValid) {
          setError(t('settings.error.sessionExpired'));
        }
      } catch (err) {
        setError(t('settings.error.validationFailed'));
        setIsSessionValid(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [validateSession, t]);

  // Handle settings errors
  const handleError = useCallback(
    (error: Error) => {
      setError(error.message);
      analytics.track('settings_error', {
        error: error.message,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
    },
    [user]
  );

  // Redirect to login if session is invalid
  if (!isSessionValid) {
    return <Navigate to="/login" replace />;
  }

  // Show loading state
  if (isLoading) {
    return (
      <Layout>
        <div style={styles.container}>
          <div role="status" aria-live="polite">
            {t('common.loading')}
          </div>
        </div>
      </Layout>
    );
  }

  // Show error if user is not authenticated
  if (!user) {
    return (
      <Layout>
        <div style={styles.container}>
          <div role="alert" style={styles.errorContainer}>
            {t('settings.error.unauthorized')}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container} role="main" aria-labelledby="settings-title">
        {/* Page Header */}
        <header style={styles.header}>
          <h1 id="settings-title" style={styles.title}>
            {t('settings.title')}
          </h1>
        </header>

        {/* Error Display */}
        {error && (
          <div role="alert" style={styles.errorContainer} aria-live="polite">
            {error}
          </div>
        )}

        {/* Settings Content */}
        <UserSettings className="settings-content" onError={handleError} />
      </div>
    </Layout>
  );
});

// Display name for debugging
Settings.displayName = 'Settings';

export default Settings;
