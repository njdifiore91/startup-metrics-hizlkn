/**
 * Enhanced Authentication Service for Startup Metrics Benchmarking Platform
 * Implements secure Google OAuth flow, token management, and session handling
 * @version 1.0.0
 */

// External imports - versions specified as per requirements
import CryptoJS from 'crypto-js'; // v4.1.1

// Internal imports
import { authConfig } from '../config/auth';
import { api } from './api';
import type { IUser } from '../interfaces/IUser';

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
  attempts: new Map<string, number>()
};

/**
 * Enhanced authentication service with security features
 */
export class AuthService {
  private googleAuth: any = null;
  private currentUser: IUser | null = null;
  private sessionId: string = '';
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeRateLimiter();
    this.setupTokenRefresh();
  }

  /**
   * Initializes Google OAuth client with enhanced security
   */
  public async initializeGoogleAuth(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('auth2', {
          callback: resolve,
          onerror: reject
        });
      });

      this.googleAuth = await window.gapi.auth2.init({
        client_id: authConfig.googleClientId,
        scope: authConfig.googleScopes.join(' ')
      });

      // Set up security monitoring
      this.googleAuth.currentUser.listen(this.handleUserChange.bind(this));
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      throw new Error('Authentication service initialization failed');
    }
  }

  /**
   * Enhanced Google OAuth login flow with security measures
   */
  public async loginWithGoogle(): Promise<IAuthResponse> {
    try {
      this.checkRateLimit();

      if (!this.googleAuth) {
        await this.initializeGoogleAuth();
      }

      const googleUser = await this.googleAuth!.signIn({
        prompt: 'select_account'
      });

      const authResponse = googleUser.getAuthResponse();
      const idToken = authResponse.id_token;

      // Exchange Google token for application tokens
      const response = await api.post<IAuthResponse>(
        authConfig.authEndpoints.googleAuth,
        { idToken }
      );

      const { token, refreshToken, user, expiresAt } = response.data;

      // Encrypt tokens before storage
      const encryptedTokens = this.encryptTokens({
        token,
        refreshToken,
        expiresAt,
        sessionId: this.generateSessionId()
      });

      this.storeTokens(encryptedTokens);
      this.currentUser = user;
      this.setupTokenRefresh();

      return response.data;
    } catch (error) {
      this.handleAuthError(error as Error);
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
        await api.post(authConfig.authEndpoints.logout, {
          sessionId: tokens.sessionId
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

      const response = await api.post<IAuthResponse>(
        authConfig.authEndpoints.refreshToken,
        {
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId
        }
      );

      const { token, refreshToken, expiresAt } = response.data;
      const encryptedTokens = this.encryptTokens({
        ...tokens,
        token,
        refreshToken,
        expiresAt
      });

      this.storeTokens(encryptedTokens);
      return token;
    } catch (error) {
      this.handleAuthError(error as Error);
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

      const decrypted = CryptoJS.AES.decrypt(
        encryptedTokens,
        this.getEncryptionKey()
      ).toString(CryptoJS.enc.Utf8);

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
      const tokens = this.getStoredTokens();
      if (!tokens) return false;

      const response = await api.post(
        authConfig.authEndpoints.validateToken,
        {
          sessionId: tokens.sessionId
        }
      );

      return response.data.valid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private encryptTokens(tokens: ITokens): string {
    return CryptoJS.AES.encrypt(
      JSON.stringify(tokens),
      this.getEncryptionKey()
    ).toString();
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
    // Use a combination of client-specific data for encryption
    const userAgent = navigator.userAgent;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return CryptoJS.SHA256(`${userAgent}${timeZone}`).toString();
  }

  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(async () => {
      const tokens = this.getStoredTokens();
      if (tokens && tokens.expiresAt - Date.now() < authConfig.tokenRefreshThreshold) {
        await this.refreshAuthToken();
      }
    }, 60000); // Check every minute
  }

  private handleUserChange(googleUser: any): void {
    const isSignedIn = googleUser.isSignedIn();
    if (!isSignedIn && this.currentUser) {
      this.logout();
    }
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const userKey = this.getUserKey();
    
    // Clean up old attempts
    RATE_LIMIT.attempts.forEach((timestamp, key) => {
      if (now - timestamp > RATE_LIMIT.WINDOW_MS) {
        RATE_LIMIT.attempts.delete(key);
      }
    });

    const attempts = RATE_LIMIT.attempts.get(userKey) || 0;
    if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    RATE_LIMIT.attempts.set(userKey, attempts + 1);
  }

  private getUserKey(): string {
    return CryptoJS.SHA256(navigator.userAgent).toString();
  }

  private initializeRateLimiter(): void {
    setInterval(() => {
      const now = Date.now();
      RATE_LIMIT.attempts.forEach((timestamp, key) => {
        if (now - timestamp > RATE_LIMIT.WINDOW_MS) {
          RATE_LIMIT.attempts.delete(key);
        }
      });
    }, RATE_LIMIT.WINDOW_MS);
  }

  private handleAuthError(error: Error): void {
    console.error('Authentication error:', error);
    this.clearTokens();
    throw new Error('Authentication failed. Please try again.');
  }
}