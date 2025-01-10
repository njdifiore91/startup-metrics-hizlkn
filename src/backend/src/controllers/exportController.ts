import { Request, Response } from 'express'; // ^4.18.2
import { injectable, inject } from 'tsyringe'; // ^4.7.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { ExportService } from '../services/exportService';
import { exportRequestSchema, validateExportRequest } from '../validators/exportValidator';
import { AppError } from '../utils/errorHandler';
import { Logger } from '../utils/logger';
import { BUSINESS_ERRORS, VALIDATION_ERRORS } from '../constants/errorCodes';
import { hasPermission } from '../constants/roles';
import { USER_ROLES } from '../constants/roles';

/**
 * Controller handling report generation and data export requests
 * Implements comprehensive security, monitoring, and error handling
 */
@injectable()
export class ExportController {
  // Rate limiting configuration
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 5;
  private static readonly DOWNLOAD_RATE_LIMIT_MAX = 10;

  // Export configuration
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly supportedFormats = ['pdf', 'csv'] as const;

  constructor(
    @inject(ExportService) private readonly exportService: ExportService,
    @inject(Logger) private readonly logger: Logger
  ) {}

  /**
   * Rate limiter for export generation requests
   */
  private static exportRateLimiter = rateLimit({
    windowMs: ExportController.RATE_LIMIT_WINDOW,
    max: ExportController.RATE_LIMIT_MAX_REQUESTS,
    message: BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.message,
    standardHeaders: true,
    legacyHeaders: false
  });

  /**
   * Rate limiter for report downloads
   */
  private static downloadRateLimiter = rateLimit({
    windowMs: ExportController.RATE_LIMIT_WINDOW,
    max: ExportController.DOWNLOAD_RATE_LIMIT_MAX,
    message: BUSINESS_ERRORS.RATE_LIMIT_EXCEEDED.message,
    standardHeaders: true,
    legacyHeaders: false
  });

  /**
   * Generates report based on request parameters
   * @param req Express request object
   * @param res Express response object
   */
  @ExportController.exportRateLimiter
  public async generateReport(req: Request, res: Response): Promise<Response> {
    try {
      // Set correlation ID for request tracking
      const correlationId = req.headers['x-correlation-id'] as string;
      this.logger.setCorrelationId(correlationId);

      // Validate request
      const validationResult = await validateExportRequest(req.body);
      if (!validationResult.isValid) {
        throw new AppError(
          VALIDATION_ERRORS.INVALID_REQUEST,
          'Invalid export request',
          validationResult.errors,
          correlationId
        );
      }

      // Extract user info and verify permissions
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !hasPermission(userRole, 'companyData', 'read')) {
        throw new AppError(
          BUSINESS_ERRORS.INSUFFICIENT_PERMISSIONS,
          'Insufficient permissions for export',
          null,
          correlationId
        );
      }

      // Extract and validate export format
      const { format, metricIds, dateRange, includeComparisons, customizations } = req.body;
      if (!this.supportedFormats.includes(format)) {
        throw new AppError(
          VALIDATION_ERRORS.INVALID_REQUEST,
          `Unsupported export format: ${format}`,
          null,
          correlationId
        );
      }

      // Initialize progress tracking
      const progressTracker = {
        total: metricIds.length,
        current: 0,
        status: 'processing'
      };

      // Generate report based on format
      let result;
      if (format === 'pdf') {
        result = await this.exportService.generatePDFReport(
          metricIds,
          dateRange,
          userId,
          {
            includeCharts: true,
            watermarkText: customizations?.watermark,
            confidentialityLevel: 'high'
          }
        );
      } else {
        result = await this.exportService.generateCSVExport(
          metricIds,
          dateRange,
          {
            includeHeaders: true,
            includeMetadata: true
          }
        );
      }

      // Set appropriate headers based on format
      const filename = `benchmark-report-${new Date().toISOString()}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      // Log successful export
      this.logger.info('Export generated successfully', {
        userId,
        format,
        metricCount: metricIds.length,
        fileSize: result.length,
        correlationId
      });

      return res.send(result);

    } catch (error) {
      this.logger.error('Export generation failed', {
        error,
        correlationId: req.headers['x-correlation-id']
      });
      throw error;
    }
  }

  /**
   * Handles download of previously generated reports
   * @param req Express request object
   * @param res Express response object
   */
  @ExportController.downloadRateLimiter
  public async downloadReport(req: Request, res: Response): Promise<Response> {
    try {
      const correlationId = req.headers['x-correlation-id'] as string;
      this.logger.setCorrelationId(correlationId);

      // Validate report ID
      const { reportId } = req.params;
      if (!reportId) {
        throw new AppError(
          VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          'Report ID is required',
          null,
          correlationId
        );
      }

      // Verify user permissions
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !hasPermission(userRole, 'companyData', 'read')) {
        throw new AppError(
          BUSINESS_ERRORS.INSUFFICIENT_PERMISSIONS,
          'Insufficient permissions for download',
          null,
          correlationId
        );
      }

      // Set security headers
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      // Stream the file
      const fileStream = await this.exportService.streamReport(reportId, userId);
      
      // Log download
      this.logger.info('Report download started', {
        userId,
        reportId,
        correlationId
      });

      return fileStream.pipe(res);

    } catch (error) {
      this.logger.error('Report download failed', {
        error,
        correlationId: req.headers['x-correlation-id']
      });
      throw error;
    }
  }
}