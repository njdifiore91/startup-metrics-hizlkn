import { injectable } from 'inversify';
import { SendEmailCommand } from '@aws-sdk/client-ses'; // ^3.0.0
import { RateLimiter } from 'rate-limiter-flexible'; // ^2.3.1
import { logger } from '../utils/logger';
import { sesClient, defaultSender, emailTemplates } from '../config/email';
import type { IUser } from '../interfaces/IUser';

// Email tracking and statistics interface
interface EmailStats {
  sent: number;
  failed: number;
  bounced: number;
  complained: number;
  lastSent: Date;
}

// Email options interface
interface SendEmailOptions {
  to: string[];
  templateId: keyof typeof emailTemplates;
  variables: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
}

// Bounce notification interface
interface BounceInfo {
  emailAddress: string;
  bounceType: string;
  bounceSubType: string;
  timestamp: Date;
}

// Complaint notification interface
interface ComplaintInfo {
  emailAddress: string;
  complaintType: string;
  timestamp: Date;
}

/**
 * Service class for handling all email communications using AWS SES
 * Implements comprehensive email delivery, template management, and tracking
 */
@injectable()
export class EmailService {
  private readonly rateLimiter: RateLimiter;
  private readonly stats: EmailStats;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // milliseconds

  constructor() {
    // Initialize rate limiter (14 emails per second per AWS SES limits)
    this.rateLimiter = new RateLimiter({
      points: 14,
      duration: 1,
      blockDuration: 1000
    });

    // Initialize statistics
    this.stats = {
      sent: 0,
      failed: 0,
      bounced: 0,
      complained: 0,
      lastSent: new Date()
    };
  }

  /**
   * Sends an email using a specified template
   * @param options Email sending options
   * @returns Promise resolving to success status
   */
  public async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // Check rate limit
      await this.rateLimiter.consume('email', 1);

      // Validate template
      const template = emailTemplates[options.templateId];
      if (!template) {
        throw new Error(`Template not found: ${options.templateId}`);
      }

      // Process template variables
      let processedBody = template.body;
      let processedSubject = template.subject;
      
      Object.entries(options.variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedBody = processedBody.replace(new RegExp(placeholder, 'g'), value);
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
      });

      // Construct email command
      const command = new SendEmailCommand({
        Source: defaultSender,
        Destination: {
          ToAddresses: options.to
        },
        Message: {
          Subject: {
            Data: processedSubject,
            Charset: 'UTF-8'
          },
          Body: template.html ? {
            Html: {
              Data: processedBody,
              Charset: 'UTF-8'
            }
          } : {
            Text: {
              Data: processedBody,
              Charset: 'UTF-8'
            }
          }
        },
        ...(options.priority === 'high' && {
          ConfigurationSetName: 'HighPriority'
        })
      });

      // Send email with retry logic
      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          await sesClient.send(command);
          this.updateStats('sent');
          logger.info('Email sent successfully', {
            templateId: options.templateId,
            recipients: options.to.length,
            attempt: attempt + 1
          });
          return true;
        } catch (error) {
          attempt++;
          if (attempt === this.maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }

      return false;
    } catch (error) {
      this.updateStats('failed');
      logger.error('Failed to send email', {
        error,
        templateId: options.templateId,
        recipients: options.to
      });
      return false;
    }
  }

  /**
   * Sends welcome email to new users
   * @param user User object containing email and name
   */
  public async sendWelcomeEmail(user: IUser): Promise<boolean> {
    return this.sendEmail({
      to: [user.email],
      templateId: 'welcomeEmail',
      variables: {
        name: user.name
      }
    });
  }

  /**
   * Sends export completion notification
   * @param user User to notify
   * @param downloadLink Link to download the export
   */
  public async sendExportCompleteEmail(user: IUser, downloadLink: string): Promise<boolean> {
    return this.sendEmail({
      to: [user.email],
      templateId: 'exportComplete',
      variables: {
        downloadLink
      }
    });
  }

  /**
   * Sends benchmark alert notification
   * @param user User to notify
   * @param metricName Name of the metric
   * @param currentValue Current metric value
   * @param threshold Threshold value
   */
  public async sendBenchmarkAlert(
    user: IUser,
    metricName: string,
    currentValue: string,
    threshold: string
  ): Promise<boolean> {
    return this.sendEmail({
      to: [user.email],
      templateId: 'benchmarkAlert',
      variables: {
        metricName,
        currentValue,
        threshold
      },
      priority: 'high'
    });
  }

  /**
   * Handles bounce notifications from SES
   * @param bounceInfo Bounce notification details
   */
  private async handleBounce(bounceInfo: BounceInfo): Promise<void> {
    this.updateStats('bounced');
    logger.warn('Email bounce received', { bounceInfo });
    // Implement bounce handling logic (e.g., update user status, notify admin)
  }

  /**
   * Handles complaint notifications from SES
   * @param complaintInfo Complaint notification details
   */
  private async handleComplaint(complaintInfo: ComplaintInfo): Promise<void> {
    this.updateStats('complained');
    logger.warn('Email complaint received', { complaintInfo });
    // Implement complaint handling logic (e.g., update user preferences, notify admin)
  }

  /**
   * Updates email sending statistics
   * @param type Type of statistic to update
   */
  private updateStats(type: keyof EmailStats): void {
    if (typeof this.stats[type] === 'number') {
      (this.stats[type] as number)++;
    }
    this.stats.lastSent = new Date();
  }
}