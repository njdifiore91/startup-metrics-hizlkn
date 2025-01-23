import crypto from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes, createHash, CipherGCM, DecipherGCM } from 'crypto'; // ^1.0.0
import { CustomError } from 'ts-custom-error'; // ^3.3.1
import { authConfig } from '../config/auth';

/**
 * Custom error class for encryption-related errors
 */
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Interface for encryption operation results
 */
export interface EncryptionResult {
  iv: Buffer;
  authTag: Buffer;
  encryptedData: Buffer;
}

/**
 * Interface for cryptographic operation options
 */
export interface CryptoOptions {
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

// Cryptographic constants
const ALGORITHM = 'aes-256-gcm' as const;
const HASH_ALGORITHM = 'sha256' as const;
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const MIN_ENTROPY = 0.75;

/**
 * Validates the entropy of generated cryptographic materials
 * @param data - Buffer containing data to validate
 * @returns Promise resolving to boolean indicating if entropy is sufficient
 */
async function validateEntropy(data: Buffer): Promise<boolean> {
  let entropy = 0;
  const frequencies = new Map<number, number>();
  
  // Calculate byte frequencies
  for (const byte of data) {
    frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
  }
  
  // Calculate Shannon entropy
  for (const count of frequencies.values()) {
    const probability = count / data.length;
    entropy -= probability * Math.log2(probability);
  }
  
  // Normalize entropy to [0,1] range
  entropy /= 8;
  return entropy >= MIN_ENTROPY;
}

/**
 * Generates a cryptographically secure key with entropy validation
 * @param length - Desired key length in bytes
 * @returns Promise resolving to Buffer containing the secure key
 * @throws EncryptionError for invalid length or insufficient entropy
 */
export async function generateKey(length: number): Promise<Buffer> {
  if (length < 1) {
    throw new EncryptionError('Invalid key length specified');
  }

  try {
    const key = randomBytes(length);
    const isEntropic = await validateEntropy(key);
    
    if (!isEntropic) {
      throw new EncryptionError('Generated key has insufficient entropy');
    }
    
    return key;
  } catch (error) {
    throw new EncryptionError(`Key generation failed: ${error.message}`);
  }
}

/**
 * Encrypts data using AES-256-GCM
 */
export async function encrypt(data: string): Promise<string> {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts data using AES-256-GCM
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf8');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]).toString('utf8');
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed');
  }
}

/**
 * Creates a secure hash of data using SHA-256 with input validation
 * @param data - String data to hash
 * @returns Promise resolving to hashed data in hex format
 * @throws EncryptionError for invalid input or hashing failures
 */
export async function hash(data: string): Promise<string> {
  if (!data) {
    throw new EncryptionError('Data is required for hashing');
  }

  try {
    const hasher = createHash(HASH_ALGORITHM);
    hasher.update(data);
    return hasher.digest('hex');
  } catch (error) {
    throw new EncryptionError(`Hashing failed: ${error.message}`);
  }
}

// Export types for external use
export type { CryptoOptions, EncryptionResult };