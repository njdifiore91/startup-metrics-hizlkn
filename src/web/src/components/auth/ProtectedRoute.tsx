/**
 * Protected Route Component
 * Implements secure route protection with comprehensive authentication,
 * authorization, and role-based access control
 * @version 1.0.0
 */

import React, { FC, PropsWithChildren, useEffect, memo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';
import { theme } from '../../config/theme';

// Route constants
const LOGIN_ROUTE = '/login';
const DEFAULT_REDIRECT = '/unauthorized';

/**
 * Valid user roles for the application
 */
export enum UserRole {
  USER = 'USER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM'
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
const validateUserRole = (userRole: string | undefined, allowedRoles: string[] | undefined): boolean => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Protected Route Component
 * Implements route protection with authentication and authorization checks
 */
const ProtectedRoute: FC<PropsWithChildren<ProtectedRouteProps>> = memo(({
  children,
  allowedRoles,
  redirectPath = DEFAULT_REDIRECT
}) => {
  const {
    isAuthenticated,
    isLoading,
    user,
    validateSession
  } = useAuth();

  // Validate session on mount and when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      validateSession();
    }
  }, [isAuthenticated, validateSession]);

  // Show loading spinner while authenticating
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
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
    return (
      <Navigate
        to={LOGIN_ROUTE}
        replace
        state={{ from: window.location.pathname }}
      />
    );
  }

  // Check role-based access if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = validateUserRole(user?.role, allowedRoles);
    
    if (!hasPermission) {
      return (
        <Navigate
          to={redirectPath}
          replace
          state={{ from: window.location.pathname }}
        />
      );
    }
  }

  // Render protected content
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
});

// Display name for debugging
ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;