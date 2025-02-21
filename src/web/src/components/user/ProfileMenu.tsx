/**
 * Enhanced Profile Menu Component
 * Implements secure user profile management and session control with Google OAuth integration
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, MenuItem, IconButton, Avatar, ListItemIcon, ListItemText } from '@mui/material';
import { Settings as SettingsIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';
import { Analytics } from '@segment/analytics-next';
import styles from './ProfileMenu.module.css';
import { AxiosError } from 'axios';
import { TIMING_CONFIG } from '../../constants/timing';

// Initialize Segment Analytics
const analytics = new Analytics({
  writeKey: import.meta.env.VITE_SEGMENT_WRITE_KEY || '',
});

interface ProfileMenuProps {
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  className = '',
  ariaLabel = 'User menu',
  testId = 'profile-menu'
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [inactivityWarningMessage, setInactivityWarningMessage] = useState<string>(
    'Your session is about to expire due to inactivity.'
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/login');
    handleClose();
  }, [dispatch, navigate]);

  const handleSettings = useCallback(() => {
    navigate('/settings');
    handleClose();
  }, [navigate]);

  // Track user activity
  const updateLastActivity = useCallback(() => {
    setShowInactivityWarning(false);
    setRefreshAttempts(0);
  }, []);

  // Handle session monitoring
  // React.useEffect(() => {
  //   const checkSession = async () => {
  //     if (!user) return;

  //     const inactivityTime = Date.now() - lastActivityRef.current;
  //     if (inactivityTime >= TIMING_CONFIG.SESSION.INACTIVITY_WARNING_MS) {
  //       setShowInactivityWarning(true);
  //     }
  //   };

  //   const sessionInterval = setInterval(checkSession, TIMING_CONFIG.SESSION.CHECK_INTERVAL_MS);
  //   return () => clearInterval(sessionInterval);
  // }, [user]);

  // Handle token refresh with retry logic
  const handleTokenRefresh = async () => {
    if (!user) return;

    try {
      // await refreshToken();
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

  if (!user) return null;

  return (
    <div className={className} data-testid={testId}>
      <IconButton
        onClick={handleClick}
        aria-controls="profile-menu"
        aria-haspopup="true"
        aria-expanded={Boolean(anchorEl)}
        aria-label={ariaLabel}
        sx={{
          '&:hover': {
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
          }
        }}
      >
        <Avatar
          alt={user.name}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.main',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>

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
};

export default ProfileMenu;
