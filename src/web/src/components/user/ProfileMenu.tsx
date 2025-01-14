/**
 * Enhanced Profile Menu Component
 * Implements secure user profile management and session control with Google OAuth integration
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@segment/analytics-next';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './ProfileMenu.module.css';

// Constants for menu interactions
const SESSION_CHECK_INTERVAL = 60000; // 1 minute
const INACTIVITY_WARNING_THRESHOLD = 300000; // 5 minutes

export interface ProfileMenuProps {
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

/**
 * Enhanced profile menu component with security features and accessibility support
 */
const ProfileMenu: React.FC<ProfileMenuProps> = React.memo(({
  className = '',
  ariaLabel = 'User profile menu',
  testId = 'profile-menu'
}) => {
  const { user, logout, refreshToken, validateSession } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Track user activity
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
  }, []);

  // Handle session monitoring
  useEffect(() => {
    const checkSession = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        handleLogout();
      }

      const inactivityTime = Date.now() - lastActivityRef.current;
      if (inactivityTime >= INACTIVITY_WARNING_THRESHOLD) {
        setShowInactivityWarning(true);
      }
    };

    const sessionInterval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(sessionInterval);
  }, [validateSession]);

  // Handle click outside menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle menu selection
  const handleMenuSelect = useCallback(async (action: string) => {
    try {
      analytics.track('Profile Menu Action', { action });

      switch (action) {
        case 'profile':
          navigate('/profile');
          break;
        case 'settings':
          navigate('/settings');
          break;
        case 'logout':
          await handleLogout();
          break;
        default:
          console.warn('Unknown menu action:', action);
      }
    } catch (error) {
      console.error('Menu action failed:', error);
    } finally {
      setIsOpen(false);
    }
  }, [navigate]);

  // Handle secure logout
  const handleLogout = async () => {
    try {
      analytics.track('User Logout');
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle token refresh
  const handleTokenRefresh = async () => {
    try {
      await refreshToken();
      setShowInactivityWarning(false);
      updateLastActivity();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await handleLogout();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={`${styles.profileMenu} ${className}`}
      data-testid={testId}
      role="navigation"
      aria-label={ariaLabel}
    >
      <button
        className={styles.avatar}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Open profile menu"
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {isOpen && (
        <div
          className={styles.menu}
          role="menu"
          aria-orientation="vertical"
        >
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user.name}</div>
            <div className={styles.userEmail}>{user.email}</div>
          </div>

          <button
            className={styles.menuItem}
            onClick={() => handleMenuSelect('profile')}
            role="menuitem"
          >
            Profile
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleMenuSelect('settings')}
            role="menuitem"
          >
            Settings
          </button>

          <button
            className={styles.menuItem}
            onClick={() => handleMenuSelect('logout')}
            role="menuitem"
          >
            Logout
          </button>
        </div>
      )}

      {showInactivityWarning && (
        <div
          className={styles.inactivityWarning}
          role="alert"
          aria-live="polite"
        >
          <p>Your session is about to expire due to inactivity.</p>
          <button
            onClick={handleTokenRefresh}
            className={styles.refreshButton}
          >
            Stay Connected
          </button>
        </div>
      )}
    </div>
  );
});

ProfileMenu.displayName = 'ProfileMenu';

export default ProfileMenu;