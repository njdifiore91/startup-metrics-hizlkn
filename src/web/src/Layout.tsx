import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const { validateSession, isLoading } = useAuth();
  const [isSessionValid, setIsSessionValid] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const isValid = await validateSession();
      setIsSessionValid(isValid);
    } catch (error) {
      console.error('Session check failed:', error);
      setIsSessionValid(false);
    }
  }, [validateSession]);

  useEffect(() => {
    checkSession();
    // Set up periodic session validation
    const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [checkSession]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isSessionValid) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Outlet />
    </div>
  );
};

export default Layout; 