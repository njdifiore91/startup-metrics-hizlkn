/**
 * Interface defining the contract for authentication providers with comprehensive
 * token lifecycle management. Implements secure authentication flows and session handling
 * based on Google OAuth and JWT tokens.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // ^4.18.2
import { IUser } from './IUser';

export interface AuthResult {
    user: IUser;
    accessToken: string;
    refreshToken: string;
}

/**
 * Authentication provider interface that establishes a contract for implementing
 * different authentication strategies. Ensures consistent authentication behavior
 * while maintaining security best practices for token management.
 * 
 * @interface IAuthProvider
 */
export interface IAuthProvider {
    /**
     * Authenticates a user using the provider's authentication flow and generates
     * initial token pair with secure session establishment.
     * 
     * @param {string} code - Authorization code received from Google
     * @param {string} redirectUri - Redirect URI after authentication
     * @returns {Promise<AuthResult>} Authentication result containing user information and secure token pair
     * @throws {AuthenticationError} When authentication fails
     */
    authenticate(code: string, redirectUri: string): Promise<AuthResult>;

    /**
     * Validates a JWT access token and returns the associated user information.
     * Implements token signature verification and expiration checks.
     * 
     * @param {string} token - JWT access token to validate
     * @returns {Promise<IUser>} User associated with the valid token
     * @throws {TokenValidationError} When token is invalid or expired
     */
    validateToken(token: string): Promise<IUser>;

    /**
     * Generates new access and refresh token pair using existing refresh token.
     * Implements secure token rotation to prevent replay attacks.
     * 
     * @param {string} refreshToken - Current refresh token
     * @returns {Promise<{accessToken: string; refreshToken: string; user: IUser}>}
     * New token pair and associated user information
     * @throws {TokenRefreshError} When refresh token is invalid or expired
     */
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: IUser;
    }>;

    /**
     * Revokes a refresh token and invalidates associated sessions.
     * Implements immediate token blacklisting for security.
     * 
     * @param {string} token - Refresh token to revoke
     * @returns {Promise<void>} Confirmation of token revocation
     * @throws {TokenRevocationError} When token revocation fails
     */
    revokeToken(token: string): Promise<void>;
}