/**
 * Protected Route Component
 * Implements secure route protection with comprehensive authentication,
 * authorization, and role-based access control
 * @version 1.0.0
 */

import React, { FC, PropsWithChildren, useEffect, memo, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { theme } from '../../config/theme';

// Route constants
const LOGIN_ROUTE = '/login';
const DASHBOARD_ROUTE = '/dashboard';
const DEFAULT_REDIRECT = '/unauthorized';

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
    const { isAuthenticated, isLoading, user, validateSession } = useAuth();
    const validationTimeoutRef = useRef<NodeJS.Timeout>();
    const lastValidationRef = useRef<number>(0);

    // Validate session only on mount and with debouncing
    useEffect(() => {
      let mounted = true;

      const validateAuth = async () => {
        if (!isAuthenticated || !mounted) return;

        // Implement debouncing
        const now = Date.now();
        if (now - lastValidationRef.current < 5000) { // 5 second debounce
          return;
        }
        lastValidationRef.current = now;

        try {
          await validateSession();
        } catch (error) {
          console.error('Session validation failed:', error);
        }
      };

      // Add slight delay to prevent race conditions with other components
      validationTimeoutRef.current = setTimeout(validateAuth, 1500);

      return () => {
        mounted = false;
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      };
    }, []); // Only run on mount

    // Show loading spinner while authenticating
    if (isLoading) {
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
    if (!isAuthenticated) {
      return <Navigate to={LOGIN_ROUTE} replace />;
    }

    // Check role-based access
    if (!validateUserRole(user?.role, allowedRoles)) {
      return <Navigate to={redirectPath} replace />;
    }

    // Render children or outlet
    return children ? <>{children}</> : <Outlet />;
  }
);

// Display name for debugging
ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
