/**
 * Protected Route Component
 * Implements secure route protection with comprehensive authentication,
 * authorization, and role-based access control
 * @version 1.0.0
 */

import React, { FC, PropsWithChildren, useEffect, memo, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { theme } from '../../config/theme';

// Route constants
const LOGIN_ROUTE = '/login';
const DEFAULT_REDIRECT = '/unauthorized';
const DASHBOARD_ROUTE = '/dashboard';

// Validation interval - Increased to reduce frequency of checks
const VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Valid user roles for the application
 */
export enum UserRole {
  USER = 'USER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

/**
 * Props interface for the ProtectedRoute component
 */
interface ProtectedRouteProps {
  /**
   * Optional array of roles that are permitted to access the route
   */
  allowedRoles?: string[];

  /**
   * Optional custom redirect path for unauthorized access
   */
  redirectPath?: string;
}

/**
 * Validates user role against allowed roles
 * @param userRole - Current user's role
 * @param allowedRoles - Array of permitted roles
 * @returns boolean indicating if user has permission
 */
const validateUserRole = (
  userRole: string | undefined,
  allowedRoles: string[] | undefined
): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Protected Route Component
 * Implements route protection with authentication and authorization checks
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = memo(
  ({ children, allowedRoles, redirectPath = DEFAULT_REDIRECT }) => {
    const { isAuthenticated, isLoading, user, validateSession, accessToken } = useAuth();
    const validationTimeoutRef = useRef<NodeJS.Timeout>();
    const lastValidationRef = useRef<number>(0);
    const location = useLocation();
    const isInitialMount = useRef(true);

    // Validate session with improved logic
    useEffect(() => {
      let mounted = true;

      const validateAuth = async () => {
        if (!mounted) return;

        const now = Date.now();
        // Skip validation if we're within the interval
        if (now - lastValidationRef.current < VALIDATION_INTERVAL) {
          return;
        }

        try {
          // Only validate if we have a token but need validation
          if (accessToken && (!user || !isAuthenticated)) {
            const isValid = await validateSession();
            if (mounted && isValid) {
              lastValidationRef.current = now;
            }
          } else if (user && isAuthenticated) {
            // If we're already authenticated, just update the timestamp
            lastValidationRef.current = now;
          }
        } catch (error) {
          console.error('Session validation failed:', error);
        }
      };

      // Only run validation on mount or when auth state changes
      if (isInitialMount.current || !lastValidationRef.current) {
        validateAuth();
        isInitialMount.current = false;
      }

      return () => {
        mounted = false;
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      };
    }, [isAuthenticated, user, validateSession, accessToken]);

    // Show loading spinner only during initial load
    if (isLoading && isInitialMount.current) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
          role="status"
          aria-label="Authenticating"
        >
          <LoadingSpinner
            size="48px"
            color={theme.colors.primary}
            thickness="4px"
            ariaLabel="Authenticating user"
          />
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      return <Navigate to={LOGIN_ROUTE} state={{ from: location }} replace />;
    }

    // Redirect to setup if not completed
    if (!user.setupCompleted && location.pathname !== '/setup') {
      return <Navigate to="/setup" replace />;
    }

    // Check role-based access
    if (!validateUserRole(user.role, allowedRoles)) {
      return <Navigate to={redirectPath} replace />;
    }

    // Render children or outlet
    return children ? <>{children}</> : <Outlet />;
  }
);

// Display name for debugging
ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
