/**
 * Enhanced Authentication Service for Startup Metrics Benchmarking Platform
 * Implements secure Google OAuth flow, token management, and session handling
 * @version 1.0.0
 */

// External imports
import { AxiosError } from 'axios';

// Internal imports
import { authConfig } from '../config/auth';
import { api } from './api';
import { IUser } from '../interfaces/types';
import { handleApiError, type ApiError } from '../utils/errorHandlers';
import type { UpdateUserSettingsParams } from '../hooks/useAuth';
import { AUTH_CONSTANTS } from '../config/constants';



// Types for Google Auth
interface GoogleUser {
  isSignedIn(): boolean;
  getAuthResponse(): { id_token: string };
}

interface GoogleAuth {
  currentUser: {
    listen(callback: (user: GoogleUser) => void): void;
    get(): GoogleUser;
  };
  isSignedIn: {
    get(): boolean;
    listen(callback: (signedIn: boolean) => void): void;
  };
  signIn(params: { prompt: string }): Promise<GoogleUser>;
  signOut(): Promise<void>;
}

declare global {
  interface Window {
    gapi: {
      load(
        apiName: string,
        params: { callback: () => void; onerror: (error: Error) => void }
      ): void;
      auth2?: {
        init(params: {
          client_id: string;
          scope: string;
          ux_mode?: 'popup' | 'redirect';
          cookie_policy?: string;
          fetch_basic_profile?: boolean;
        }): Promise<GoogleAuth>;
        getAuthInstance(): GoogleAuth | null;
      };
    };
  }
}

/**
 * Enhanced response structure from authentication endpoints
 */
interface IAuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  data?: any;
}

/**
 * Enhanced structure for storing authentication tokens
 */
interface ITokens {
  token: string;
  refreshToken: string;
}

/**
 * Structured error interface for authentication failures
 */
interface IAuthError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: number;
}

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 300000, // 5 minutes
  attempts: new Map<string, number>(),
} as const;

/**
 * Enhanced authentication service with security features
 */
export class AuthService {
  private static instance: AuthService;
  private googleAuth: GoogleAuth | null = null;
  private currentUser: IUser | null = null;
  private isAuthenticated: boolean = false;
  private token: string = '';
  private refreshToken: string = '';
  private tokenExpiration: Date = new Date();
  private lastValidationTime: number = 0;
  private validationCache: { isValid: boolean; timestamp: number; user: IUser | null } | null =
    null;
  private static VALIDATION_CACHE_TTL = 15 * 60 * 1000; // 15 minute cache TTL
  private validationInProgress: Promise<boolean> | null = null;
  private globalValidationTimer: NodeJS.Timeout | null = null;
  private initializationPromise: Promise<void> | null = null;
  private static VALIDATION_DEBOUNCE = 5000; // 5 second debounce

  constructor() {
    if (AuthService.instance) {
      return AuthService.instance;
    }
    AuthService.instance = this;
    this.initializeRateLimiter();

    // Initialize service in constructor
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // First try to restore session from stored tokens
      const tokens = this.getStoredTokens();
      if (!tokens) {
        // No tokens found, clear any lingering state
        this.clearTokens();
        this.emitAuthEvent(false, null, 'no_tokens');
        return;
      }

      this.token = tokens.token;
      this.refreshToken = tokens.refreshToken;

      // Set the Authorization header immediately
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      }

      // Try to refresh token first if it's close to expiry or if expiration is unknown
      const tokenExp = this.getTokenExpiration();
      if (!tokenExp || tokenExp.getTime() - Date.now() < 15 * 60 * 1000) {
        // 15 minutes threshold
        try {
          const newToken = await this.refreshAuthToken();
          if (newToken) {
            this.token = newToken;
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, newToken);
          }
        } catch (refreshError) {
          console.warn('Token refresh failed during initialization:', refreshError);
          // Don't throw here, continue with validation to see if current token is still valid
        }
      }

      // Validate the session
      try {
        const isValid = await this.validateSession();
        if (isValid) {
          this.isAuthenticated = true;
          this.setupGlobalValidation();
        } else {
          // Session is invalid, clear everything
          this.clearTokens();
          this.emitAuthEvent(false, null, 'session_expired');
        }
      } catch (validationError) {
        console.warn('Session validation failed:', validationError);
        // Clear tokens and emit auth event for auth-related errors
        if (validationError instanceof AxiosError && [401, 403].includes(validationError.response?.status || 0)) {
          this.clearTokens();
          this.emitAuthEvent(false, null, 'invalid_session');
        }
      }

      // Initialize Google Auth in background
      this.initializeGoogleAuth().catch((error) => {
        console.warn('Background Google Auth initialization failed:', error);
      });
    } catch (error) {
      console.error('Auth service initialization failed:', error);
      // Clear tokens and emit auth event for critical errors
      this.clearTokens();
      this.emitAuthEvent(false, null, 'initialization_failed');
    }
  }

  private setupGlobalValidation(): void {
    if (this.globalValidationTimer) {
      clearInterval(this.globalValidationTimer);
    }

    let lastValidationAttempt = 0;
    let consecutiveFailures = 0;
    const MIN_VALIDATION_INTERVAL = 30000; // 30 seconds
    const MAX_CONSECUTIVE_FAILURES = 3;

    this.globalValidationTimer = setInterval(async () => {
      try {
        const now = Date.now();
        if (now - lastValidationAttempt < MIN_VALIDATION_INTERVAL) {
          return;
        }
        lastValidationAttempt = now;

        // Check token expiration and refresh if needed
        const tokenExp = this.getTokenExpiration();
        if (tokenExp && tokenExp.getTime() - now < 5 * 60 * 1000) {
          try {
            await this.refreshAuthToken();
            consecutiveFailures = 0;
            return;
          } catch (error) {
            console.warn('Token refresh failed in global validation:', error);
          }
        }

        const isValid = await this.validateSession();
        if (!isValid) {
          consecutiveFailures++;
          console.warn(
            `Session validation failed (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`
          );

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.error('Multiple consecutive validation failures, logging out');
            this.clearTokens();
            this.emitAuthEvent(false, null, 'multiple_consecutive_failures');
          }
        } else {
          consecutiveFailures = 0;
        }
      } catch (error) {
        console.error('Global validation error:', error);
      }
    }, 60000); // Check every minute

    // Clean up timer on page unload
    window.addEventListener('unload', () => {
      if (this.globalValidationTimer) {
        clearInterval(this.globalValidationTimer);
      }
    });
  }

  /**
   * Initializes Google OAuth client with enhanced security
   */
  private async loadGoogleApiScript(): Promise<void> {
    if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.id = 'google-api-script';
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.head.appendChild(script);
    });
  }

  private async loadAuth2(): Promise<void> {
    if (window.gapi?.auth2) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      window.gapi.load('auth2', {
        callback: () => resolve(),
        onerror: (error: Error) => reject(error),
      });
    });
  }

  public async initializeGoogleAuth(): Promise<void> {
    try {
      console.log('Initializing Google OAuth client...');
      const clientId = authConfig.googleClientId;
      console.log('Client ID available:', !!clientId);
      console.log('Origin:', window.location.origin);

      if (!clientId) {
        throw new Error('Google OAuth client ID is not configured');
      }

      // Skip initialization if we already have valid tokens
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const refreshToken = localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);

      if (token && refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.isAuthenticated = true;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return;
      }

      // Initialize Google OAuth client without the IFrame
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: authConfig.googleScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      throw new Error('Authentication service initialization failed');
    }
  }

  /**
   * Initiates Google OAuth login flow using URL redirect
   * @returns Promise<IAuthResponse> Authentication response with user and tokens
   */
  public async loginWithGoogle(): Promise<IAuthResponse> {
    try {
      this.checkRateLimit();
      const params = new URLSearchParams({
        client_id: authConfig.googleClientId,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: authConfig.googleScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      // This is a redirect, so we won't actually return anything
      // TypeScript needs a return statement though
      return {} as IAuthResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to initiate Google login');
    }
  }

  /**
   * Handles the OAuth callback and exchanges code for tokens
   */
  public async handleGoogleCallback(code: string, retryCount = 0): Promise<IAuthResponse> {
    try {
      // Add delay if this is a retry attempt
      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }

      const response = await api.post<{
        status: string;
        data: {
          user: IUser;
          accessToken: string;
          refreshToken: string;
        }
      }>('/api/v1/auth/google', {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`,
      });

      if (!response.data.status || response.data.status !== 'success' || !response.data.data) {
        throw new Error('Invalid response from server');
      }

      const { user, accessToken, refreshToken } = response.data.data;

      // Set the auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      // Update auth state
      this.isAuthenticated = true;
      this.currentUser = user;
      this.token = accessToken;
      this.refreshToken = refreshToken;

      // Set token expiration to 1 hour from now (typical JWT expiration)
      this.tokenExpiration = new Date(Date.now() + 3600 * 1000);

      // Emit state change event with complete auth data
      this.emitAuthEvent(true, user, 'login_success');

      // Return complete auth response
      return {
        user,
        accessToken,
        refreshToken,
        data: response.data,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 429 && retryCount < 3) {
          console.log(`Rate limited, retrying in ${retryCount + 1} seconds...`);
          return this.handleGoogleCallback(code, retryCount + 1);
        }
      }
      console.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Secure logout with token revocation
   */
  public async logout(): Promise<void> {
    try {
      const tokens = this.getStoredTokens();
      if (tokens?.refreshToken) {
        await api.post(authConfig.authEndpoints.logout, {
          refreshToken: tokens.refreshToken,
        });
      }

      this.clearTokens();
      this.currentUser = null;

      if (this.googleAuth) {
        await this.googleAuth.signOut();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if server call fails
      this.clearTokens();
    }
  }

  /**
   * Secure token refresh with retry mechanism
   */
  public async refreshAuthToken(): Promise<string> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<IAuthResponse>(authConfig.authEndpoints.refreshToken, {
        refreshToken: this.refreshToken,
      });

      if (!response.data || !response.data.data.accessToken) {
        throw new Error('Invalid response from refresh token endpoint');
      }

      const { accessToken, refreshToken, user } = response.data.data;

      // Update tokens and state
      this.token = accessToken;
      this.refreshToken = refreshToken;
      this.currentUser = user;
      this.isAuthenticated = true;
      this.tokenExpiration = new Date(Date.now() + 3600 * 1000); // 1 hour from now

      // Update token in localStorage
      localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, this.token);
      localStorage.setItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY, this.refreshToken);

      // Update axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

      // Emit auth state change event
      this.emitAuthEvent(true, user, 'token_refreshed');

      return this.token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      this.emitAuthEvent(false, null, 'refresh_failed');
      throw error;
    }
  }

  /**
   * Retrieves stored tokens
   */
  public getStoredTokens(): ITokens | null {
    try {
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const refreshToken = localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);

      if (!token || !refreshToken) {
        return null;
      }

      return { token, refreshToken };
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }

  /**
   * Gets the current authenticated user
   */
  public getCurrentUser(): IUser | null {
    return this.currentUser;
  }

  /**
   * Validates current session security with caching
   */
  public async validateSession(): Promise<boolean> {
    try {
      // Wait for initialization to complete first
      if (this.initializationPromise) {
        await this.initializationPromise;
      }

      const now = Date.now();

      // If there's a validation in progress, return current auth state
      if (this.validationInProgress) {
        return this.isAuthenticated;
      }

      // Check cache with longer TTL
      if (
        this.validationCache &&
        now - this.validationCache.timestamp < AuthService.VALIDATION_CACHE_TTL
      ) {
        if (this.validationCache.user) {
          this.currentUser = this.validationCache.user;
        }
        return this.validationCache.isValid;
      }

      // Implement request debouncing with 5 second window
      if (now - this.lastValidationTime < AuthService.VALIDATION_DEBOUNCE) {
        return this.isAuthenticated;
      }

      // Create a new validation promise
      this.validationInProgress = (async () => {
        try {
          const tokens = this.getStoredTokens();
          if (!tokens || !tokens.token) {
            this.validationCache = { isValid: false, timestamp: now, user: null };
            return false;
          }

          // Check token expiration and try to refresh if needed
          const tokenExp = this.getTokenExpiration();
          if (tokenExp && tokenExp.getTime() - now < 5 * 60 * 1000) {
            // 5 minutes before expiry
            try {
              await this.refreshAuthToken();
            } catch (refreshError) {
              console.warn('Token refresh failed:', refreshError);
              // Continue with validation even if refresh fails
            }
          }

          const response = await api.post(authConfig.authEndpoints.validateToken, {});
          const innerResponse = response.data.data;
          const isValid = innerResponse.status === 'success' && innerResponse.data?.user;

          if (isValid) {
            const user = innerResponse.data.user;
            this.currentUser = user;
            this.isAuthenticated = true;
            this.validationCache = { isValid: true, timestamp: now, user };
            this.lastValidationTime = now;

            // Update API header with current token
            if (this.token) {
              api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
            }

            // Emit state change event
            this.emitAuthEvent(true, user, 'session_valid');

            return true;
          }

          this.clearTokens();
          this.validationCache = { isValid: false, timestamp: now, user: null };
          return false;
        } catch (error) {
          console.error('Session validation failed:', error);
          if (error instanceof AxiosError) {
            // Keep session active for network-related issues
            if (
              !error.response ||
              error.code === 'ECONNABORTED' ||
              [404, 500, 503].includes(error.response?.status || 0)
            ) {
              console.warn('Network-related validation error, maintaining session:', error);
              return this.isAuthenticated;
            }

            // Only clear tokens for actual auth failures (401, 403)
            if ([401, 403].includes(error.response?.status || 0)) {
              this.clearTokens();
              this.validationCache = { isValid: false, timestamp: now, user: null };
              return false;
            }
          }

          // For unknown errors, maintain current session state
          console.error('Unexpected validation error:', error);
          return this.isAuthenticated;
        } finally {
          this.validationInProgress = null;
        }
      })();

      return this.validationInProgress;
    } catch (error) {
      console.error('validateSession: Error occurred:', error);
      this.validationInProgress = null;
      // Don't clear tokens on outer try-catch, maintain current state
      return this.isAuthenticated;
    }
  }

  /**
   * Updates authentication state and emits change event
   */
  private updateAuthState(isAuthenticated: boolean, user: IUser | null, tokens?: ITokens): void {
    this.isAuthenticated = isAuthenticated;
    this.currentUser = user;

    if (tokens) {
      this.token = tokens.token;
      this.refreshToken = tokens.refreshToken;
      this.tokenExpiration = new Date(Date.now() + 3600 * 1000); // 1 hour from now
    }

    // Emit state change event
    this.emitAuthEvent(isAuthenticated, user);
  }

  /**
   * Private helper methods
   */
  private clearTokens(): void {
    localStorage.removeItem(AUTH_CONSTANTS.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);
    this.token = '';
    this.refreshToken = '';
    this.isAuthenticated = false;
    this.currentUser = null;
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common['Authorization'];
    }
  }

  private handleUserChange(googleUser: GoogleUser): void {
    if (!googleUser.isSignedIn()) {
      this.logout().catch(console.error);
    }
  }

  private checkRateLimit(): void {
    const userKey = this.getUserKey();
    const attempts = RATE_LIMIT.attempts.get(userKey) || 0;

    if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    RATE_LIMIT.attempts.set(userKey, attempts + 1);
    setTimeout(() => {
      RATE_LIMIT.attempts.delete(userKey);
    }, RATE_LIMIT.WINDOW_MS);
  }

  private getUserKey(): string {
    return `${navigator.userAgent}_${new Date().toDateString()}`;
  }

  private initializeRateLimiter(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of RATE_LIMIT.attempts.entries()) {
        if (now - timestamp > RATE_LIMIT.WINDOW_MS) {
          RATE_LIMIT.attempts.delete(key);
        }
      }
    }, RATE_LIMIT.WINDOW_MS);
  }

  private handleAuthError(error: AxiosError<ApiError>): Error {
    const authError: IAuthError = {
      code: error.response?.data?.code || 'AUTH_ERROR',
      message: error.response?.data?.message || 'Authentication failed',
      details: error.response?.data?.details || {},
      timestamp: Date.now(),
    };

    console.error('Auth error:', authError);
    return new Error(authError.message);
  }

  /**
   * Updates user settings with validation and error handling
   */
  public async updateUserSettings(params: UpdateUserSettingsParams): Promise<void> {
    try {
      const response = await api.patch(`/users/${params.userId}/settings`, {
        preferences: params.preferences,
      });

      if (!response.data.success) {
        throw new Error('Failed to update user settings');
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        const { message } = handleApiError(error);
        throw new Error(message);
      }
      throw error;
    }
  }

  /**
   * Rate limit helper
   */
  private async waitForRateLimit(retryCount: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Gets the token expiration date
   */
  private getTokenExpiration(): Date | null {
    try {
      const token = this.token;
      if (!token) return null;

      // Decode token without verification to get expiration
      const decoded = JSON.parse(atob(token.split('.')[1]));
      if (!decoded.exp) return null;

      return new Date(decoded.exp * 1000);
    } catch (error) {
      console.warn('Error getting token expiration:', error);
      return null;
    }
  }

  /**
   * Checks if the current token is expired or about to expire
   */
  private isTokenExpired(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    // Consider token expired if it's within 5 minutes of expiration
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    return expiration.getTime() - Date.now() <= expirationBuffer;
  }

  /**
   * Emits authentication state change event
   */
  private emitAuthEvent(isAuthenticated: boolean, user: IUser | null, reason?: string): void {
    window.dispatchEvent(
      new CustomEvent('auth-state-change', {
        detail: {
          isAuthenticated,
          user,
          token: this.token,
          refreshToken: this.refreshToken,
          tokenExpiration: this.tokenExpiration,
          reason,
        },
      })
    );
  }
}

// Export singleton instance
export const authService = new AuthService();

interface LoginResponse {
  success: boolean;
  data: {
    user: IUser;
    accessToken: string;
    refreshToken: string;
  };
}

interface SetupData {
  role: 'USER' | 'ANALYST';
  companyName?: string;
  revenueRange?: string;
}

interface SetupResponse {
  success: boolean;
  data: {
    user: IUser;
    accessToken: string;
  };
}

export const loginWithGoogle = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const handleGoogleCallback = async (code: string) => {
  const response = await api.post<{
    status: string;
    data: {
      user: IUser;
      accessToken: string;
      refreshToken: string;
    }
  }>('/api/v1/auth/google', {
    code,
    redirectUri: `${window.location.origin}/auth/google/callback`,
  });

  if (!response.data.status || response.data.status !== 'success' || !response.data.data) {
    throw new Error('Invalid response from server');
  }

  const { user, accessToken, refreshToken } = response.data.data;

  // Set the auth header
  api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

  return {
    user,
    accessToken,
    refreshToken
  };
};

export const completeUserSetup = async (setupData: SetupData): Promise<SetupResponse> => {
  try {
    console.log('Sending setup data:', setupData);
    const response = await api.post<{
      status: string;
      data: IUser;
      metadata?: any;
    }>('/api/v1/users/setup', setupData);
    console.log('Setup response:', response.data);
    
    if (!response.data.status || response.data.status !== 'success' || !response.data.data) {
      throw new Error('Invalid response from server');
    }
    
    // Return the response in the expected format
    return {
      success: response.data.status === 'success',
      data: {
        user: response.data.data,
        accessToken: '' // The backend doesn't return a new access token for setup
      }
    };
  } catch (error) {
    console.error('Setup error:', error);
    throw error;
  }
};
