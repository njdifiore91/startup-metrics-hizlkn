import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Request, Response } from 'express';
import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUser } from '../interfaces/IUser';
import { AppError } from '../utils/errorHandler';
import { AUTH_ERRORS } from '../constants/errorCodes';
import { USER_ROLES } from '../constants/roles';
import { logger } from '../utils/logger';

/**
 * Google OAuth authentication provider implementing IAuthProvider interface
 */
export class GoogleAuthProvider implements IAuthProvider {
  public oAuth2Client: OAuth2Client;

  constructor() {
    this.oAuth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  /**
   * Authenticates a user using Google OAuth
   */
  async authenticate(req: Request, res: Response): Promise<{
    user: IUser;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const { code } = req.body;
      if (!code) {
        throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Authorization code required');
      }

      const { tokens } = await this.oAuth2Client.getToken({
        code,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL
      });

      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Invalid token payload');
      }

      const user = this.mapGoogleUserToAppUser(payload);

      return {
        user,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!
      };
    } catch (error) {
      logger.error('Authentication failed', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Authentication failed');
    }
  }

  /**
   * Validates JWT token and returns user information
   */
  async validateToken(token: string): Promise<IUser> {
    try {
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Invalid token payload');
      }

      return this.mapGoogleUserToAppUser(payload);
    } catch (error) {
      logger.error('Token validation failed', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Token validation failed');
    }
  }

  /**
   * Exchanges authorization code for user data
   */
  async exchangeCode(code: string, redirectUri: string): Promise<IUser> {
    try {
      const { tokens } = await this.oAuth2Client.getToken({
        code,
        redirect_uri: redirectUri
      });

      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Invalid token payload');
      }

      return this.mapGoogleUserToAppUser(payload);
    } catch (error) {
      logger.error('Code exchange failed', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Code exchange failed');
    }
  }

  /**
   * Refreshes access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: IUser;
  }> {
    try {
      this.oAuth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oAuth2Client.refreshAccessToken();
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: credentials.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Invalid token payload');
      }

      return {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || refreshToken,
        user: this.mapGoogleUserToAppUser(payload)
      };
    } catch (error) {
      logger.error('Token refresh failed', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Token refresh failed');
    }
  }

  /**
   * Revokes the given token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await this.oAuth2Client.revokeToken(token);
    } catch (error) {
      logger.error('Token revocation failed', { 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw new AppError(AUTH_ERRORS.INVALID_TOKEN.code, 'Token revocation failed');
    }
  }

  /**
   * Maps Google user data to our application's user model
   */
  public mapGoogleUserToAppUser(payload: TokenPayload): IUser {
    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      role: USER_ROLES.USER,
      tier: 'free',
      googleId: payload.sub,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      version: 1
    };
  }
} 