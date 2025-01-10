import { renderHook, act } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { AuthService } from '../../src/services/auth';
import { useAuth } from '../../src/hooks/useAuth';
import authReducer, { SessionStatus, AuthError } from '../../src/store/authSlice';
import type { IUser } from '../../src/interfaces/IUser';

// Mock AuthService
jest.mock('../../src/services/auth');

// Test constants
const mockUser: IUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  googleId: 'test-google-id',
  createdAt: new Date(),
  lastLoginAt: new Date(),
  isActive: true
};

const mockAuthResponse = {
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser,
  expiresAt: Date.now() + 3600000, // 1 hour from now
  sessionId: 'test-session-id'
};

// Create mock store
const createMockStore = () => configureStore({
  reducer: {
    auth: authReducer
  }
});

describe('useAuth Hook', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Reset mocks and store before each test
    jest.clearAllMocks();
    mockStore = createMockStore();
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;

    // Setup AuthService mock implementations
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.initializeGoogleAuth = jest.fn();
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.loginWithGoogle = jest.fn().mockResolvedValue(mockAuthResponse);
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.logout = jest.fn().mockResolvedValue(undefined);
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.refreshAuthToken = jest.fn().mockResolvedValue('new-token');
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.validateSession = jest.fn().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  // Test successful login flow
  it('should handle successful login', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mockAuthService.initializeGoogleAuth).toHaveBeenCalled();
    expect(mockAuthService.loginWithGoogle).toHaveBeenCalled();
  });

  // Test login error handling
  it('should handle login failure', async () => {
    const mockError: AuthError = {
      code: 'AUTH_ERROR',
      message: 'Login failed',
      details: {}
    };

    (AuthService as jest.MockedClass<typeof AuthService>).prototype.loginWithGoogle = 
      jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  // Test successful logout
  it('should handle successful logout', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    // First login
    await act(async () => {
      await result.current.login();
    });

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  // Test token refresh
  it('should handle token refresh', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
      await result.current.refreshToken();
    });

    expect(mockAuthService.refreshAuthToken).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  // Test session validation
  it('should validate session status', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
      await result.current.validateSession();
    });

    expect(mockAuthService.validateSession).toHaveBeenCalled();
    expect(result.current.sessionStatus).toBe(SessionStatus.ACTIVE);
  });

  // Test automatic token refresh
  it('should automatically refresh token before expiry', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
    });

    // Fast-forward past token refresh interval
    await act(async () => {
      jest.advanceTimersByTime(300000); // 5 minutes
    });

    expect(mockAuthService.refreshAuthToken).toHaveBeenCalled();
  });

  // Test session timeout
  it('should handle session timeout', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
    });

    // Mock session validation to return false after timeout
    (AuthService as jest.MockedClass<typeof AuthService>).prototype.validateSession = 
      jest.fn().mockResolvedValue(false);

    // Fast-forward past session validation interval
    await act(async () => {
      jest.advanceTimersByTime(60000); // 1 minute
    });

    expect(result.current.sessionStatus).toBe(SessionStatus.EXPIRED);
  });

  // Test error handling during token refresh
  it('should handle token refresh failure', async () => {
    const mockError: AuthError = {
      code: 'TOKEN_REFRESH_ERROR',
      message: 'Token refresh failed',
      details: {}
    };

    (AuthService as jest.MockedClass<typeof AuthService>).prototype.refreshAuthToken = 
      jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
      await result.current.refreshToken();
    });

    expect(result.current.error).toEqual(mockError);
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  // Test user activity monitoring
  it('should monitor user activity', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <Provider store={mockStore}>{children}</Provider>
      )
    });

    await act(async () => {
      await result.current.login();
    });

    // Simulate user activity
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove'));
    });

    expect(result.current.sessionStatus).toBe(SessionStatus.ACTIVE);
  });
});