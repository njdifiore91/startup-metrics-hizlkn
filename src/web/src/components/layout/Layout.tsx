import React, { useState, useCallback, useEffect, memo } from 'react';
import styled from '@emotion/styled';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { useToast, ToastType, ToastPosition } from '../../hooks/useToast';
import { useLocation } from 'react-router-dom';

// Layout Props Interface
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'ltr' | 'rtl';
}

type SessionStatus = 'valid' | 'invalid' | 'loading';

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

const MainContent = styled.main<{ sidebarOpen: boolean; isLoginPage?: boolean }>`
  flex: 1;
  margin-inline-start: ${(props) => (!props.isLoginPage ? (props.sidebarOpen ? '240px' : '64px') : '0')};
  margin-top: 64px;
  padding: var(--spacing-lg);
  transition: margin-inline-start 0.3s ease;
  position: relative;
  background-color: var(--color-background-light);
  min-height: calc(100vh - 128px);

  @media (max-width: 768px) {
    margin-inline-start: 0;
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
  // State Management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { validateSession, sessionStatus } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { showToast } = useToast();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Session Monitoring
  useEffect(() => {
    const checkSession = async () => {
      try {
        const isValid = await validateSession();
        if (!isValid) {
          showToast(
            'Your session has expired. Please log in again.',
            ToastType.WARNING,
            ToastPosition.TOP_RIGHT
          );
        }
      } catch (error) {
        console.error('Session validation failed:', error);
      }
    };

    const sessionInterval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(sessionInterval);
  }, [validateSession]);

  // Theme Change Handler
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('theme-dark', newTheme === 'dark');
  }, []);

  // Sidebar Toggle Handler
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Error Handler
  const handleError = useCallback((error: Error) => {
    showToast(error.message, ToastType.ERROR, ToastPosition.TOP_RIGHT);
  }, []);

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
            toggleSidebar();
            break;
          default:
            break;
        }
      }
    },
    [toggleSidebar]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        {!isLoginPage && (
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            onError={handleError}
            ariaLabel="Main navigation sidebar"
          />
        )}

        {/* Main Content Area */}
        <MainContent
          id="main-content"
          sidebarOpen={sidebarOpen}
          isLoginPage={isLoginPage}
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>
        </MainContent>

        {/* Footer Component */}
        <Footer
          ariaLabel="Site footer"
          links={[
            { id: 'privacy', label: 'Privacy Policy', href: '/privacy' },
            { id: 'terms', label: 'Terms of Service', href: '/terms' },
            { id: 'contact', label: 'Contact Us', href: '/contact' },
          ]}
        />
      </LayoutContainer>
    </ErrorBoundary>
  );
});

// Display name for debugging
Layout.displayName = 'Layout';

export type { LayoutProps };
export default Layout;
