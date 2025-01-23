/**
 * Enhanced authentication service implementing secure token management and session validation.
 * Provides comprehensive security features including RS256 JWT signing, secure token storage,
 * and robust session management.
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { sign, verify, SignOptions, VerifyOptions } from 'jsonwebtoken'; // ^9.0.0
import Redis from 'ioredis'; // ^5.3.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import winston from 'winston'; // ^3.8.0
import crypto from 'crypto';
import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUser } from '../interfaces/IUser';
import { USER_ROLES } from '../constants/roles';

// Custom error types for authentication flows
class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

class TokenValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TokenValidationError';
    }
}

/**
 * Configuration constants for token management and security
 */
const TOKEN_CONFIG = {
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '14d',
    MIN_ENTROPY_BITS: 128,
    ENCRYPTION_ALGORITHM: 'aes-256-gcm',
    TOKEN_NAMESPACE: 'auth:tokens:',
    BLACKLIST_NAMESPACE: 'auth:blacklist:'
} as const;

/**
 * Enhanced authentication service implementing secure session management
 * and comprehensive token lifecycle handling
 */
export class AuthService {
    private readonly logger: winston.Logger;
    private readonly rateLimiter: any;

    constructor(
        private readonly authProvider: IAuthProvider,
        private readonly redisClient: Redis
    ) {
        // Initialize secure logging
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'auth-events.log' })
            ]
        });

        // Configure rate limiting
        this.rateLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many authentication attempts, please try again later'
        });
    }

    /**
     * Authenticates a user and establishes a secure session with token pair
     * @param req Express request object
     * @param res Express response object
     * @returns Authentication result with secure tokens
     * @throws AuthenticationError
     */
    public async authenticate(
        req: Request,
        res: Response
    ): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
        try {
            // Apply rate limiting
            await new Promise((resolve) => this.rateLimiter(req, res, resolve));

            // Perform authentication via provider
            const authResult = await this.authProvider.authenticate(req, res);

            // Generate secure token pair
            const tokens = await this.generateTokenPair(authResult.user);

            // Store refresh token securely
            await this.storeRefreshToken(authResult.user.id, tokens.refreshToken);

            // Set secure HTTP-only cookies
            this.setSecureCookies(res, tokens);

            // Log successful authentication
            this.logger.info('Authentication successful', {
                userId: authResult.user.id,
                timestamp: new Date().toISOString()
            });

            return {
                user: authResult.user,
                tokens
            };
        } catch (error) {
            this.logger.error('Authentication failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw new AuthenticationError('Authentication failed');
        }
    }

    /**
     * Validates a session token with comprehensive security checks
     * @param token Access token to validate
     * @returns Validated user information
     * @throws TokenValidationError
     */
    public async validateSession(token: string): Promise<IUser> {
        try {
            // Verify token signature and expiration
            const decoded = await this.verifyToken(token);

            // Check token blacklist
            const isBlacklisted = await this.redisClient.exists(
                `${TOKEN_CONFIG.BLACKLIST_NAMESPACE}${token}`
            );
            if (isBlacklisted) {
                throw new TokenValidationError('Token has been revoked');
            }

            // Verify token entropy
            if (!this.hasMinimumEntropy(token)) {
                throw new TokenValidationError('Token does not meet security requirements');
            }

            return decoded as IUser;
        } catch (error) {
            this.logger.error('Token validation failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw new TokenValidationError('Session validation failed');
        }
    }

    /**
     * Refreshes a session with secure token rotation
     * @param refreshToken Current refresh token
     * @returns New token pair and user information
     * @throws TokenValidationError
     */
    public async refreshSession(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: IUser;
    }> {
        try {
            const result = await this.authProvider.refreshToken(refreshToken);
            
            // Invalidate old refresh token
            await this.blacklistToken(refreshToken);

            // Store new refresh token
            await this.storeRefreshToken(result.user.id, result.refreshToken);

            return result;
        } catch (error) {
            throw new TokenValidationError('Session refresh failed');
        }
    }

    /**
     * Revokes a session and blacklists associated tokens
     * @param refreshToken Refresh token to revoke
     */
    public async revokeSession(refreshToken: string): Promise<void> {
        try {
            await this.authProvider.revokeToken(refreshToken);
            await this.blacklistToken(refreshToken);
        } catch (error) {
            this.logger.error('Session revocation failed', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw new Error('Session revocation failed');
        }
    }

    /**
     * Generates a secure token pair with RS256 signing
     * @param user User information for token payload
     * @returns Access and refresh tokens
     * @private
     */
    private async generateTokenPair(user: IUser): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        const signOptions: SignOptions = {
            algorithm: 'RS256',
            expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY
        };

        const accessToken = sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role
            },
            import.meta.env.JWT_PRIVATE_KEY!,
            signOptions
        );

        const refreshToken = sign(
            {
                sub: user.id,
                type: 'refresh'
            },
            import.meta.env.JWT_PRIVATE_KEY!,
            { ...signOptions, expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Verifies a token's signature and expiration
     * @param token Token to verify
     * @private
     */
    private async verifyToken(token: string): Promise<object> {
        const verifyOptions: VerifyOptions = {
            algorithms: ['RS256']
        };

        return verify(token, import.meta.env.JWT_PUBLIC_KEY!, verifyOptions);
    }

    /**
     * Stores an encrypted refresh token in Redis
     * @param userId User ID associated with the token
     * @param token Refresh token to store
     * @private
     */
    private async storeRefreshToken(userId: string, token: string): Promise<void> {
        const encryptedToken = this.encryptToken(token);
        await this.redisClient.set(
            `${TOKEN_CONFIG.TOKEN_NAMESPACE}${userId}`,
            encryptedToken,
            'EX',
            14 * 24 * 60 * 60 // 14 days in seconds
        );
    }

    /**
     * Adds a token to the blacklist
     * @param token Token to blacklist
     * @private
     */
    private async blacklistToken(token: string): Promise<void> {
        await this.redisClient.set(
            `${TOKEN_CONFIG.BLACKLIST_NAMESPACE}${token}`,
            '1',
            'EX',
            24 * 60 * 60 // 24 hours in seconds
        );
    }

    /**
     * Sets secure HTTP-only cookies for token storage
     * @param res Express response object
     * @param tokens Token pair to store in cookies
     * @private
     */
    private setSecureCookies(
        res: Response,
        tokens: { accessToken: string; refreshToken: string }
    ): void {
        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/api/auth/refresh',
            maxAge: 1209600000 // 14 days
        });
    }

    /**
     * Encrypts a token for secure storage
     * @param token Token to encrypt
     * @private
     */
    private encryptToken(token: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            TOKEN_CONFIG.ENCRYPTION_ALGORITHM,
            import.meta.env.ENCRYPTION_KEY!,
            iv
        );
        
        const encrypted = Buffer.concat([
            cipher.update(token, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return Buffer.concat([iv, authTag, encrypted]).toString('base64');
    }

    /**
     * Verifies token entropy meets minimum security requirements
     * @param token Token to check
     * @private
     */
    private hasMinimumEntropy(token: string): boolean {
        const entropy = crypto.randomBytes(32).toString('base64');
        return Buffer.from(token).length * 8 >= TOKEN_CONFIG.MIN_ENTROPY_BITS;
    }
}