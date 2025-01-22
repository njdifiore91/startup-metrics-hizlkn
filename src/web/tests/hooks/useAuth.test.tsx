import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { AuthService } from '../../src/services/auth';
import { useAuth } from '../../src/hooks/useAuth';
import authReducer, { SessionStatus, AuthError, UserPreferences } from '../../src/store/authSlice';
import type { IUser } from '../../src/interfaces/IUser';
import { USER_ROLES } from '../../src/config/constants';
import React, { ReactNode } from 'react';

// Mock AuthService
jest.mock('../../src/services/auth');

// Test constants
const mockUserPreferences: UserPreferences = {
  theme: 'light',
  language: 'en',
  notifications: {
    email: true,
    browser: true,
    security: true,
  },
  twoFactorEnabled: false,
};

const mockUser: IUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: USER_ROLES.USER,
  googleId: 'test-google-id',
  createdAt: new Date(),
  lastLoginAt: new Date(),
  isActive: true,
  preferences: mockUserPreferences,
  permissions: [],
};

const mockAuthResponse = {
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser,
  expiresAt: Date.now() + 3600000, // 1 hour from now
  sessionId: 'test-session-id',
};

// Create mock store
const createMockStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
  });

const Wrapper = ({ children }: { children: ReactNode }) => {
  const store = createMockStore();
  return <Provider store={store}>{children}</Provider>;
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup AuthService mock implementations
    jest
      .spyOn(AuthService.prototype, 'initializeGoogleAuth')
      .mockImplementation(() => Promise.resolve());
    jest
      .spyOn(AuthService.prototype, 'loginWithGoogle')
      .mockImplementation(() => Promise.resolve(mockAuthResponse));
    jest.spyOn(AuthService.prototype, 'logout').mockImplementation(() => Promise.resolve());
    jest
      .spyOn(AuthService.prototype, 'refreshAuthToken')
      .mockImplementation(() => Promise.resolve('new-token'));
    jest
      .spyOn(AuthService.prototype, 'validateSession')
      .mockImplementation(() => Promise.resolve(true));
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // Test successful login flow
  it('should handle successful login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  // Test login error handling
  it('should handle login failure', async () => {
    const mockError: AuthError = {
      code: 'AUTH_ERROR',
      message: 'Login failed',
      details: {},
    };

    jest
      .spyOn(AuthService.prototype, 'loginWithGoogle')
      .mockImplementation(() => Promise.reject(mockError));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
