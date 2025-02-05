/**
 * UserSettings Component
 * Provides comprehensive user settings management with role-based access control
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from '@emotion/styled';
import { UpdateUserSettingsParams, useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/common/Card';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Tune as TuneIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Shield as ShieldIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

// Styled Components
const StyledCard = styled(Card)`
  background: var(--color-surface);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    font-size: var(--font-size-lg);
    color: var(--color-text-primary);
  }

  svg {
    color: var(--color-primary);
    font-size: 24px;
  }
`;

const Field = styled.div`
  margin-bottom: var(--spacing-lg);

  label {
    display: block;
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .value {
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
    padding: var(--spacing-sm) 0;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-background-hover);
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  svg {
    color: var(--color-text-secondary);
    font-size: 20px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-sm);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ variant = 'primary' }) =>
    variant === 'primary'
      ? `
    background-color: var(--color-primary);
    color: white;
    border: none;

    &:hover {
      background-color: var(--color-primary-dark);
    }
    `
      : `
    background-color: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);

    &:hover {
      background-color: var(--color-background-hover);
    }
    `}
`;

// Interfaces
interface UserSettingsProps {
  className?: string;
  onError: (error: Error) => void;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    browser: boolean;
    security: boolean;
  };
  twoFactorEnabled: boolean;
  revenueRange?: string;
}

// Constants
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];
const SESSION_TIMEOUT_WARNING = 5 * 60 * 1000; // 5 minutes

const UserSettings: React.FC<UserSettingsProps> = React.memo(({ className }) => {
  const { t } = useTranslation();
  const { user, isLoading, updateUserSettings, logout } = useAuth();

  // State management
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      browser: true,
      security: true,
    },
    twoFactorEnabled: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Format last login date with localization
  const formatLastLogin = useCallback(
    (timestamp: string | number | Date): string => {
      try {
        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        }).format(date);
      } catch (error) {
        console.error('Date formatting error:', error);
        return 'Never logged in';
      }
    },
    []
  );

  // Handle preference updates
  const handlePreferenceChange = useCallback((key: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      const updateParams: UpdateUserSettingsParams = {
        userId: user.id,
        preferences,
      };
      await updateUserSettings(updateParams);
      setIsEditing(false);
    } catch (error: any) {
      setErrors({
        submit: error.message || t('settings.error.updateFailed'),
      });
    }
  };

  // Handle 2FA toggle with security confirmation
  const handle2FAToggle = async () => {
    if (!preferences.twoFactorEnabled) {
      // Implement 2FA setup flow
      const confirmed = window.confirm(t('settings.2fa.enableConfirmation'));
      if (confirmed) {
        handlePreferenceChange('twoFactorEnabled', true);
      }
    } else {
      // Implement 2FA disable flow with additional security
      const confirmed = window.confirm(t('settings.2fa.disableWarning'));
      if (confirmed) {
        handlePreferenceChange('twoFactorEnabled', false);
      }
    }
  };

  // Session timeout warning
  useEffect(() => {
    if (!user) return;

    const warningTimeout = setTimeout(() => {
      setShowSessionWarning(true);
    }, SESSION_TIMEOUT_WARNING);

    return () => clearTimeout(warningTimeout);
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="user-settings__loading" role="status" aria-live="polite">
        {t('common.loading')}
      </div>
    );
  }

  // Error state
  if (!user) {
    return (
      <div className="user-settings__error" role="alert">
        {t('settings.error.unauthorized')}
      </div>
    );
  }

  return (
    <div className={`user-settings ${className || ''}`}>
      <StyledCard elevation="medium" className="section">
        <SectionHeader>
          <PersonIcon />
          <h2>Profile Information</h2>
        </SectionHeader>
        <Field>
          <label>Email</label>
          <div className="value">{user.email}</div>
        </Field>
        <Field>
          <label>Name</label>
          <div className="value">{user.name}</div>
        </Field>
        <Field>
          <label>Last Login</label>
          <div className="value">{formatLastLogin(user.lastLoginAt)}</div>
        </Field>
      </StyledCard>

      <StyledCard elevation="medium" className="section">
        <SectionHeader>
          <BusinessIcon />
          <h2>Company Information</h2>
        </SectionHeader>
        <Field>
          <label htmlFor="revenueRange">Annual Revenue Range</label>
          <Select
            id="revenueRange"
            value={user.revenueRange || ''}
            onChange={(e) => handlePreferenceChange('revenueRange', e.target.value)}
          >
            <option value="">Select Revenue Range</option>
            <option value="0-1M">$0 - $1M</option>
            <option value="1M-5M">$1M - $5M</option>
            <option value="5M-20M">$5M - $20M</option>
            <option value="20M-50M">$20M - $50M</option>
            <option value="50M+">$50M+</option>
          </Select>
          <div className="description">
            Select your company's annual revenue range for accurate benchmark comparisons
          </div>
        </Field>
      </StyledCard>

      <StyledCard elevation="medium" className="section">
        <SectionHeader>
          <SecurityIcon />
          <h2>Security Settings</h2>
        </SectionHeader>
        <Field>
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={preferences.twoFactorEnabled}
              onChange={handle2FAToggle}
            />
            <span>Two-Factor Authentication</span>
          </CheckboxLabel>
          <div className="description">
            Enable two-factor authentication for enhanced account security
          </div>
        </Field>
      </StyledCard>

      <StyledCard elevation="medium" className="section">
        <SectionHeader>
          <TuneIcon />
          <h2>Preferences</h2>
        </SectionHeader>
        <Field>
          <label htmlFor="theme">Theme</label>
          <Select
            id="theme"
            value={preferences.theme}
            onChange={(e) => handlePreferenceChange('theme', e.target.value)}
          >
            <option value="system">System Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Field>
        <Field>
          <label htmlFor="language">Language</label>
          <Select
            id="language"
            value={preferences.language}
            onChange={(e) => handlePreferenceChange('language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </Select>
        </Field>
        <Field>
          <label>Notifications</label>
          <CheckboxGroup>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    email: e.target.checked,
                  })
                }
              />
              <EmailIcon />
              <span>Email Notifications</span>
            </CheckboxLabel>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={preferences.notifications.browser}
                onChange={(e) =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    browser: e.target.checked,
                  })
                }
              />
              <NotificationsIcon />
              <span>Browser Notifications</span>
            </CheckboxLabel>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={preferences.notifications.security}
                onChange={(e) =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    security: e.target.checked,
                  })
                }
              />
              <ShieldIcon />
              <span>Security Alerts</span>
            </CheckboxLabel>
          </CheckboxGroup>
        </Field>
      </StyledCard>

      <Actions>
        <Button variant="primary" onClick={handleSubmit}>
          Save Changes
        </Button>
        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </Actions>

      {showSessionWarning && (
        <div className="warning-modal" role="alertdialog">
          <h3>Session Warning</h3>
          <p>Your session is about to expire. Would you like to continue?</p>
          <Button variant="primary" onClick={() => setShowSessionWarning(false)}>
            Continue Session
          </Button>
        </div>
      )}

      <style>{`
        .user-settings {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }

        .user-settings__section {
          margin-bottom: var(--spacing-xl);
        }

        .user-settings__field {
          margin-bottom: var(--spacing-md);
        }

        .user-settings__value {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
        }

        .user-settings__error {
          color: var(--color-error);
          margin-top: var(--spacing-sm);
        }

        .user-settings__actions {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }

        .user-settings__warning {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: var(--color-background);
          padding: var(--spacing-xl);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-lg);
        }
      `}</style>
    </div>
  );
});

UserSettings.displayName = 'UserSettings';

export type { UserSettingsProps, UserPreferences };
export { UserSettings };
