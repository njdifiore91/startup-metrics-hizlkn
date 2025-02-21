import { IUser } from '../models/User';

export interface IAuthProvider {
  /**
   * Validates a JWT token and returns the associated user
   * @param token - The JWT token to validate
   * @returns The user associated with the token
   * @throws {AppError} If token is invalid or expired
   */
  validateToken(token: string): Promise<IUser>;
  
  /**
   * Exchanges an OAuth code for user data
   * @param code - The OAuth code from the authentication provider
   * @param redirectUri - The redirect URI used in the OAuth flow
   * @returns The user data from the provider
   * @throws {AppError} If code is invalid or exchange fails
   */
  exchangeCode(code: string, redirectUri: string): Promise<IUser>;
  
  /**
   * Refreshes an expired access token using a refresh token
   * @param refreshToken - The refresh token to use
   * @returns New access and refresh tokens
   * @throws {AppError} If refresh token is invalid or expired
   */
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: IUser;
  }>;
} 