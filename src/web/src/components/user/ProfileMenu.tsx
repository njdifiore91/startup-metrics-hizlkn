/**
 * Enhanced Profile Menu Component
 * Implements secure user profile management and session control with Google OAuth integration
 * @version 1.0.0
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Analytics } from '@segment/analytics-next';
import { useAuth } from '../../hooks/useAuth';
import styles from './ProfileMenu.module.css';
import { AxiosError } from 'axios';
import { TIMING_CONFIG } from '../../constants/timing';

// Initialize Segment Analytics
const analytics = new Analytics({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

export interface ProfileMenuProps {
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

/**
 * Enhanced profile menu component with security features and accessibility support
 */
const ProfileMenu = React.memo(({ 
  className = '', 
  ariaLabel = 'User profile menu', 
  testId = 'profile-menu' 
}: ProfileMenuProps): React.ReactElement | null => {
    const { user, logout, refreshToken, validateSession } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showInactivityWarning, setShowInactivityWarning] = React.useState(false);
    const [refreshAttempts, setRefreshAttempts] = React.useState(0);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const lastActivityRef = React.useRef<number>(Date.now());
    const [inactivityWarningMessage, setInactivityWarningMessage] = React.useState<string>(
      'Your session is about to expire due to inactivity.'
    );

    // Track user activity
    const updateLastActivity = React.useCallback(() => {
      lastActivityRef.current = Date.now();
      setShowInactivityWarning(false);
      setRefreshAttempts(0);
    }, []);

    // Handle session monitoring
    React.useEffect(() => {
      const checkSession = async () => {
        const isValid = await validateSession();
        if (!isValid) {
          handleLogout();
          return;
        }

        const inactivityTime = Date.now() - lastActivityRef.current;
        if (inactivityTime >= TIMING_CONFIG.SESSION.INACTIVITY_WARNING_MS) {
          setShowInactivityWarning(true);
        }
      };

      const sessionInterval = setInterval(checkSession, TIMING_CONFIG.SESSION.CHECK_INTERVAL_MS);
      return () => clearInterval(sessionInterval);
    }, [validateSession]);

    // Handle click outside menu
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle menu selection
    const handleMenuSelect = React.useCallback(
      async (action: string) => {
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
      },
      [navigate]
    );

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

    // Handle token refresh with retry logic
    const handleTokenRefresh = async () => {
      try {
        await refreshToken();
        setShowInactivityWarning(false);
        updateLastActivity();
        setRefreshAttempts(0);
        
        analytics.track('Session Refresh', {
          status: 'success',
          userId: user?.id
        });
      } catch (error) {
        console.error('Token refresh failed:', error);
        
        if (error instanceof AxiosError) {
          const errorCode = error.response?.data?.error?.code;
          const isAuthError = [401, 403].includes(error.response?.status || 0);
          const isTokenExpired = errorCode === 'AUTH_003' || error.response?.data?.error?.message?.includes('Token expired');

          if (isAuthError || isTokenExpired) {
            analytics.track('Session Expired', {
              userId: user?.id,
              reason: isTokenExpired ? 'token_expired' : 'auth_error'
            });
            
            await handleLogout();
            return;
          }
        }
        
        setRefreshAttempts(prev => prev + 1);
        
        if (refreshAttempts >= TIMING_CONFIG.SESSION.MAX_CONSECUTIVE_FAILURES) {
          setInactivityWarningMessage('Maximum refresh attempts reached. Please log in again.');
          await handleLogout();
          return;
        }
        
        setShowInactivityWarning(true);
        setInactivityWarningMessage(
          `Unable to refresh session. Click "Try Again" to retry. (Attempt ${refreshAttempts + 1}/${TIMING_CONFIG.SESSION.MAX_CONSECUTIVE_FAILURES})`
        );
        
        analytics.track('Session Refresh', {
          status: 'failed',
          userId: user?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt: refreshAttempts + 1
        });
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
          <div className={styles.menu} role="menu" aria-orientation="vertical">
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
          <div className={styles.inactivityWarning} role="alert" aria-live="polite">
            <p>{inactivityWarningMessage}</p>
            <button 
              onClick={handleTokenRefresh} 
              className={styles.refreshButton}
              disabled={refreshAttempts >= TIMING_CONFIG.SESSION.MAX_CONSECUTIVE_FAILURES}
            >
              {inactivityWarningMessage.includes('Unable to refresh') ? 'Try Again' : 'Stay Connected'}
            </button>
          </div>
        )}
      </div>
    );
  });

ProfileMenu.displayName = 'ProfileMenu';

export default ProfileMenu;
