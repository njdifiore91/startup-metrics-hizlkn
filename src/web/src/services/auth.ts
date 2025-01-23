/**
 * Enhanced Authentication Service for Startup Metrics Benchmarking Platform
 * Implements secure Google OAuth flow, token management, and session handling
 * @version 1.0.0
 */

// External imports
import CryptoJS from 'crypto-js';
import { AxiosError } from 'axios';

// Internal imports
import { authConfig } from '../config/auth';
import { api } from './api';
import { IUser } from '../interfaces/IUser';
import { handleApiError, type ApiError } from '../utils/errorHandlers';
import type { UpdateUserSettingsParams } from '../hooks/useAuth';

// Constants
const AUTH_CONFIG = {
  REFRESH_INTERVAL: 60000, // 1 minute
  ENCRYPTION_KEY: import.meta.env.VITE_ENCRYPTION_KEY || 'default-key',
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
  attachClickHandler(
    element: HTMLElement | null,
    options: { prompt: string },
    onSuccess: (user: GoogleUser) => void,
    onFailure: (error: Error) => void,
    popupConfig?: {
      width: number;
      height: number;
      left: number;
      top: number;
    }
  ): void;
}

interface GoogleAuthStatic {
  init(params: {
    client_id: string;
    scope: string;
    ux_mode?: 'popup' | 'redirect';
    redirect_uri?: string;
    cookie_policy?: 'single_host_origin' | 'none';
    hosted_domain?: string;
    fetch_basic_profile?: boolean;
    prompt?: 'select_account' | 'consent';
    gsiwebsdk?: number;
    state_cookie_domain?: string;
    access_type?: 'online' | 'offline';
  }): Promise<GoogleAuth>;
  getAuthInstance(): GoogleAuth | null;
}

declare global {
  interface Window {
    gapi: {
      load(
        apiName: string,
        params: { callback: () => void; onerror: (error: Error) => void }
      ): void;
      auth2: GoogleAuthStatic;
    };
  }
}

/**
 * Enhanced response structure from authentication endpoints
 */
interface IAuthResponse {
  token: string;
  refreshToken: string;
  user: IUser;
  expiresAt: number;
  sessionId: string;
}

/**
 * Enhanced structure for storing encrypted authentication tokens
 */
interface ITokens {
  token: string;
  refreshToken: string;
  expiresAt: number;
  sessionId: string;
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
  private sessionId: string = '';
  private refreshTimer: NodeJS.Timeout | null = null;

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

      // Check if auth2 is already initialized
      try {
        const existingAuth = window.gapi?.auth2?.getAuthInstance();
        if (existingAuth) {
          console.log('Using existing auth instance');
          this.googleAuth = existingAuth;
          return;
        }
      } catch (e) {
        console.log('No existing auth instance found');
      }

      // Load the Google API script if not already loaded
      await this.loadGoogleApiScript();
      console.log('Google API script loaded');

      // Load auth2 module
      await this.loadAuth2();
      console.log('Auth2 module loaded');

      // Initialize the Google Auth client
      console.log('Creating new auth instance with config:', {
        client_id: clientId,
        scope: authConfig.googleScopes.join(' '),
      });
      
      this.googleAuth = await window.gapi.auth2.init({
        client_id: clientId,
        scope: authConfig.googleScopes.join(' '),
        fetch_basic_profile: true,
        ux_mode: 'popup',
        cookie_policy: 'single_host_origin'
      });

      if (!this.googleAuth) {
        throw new Error('Failed to create auth instance');
      }

      // Set up security monitoring
      console.log('Auth instance created successfully');
      this.googleAuth.currentUser.listen(this.handleUserChange.bind(this));
      
      // Check if already signed in
      const isSignedIn = this.googleAuth.isSignedIn.get();
      if (isSignedIn) {
        const googleUser = this.googleAuth.currentUser.get();
        await this.handleUserChange(googleUser);
      }
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
  public async handleGoogleCallback(code: string): Promise<IAuthResponse> {
    try {
      const response = await api.post<IAuthResponse>(authConfig.authEndpoints.googleAuth, {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`
      });

      const { token, refreshToken, user, expiresAt } = response.data;

      const encryptedTokens = this.encryptTokens({
        token,
        refreshToken,
        expiresAt,
        sessionId: this.generateSessionId(),
      });

      this.storeTokens(encryptedTokens);
      this.currentUser = user;
      this.setupTokenRefresh();

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw this.handleAuthError(error as AxiosError<ApiError>);
      }
      throw new Error('Failed to exchange code for tokens');
    }
  }

  /**
   * Secure logout with token revocation
   */
  public async logout(): Promise<void> {
    try {
      const tokens = this.getStoredTokens();
      if (tokens) {
        await api.post(authConfig.authEndpoints.logout, {
          sessionId: tokens.sessionId,
        });
      }

      this.clearTokens();
      this.currentUser = null;
      this.sessionId = '';

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
        refreshToken: tokens.refreshToken,
        sessionId: tokens.sessionId,
      });

      const { token, refreshToken, expiresAt } = response.data;
      const encryptedTokens = this.encryptTokens({
        ...tokens,
        token,
        refreshToken,
        expiresAt,
      });

      this.storeTokens(encryptedTokens);
      return token;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        throw this.handleAuthError(error as AxiosError<ApiError>);
      }
      throw error;
    }
  }

  /**
   * Retrieves and decrypts stored tokens
   */
  public getStoredTokens(): ITokens | null {
    try {
      const encryptedTokens = localStorage.getItem(authConfig.tokenStorageKey);
      if (!encryptedTokens) return null;

      const decrypted = CryptoJS.AES.decrypt(encryptedTokens, this.getEncryptionKey()).toString(
        CryptoJS.enc.Utf8
      );

      return JSON.parse(decrypted);
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

      console.log('validateSession: Making validation request');
      const response = await api.post(
        authConfig.authEndpoints.validateToken,
        { sessionId: tokens.sessionId },
        {
          headers: {
            Authorization: `Bearer ${tokens.token}`,
          },
        }
      );
      console.log('validateSession: Response received:', response.data);

      if (response.data.valid) {
        console.log('validateSession: Session is valid, updating user');
        this.currentUser = response.data.user;
        return true;
      }

      console.log('validateSession: Session is invalid, clearing tokens');
      this.clearTokens();
      return false;
    } catch (error) {
      console.error('validateSession: Error occurred:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private encryptTokens(tokens: ITokens): string {
    return CryptoJS.AES.encrypt(JSON.stringify(tokens), this.getEncryptionKey()).toString();
  }

  private storeTokens(encryptedTokens: string): void {
    localStorage.setItem(authConfig.tokenStorageKey, encryptedTokens);
  }

  private clearTokens(): void {
    localStorage.removeItem(authConfig.tokenStorageKey);
  }

  private generateSessionId(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  private getEncryptionKey(): string {
    return AUTH_CONFIG.ENCRYPTION_KEY;
  }

  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshAuthToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
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
}

// Export singleton instance
export const authService = new AuthService();
