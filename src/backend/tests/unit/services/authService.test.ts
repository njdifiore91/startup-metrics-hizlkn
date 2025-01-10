import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import Redis from 'ioredis-mock';
import { Request, Response } from 'express';
import { AuthService } from '../../../src/services/authService';
import { IAuthProvider } from '../../../src/interfaces/IAuthProvider';
import { IUser } from '../../../src/interfaces/IUser';
import { USER_ROLES } from '../../../src/constants/roles';
import { authConfig } from '../../../src/config/auth';

// Mock user data
const mockUser: IUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: USER_ROLES.USER,
    googleId: '12345',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true,
    version: 1
};

// Mock tokens
const mockTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token'
};

// Mock auth provider implementation
class MockAuthProvider implements IAuthProvider {
    async authenticate(): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
        return { user: mockUser, ...mockTokens };
    }

    async validateToken(): Promise<IUser> {
        return mockUser;
    }

    async refreshToken(): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
        return { ...mockTokens, user: mockUser };
    }

    async revokeToken(): Promise<void> {
        return;
    }
}

describe('AuthService', () => {
    let authService: AuthService;
    let mockRedis: Redis;
    let mockAuthProvider: IAuthProvider;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        // Initialize mocks
        mockRedis = new Redis();
        mockAuthProvider = new MockAuthProvider();
        mockRequest = {
            headers: {},
            cookies: {}
        };
        mockResponse = {
            cookie: jest.fn(),
            clearCookie: jest.fn()
        };

        // Create service instance
        authService = new AuthService(mockAuthProvider, mockRedis);

        // Mock crypto functions
        jest.spyOn(global.crypto, 'randomBytes').mockImplementation(() => Buffer.from('mock-random-bytes'));
        jest.spyOn(global.crypto, 'createCipheriv').mockReturnValue({
            update: jest.fn().mockReturnValue(Buffer.from('mock-encrypted')),
            final: jest.fn().mockReturnValue(Buffer.from('')),
            getAuthTag: jest.fn().mockReturnValue(Buffer.from('mock-auth-tag'))
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockRedis.flushall();
    });

    describe('authenticate', () => {
        it('should successfully authenticate user and return tokens', async () => {
            const result = await authService.authenticate(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(result).toEqual({
                user: mockUser,
                tokens: mockTokens
            });
            expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
        });

        it('should store refresh token in Redis', async () => {
            await authService.authenticate(
                mockRequest as Request,
                mockResponse as Response
            );

            const storedToken = await mockRedis.get(`auth:tokens:${mockUser.id}`);
            expect(storedToken).toBeTruthy();
        });

        it('should set secure HTTP-only cookies', async () => {
            await authService.authenticate(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'accessToken',
                mockTokens.accessToken,
                expect.objectContaining({
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict'
                })
            );
        });

        it('should handle authentication failures', async () => {
            jest.spyOn(mockAuthProvider, 'authenticate').mockRejectedValue(new Error('Auth failed'));

            await expect(
                authService.authenticate(mockRequest as Request, mockResponse as Response)
            ).rejects.toThrow('Authentication failed');
        });
    });

    describe('validateSession', () => {
        it('should validate token and return user data', async () => {
            const result = await authService.validateSession(mockTokens.accessToken);
            expect(result).toEqual(mockUser);
        });

        it('should reject blacklisted tokens', async () => {
            await mockRedis.set(`auth:blacklist:${mockTokens.accessToken}`, '1');

            await expect(
                authService.validateSession(mockTokens.accessToken)
            ).rejects.toThrow('Session validation failed');
        });

        it('should verify token entropy requirements', async () => {
            const weakToken = 'weak.token';
            await expect(
                authService.validateSession(weakToken)
            ).rejects.toThrow('Session validation failed');
        });
    });

    describe('refreshSession', () => {
        it('should refresh tokens and return new pair', async () => {
            const result = await authService.refreshSession(mockTokens.refreshToken);

            expect(result).toEqual({
                ...mockTokens,
                user: mockUser
            });
        });

        it('should blacklist old refresh token', async () => {
            await authService.refreshSession(mockTokens.refreshToken);

            const isBlacklisted = await mockRedis.exists(
                `auth:blacklist:${mockTokens.refreshToken}`
            );
            expect(isBlacklisted).toBe(1);
        });

        it('should handle refresh failures', async () => {
            jest.spyOn(mockAuthProvider, 'refreshToken').mockRejectedValue(new Error('Refresh failed'));

            await expect(
                authService.refreshSession(mockTokens.refreshToken)
            ).rejects.toThrow('Session refresh failed');
        });
    });

    describe('revokeSession', () => {
        it('should revoke session and blacklist token', async () => {
            await authService.revokeSession(mockTokens.refreshToken);

            const isBlacklisted = await mockRedis.exists(
                `auth:blacklist:${mockTokens.refreshToken}`
            );
            expect(isBlacklisted).toBe(1);
        });

        it('should handle revocation failures', async () => {
            jest.spyOn(mockAuthProvider, 'revokeToken').mockRejectedValue(new Error('Revoke failed'));

            await expect(
                authService.revokeSession(mockTokens.refreshToken)
            ).rejects.toThrow('Session revocation failed');
        });
    });

    describe('security features', () => {
        it('should implement rate limiting', async () => {
            const requests = Array(101).fill(null).map(() => 
                authService.authenticate(mockRequest as Request, mockResponse as Response)
            );

            await expect(Promise.all(requests)).rejects.toThrow();
        });

        it('should prevent timing attacks during token validation', async () => {
            const validationStart = Date.now();
            await expect(authService.validateSession('invalid.token')).rejects.toThrow();
            const validationTime = Date.now() - validationStart;

            const validStart = Date.now();
            await authService.validateSession(mockTokens.accessToken);
            const validTime = Date.now() - validStart;

            expect(Math.abs(validationTime - validTime)).toBeLessThan(100);
        });

        it('should enforce minimum token entropy', async () => {
            const weakToken = 'weak.token';
            const strongToken = mockTokens.accessToken;

            await expect(authService.validateSession(weakToken)).rejects.toThrow();
            await expect(authService.validateSession(strongToken)).resolves.toBeTruthy();
        });
    });
});