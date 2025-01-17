import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.0.0
import { useMetrics } from '../../hooks/useMetrics';
import { ProfileMenu } from '../user/ProfileMenu';
import { Button } from '../common/Button';
import ErrorBoundary from '../common/ErrorBoundary';
import logo from '../../assets/images/logo.svg';
import '../../styles/theme.css';

interface HeaderProps {
  className?: string;
  testId?: string;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ 
  className = '',
  testId = 'main-header',
  onThemeChange
}) => {
  const navigate = useNavigate();
  const { loading } = useMetrics();

  // Handle logo click navigation
  const handleLogoClick = useCallback((
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    event.preventDefault();
    if (event.type === 'keydown' && (event as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    navigate('/dashboard');
  }, [navigate]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyboardNav = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.key) {
          case 'm':
            navigate('/metrics');
            break;
          case 'b':
            navigate('/benchmarks');
            break;
          case 'p':
            navigate('/profile');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardNav);
    return () => window.removeEventListener('keydown', handleKeyboardNav);
  }, [navigate]);

  return (
    <ErrorBoundary>
      <header
        className={`header ${className}`}
        data-testid={testId}
        role="banner"
        aria-label="Main navigation"
      >
        <div className="logo-section">
          <div
            role="button"
            tabIndex={0}
            onClick={handleLogoClick}
            onKeyDown={handleLogoClick}
            className="logo-container"
            aria-label="Go to dashboard"
          >
            <img
              src={logo}
              alt="Startup Metrics Benchmarking Platform"
              className="logo"
              width="200"
              height="48"
            />
          </div>
        </div>

        <div className="nav-controls">
          {!loading && (
            <Button
              variant="text"
              size="small"
              onClick={() => onThemeChange('dark')}
              ariaLabel="Toggle dark mode"
              className="theme-toggle"
            >
              <span className="sr-only">Toggle theme</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 2v16M2 10h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Button>
          )}

          <ProfileMenu
            className="profile-menu"
            ariaLabel="User menu"
            testId="header-profile-menu"
          />
        </div>

        <style>
          {`
          .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: var(--header-height);
            background-color: var(--color-background);
            border-bottom: 1px solid var(--border-color-light);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 var(--spacing-lg);
            z-index: var(--z-index-fixed);
            box-shadow: var(--shadow-sm);
          }

          .logo-section {
            display: flex;
            align-items: center;
          }

          .logo-container {
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: var(--spacing-sm);
            border-radius: var(--border-radius-sm);
            transition: background-color var(--transition-fast);
          }

          .logo-container:hover {
            background-color: var(--color-primary-light);
          }

          .logo-container:focus-visible {
            outline: var(--focus-ring-width) solid var(--focus-ring-color);
            outline-offset: var(--focus-ring-offset);
          }

          .logo {
            height: 32px;
            width: auto;
            user-select: none;
          }

          .nav-controls {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
          }

          .theme-toggle {
            padding: var(--spacing-sm);
            border-radius: var(--border-radius-full);
          }

          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }

          @media (max-width: 768px) {
            .header {
              height: 56px;
              padding: 0 var(--spacing-md);
            }

            .logo {
              height: 24px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .logo-container,
            .theme-toggle {
              transition: none;
            }
          }
          `}
        </style>
      </header>
    </ErrorBoundary>
  );
});

Header.displayName = 'Header';

export default Header;