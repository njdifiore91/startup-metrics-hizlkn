import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Request, Response } from 'express';
import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUser } from '../interfaces/IUser';
import { AppError } from '../utils/AppError';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { USER_ROLES } from '../constants/roles';
import { logger } from '../utils/logger';
import { userService } from '../services/userService';
import { sign, verify } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import crypto from 'crypto';
import { authConfig } from '../config/auth';
import User from '../models/User';
import { v4 as uuidv4 } from 'uuid';

// HTTP Status Codes
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Google OAuth authentication provider implementing IAuthProvider interface
 */
export class GoogleAuthProvider implements IAuthProvider {
  public oAuth2Client: OAuth2Client;
  private readonly redisClient: Redis;
  private readonly rateLimitWindow: number = 15 * 60; // 15 minutes
  private readonly maxLoginAttempts: number = 5;

  constructor() {
    this.oAuth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    });
    this.redisClient = new Redis(process.env.REDIS_URL!, {
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  /**
   * Maps Google user data to our application's user model
   */
  private mapGoogleUserToAppUser(payload: TokenPayload): IUser {
    return {
      id: uuidv4(),
      email: payload.email!,
      name: payload.name!,
      googleId: payload.sub,
      role: USER_ROLES.USER,
      tier: 'free',
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Encrypts a token for secure storage
   */
  private encryptToken(token: string): string {
    // In development, just store the token as is
    if (process.env.NODE_ENV === 'development') {
      return token;
    }

    const iv = randomBytes(16);
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'utf8');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Authenticates user with Google OAuth
   */
  async authenticate(code: string, redirectUri: string): Promise<AuthResult> {
    try {
      console.log('Code', code);
      console.log('Redirect URI', redirectUri);
      // Get tokens from Google
      const { tokens } = await this.oAuth2Client.getToken({
        code,
        redirect_uri: redirectUri,
      });

      if (!tokens.access_token) {
        throw new AppError(
          AUTH_ERRORS.AUTHENTICATION_FAILED.message,
          AUTH_ERRORS.AUTHENTICATION_FAILED.httpStatus,
          AUTH_ERRORS.AUTHENTICATION_FAILED.code
        );
      }

      // Verify the ID token
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(
          AUTH_ERRORS.AUTHENTICATION_FAILED.message,
          AUTH_ERRORS.AUTHENTICATION_FAILED.httpStatus,
          AUTH_ERRORS.AUTHENTICATION_FAILED.code
        );
      }

      // Create or update user
      const googleUser: GoogleUser = {
        id: payload.sub!,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
      };

      // Create or update user in database
      const [user, created] = await User.findOrCreate({
        where: { googleId: googleUser.id },
        defaults: {
          id: uuidv4(),
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.id,
          role: USER_ROLES.USER,
          tier: 'free',
          isActive: true,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (!created) {
        // Update existing user's information
        await user.update({
          lastLoginAt: new Date(),
          name: googleUser.name, // Update name in case it changed
          email: googleUser.email, // Update email in case it changed
          isActive: true, // Ensure user is active upon login
        });
      }

      // Generate JWT tokens
      const accessToken = sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      const refreshToken = sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: '7d',
      });

      // Store refresh token in Redis
      const encryptedRefreshToken = this.encryptToken(refreshToken);
      await this.redisClient.set(
        `refresh_token:${user.id}`,
        encryptedRefreshToken,
        'EX',
        7 * 24 * 60 * 60 // 7 days
      );

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Google authentication failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new AppError(
        `${AUTH_ERRORS.AUTHENTICATION_FAILED.message}: ${errorMessage}`,
        AUTH_ERRORS.AUTHENTICATION_FAILED.httpStatus,
        AUTH_ERRORS.AUTHENTICATION_FAILED.code
      );
    }
  }

  /**
   * Validates JWT token and returns user information
   */
  async validateToken(token: string): Promise<IUser> {
    try {
      // Verify JWT token
      const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string; role: string };

      // Get user from database
      const user = await User.findOne({ where: { id: decoded.userId } });

      if (!user) {
        throw new AppError(
          'User not found',
          HTTP_STATUS.UNAUTHORIZED,
          AUTH_ERRORS.INVALID_TOKEN.code
        );
      }

      return user;
    } catch (error) {
      logger.error('Token validation failed', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw new AppError(
        'Token validation failed',
        HTTP_STATUS.UNAUTHORIZED,
        AUTH_ERRORS.INVALID_TOKEN.code
      );
    }
  }

  /**
   * Exchanges authorization code for user data
   */
  async exchangeCode(code: string, redirectUri: string): Promise<IUser> {
    try {
      const { tokens } = await this.oAuth2Client.getToken({
        code,
        redirect_uri: redirectUri,
      });

      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(
          'Invalid token payload',
          HTTP_STATUS.UNAUTHORIZED,
          AUTH_ERRORS.INVALID_TOKEN.code
        );
      }

      return this.mapGoogleUserToAppUser(payload);
    } catch (error) {
      logger.error('Code exchange failed', {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw new AppError(
        'Code exchange failed',
        HTTP_STATUS.UNAUTHORIZED,
        AUTH_ERRORS.INVALID_TOKEN.code
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    try {
      this.oAuth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const response = await this.oAuth2Client.refreshAccessToken();
      const tokens = response.credentials;

      if (!tokens.access_token) {
        throw new AppError(
          AUTH_ERRORS.TOKEN_EXPIRED.message,
          AUTH_ERRORS.TOKEN_EXPIRED.httpStatus,
          AUTH_ERRORS.TOKEN_EXPIRED.code
        );
      }

      // Verify the ID token to get user info
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(
          AUTH_ERRORS.TOKEN_EXPIRED.message,
          AUTH_ERRORS.TOKEN_EXPIRED.httpStatus,
          AUTH_ERRORS.TOKEN_EXPIRED.code
        );
      }

      const user: IUser = {
        id: uuidv4(),
        email: payload.email!,
        name: payload.name!,
        googleId: payload.sub,
        role: USER_ROLES.USER,
        tier: 'free',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        user,
      };
    } catch (error) {
      logger.error('Token refresh failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError(
        AUTH_ERRORS.TOKEN_EXPIRED.message,
        AUTH_ERRORS.TOKEN_EXPIRED.httpStatus,
        AUTH_ERRORS.TOKEN_EXPIRED.code
      );
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      // First decode the token to get user info
      const decoded = verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };

      // Find and update user's active status
      const user = await User.findOne({ where: { id: decoded.userId } });
      if (user) {
        await User.update({ isActive: false }, { where: { id: decoded.userId } });
        logger.info('Successfully deactivated user account', {
          userId: decoded.userId,
          email: user.email,
        });
      } else {
        logger.warn('User not found during logout', { userId: decoded.userId });
      }

      // Revoke Google OAuth token
      await this.oAuth2Client.revokeToken(token);
    } catch (error) {
      logger.error('Token revocation or user deactivation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new AppError(
        'Failed to properly logout user',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        AUTH_ERRORS.AUTHENTICATION_FAILED.code
      );
    }
  }

  async getGoogleUser(code: string): Promise<GoogleUser> {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);

      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Invalid Google token', HTTP_STATUS.UNAUTHORIZED);
      }

      return {
        id: payload.sub!,
        email: payload.email!,
        name: payload.name!,
        picture: payload.picture,
      };
    } catch (error) {
      logger.error('Google authentication failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AppError('Google authentication failed', HTTP_STATUS.UNAUTHORIZED);
    }
  }
}
