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
import { IUser } from '../interfaces/IUser';
import { handleApiError, type ApiError } from '../utils/errorHandlers';
import type { UpdateUserSettingsParams } from '../hooks/useAuth';
import { AUTH_CONSTANTS } from '../config/constants';

// Constants
const AUTH_CONFIG = {
  REFRESH_INTERVAL: 60000, // 1 minute
} as const;

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
  private googleAuthUrl: string = '';
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
      if (tokens) {
        this.token = tokens.token;
        this.refreshToken = tokens.refreshToken;

        // Validate the session immediately
        const isValid = await this.validateSession();
        if (isValid) {
          this.isAuthenticated = true;
          api.defaults.headers.common['Authorization'] = `Bearer ${tokens.token}`;
          this.setupGlobalValidation();
        } else {
          this.clearTokens();
        }
      }

      // Initialize Google Auth in background
      this.initializeGoogleAuth().catch((error) => {
        console.warn('Background Google Auth initialization failed:', error);
      });
    } catch (error) {
      console.error('Auth service initialization failed:', error);
      this.clearTokens();
    }
  }

  private setupGlobalValidation(): void {
    // Clear any existing timer
    if (this.globalValidationTimer) {
      clearInterval(this.globalValidationTimer);
    }

    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    let lastValidationAttempt = Date.now();
    const MIN_VALIDATION_INTERVAL = 30000; // 30 seconds minimum between validations

    this.globalValidationTimer = setInterval(async () => {
      try {
        const now = Date.now();
        if (now - lastValidationAttempt < MIN_VALIDATION_INTERVAL) {
          return;
        }
        lastValidationAttempt = now;

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
            window.dispatchEvent(
              new CustomEvent('auth-state-change', {
                detail: {
                  isAuthenticated: false,
                  user: null,
                  token: null,
                  refreshToken: null,
                  tokenExpiration: null,
                },
              })
            );
          }
        } else {
          consecutiveFailures = 0;
        }
      } catch (error) {
        if (error instanceof AxiosError && [401, 403].includes(error.response?.status || 0)) {
          consecutiveFailures++;
          console.warn(
            `Auth error in global validation (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`
          );
        } else {
          console.warn('Non-auth error in global validation:', error);
        }
      }
    }, AuthService.VALIDATION_CACHE_TTL);

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
      this.googleAuthUrl = authUrl;
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

      const response = await api.post<IAuthResponse>(authConfig.authEndpoints.googleAuth, {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`,
      });
      const data: any = response.data.data;
      const { accessToken: token, refreshToken, user } = data;

      // Store tokens securely
      localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, token);
      localStorage.setItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY, refreshToken);

      // Update auth state
      this.isAuthenticated = true;
      this.currentUser = user;
      this.token = token;
      this.refreshToken = refreshToken;

      // Set token expiration to 1 hour from now (typical JWT expiration)
      this.tokenExpiration = new Date(Date.now() + 3600 * 1000);

      // Initialize API client with new token
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Emit state change event with complete auth data
      window.dispatchEvent(
        new CustomEvent('auth-state-change', {
          detail: {
            isAuthenticated: true,
            user,
            token,
            refreshToken,
            tokenExpiration: this.tokenExpiration,
          },
        })
      );

      // Return complete auth response
      return {
        user,
        accessToken: token,
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
      const tokens = this.getStoredTokens();
      if (!tokens) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<IAuthResponse>(authConfig.authEndpoints.refreshToken, {
        refreshToken: tokens.refreshToken,
      });

      const { accessToken, refreshToken } = response.data;

      // Store new tokens
      localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, accessToken);
      localStorage.setItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY, refreshToken);

      // Update instance state
      this.token = accessToken;
      this.refreshToken = refreshToken;
      this.tokenExpiration = new Date(Date.now() + 3600 * 1000);

      return accessToken;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw this.handleAuthError(error as AxiosError<ApiError>);
      }
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
              const newToken = await this.refreshAuthToken();
              if (newToken) {
                // Update validation time to prevent immediate revalidation
                this.lastValidationTime = now;
                return true;
              }
            } catch (refreshError) {
              console.warn('Token refresh failed:', refreshError);
              // Continue with validation even if refresh fails
            }
          }

          // Add retry logic for failed validations with exponential backoff
          let retries = 3;
          let consecutiveFailures = 0;

          while (retries > 0) {
            try {
              const response = await api.post(authConfig.authEndpoints.validateToken, {});
              const innerResponse = response.data.data;
              const isValid = innerResponse.status === 'success' && innerResponse.data?.user;

              if (isValid) {
                const user = innerResponse.data.user;
                this.updateAuthState(true, user, tokens);
                this.validationCache = { isValid: true, timestamp: now, user };
                this.lastValidationTime = now;
                consecutiveFailures = 0; // Reset failure count on success
                return true;
              }

              // If validation explicitly fails (not due to network error)
              consecutiveFailures++;
              if (consecutiveFailures >= 3) {
                this.validationCache = { isValid: false, timestamp: now, user: null };
                return false;
              }
              break;
            } catch (error) {
              if (
                retries > 1 &&
                error instanceof AxiosError &&
                (error.response?.status === 500 ||
                  error.response?.status === 503 ||
                  !error.response || // Network error
                  error.code === 'ECONNABORTED')
              ) {
                // Timeout
                retries--;
                await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)));
                continue;
              }
              throw error;
            }
          }

          // For network-related issues, maintain current state
          if (retries === 0) {
            console.warn('Validation retries exhausted, maintaining current session state');
            return this.isAuthenticated;
          }

          this.clearTokens();
          this.validationCache = { isValid: false, timestamp: now, user: null };
          return false;
        } catch (error) {
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
    window.dispatchEvent(
      new CustomEvent('auth-state-change', {
        detail: {
          isAuthenticated,
          user,
          token: this.token,
          refreshToken: this.refreshToken,
          tokenExpiration: this.tokenExpiration,
        },
      })
    );
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
   * Gets the current token's expiration date
   * @returns Date object representing token expiration or null if no token
   */
  public getTokenExpiration(): Date | null {
    const token = this.getStoredTokens()?.token;
    if (!token) return null;

    try {
      // Decode the JWT token to get expiration
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      return payload.exp ? new Date(payload.exp * 1000) : null;
    } catch (error) {
      console.error('Error getting token expiration:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
