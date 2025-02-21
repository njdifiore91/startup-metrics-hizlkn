import React, { useCallback, useEffect, memo, useState, useRef } from 'react';
import styled from '@emotion/styled';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { useToast, ToastType, ToastPosition } from '../../hooks/useToast';
import { useLocation, useNavigate } from 'react-router-dom';
import { RootState } from '../../store';
import { toggleSidebar } from '../../store/uiSlice';

// Layout Props Interface
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'ltr' | 'rtl';
}

// Styled Components
const LayoutContainer = styled.div<{ direction: 'ltr' | 'rtl' }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text);
  direction: ${(props) => props.direction};
  position: relative;
  overflow-x: hidden;
`;

const MainContent = styled.main<{ isLoginPage?: boolean }>`
  flex: 1;
  margin-top: 64px;
  padding: var(--spacing-lg);
  transition: margin-inline-start 0.3s ease;
  position: relative;
  background-color: var(--color-background-light);
  min-height: calc(100vh - 128px);

  @media (max-width: 768px) {
    padding: var(--spacing-md);
  }
`;

const SkipLink = styled.a`
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--color-primary);
  color: white;
  padding: 8px;
  z-index: 100;
  transition: top 0.3s;

  &:focus {
    top: 0;
  }
`;

// Layout Component
const Layout: React.FC<LayoutProps> = memo(({ children, className = '', direction = 'ltr' }) => {
  const dispatch = useDispatch();
  const { validateSession, user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';
  const isSetupPage = location.pathname === '/setup';
  const shouldShowSidebar = !isLoginPage && !isSetupPage && user?.setupCompleted;
  const sessionCheckRef = useRef<NodeJS.Timeout>();
  const lastValidationRef = useRef<number>(0);
  const validationInProgressRef = useRef<boolean>(false);
  
  const isSidebarOpen = useSelector((state: RootState) => state.ui.isSidebarOpen);

  // Session Monitoring with reduced frequency and debouncing
  useEffect(() => {
    const checkSession = async () => {
      // Prevent concurrent validations
      if (validationInProgressRef.current) {
        return;
      }

      // Implement debouncing
      const now = Date.now();
      if (now - lastValidationRef.current < 15 * 60 * 1000) { // 15 minute debounce
        return;
      }

      try {
        validationInProgressRef.current = true;
        lastValidationRef.current = now;
        
        const isValid = await validateSession();
        if (!isValid && !isLoginPage && !isSetupPage) {
          // Only redirect if we're not already on the login or setup page
          // and after multiple failed attempts
          if (!sessionCheckRef.current) {
            sessionCheckRef.current = setTimeout(() => {
              showToast(
                'Your session has expired. Please log in again.',
                ToastType.WARNING,
                ToastPosition.TOP_RIGHT
              );
              navigate('/login');
            }, 5000); // Give a 5-second delay before redirecting
          }
        } else if (isValid && sessionCheckRef.current) {
          // Clear the redirect timeout if the session becomes valid
          clearTimeout(sessionCheckRef.current);
          sessionCheckRef.current = undefined;
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        // Don't redirect on network errors or other transient failures
      } finally {
        validationInProgressRef.current = false;
      }
    };

    // Only set up validation for non-login pages
    if (!isLoginPage && !isSetupPage) {
      // Initial check with delay to prevent race conditions
      const initialCheckTimeout = setTimeout(checkSession, 2000);

      // Set up interval with longer duration (15 minutes)
      const intervalId = setInterval(checkSession, 15 * 60 * 1000);

      return () => {
        clearTimeout(initialCheckTimeout);
        if (sessionCheckRef.current) {
          clearTimeout(sessionCheckRef.current);
        }
        clearInterval(intervalId);
      };
    }
  }, [validateSession, showToast, isLoginPage, isSetupPage, navigate]);

  // Theme Change Handler
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('theme-dark', newTheme === 'dark');
  }, []);

  // Sidebar Toggle Handler
  const handleSidebarToggle = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  // Error Handler
  const handleError = useCallback((error: Error) => {
    showToast(error.message, ToastType.ERROR, ToastPosition.TOP_RIGHT);
  }, [showToast]);

  // Keyboard Navigation Handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.key) {
          case 'n': {
            const skipLink = document.querySelector('#skip-to-content') as HTMLElement | null;
            if (skipLink) {
              skipLink.focus();
            }
            break;
          }
          case 'm':
            handleSidebarToggle();
            break;
          default:
            break;
        }
      }
    },
    [handleSidebarToggle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle navigation based on user role
  const handleNavigation = useCallback((path: string) => {
    if (user?.role === 'ANALYST' && path === '/dashboard') {
      navigate('/analytics');
    } else if (user?.role === 'USER' && path === '/dashboard') {
      navigate('/company-dashboard');
    } else {
      navigate(path);
    }
  }, [user?.role, navigate]);

  return (
    <ErrorBoundary onError={handleError}>
      <LayoutContainer
        className={className}
        direction={direction}
        role="application"
        aria-label="Main application layout"
      >
        {/* Skip Navigation Link */}
        <SkipLink href="#main-content" id="skip-to-content" tabIndex={0}>
          Skip to main content
        </SkipLink>

        {/* Header Component */}
        <Header onThemeChange={handleThemeChange} testId="main-header" />

        {/* Sidebar Component */}
        {shouldShowSidebar && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggle={handleSidebarToggle}
            onNavigate={handleNavigation}
            onError={handleError}
            ariaLabel="Main navigation sidebar"
          />
        )}

        {/* Main Content Area */}
        <MainContent
          id="main-content"
          isLoginPage={isLoginPage}
          style={{
            marginLeft: shouldShowSidebar && isSidebarOpen ? '250px' : '0',
            transition: 'margin-left 0.3s ease'
          }}
        >
          <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>
        </MainContent>

        {/* Footer Component */}
        <Footer />
      </LayoutContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
Layout.displayName = 'Layout';

export type { LayoutProps };
export default Layout;
