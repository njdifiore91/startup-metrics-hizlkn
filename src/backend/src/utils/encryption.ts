import { createCipheriv, createDecipheriv, randomBytes, createHash, CipherGCM, DecipherGCM } from 'crypto'; // ^1.0.0
import { CustomError } from 'ts-custom-error'; // ^3.3.1
import { authConfig } from '../config/auth';

/**
 * Custom error class for encryption-related errors
 */
class EncryptionError extends CustomError {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Interface for encryption operation results
 */
export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
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
const TAG_LENGTH = 16; // 128 bits
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
 * Encrypts data using AES-256-GCM algorithm with secure IV generation
 * @param data - String data to encrypt
 * @param key - Encryption key as Buffer
 * @param options - Optional cryptographic parameters
 * @returns Promise resolving to EncryptionResult containing encrypted data, IV, and tag
 * @throws EncryptionError for invalid inputs or encryption failures
 */
export async function encrypt(
  data: string,
  key: Buffer,
  options: CryptoOptions = { keyLength: KEY_LENGTH, ivLength: IV_LENGTH, tagLength: TAG_LENGTH }
): Promise<EncryptionResult> {
  if (!data || !key) {
    throw new EncryptionError('Data and key are required');
  }

  if (key.length !== options.keyLength) {
    throw new EncryptionError(`Key must be ${options.keyLength} bytes`);
  }

  let cipher: CipherGCM;
  try {
    const iv = randomBytes(options.ivLength);
    cipher = createCipheriv(ALGORITHM, key, iv) as CipherGCM;
    
    const encryptedData = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encryptedData: encryptedData.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  } catch (error) {
    throw new EncryptionError(`Encryption failed: ${error.message}`);
  } finally {
    // Clean up sensitive data
    if (cipher) {
      cipher.end();
    }
  }
}

/**
 * Decrypts data using AES-256-GCM algorithm with authentication verification
 * @param encryptedData - Base64 encoded encrypted data
 * @param key - Decryption key as Buffer
 * @param iv - Base64 encoded initialization vector
 * @param tag - Base64 encoded authentication tag
 * @param options - Optional cryptographic parameters
 * @returns Promise resolving to decrypted string
 * @throws EncryptionError for invalid inputs, decryption failures, or authentication failures
 */
export async function decrypt(
  encryptedData: string,
  key: Buffer,
  iv: string,
  tag: string,
  options: CryptoOptions = { keyLength: KEY_LENGTH, ivLength: IV_LENGTH, tagLength: TAG_LENGTH }
): Promise<string> {
  if (!encryptedData || !key || !iv || !tag) {
    throw new EncryptionError('All parameters are required for decryption');
  }

  if (key.length !== options.keyLength) {
    throw new EncryptionError(`Key must be ${options.keyLength} bytes`);
  }

  let decipher: DecipherGCM;
  try {
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    decipher = createDecipheriv(ALGORITHM, key, ivBuffer) as DecipherGCM;
    decipher.setAuthTag(tagBuffer);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new EncryptionError(`Decryption failed: ${error.message}`);
  } finally {
    // Clean up sensitive data
    if (decipher) {
      decipher.end();
    }
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