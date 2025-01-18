/**
 * UserSettings Component
 * Provides comprehensive user settings management with role-based access control
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../common/Card';

// Interfaces
interface UserSettingsProps {
  className?: string;
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
      security: true
    },
    twoFactorEnabled: false
  });
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Format last login date with localization
  const formatLastLogin = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat(preferences.language, {
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(date);
  }, [preferences.language]);

  // Handle preference updates
  const handlePreferenceChange = useCallback((
    key: keyof UserPreferences,
    value: any
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await updateUserSettings({
        userId: user?.id,
        preferences
      });
      setIsEditing(false);
    } catch (error: any) {
      setErrors({
        submit: error.message || t('settings.error.updateFailed')
      });
    }
  };

  // Handle 2FA toggle with security confirmation
  const handle2FAToggle = async () => {
    if (!preferences.twoFactorEnabled) {
      const confirmed = window.confirm(t('settings.2fa.enableConfirmation') || '');
      if (confirmed) {
        handlePreferenceChange('twoFactorEnabled', true);
      }
    } else {
      const confirmed = window.confirm(t('settings.2fa.disableWarning') || '');
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
      {/* Profile Section */}
      <Card
        elevation="medium"
        className="user-settings__section"
        aria-label={t('settings.profile.title')}
      >
        <h2>{t('settings.profile.title')}</h2>
        <div className="user-settings__field">
          <label>{t('settings.profile.email')}</label>
          <div className="user-settings__value">{user.email}</div>
        </div>
        <div className="user-settings__field">
          <label>{t('settings.profile.name')}</label>
          <div className="user-settings__value">{user.name}</div>
        </div>
        <div className="user-settings__field">
          <label>{t('settings.profile.lastLogin')}</label>
          <div className="user-settings__value">
            {formatLastLogin(user.lastLoginAt)}
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card
        elevation="medium"
        className="user-settings__section"
        aria-label={t('settings.security.title')}
      >
        <h2>{t('settings.security.title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="user-settings__field">
            <label htmlFor="twoFactor">
              {t('settings.security.2fa')}
            </label>
            <div className="user-settings__toggle">
              <input
                type="checkbox"
                id="twoFactor"
                checked={preferences.twoFactorEnabled}
                onChange={handle2FAToggle}
                aria-describedby="twoFactorDescription"
              />
              <span id="twoFactorDescription" className="user-settings__description">
                {t('settings.security.2faDescription')}
              </span>
            </div>
          </div>
        </form>
      </Card>

      {/* Preferences Section */}
      <Card
        elevation="medium"
        className="user-settings__section"
        aria-label={t('settings.preferences.title')}
      >
        <h2>{t('settings.preferences.title')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="user-settings__field">
            <label htmlFor="theme">{t('settings.preferences.theme')}</label>
            <select
              id="theme"
              value={preferences.theme}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
            >
              <option value="light">{t('settings.preferences.themeLight')}</option>
              <option value="dark">{t('settings.preferences.themeDark')}</option>
              <option value="system">{t('settings.preferences.themeSystem')}</option>
            </select>
          </div>

          <div className="user-settings__field">
            <label htmlFor="language">{t('settings.preferences.language')}</label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="user-settings__field">
            <label>{t('settings.preferences.notifications')}</label>
            <div className="user-settings__checkboxes">
              {Object.keys(preferences.notifications).map(key => (
                <label key={key} className="user-settings__checkbox">
                  <input
                    type="checkbox"
                    checked={preferences.notifications[key as keyof typeof preferences.notifications]}
                    onChange={(e) => handlePreferenceChange('notifications', {
                      ...preferences.notifications,
                      [key]: e.target.checked
                    })}
                  />
                  {t(`settings.preferences.notifications.${key}`)}
                </label>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="user-settings__error" role="alert">
              {errors.submit}
            </div>
          )}

          <div className="user-settings__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={!isEditing}
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={logout}
            >
              {t('common.logout')}
            </button>
          </div>
        </form>
      </Card>

      {/* Session Warning Modal */}
      {showSessionWarning && (
        <div
          className="user-settings__warning"
          role="alertdialog"
          aria-labelledby="sessionWarningTitle"
        >
          <h3 id="sessionWarningTitle">{t('settings.session.warningTitle')}</h3>
          <p>{t('settings.session.warningMessage')}</p>
          <button onClick={() => setShowSessionWarning(false)}>
            {t('common.continue')}
          </button>
        </div>
      )}
    </div>
  );
});

UserSettings.displayName = 'UserSettings';

export type { UserSettingsProps, UserPreferences };
export { UserSettings };