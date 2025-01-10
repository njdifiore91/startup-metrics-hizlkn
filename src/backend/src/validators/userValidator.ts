/**
 * User data validation module implementing comprehensive validation schemas and functions
 * for user-related data using Joi with enhanced security measures.
 * @version 1.0.0
 */

import Joi from 'joi'; // v17.9.0
import { IUser } from '../interfaces/IUser';
import { USER_ROLES } from '../constants/roles';
import { USER_VALIDATION_RULES, INPUT_LENGTH_LIMITS } from '../constants/validations';

/**
 * Enhanced validation schema for user creation with strict security rules
 */
export const createUserSchema = Joi.object<IUser>({
    email: Joi.string()
        .required()
        .max(INPUT_LENGTH_LIMITS.MAX_EMAIL_LENGTH)
        .pattern(USER_VALIDATION_RULES.EMAIL.format)
        .trim()
        .lowercase()
        .messages({
            'string.pattern.base': USER_VALIDATION_RULES.EMAIL.errorMessage,
            'string.max': `Email must not exceed ${INPUT_LENGTH_LIMITS.MAX_EMAIL_LENGTH} characters`,
            'string.empty': 'Email is required'
        }),

    name: Joi.string()
        .required()
        .min(INPUT_LENGTH_LIMITS.MIN_NAME_LENGTH)
        .max(INPUT_LENGTH_LIMITS.MAX_NAME_LENGTH)
        .pattern(USER_VALIDATION_RULES.NAME.format)
        .trim()
        .messages({
            'string.pattern.base': USER_VALIDATION_RULES.NAME.errorMessage,
            'string.min': `Name must be at least ${INPUT_LENGTH_LIMITS.MIN_NAME_LENGTH} characters`,
            'string.max': `Name must not exceed ${INPUT_LENGTH_LIMITS.MAX_NAME_LENGTH} characters`,
            'string.empty': 'Name is required'
        }),

    role: Joi.string()
        .valid(...Object.values(USER_ROLES))
        .required()
        .messages({
            'any.only': 'Invalid role specified',
            'any.required': 'Role is required'
        })
}).strict();

/**
 * Enhanced validation schema for user updates with version control
 */
export const updateUserSchema = Joi.object<Partial<IUser>>({
    name: Joi.string()
        .min(INPUT_LENGTH_LIMITS.MIN_NAME_LENGTH)
        .max(INPUT_LENGTH_LIMITS.MAX_NAME_LENGTH)
        .pattern(USER_VALIDATION_RULES.NAME.format)
        .trim()
        .messages({
            'string.pattern.base': USER_VALIDATION_RULES.NAME.errorMessage,
            'string.min': `Name must be at least ${INPUT_LENGTH_LIMITS.MIN_NAME_LENGTH} characters`,
            'string.max': `Name must not exceed ${INPUT_LENGTH_LIMITS.MAX_NAME_LENGTH} characters`
        }),

    role: Joi.string()
        .valid(...Object.values(USER_ROLES))
        .messages({
            'any.only': 'Invalid role specified'
        }),

    version: Joi.number()
        .required()
        .min(0)
        .messages({
            'number.base': 'Version must be a number',
            'number.min': 'Version must be non-negative',
            'any.required': 'Version is required for updates'
        })
}).strict();

/**
 * Sanitizes and validates user data during creation with enhanced security checks
 * @param userData - The user data to validate
 * @returns Promise resolving to validation result with error, value, and sanitization status
 */
export const validateUserCreation = async (
    userData: Partial<IUser>
): Promise<{
    error?: Joi.ValidationError;
    value?: IUser;
    sanitized: boolean;
}> => {
    try {
        // Sanitize input data
        const sanitizedData = {
            ...userData,
            email: userData.email?.trim().toLowerCase(),
            name: userData.name?.trim(),
        };

        // Validate with strict mode
        const { error, value } = await createUserSchema.validateAsync(sanitizedData, {
            abortEarly: false,
            stripUnknown: true
        });

        return {
            error,
            value,
            sanitized: true
        };
    } catch (error) {
        return {
            error: error as Joi.ValidationError,
            sanitized: true
        };
    }
};

/**
 * Sanitizes and validates user update data with version control
 * @param updateData - The user update data to validate
 * @returns Promise resolving to validation result with error, value, and sanitization status
 */
export const validateUserUpdate = async (
    updateData: Partial<IUser>
): Promise<{
    error?: Joi.ValidationError;
    value?: Partial<IUser>;
    sanitized: boolean;
}> => {
    try {
        // Sanitize input data
        const sanitizedData = {
            ...updateData,
            name: updateData.name?.trim(),
            version: updateData.version
        };

        // Validate with strict mode
        const { error, value } = await updateUserSchema.validateAsync(sanitizedData, {
            abortEarly: false,
            stripUnknown: true
        });

        return {
            error,
            value,
            sanitized: true
        };
    } catch (error) {
        return {
            error: error as Joi.ValidationError,
            sanitized: true
        };
    }
};