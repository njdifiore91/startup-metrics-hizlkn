// @ts-check
import { config } from 'dotenv'; // v16.0.3
import type { ProcessEnv } from '../types/environment';

// Load environment variables
config();

/**
 * Comprehensive authentication configuration object with enhanced security settings
 * Implements JWT with RS256, Google OAuth, secure sessions, and Redis integration
 */
export const authConfig = {
  /**
   * JWT Configuration
   * Uses RS256 algorithm with public/private key pair for enhanced security
   */
  jwt: {
    privateKey: import.meta.env.JWT_PRIVATE_KEY,
    publicKey: import.meta.env.JWT_PUBLIC_KEY,
    algorithm: 'RS256' as const,
    expiresIn: import.meta.env.JWT_EXPIRY || '1h',
    refreshTokenExpiry: '14d',
    issuer: 'startup-metrics-platform',
    audience: 'startup-metrics-users',
    clockTolerance: 30, // Seconds of clock drift tolerance
  },

  /**
   * Google OAuth Configuration
   * Implements secure OAuth 2.0 flow with enhanced scope management
   */
  google: {
    clientId: import.meta.env.GOOGLE_CLIENT_ID,
    clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    callbackURL: import.meta.env.GOOGLE_CALLBACK_URL,
    scope: [
      'profile',
      'email',
    ],
    prompt: 'select_account', // Force account selection
    accessType: 'offline', // Enable refresh token generation
    includeGrantedScopes: true, // Include previously granted scopes
    hostedDomain: import.meta.env.GOOGLE_HOSTED_DOMAIN, // Optional G Suite domain restriction
  },

  /**
   * Session Configuration
   * Implements secure session management with strict cookie settings
   */
  session: {
    secret: import.meta.env.SESSION_SECRET,
    name: 'sid', // Custom session ID name
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    rolling: true, // Reset expiration on each request
    cookie: {
      secure: import.meta.env.NODE_ENV === 'production', // Secure in production
      httpOnly: true, // Prevent client-side access
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
      sameSite: 'strict' as const, // Strict same-site policy
      domain: import.meta.env.COOKIE_DOMAIN, // Cookie domain
      path: '/', // Cookie path
    },
  },

  /**
   * Redis Session Store Configuration
   * Implements distributed session storage with retry mechanism
   */
  redis: {
    url: import.meta.env.REDIS_URL,
    prefix: 'sess:', // Session key prefix
    ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
    disableTouch: false, // Enable TTL refresh on session access
    retry_strategy: (options: { error: Error; total_retry_time: number; times_connected: number; attempt: number }) => {
      // Implement exponential backoff with max retry time
      if (options.error?.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error
        return new Error('The server refused the connection');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after 1 hour
        return new Error('Retry time exhausted');
      }
      // Reconnect after
      return Math.min(options.attempt * 100, 3000);
    },
  },
} as const;

// Type assertion to ensure all config properties are readonly
export type AuthConfig = typeof authConfig;