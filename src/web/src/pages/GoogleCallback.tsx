import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authService } from '../services/auth';
import { authActions } from '../store/authSlice';

export const GoogleCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (isProcessing.current) {
        return;
      }

      try {
        isProcessing.current = true;
        
        // Get the code from URL parameters using location.search
        const searchParams = new URLSearchParams(location.search);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        
        // Check for error from Google
        const error = searchParams.get('error');
        if (error) {
          console.error('Google OAuth error:', error);
          const errorDescription = searchParams.get('error_description');
          throw new Error(errorDescription || 'Google authentication failed');
        }

        const code = searchParams.get('code');
        if (!code) {
          console.error('No authorization code received from Google');
          throw new Error('No authorization code received');
        }

        console.log('Received authorization code:', code);

        // Exchange code for tokens
        const response = await authService.handleGoogleCallback(code);
        console.log('Token exchange successful');
        
        // Update Redux store
        dispatch(authActions.setUser(response.user));
        dispatch(authActions.setTokens({
          token: response.token,
          refreshToken: response.refreshToken,
          expiration: new Date(response.expiresAt)
        }));

        // Clear the URL parameters
        window.history.replaceState({}, document.title, '/auth/google/callback');
        
        // Redirect to dashboard
        navigate('/dashboard', { replace: true });
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

    handleCallback();
  }, [location.search, navigate, dispatch]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default GoogleCallback; 