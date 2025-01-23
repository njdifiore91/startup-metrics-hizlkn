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
  data(arg0: string, data: any): unknown;
  user: IUser;
  accessToken: string;
  refreshToken: string;
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
  private googleAuth: GoogleAuth | null = null;
  private currentUser: IUser | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isAuthenticated: boolean = false;
  private token: string = '';
  private refreshToken: string = '';
  private tokenExpiration: Date = new Date();
  private googleAuthUrl: string = '';

  constructor() {
    this.initializeRateLimiter();
    this.setupTokenRefresh();
    // Initialize Google Auth in the background
    this.initializeGoogleAuth().catch(error => {
      console.warn('Background Google Auth initialization failed:', error);
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
        prompt: 'consent'
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
   */
  public async loginWithGoogle(): Promise<void> {
    try {
      this.checkRateLimit();
      const params = new URLSearchParams({
        client_id: authConfig.googleClientId,
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: authConfig.googleScopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      });

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }

      const response = await api.post<IAuthResponse>(authConfig.authEndpoints.googleAuth, {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`
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

      // Emit state change event
      window.dispatchEvent(new CustomEvent('auth-state-change', {
        detail: {
          isAuthenticated: true,
          user,
          token,
          refreshToken,
          tokenExpiration: this.tokenExpiration
        }
      }));

      return response.data;
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
      if (tokens) {
        await api.post(authConfig.authEndpoints.logout);
      }

      this.clearTokens();
      this.currentUser = null;

      if (this.googleAuth) {
        await this.googleAuth.signOut();
      }

      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
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
        refreshToken: tokens.refreshToken
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
   * Validates current session security
   */
  public async validateSession(): Promise<boolean> {
    try {
      console.log('validateSession: Getting stored tokens');
      const tokens = this.getStoredTokens();
      console.log('validateSession: Stored tokens exist:', !!tokens);

      if (!tokens || !tokens.token) {
        console.log('validateSession: No valid tokens found');
        return false;
      }

      const token = tokens.token;
      console.log('validateSession: Using token:', token);

      // Set up API client with token
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      console.log('validateSession: Making validation request');
      try {
        const response = await api.post(
          authConfig.authEndpoints.validateToken,
          {}
        );
        console.log('validateSession: Response received:', response.data);

        // Handle double-wrapped response structure
        const innerResponse = response.data.data;
        if (innerResponse.status === 'success' && innerResponse.data?.user) {
          const user = innerResponse.data.user;
          this.updateAuthState(true, user, tokens);
          return true;
        }

        console.log('validateSession: Invalid response format:', response.data);
        this.clearTokens();
        return false;
      } catch (error) {
        console.error('validateSession: Request error:', error);
        if (error instanceof AxiosError) {
          console.log('validateSession: Error status:', error.response?.status);
          console.log('validateSession: Error data:', error.response?.data);
          
          if (error.response?.status === 404) {
            console.log('validateSession: Validation endpoint not found, maintaining current auth state');
            this.updateAuthState(true, this.currentUser, tokens);
            return true;
          }
        }
        throw error;
      }
    } catch (error) {
      console.error('validateSession: Error occurred:', error);
      // Only clear tokens if it's not a 404 error
      if (!(error instanceof AxiosError && error.response?.status === 404)) {
        this.clearTokens();
      }
      return false;
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
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: {
        isAuthenticated,
        user,
        token: this.token,
        refreshToken: this.refreshToken,
        tokenExpiration: this.tokenExpiration
      }
    }));

    // Set up token refresh if authenticated
    if (isAuthenticated && !this.refreshTimer) {
      this.setupTokenRefresh();
    }
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
    api.defaults.headers.common['Authorization'] = '';
  }

  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Only set up refresh timer if we have tokens
    const tokens = this.getStoredTokens();
    if (!tokens) {
      return;
    }

    this.refreshTimer = setInterval(async () => {
      try {
        const tokens = this.getStoredTokens();
        if (!tokens) {
          clearInterval(this.refreshTimer!);
          this.refreshTimer = null;
          return;
        }
        await this.refreshAuthToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear refresh timer on error
        clearInterval(this.refreshTimer!);
        this.refreshTimer = null;
      }
    }, AUTH_CONFIG.REFRESH_INTERVAL);
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
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Export singleton instance
export const authService = new AuthService();
