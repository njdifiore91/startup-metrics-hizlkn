import { describe, expect, jest, test, beforeEach, afterEach } from '@jest/globals'; // ^29.0.0
import { SendEmailCommand } from '@aws-sdk/client-ses'; // ^3.0.0
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.4.1
import { EmailService } from '../../src/services/emailService';
import { sesClient, emailTemplates } from '../../src/config/email';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/config/email', () => ({
  sesClient: {
    send: jest.fn()
  },
  emailTemplates: {
    welcomeEmail: {
      id: 'welcome',
      version: '1.0.0',
      subject: 'Welcome to Startup Metrics Platform',
      body: 'Hello {{name}},\n\nWelcome to the Startup Metrics Platform.',
      variables: ['name'],
      html: false
    },
    exportComplete: {
      id: 'export-complete',
      version: '1.0.0',
      subject: 'Your Export is Ready',
      body: 'Your benchmark data export is ready. Download here: {{downloadLink}}',
      variables: ['downloadLink'],
      html: true
    },
    benchmarkAlert: {
      id: 'benchmark-alert',
      version: '1.0.0',
      subject: 'Benchmark Alert: {{metricName}}',
      body: 'Your {{metricName}} has exceeded the threshold: {{currentValue}} > {{threshold}}',
      variables: ['metricName', 'currentValue', 'threshold'],
      html: true
    }
  },
  defaultSender: 'test@example.com'
}));

jest.mock('../../src/utils/logger');
jest.mock('rate-limiter-flexible');

describe('EmailService', () => {
  let emailService: EmailService;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    googleId: 'test-google-id',
    role: 'user',
    createdAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true,
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService();
    (RateLimiter as jest.Mock).mockImplementation(() => ({
      consume: jest.fn().mockResolvedValue(true)
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendEmail', () => {
    test('should successfully send an email with security headers', async () => {
      // Mock successful SES response
      (sesClient.send as jest.Mock).mockResolvedValueOnce({});

      const result = await emailService.sendEmail({
        to: [mockUser.email],
        templateId: 'welcomeEmail',
        variables: { name: mockUser.name }
      });

      expect(result).toBe(true);
      expect(sesClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.objectContaining({
            Subject: expect.objectContaining({
              Data: expect.any(String),
              Charset: 'UTF-8'
            })
          })
        })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Email sent successfully',
        expect.any(Object)
      );
    });

    test('should handle rate limiting correctly', async () => {
      // Mock rate limit exceeded
      (RateLimiter as jest.Mock).mockImplementation(() => ({
        consume: jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))
      }));

      const result = await emailService.sendEmail({
        to: [mockUser.email],
        templateId: 'welcomeEmail',
        variables: { name: mockUser.name }
      });

      expect(result).toBe(false);
      expect(sesClient.send).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.any(Object)
      );
    });

    test('should retry on temporary failures', async () => {
      // Mock temporary failure then success
      (sesClient.send as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({});

      const result = await emailService.sendEmail({
        to: [mockUser.email],
        templateId: 'welcomeEmail',
        variables: { name: mockUser.name }
      });

      expect(result).toBe(true);
      expect(sesClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendWelcomeEmail', () => {
    test('should send welcome email with correct template', async () => {
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');
      await emailService.sendWelcomeEmail(mockUser);

      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: [mockUser.email],
        templateId: 'welcomeEmail',
        variables: { name: mockUser.name }
      });
    });
  });

  describe('sendExportCompleteEmail', () => {
    test('should send export completion email with download link', async () => {
      const downloadLink = 'https://example.com/export/123';
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');
      
      await emailService.sendExportCompleteEmail(mockUser, downloadLink);

      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: [mockUser.email],
        templateId: 'exportComplete',
        variables: { downloadLink }
      });
    });
  });

  describe('sendBenchmarkAlert', () => {
    test('should send benchmark alert with high priority', async () => {
      const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');
      const metricName = 'ARR Growth';
      const currentValue = '75%';
      const threshold = '50%';

      await emailService.sendBenchmarkAlert(
        mockUser,
        metricName,
        currentValue,
        threshold
      );

      expect(sendEmailSpy).toHaveBeenCalledWith({
        to: [mockUser.email],
        templateId: 'benchmarkAlert',
        variables: { metricName, currentValue, threshold },
        priority: 'high'
      });
    });
  });

  describe('handleBounce', () => {
    test('should process bounce notification correctly', async () => {
      const bounceInfo = {
        emailAddress: 'bounce@example.com',
        bounceType: 'Permanent',
        bounceSubType: 'Suppressed',
        timestamp: new Date()
      };

      // @ts-ignore - accessing private method for testing
      await emailService.handleBounce(bounceInfo);

      expect(logger.warn).toHaveBeenCalledWith(
        'Email bounce received',
        expect.objectContaining({ bounceInfo })
      );
    });
  });

  describe('handleComplaint', () => {
    test('should process complaint notification correctly', async () => {
      const complaintInfo = {
        emailAddress: 'complaint@example.com',
        complaintType: 'abuse',
        timestamp: new Date()
      };

      // @ts-ignore - accessing private method for testing
      await emailService.handleComplaint(complaintInfo);

      expect(logger.warn).toHaveBeenCalledWith(
        'Email complaint received',
        expect.objectContaining({ complaintInfo })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template gracefully', async () => {
      const result = await emailService.sendEmail({
        to: [mockUser.email],
        // @ts-ignore - testing invalid template
        templateId: 'nonexistentTemplate',
        variables: {}
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.any(Object)
      );
    });

    test('should handle SES service errors', async () => {
      (sesClient.send as jest.Mock).mockRejectedValue(
        new Error('SES Service Error')
      );

      const result = await emailService.sendEmail({
        to: [mockUser.email],
        templateId: 'welcomeEmail',
        variables: { name: mockUser.name }
      });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send email',
        expect.any(Object)
      );
    });
  });
});