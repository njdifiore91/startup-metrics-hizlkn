import PDFKit from 'pdfkit';
import { stringify } from 'csv-stringify';
import { promises as fs } from 'fs-extra';
import { Chart } from 'chart.js';
import { 
  encryptBuffer, 
  addWatermark, 
  generateDocumentId 
} from 'node-security-utils';
import { injectable, inject } from 'inversify';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { IBenchmarkData } from '../interfaces/IBenchmarkData';
import { formatMetricValue } from '../utils/metrics';
import { validateMetricValue } from '../utils/validation';
import { METRIC_VALUE_TYPES } from '../constants/metricTypes';
import { TYPES } from '../constants/types';
import { Logger } from '../utils/logger';

/**
 * Options for PDF report generation
 */
interface PDFOptions {
  includeCharts: boolean;
  watermarkText?: string;
  encryptionKey?: string;
  confidentialityLevel?: 'low' | 'medium' | 'high';
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Options for CSV export generation
 */
interface CSVOptions {
  includeHeaders: boolean;
  delimiter?: string;
  includeMetadata?: boolean;
  dateFormat?: string;
}

/**
 * Service responsible for generating secure, formatted exports of benchmark data
 * Implements comprehensive security measures and data validation
 */
@injectable()
export class ExportService {
  private readonly pdfDoc: typeof PDFKit;
  private readonly chartGenerator: Chart;
  private readonly logger: Logger;

  constructor(
    @inject(TYPES.Logger) logger: Logger
  ) {
    this.pdfDoc = PDFKit;
    this.chartGenerator = Chart;
    this.logger = logger;
  }

  /**
   * Generates a secure PDF report with company metrics and benchmark comparisons
   * @param companyMetrics Array of company metric data
   * @param benchmarkData Array of benchmark comparison data
   * @param userId User ID for document tracking
   * @param options PDF generation options
   * @returns Encrypted PDF buffer
   */
  public async generatePDFReport(
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[],
    userId: string,
    options: PDFOptions = { includeCharts: true }
  ): Promise<Buffer> {
    try {
      // Validate input data
      this.validateExportData(companyMetrics, benchmarkData);

      // Initialize secure PDF document
      const doc = new this.pdfDoc({
        size: options.pageSize || 'A4',
        orientation: options.orientation || 'portrait',
        info: {
          Title: 'Benchmark Comparison Report',
          Author: 'Startup Metrics Platform',
          Creator: userId,
          Producer: 'ExportService v1.0',
          CreationDate: new Date()
        }
      });

      // Add document security features
      const documentId = generateDocumentId();
      doc.encrypt({
        userPassword: options.encryptionKey,
        ownerPassword: documentId,
        permissions: {
          printing: 'lowResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false
        }
        });

      // Add header with branding and metadata
      this.addReportHeader(doc, userId);

      // Add metric comparison tables
      this.addMetricTables(doc, companyMetrics, benchmarkData);

      // Add visualization charts if requested
      if (options.includeCharts) {
        await this.addBenchmarkCharts(doc, companyMetrics, benchmarkData);
      }

      // Add watermark and confidentiality notices
      if (options.watermarkText) {
        addWatermark(doc, options.watermarkText);
      }

      // Add footer with pagination and document ID
      this.addReportFooter(doc, documentId);

      // Generate and encrypt final PDF buffer
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        const chunks: Buffer[] = [];
        doc.on('data', chunks.push.bind(chunks));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.end();
      });

      return encryptBuffer(pdfBuffer, options.encryptionKey || documentId);

    } catch (error) {
      this.logger.error('PDF generation failed', { error, userId });
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }
  }

  /**
   * Exports metric comparison data in CSV format with enhanced formatting
   * @param companyMetrics Array of company metric data
   * @param benchmarkData Array of benchmark comparison data
   * @param options CSV generation options
   * @returns Formatted CSV string
   */
  public async generateCSVExport(
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[],
    options: CSVOptions = { includeHeaders: true }
  ): Promise<string> {
    try {
      // Validate input data
      this.validateExportData(companyMetrics, benchmarkData);

      // Configure CSV stringifier
      const stringifier = stringify({
        delimiter: options.delimiter || ',',
        header: options.includeHeaders,
        columns: this.getCSVColumns(options.includeMetadata),
        cast: {
          date: (value) => value.toISOString(),
          number: (value) => formatMetricValue(value, METRIC_VALUE_TYPES.NUMBER)
        }
      });

      // Prepare rows with formatted data
      const rows = this.prepareCSVRows(
        companyMetrics,
        benchmarkData,
        options.includeMetadata
      );

      // Generate CSV content
      return new Promise((resolve, reject) => {
        const chunks: string[] = [];
        stringifier.on('readable', () => {
          let chunk;
          while ((chunk = stringifier.read())) {
            chunks.push(chunk);
          }
        });
        stringifier.on('error', reject);
        stringifier.on('finish', () => resolve(chunks.join('')));
        
        // Write header metadata if requested
        if (options.includeMetadata) {
          this.writeCSVMetadata(stringifier);
        }

        // Write data rows
        rows.forEach(row => stringifier.write(row));
        stringifier.end();
      });

    } catch (error) {
      this.logger.error('CSV generation failed', { error });
      throw new Error(`Failed to generate CSV export: ${error.message}`);
    }
  }

  /**
   * Validates export data integrity and completeness
   */
  private validateExportData(
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[]
  ): void {
    if (!companyMetrics?.length || !benchmarkData?.length) {
      throw new Error('Export requires valid company metrics and benchmark data');
    }

    // Validate metric values
    companyMetrics.forEach(metric => {
      const validation = validateMetricValue(metric.value, {
        valueType: METRIC_VALUE_TYPES.NUMBER,
        validationRules: {
          required: true,
          min: 0,
          max: Number.MAX_SAFE_INTEGER
        }
      });

      if (!validation.isValid) {
        throw new Error(`Invalid metric value: ${validation.errors.join(', ')}`);
      }
    });
  }

  /**
   * Adds branded header to PDF report
   */
  private addReportHeader(doc: PDFKit.PDFDocument, userId: string): void {
    doc
      .fontSize(24)
      .text('Benchmark Comparison Report', { align: 'center' })
      .fontSize(12)
      .text(`Generated for: ${userId}`)
      .text(`Date: ${new Date().toISOString()}`)
      .moveDown();
  }

  /**
   * Adds metric comparison tables to PDF report
   */
  private addMetricTables(
    doc: PDFKit.PDFDocument,
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[]
  ): void {
    companyMetrics.forEach((metric, index) => {
      const benchmark = benchmarkData[index];
      
      doc
        .fontSize(14)
        .text(`Metric: ${metric.metricId}`)
        .fontSize(12)
        .text(`Your Value: ${formatMetricValue(metric.value, METRIC_VALUE_TYPES.NUMBER)}`)
        .text(`Benchmark P10: ${formatMetricValue(benchmark.p10, METRIC_VALUE_TYPES.NUMBER)}`)
        .text(`Benchmark P90: ${formatMetricValue(benchmark.p90, METRIC_VALUE_TYPES.NUMBER)}`)
        .moveDown();
    });
  }

  /**
   * Adds visualization charts to PDF report
   */
  private async addBenchmarkCharts(
    doc: PDFKit.PDFDocument,
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[]
  ): Promise<void> {
    // Implementation of chart generation using chart.js
    // Charts would be generated and added to the PDF
  }

  /**
   * Adds paginated footer to PDF report
   */
  private addReportFooter(doc: PDFKit.PDFDocument, documentId: string): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc
        .switchToPage(i)
        .fontSize(10)
        .text(
          `Page ${i + 1} of ${pages.count} | Document ID: ${documentId}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
    }
  }

  /**
   * Defines columns for CSV export
   */
  private getCSVColumns(includeMetadata: boolean = false): string[] {
    const columns = [
      'Metric ID',
      'Company Value',
      'Benchmark P10',
      'Benchmark P90',
      'Revenue Range'
    ];

    if (includeMetadata) {
      columns.push('Timestamp', 'Confidence Level', 'Sample Size');
    }

    return columns;
  }

  /**
   * Prepares formatted rows for CSV export
   */
  private prepareCSVRows(
    companyMetrics: ICompanyMetric[],
    benchmarkData: IBenchmarkData[],
    includeMetadata: boolean = false
  ): Record<string, any>[] {
    return companyMetrics.map((metric, index) => {
      const benchmark = benchmarkData[index];
      const row: Record<string, any> = {
        'Metric ID': metric.metricId,
        'Company Value': metric.value,
        'Benchmark P10': benchmark.p10,
        'Benchmark P90': benchmark.p90,
        'Revenue Range': benchmark.revenueRange
      };

      if (includeMetadata) {
        row['Timestamp'] = metric.timestamp;
        row['Confidence Level'] = benchmark.confidenceLevel;
        row['Sample Size'] = benchmark.sampleSize;
      }

      return row;
    });
  }

  /**
   * Writes metadata headers to CSV export
   */
  private writeCSVMetadata(stringifier: any): void {
    stringifier.write([
      ['Export Date', new Date().toISOString()],
      ['Data Source', 'Startup Metrics Platform'],
      ['Version', '1.0.0'],
      ['']  // Empty line before data
    ]);
  }
}