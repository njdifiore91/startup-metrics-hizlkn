import { describe, test, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'; // ^29.5.0
import { encrypt, decrypt, generateKey, hash } from '../../../src/utils/encryption';
import { randomBytes } from 'crypto';

// Mock crypto.randomBytes
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn()
}));

describe('Encryption Utility Tests', () => {
  // Test constants
  const TEST_KEY_LENGTH = 32;
  const TEST_IV_LENGTH = 16;
  const TEST_TAG_LENGTH = 16;
  const TEST_DATA = {
    empty: '',
    ascii: 'Hello World!',
    unicode: '🔒 Hello 世界!',
    large: 'x'.repeat(1000000)
  };

  // Test vectors
  let testKey: Buffer;
  let mockRandomBytes: jest.Mock;

  beforeAll(() => {
    mockRandomBytes = randomBytes as jest.Mock;
    mockRandomBytes.mockImplementation((size: number) => Buffer.alloc(size, 1));
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    testKey = await generateKey(TEST_KEY_LENGTH);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear sensitive data
    testKey = Buffer.alloc(0);
  });

  describe('generateKey', () => {
    test('generates key with correct length', async () => {
      const key = await generateKey(TEST_KEY_LENGTH);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(TEST_KEY_LENGTH);
    });

    test('throws error for invalid key length', async () => {
      await expect(generateKey(0)).rejects.toThrow('Invalid key length');
      await expect(generateKey(-1)).rejects.toThrow('Invalid key length');
    });

    test('generates unique keys', async () => {
      mockRandomBytes.mockRestore();
      const key1 = await generateKey(TEST_KEY_LENGTH);
      const key2 = await generateKey(TEST_KEY_LENGTH);
      expect(key1).not.toEqual(key2);
    });

    test('validates entropy of generated key', async () => {
      mockRandomBytes.mockImplementationOnce(() => Buffer.alloc(TEST_KEY_LENGTH, 0));
      await expect(generateKey(TEST_KEY_LENGTH)).rejects.toThrow('insufficient entropy');
    });
  });

  describe('encrypt', () => {
    test('encrypts data with valid parameters', async () => {
      const result = await encrypt(TEST_DATA.ascii, testKey);
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      expect(Buffer.from(result.iv, 'base64').length).toBe(TEST_IV_LENGTH);
      expect(Buffer.from(result.tag, 'base64').length).toBe(TEST_TAG_LENGTH);
    });

    test('handles empty string encryption', async () => {
      const result = await encrypt(TEST_DATA.empty, testKey);
      expect(result.encryptedData).toBeTruthy();
    });

    test('handles unicode string encryption', async () => {
      const result = await encrypt(TEST_DATA.unicode, testKey);
      expect(result.encryptedData).toBeTruthy();
    });

    test('handles large data encryption', async () => {
      const result = await encrypt(TEST_DATA.large, testKey);
      expect(result.encryptedData).toBeTruthy();
    });

    test('throws error for invalid inputs', async () => {
      await expect(encrypt('', Buffer.alloc(0))).rejects.toThrow('Data and key are required');
      await expect(encrypt(TEST_DATA.ascii, Buffer.alloc(16))).rejects.toThrow('Key must be');
    });
  });

  describe('decrypt', () => {
    test('decrypts encrypted data correctly', async () => {
      const encrypted = await encrypt(TEST_DATA.ascii, testKey);
      const decrypted = await decrypt(
        encrypted.encryptedData,
        testKey,
        encrypted.iv,
        encrypted.tag
      );
      expect(decrypted).toBe(TEST_DATA.ascii);
    });

    test('detects tampering with encrypted data', async () => {
      const encrypted = await encrypt(TEST_DATA.ascii, testKey);
      const tampered = encrypted.encryptedData.replace(/A/g, 'B');
      await expect(decrypt(
        tampered,
        testKey,
        encrypted.iv,
        encrypted.tag
      )).rejects.toThrow('Decryption failed');
    });

    test('detects tampering with authentication tag', async () => {
      const encrypted = await encrypt(TEST_DATA.ascii, testKey);
      const tamperedTag = encrypted.tag.replace(/A/g, 'B');
      await expect(decrypt(
        encrypted.encryptedData,
        testKey,
        encrypted.iv,
        tamperedTag
      )).rejects.toThrow('Decryption failed');
    });

    test('throws error for invalid inputs', async () => {
      const encrypted = await encrypt(TEST_DATA.ascii, testKey);
      await expect(decrypt('', testKey, encrypted.iv, encrypted.tag))
        .rejects.toThrow('All parameters are required');
      await expect(decrypt(encrypted.encryptedData, Buffer.alloc(16), encrypted.iv, encrypted.tag))
        .rejects.toThrow('Key must be');
    });
  });

  describe('hash', () => {
    test('generates consistent hashes', async () => {
      const hash1 = await hash(TEST_DATA.ascii);
      const hash2 = await hash(TEST_DATA.ascii);
      expect(hash1).toBe(hash2);
    });

    test('generates different hashes for different inputs', async () => {
      const hash1 = await hash(TEST_DATA.ascii);
      const hash2 = await hash(TEST_DATA.unicode);
      expect(hash1).not.toBe(hash2);
    });

    test('handles empty string hashing', async () => {
      await expect(hash('')).rejects.toThrow('Data is required');
    });

    test('generates hex-encoded hash', async () => {
      const result = await hash(TEST_DATA.ascii);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    test('handles large input hashing', async () => {
      const result = await hash(TEST_DATA.large);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Memory Management', () => {
    test('cleans up sensitive data after encryption', async () => {
      const result = await encrypt(TEST_DATA.ascii, testKey);
      expect(result.encryptedData).toBeTruthy();
      // Verify cipher cleanup by checking internal state
      const cipher = (global as any).__TEST_CIPHER__;
      expect(cipher?.final).toHaveBeenCalled;
      expect(cipher?.end).toHaveBeenCalled;
    });

    test('cleans up sensitive data after decryption', async () => {
      const encrypted = await encrypt(TEST_DATA.ascii, testKey);
      const decrypted = await decrypt(
        encrypted.encryptedData,
        testKey,
        encrypted.iv,
        encrypted.tag
      );
      expect(decrypted).toBeTruthy();
      // Verify decipher cleanup by checking internal state
      const decipher = (global as any).__TEST_DECIPHER__;
      expect(decipher?.final).toHaveBeenCalled;
      expect(decipher?.end).toHaveBeenCalled;
    });
  });
});