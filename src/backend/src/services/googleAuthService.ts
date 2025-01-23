import { OAuth2Client, TokenPayload } from 'google-auth-library'; // ^8.7.0
import { sign, verify } from 'jsonwebtoken'; // ^9.0.0
import { Request, Response } from 'express'; // ^4.18.2
import { createClient } from 'redis'; // ^4.6.7
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'; // built-in

import { IAuthProvider } from '../interfaces/IAuthProvider';
import { IUser } from '../interfaces/IUser';
import { authConfig } from '../config/auth';
import { logger } from '../utils/logger';
import { USER_ROLES } from '../constants/roles';

/**
 * Enhanced Google OAuth authentication service with secure token management
 * Implements IAuthProvider interface with comprehensive security features
 */
class GoogleAuthService implements IAuthProvider {
    private readonly OAuth2Client: OAuth2Client;
    private readonly redisClient: ReturnType<typeof createClient>;
    private readonly tokenEncryptionKey: Buffer;
    private readonly rateLimitWindow: number = 3600; // 1 hour
    private readonly maxLoginAttempts: number = 5;

    constructor() {
        // Initialize Google OAuth client
        this.OAuth2Client = new OAuth2Client({
            clientId: authConfig.google.clientId,
            clientSecret: authConfig.google.clientSecret,
            redirectUri: authConfig.google.callbackURL
        });

        // Initialize Redis client with secure configuration
        this.redisClient = createClient({
            url: import.meta.env.REDIS_URL,
            socket: {
                tls: import.meta.env.NODE_ENV === 'production',
                rejectUnauthorized: true
            }
        });

        // Initialize encryption key for token storage
        this.tokenEncryptionKey = randomBytes(32);

        // Connect to Redis
        this.redisClient.connect().catch(error => {
            logger.error('Redis connection error', { error });
            throw error;
        });
    }

    /**
     * Authenticates user with Google OAuth2 flow and implements secure token management
     */
    public async authenticate(req: Request, res: Response): Promise<{
        user: IUser;
        accessToken: string;
        refreshToken: string;
    }> {
        try {
            // Rate limiting check
            const clientIp = req.ip;
            const attempts = await this.redisClient.incr(`login_attempts:${clientIp}`);
            await this.redisClient.expire(`login_attempts:${clientIp}`, this.rateLimitWindow);

            if (attempts > this.maxLoginAttempts) {
                logger.warn('Rate limit exceeded', { clientIp });
                throw new Error('Too many login attempts');
            }

            // Validate authorization code
            const { code } = req.body;
            if (!code) {
                throw new Error('Authorization code required');
            }

            // Exchange code for tokens
            const { tokens } = await this.OAuth2Client.getToken(code);
            const ticket = await this.OAuth2Client.verifyIdToken({
                idToken: tokens.id_token!,
                audience: authConfig.google.clientId
            });

            const payload: TokenPayload = ticket.getPayload()!;

            // Create or update user
            const user: IUser = {
                id: payload.sub,
                email: payload.email!,
                name: payload.name!,
                role: USER_ROLES.USER,
                googleId: payload.sub,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                profileImageUrl: payload.picture,
                version: 1
            };

            // Generate JWT tokens
            const accessToken = sign(
                { userId: user.id, role: user.role },
                authConfig.jwt.privateKey!,
                {
                    algorithm: authConfig.jwt.algorithm,
                    expiresIn: authConfig.jwt.expiresIn,
                    issuer: authConfig.jwt.issuer,
                    audience: authConfig.jwt.audience
                }
            );

            const refreshToken = randomBytes(40).toString('hex');
            const encryptedRefreshToken = this.encryptToken(refreshToken);

            // Store refresh token in Redis with user context
            await this.redisClient.set(
                `refresh_token:${refreshToken}`,
                JSON.stringify({ userId: user.id, version: 1 }),
                { EX: 14 * 24 * 60 * 60 } // 14 days
            );

            logger.info('User authenticated successfully', {
                userId: user.id,
                email: user.email
            });

            return { user, accessToken, refreshToken };
        } catch (error) {
            logger.error('Authentication failed', { error });
            throw error;
        }
    }

    /**
     * Validates JWT token with enhanced security checks
     */
    public async validateToken(token: string): Promise<IUser> {
        try {
            // Check token blacklist
            const isBlacklisted = await this.redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }

            // Verify token signature and claims
            const decoded = verify(token, authConfig.jwt.publicKey!, {
                algorithms: [authConfig.jwt.algorithm],
                issuer: authConfig.jwt.issuer,
                audience: authConfig.jwt.audience,
                clockTolerance: authConfig.jwt.clockTolerance
            }) as { userId: string; role: string };

            // Fetch user details (mock implementation)
            const user: IUser = {
                id: decoded.userId,
                email: 'user@example.com', // In real implementation, fetch from database
                name: 'User',
                role: decoded.role as typeof USER_ROLES[keyof typeof USER_ROLES],
                googleId: decoded.userId,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                version: 1
            };

            return user;
        } catch (error) {
            logger.error('Token validation failed', { error });
            throw error;
        }
    }

    /**
     * Generates new access token with secure refresh token rotation
     */
    public async refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: IUser;
    }> {
        try {
            // Validate refresh token
            const tokenData = await this.redisClient.get(
                `refresh_token:${refreshToken}`
            );
            if (!tokenData) {
                throw new Error('Invalid refresh token');
            }

            const { userId, version } = JSON.parse(tokenData);

            // Generate new token pair
            const newAccessToken = sign(
                { userId },
                authConfig.jwt.privateKey!,
                {
                    algorithm: authConfig.jwt.algorithm,
                    expiresIn: authConfig.jwt.expiresIn,
                    issuer: authConfig.jwt.issuer,
                    audience: authConfig.jwt.audience
                }
            );

            const newRefreshToken = randomBytes(40).toString('hex');

            // Implement token rotation
            await this.redisClient.multi()
                .del(`refresh_token:${refreshToken}`)
                .set(
                    `refresh_token:${newRefreshToken}`,
                    JSON.stringify({ userId, version: version + 1 }),
                    { EX: 14 * 24 * 60 * 60 }
                )
                .exec();

            // Mock user data (in real implementation, fetch from database)
            const user: IUser = {
                id: userId,
                email: 'user@example.com',
                name: 'User',
                role: USER_ROLES.USER,
                googleId: userId,
                createdAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                version: version + 1
            };

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user
            };
        } catch (error) {
            logger.error('Token refresh failed', { error });
            throw error;
        }
    }

    /**
     * Revokes tokens and invalidates sessions
     */
    public async revokeToken(refreshToken: string): Promise<void> {
        try {
            // Invalidate refresh token
            await this.redisClient.del(`refresh_token:${refreshToken}`);

            // Add to blacklist with expiry
            await this.redisClient.set(
                `blacklist:${refreshToken}`,
                '1',
                { EX: 14 * 24 * 60 * 60 }
            );

            logger.info('Token revoked successfully');
        } catch (error) {
            logger.error('Token revocation failed', { error });
            throw error;
        }
    }

    /**
     * Encrypts refresh token for secure storage
     */
    private encryptToken(token: string): string {
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-gcm', this.tokenEncryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(token, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
    }

    /**
     * Decrypts stored refresh token
     */
    private decryptToken(encryptedToken: string): string {
        const [ivHex, encryptedHex, authTagHex] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = createDecipheriv('aes-256-gcm', this.tokenEncryptionKey, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final('utf8');
    }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService();