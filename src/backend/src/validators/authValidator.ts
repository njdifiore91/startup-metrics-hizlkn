/**
 * Authentication request validator for the Startup Metrics Benchmarking Platform.
 * Implements comprehensive validation for Google OAuth, token management, and session validation.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import sanitizeHtml from 'sanitize-html'; // v2.11.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.1

import { IUser } from '../interfaces/IUser';
import { USER_VALIDATION_RULES } from '../constants/validations';
import { AUTH_ERRORS } from '../constants/errorCodes';

// Rate limiter configuration for authentication attempts
const authRateLimiter = new RateLimiterMemory({
    points: 5, // Number of attempts
    duration: 60, // Per minute
    blockDuration: 300 // 5 minutes block
});

/**
 * Interface for validation results
 */
interface ValidationResult {
    isValid: boolean;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Sanitizes input to prevent XSS attacks
 * @param input String input to sanitize
 */
const sanitizeInput = (input: string): string => {
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
    });
};

/**
 * Validates redirect URI against whitelist
 * @param uri Redirect URI to validate
 */
const validateRedirectUri = (uri: string): boolean => {
    // Decode the URI if it's encoded
    const decodedUri = decodeURIComponent(uri.replace(/&#x2F;/g, '/'));
    
    const allowedDomains = [
        'localhost:3000',
        'localhost',
        'startup-metrics.com',
        'app.startup-metrics.com'
    ];

    try {
        const url = new URL(decodedUri);
        
        // Allow any localhost URL during development
        if (url.hostname === 'localhost') {
            return true;
        }

        // For non-localhost, check against allowed domains
        return allowedDomains.some(domain => {
            // Remove protocol and trailing slashes for comparison
            const hostWithPort = url.host;
            return domain === hostWithPort;
        });
    } catch (error) {
        console.error('URL parsing error:', error);
        return false;
    }
};

/**
 * Validates JWT token format
 * @param token Token to validate
 */
const validateTokenFormat = (token: string): boolean => {
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
    return jwtRegex.test(token);
};

/**
 * Schema for Google OAuth authentication requests
 */
const googleAuthSchema = Joi.object({
    code: Joi.string()
        .required()
        .messages({
            'string.empty': 'Authorization code is required',
            'any.required': 'Authorization code is required'
        }),
    redirectUri: Joi.string()
        .required()
        .custom((value, helpers) => {
            try {
                const url = new URL(value);
                if (!validateRedirectUri(value)) {
                    return helpers.error('any.invalid');
                }
                return value;
            } catch (error) {
                return helpers.error('any.invalid');
            }
        })
        .messages({
            'string.empty': 'Redirect URI is required',
            'any.required': 'Redirect URI is required',
            'any.invalid': 'Invalid redirect URI format or domain not allowed'
        })
});

/**
 * Schema for token refresh requests
 */
const tokenRefreshSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .custom((value) => {
            if (!validateTokenFormat(value)) {
                throw new Error('Invalid token format');
            }
            return value;
        })
        .messages({
            'string.empty': 'Refresh token is required',
            'any.required': 'Refresh token is required'
        }),
    userId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Invalid user ID format',
            'any.required': 'User ID is required'
        })
});

/**
 * Schema for session validation
 */
const sessionSchema = Joi.object({
    sessionToken: Joi.string()
        .required()
        .custom((value) => validateTokenFormat(value))
        .messages({
            'string.empty': 'Session token is required',
            'any.required': 'Session token is required'
        }),
    userId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Invalid user ID format',
            'any.required': 'User ID is required'
        }),
    email: Joi.string()
        .email()
        .max(USER_VALIDATION_RULES.EMAIL.maxLength)
        .required()
        .messages({
            'string.email': 'Invalid email format',
            'string.max': `Email cannot exceed ${USER_VALIDATION_RULES.EMAIL.maxLength} characters`
        })
});

/**
 * Validation schema for Google OAuth request
 */
export const validateGoogleAuthRequest = Joi.object({
    code: Joi.string().required().messages({
        'string.empty': 'Authorization code is required',
        'any.required': 'Authorization code is required'
    })
});

/**
 * Validation schema for refresh token request
 */
export const validateRefreshTokenRequest = Joi.object({
    refreshToken: Joi.string().required().messages({
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required'
    })
});

/**
 * Validates Google OAuth authentication request data
 * @param requestData Request data to validate
 * @param ipAddress IP address for rate limiting
 */
export const validateGoogleAuthRequestData = async (
    requestData: any,
    ipAddress: string
): Promise<ValidationResult> => {
    try {
        // Check rate limiting
        await authRateLimiter.consume(ipAddress);

        // Validate request data
        await googleAuthSchema.validateAsync(requestData, { abortEarly: false });

        return { isValid: true };
    } catch (error) {
        if (error.name === 'RateLimiterError') {
            return {
                isValid: false,
                error: {
                    ...AUTH_ERRORS.RATE_LIMIT_EXCEEDED,
                    details: 'Too many authentication attempts'
                }
            };
        }

        return {
            isValid: false,
            error: {
                ...AUTH_ERRORS.UNAUTHORIZED,
                details: error.details || error.message
            }
        };
    }
};

/**
 * Validates token refresh requests
 * @param requestData Request data to validate
 */
export const validateTokenRequest = async (
    requestData: any
): Promise<ValidationResult> => {
    try {
        await tokenRefreshSchema.validateAsync(requestData, { abortEarly: false });
        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: {
                ...AUTH_ERRORS.INVALID_TOKEN,
                details: error.details || error.message
            }
        };
    }
};

/**
 * Validates user session data
 * @param sessionData Session data to validate
 */
export const validateSession = async (
    sessionData: any
): Promise<ValidationResult> => {
    try {
        await sessionSchema.validateAsync(sessionData, { abortEarly: false });

        // Additional session validation logic
        const tokenExpiration = new Date(sessionData.exp * 1000);
        if (tokenExpiration < new Date()) {
            return {
                isValid: false,
                error: {
                    ...AUTH_ERRORS.TOKEN_EXPIRED,
                    details: 'Session has expired'
                }
            };
        }

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: {
                ...AUTH_ERRORS.UNAUTHORIZED,
                details: error.details || error.message
            }
        };
    }
};