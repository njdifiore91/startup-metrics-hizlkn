import { SESClient, SESClientConfig, SendEmailCommand } from '@aws-sdk/client-ses'; // ^3.0.0
import { logger } from '../utils/logger';

// Environment variables validation and defaults
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'DEFAULT_SENDER_EMAIL'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Email configuration constants
const EMAIL_RATE_LIMIT = parseInt(process.env.EMAIL_RATE_LIMIT || '14', 10); // Emails per second
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

// Email template interface with validation
export interface EmailTemplate {
  id: string;
  version: string;
  subject: string;
  body: string;
  variables: string[];
  html: boolean;
}

// Email sending options interface
export interface EmailOptions {
  template: EmailTemplate;
  to: string[];
  variables: Record<string, string>;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

// System email templates
export const emailTemplates: Record<string, EmailTemplate> = {
  welcomeEmail: {
    id: 'welcome',
    version: '1.0.0',
    subject: 'Welcome to Startup Metrics Platform',
    body: 'Hello {{name}},\n\nWelcome to the Startup Metrics Platform. Get started by...',
    variables: ['name'],
    html: false
  },
  passwordReset: {
    id: 'password-reset',
    version: '1.0.0',
    subject: 'Password Reset Request',
    body: 'Click the following link to reset your password: {{resetLink}}',
    variables: ['resetLink'],
    html: true
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
    body: 'Your {{metricName}} has exceeded the configured threshold...',
    variables: ['metricName', 'currentValue', 'threshold'],
    html: true
  },
  systemAlert: {
    id: 'system-alert',
    version: '1.0.0',
    subject: 'System Alert: {{alertType}}',
    body: 'System alert: {{message}}',
    variables: ['alertType', 'message', 'severity'],
    html: true
  }
};

// Create and configure SES client
const createSESClient = (): SESClient => {
  const config: SESClientConfig = {
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    },
    maxAttempts: MAX_RETRIES
  };

  return new SESClient(config);
};

// Validate email template
const validateTemplate = (template: EmailTemplate): boolean => {
  if (!template.id || !template.version || !template.subject || !template.body) {
    logger.error('Invalid template structure', { template });
    return false;
  }

  // Verify all declared variables are used in the template
  const contentString = template.body + template.subject;
  return template.variables.every(variable => 
    contentString.includes(`{{${variable}}}`));
};

// Rate limiting implementation
let lastSendTime = Date.now();
let sendCount = 0;

const checkRateLimit = async (): Promise<void> => {
  const now = Date.now();
  if (now - lastSendTime >= 1000) {
    // Reset counter after 1 second
    sendCount = 0;
    lastSendTime = now;
  } else if (sendCount >= EMAIL_RATE_LIMIT) {
    // Wait until next second if rate limit reached
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastSendTime)));
    sendCount = 0;
    lastSendTime = Date.now();
  }
  sendCount++;
};

// Initialize SES client
export const sesClient = createSESClient();
export const defaultSender = process.env.DEFAULT_SENDER_EMAIL!;

// Main email sending function
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Rate limit check
    await checkRateLimit();

    // Validate template
    if (!validateTemplate(options.template)) {
      throw new Error('Invalid email template');
    }

    // Process template variables
    let processedBody = options.template.body;
    let processedSubject = options.template.subject;
    
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
        Body: options.template.html ? {
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
      }
    });

    // Send email with retry logic
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        await sesClient.send(command);
        logger.info('Email sent successfully', {
          template: options.template.id,
          recipients: options.to.length,
          attempt: attempt + 1
        });
        return true;
      } catch (error) {
        attempt++;
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }

    return false;
  } catch (error) {
    logger.error('Failed to send email', {
      error,
      template: options.template.id,
      recipients: options.to
    });
    return false;
  }
};