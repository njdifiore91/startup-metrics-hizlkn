import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { handleGoogleCallback } from '../services/auth';
import { setCredentials } from '../store/authSlice';
import { Box, CircularProgress, Typography } from '@mui/material';

export const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isProcessing = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');

        if (!code) {
          throw new Error('No authorization code received');
        }

        const response = await handleGoogleCallback(code);
        console.log('Google callback response:', response);

        if (!response || !response.user) {
          throw new Error('Invalid response from server');
        }

        // Update Redux store with user and tokens
        dispatch(setCredentials({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        }));

        // Redirect based on setup status
        if (!response.user.setupCompleted) {
          navigate('/setup', { replace: true });
        } else {
          navigate(response.user.role === 'ANALYST' ? '/analytics' : '/company-dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Failed to handle Google callback:', error);
        navigate('/login', { 
          replace: true,
          state: { 
            error: error instanceof Error ? error.message : 'Authentication failed'
          }
        });
      }
    };

    processCallback();
  }, [location.search, navigate, dispatch]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
    >
      <CircularProgress size={48} />
      <Typography variant="body1" sx={{ mt: 2 }}>
        Completing sign in...
      </Typography>
    </Box>
  );
};

export default GoogleCallback; 