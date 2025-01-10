import { describe, test, expect } from '@jest/globals';
import { validateMetricValue, validateUserData, sanitizeInput } from '../../../src/utils/validation';
import { METRIC_VALIDATION_RULES, USER_VALIDATION_RULES } from '../../../src/constants/validations';
import { METRIC_VALUE_TYPES } from '../../../src/constants/metricTypes';
import type { IMetric } from '../../../src/interfaces/IMetric';

describe('validateMetricValue', () => {
  // Test data setup
  const createMetric = (valueType: string): IMetric => ({
    id: 'test-id',
    name: 'Test Metric',
    category: 'financial',
    valueType: valueType as any,
    validationRules: METRIC_VALIDATION_RULES[valueType],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('Percentage Validation', () => {
    const percentageMetric = createMetric(METRIC_VALUE_TYPES.PERCENTAGE);

    test('should validate valid percentage values', () => {
      const validCases = ['75.5', '0.01', '100.00', '0', '99.99'];
      validCases.forEach(value => {
        const result = validateMetricValue(value, percentageMetric);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(typeof result.sanitizedValue).toBe('number');
      });
    });

    test('should reject invalid percentage values', () => {
      const invalidCases = ['150.5', '-1', '100.001', 'abc', ''];
      invalidCases.forEach(value => {
        const result = validateMetricValue(value, percentageMetric);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should enforce decimal precision for percentages', () => {
      const result = validateMetricValue('75.555', percentageMetric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 2 decimal places allowed');
    });
  });

  describe('Currency Validation', () => {
    const currencyMetric = createMetric(METRIC_VALUE_TYPES.CURRENCY);

    test('should validate valid currency values', () => {
      const validCases = ['1000.00', '0.01', '999999.99', '0.00', '500000.50'];
      validCases.forEach(value => {
        const result = validateMetricValue(value, currencyMetric);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid currency values', () => {
      const invalidCases = ['-100.00', '1000.999', '1000000000.01', 'abc', ''];
      invalidCases.forEach(value => {
        const result = validateMetricValue(value, currencyMetric);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should require exactly two decimal places', () => {
      const result = validateMetricValue('1000.0', currencyMetric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Currency must be between 0 and 1B with exactly 2 decimal places');
    });
  });

  describe('Number Validation', () => {
    const numberMetric = createMetric(METRIC_VALUE_TYPES.NUMBER);

    test('should validate valid number values', () => {
      const validCases = ['0', '1000', '999999', '1', '500000'];
      validCases.forEach(value => {
        const result = validateMetricValue(value, numberMetric);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid number values', () => {
      const invalidCases = ['-1', '1000.5', '1000000001', 'abc', ''];
      invalidCases.forEach(value => {
        const result = validateMetricValue(value, numberMetric);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject decimal values', () => {
      const result = validateMetricValue('100.5', numberMetric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Number must be between 0 and 1M with no decimal places');
    });
  });

  describe('Ratio Validation', () => {
    const ratioMetric = createMetric(METRIC_VALUE_TYPES.RATIO);

    test('should validate valid ratio values', () => {
      const validCases = ['0.875', '1.000', '0.001', '999.999', '0'];
      validCases.forEach(value => {
        const result = validateMetricValue(value, ratioMetric);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject invalid ratio values', () => {
      const invalidCases = ['-0.5', '1000.1', '0.8888', 'abc', ''];
      invalidCases.forEach(value => {
        const result = validateMetricValue(value, ratioMetric);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should enforce three decimal places maximum', () => {
      const result = validateMetricValue('0.8888', ratioMetric);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum 3 decimal places allowed');
    });
  });
});

describe('validateUserData', () => {
  describe('Email Validation', () => {
    test('should validate valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+label@example.com',
        'valid@subdomain.example.com'
      ];
      validEmails.forEach(email => {
        const result = validateUserData({ email });
        expect(result.isValid).toBe(true);
        expect(result.errors.email).toBeUndefined();
      });
    });

    test('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test@.com',
        'test@com',
        ''
      ];
      invalidEmails.forEach(email => {
        const result = validateUserData({ email });
        expect(result.isValid).toBe(false);
        expect(result.errors.email).toBeDefined();
      });
    });

    test('should enforce email length limits', () => {
      const longEmail = 'a'.repeat(245) + '@example.com';
      const result = validateUserData({ email: longEmail });
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain(`Email must not exceed ${USER_VALIDATION_RULES.EMAIL.maxLength} characters`);
    });
  });

  describe('Name Validation', () => {
    test('should validate valid names', () => {
      const validNames = [
        'John Doe',
        'María-José',
        "O'Connor",
        'Jean-Pierre',
        'Anna Maria'
      ];
      validNames.forEach(name => {
        const result = validateUserData({ name });
        expect(result.isValid).toBe(true);
        expect(result.errors.name).toBeUndefined();
      });
    });

    test('should reject invalid names', () => {
      const invalidNames = [
        'A',
        'A'.repeat(51),
        '123',
        '<script>alert("xss")</script>',
        ''
      ];
      invalidNames.forEach(name => {
        const result = validateUserData({ name });
        expect(result.isValid).toBe(false);
        expect(result.errors.name).toBeDefined();
      });
    });

    test('should enforce name length limits', () => {
      const longName = 'A'.repeat(51);
      const result = validateUserData({ name: longName });
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain(`Name must not exceed ${USER_VALIDATION_RULES.NAME.maxLength} characters`);
    });
  });
});

describe('sanitizeInput', () => {
  test('should sanitize HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
  });

  test('should handle empty input', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });

  test('should respect maxLength option', () => {
    const input = 'a'.repeat(100);
    const result = sanitizeInput(input, { maxLength: 50 });
    expect(result.length).toBe(50);
  });

  test('should allow specified HTML tags when configured', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeInput(input, { allowedTags: ['p'] });
    expect(result).toContain('<p>');
    expect(result).toContain('</p>');
    expect(result).not.toContain('<script>');
  });

  test('should handle complex HTML entities', () => {
    const input = '&lt;div&gt;Test&lt;/div&gt;';
    const result = sanitizeInput(input);
    expect(result).toBe('&lt;div&gt;Test&lt;/div&gt;');
  });
});