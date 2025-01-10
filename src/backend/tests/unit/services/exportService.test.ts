import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import PDFKit from 'pdfkit';
import { ExportService } from '../../../src/services/exportService';
import { ICompanyMetric } from '../../../src/interfaces/ICompanyMetric';
import { IBenchmarkData } from '../../../src/interfaces/IBenchmarkData';
import { METRIC_VALUE_TYPES } from '../../../src/constants/metricTypes';
import { Logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('pdfkit');
jest.mock('csv-stringify');
jest.mock('../../../src/utils/logger');

describe('ExportService', () => {
  let exportService: ExportService;
  let mockLogger: jest.Mocked<Logger>;

  // Test data setup
  const mockCompanyMetrics: ICompanyMetric[] = [
    {
      id: 'metric-1',
      userId: 'user-1',
      metricId: 'arr-growth',
      value: 75.5,
      timestamp: new Date('2023-01-01'),
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    }
  ];

  const mockBenchmarkData: IBenchmarkData[] = [
    {
      id: 'benchmark-1',
      metricId: 'arr-growth',
      sourceId: 'source-1',
      revenueRange: '$1M-$5M',
      p10: 20,
      p25: 35,
      p50: 50,
      p75: 65,
      p90: 80,
      reportDate: new Date('2023-01-01'),
      sampleSize: 100,
      confidenceLevel: 0.95,
      isSeasonallyAdjusted: false,
      dataQualityScore: 0.9,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Initialize service with mocked dependencies
    exportService = new ExportService(mockLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generatePDFReport', () => {
    it('should generate secure PDF report with company metrics and benchmarks', async () => {
      // Mock PDF document methods
      const mockPdfDoc = {
        text: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        fontSize: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'end') callback();
        }),
        end: jest.fn(),
        encrypt: jest.fn(),
        page: { height: 800 }
      };

      (PDFKit as jest.Mock).mockImplementation(() => mockPdfDoc);

      const userId = 'user-1';
      const options = {
        includeCharts: true,
        watermarkText: 'Confidential',
        encryptionKey: 'test-key',
        confidentialityLevel: 'high' as const,
        pageSize: 'A4' as const
      };

      // Execute test
      const result = await exportService.generatePDFReport(
        mockCompanyMetrics,
        mockBenchmarkData,
        userId,
        options
      );

      // Verify PDF generation
      expect(PDFKit).toHaveBeenCalledWith(expect.objectContaining({
        size: 'A4',
        orientation: 'portrait'
      }));

      // Verify encryption
      expect(mockPdfDoc.encrypt).toHaveBeenCalledWith(expect.objectContaining({
        userPassword: 'test-key',
        permissions: expect.objectContaining({
          printing: 'lowResolution',
          modifying: false,
          copying: false
        })
      }));

      // Verify content generation
      expect(mockPdfDoc.text).toHaveBeenCalledWith(
        'Benchmark Comparison Report',
        expect.any(Object)
      );

      // Verify buffer return
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty metrics with proper security measures', async () => {
      const userId = 'user-1';
      
      await expect(
        exportService.generatePDFReport([], [], userId)
      ).rejects.toThrow('Export requires valid company metrics and benchmark data');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'PDF generation failed',
        expect.any(Object)
      );
    });

    it('should validate metric values before generating PDF', async () => {
      const invalidMetrics = [{
        ...mockCompanyMetrics[0],
        value: -1 // Invalid negative value
      }];

      await expect(
        exportService.generatePDFReport(invalidMetrics, mockBenchmarkData, 'user-1')
      ).rejects.toThrow('Invalid metric value');
    });
  });

  describe('generateCSVExport', () => {
    it('should generate secure CSV with validated data', async () => {
      const options = {
        includeHeaders: true,
        delimiter: ',',
        includeMetadata: true,
        dateFormat: 'ISO'
      };

      const result = await exportService.generateCSVExport(
        mockCompanyMetrics,
        mockBenchmarkData,
        options
      );

      // Verify CSV structure
      expect(result).toContain('Metric ID,Company Value,Benchmark P10,Benchmark P90');
      expect(result).toContain(mockCompanyMetrics[0].metricId);
      expect(result).toContain(mockBenchmarkData[0].revenueRange);
    });

    it('should handle sensitive data properly', async () => {
      const sensitiveMetrics = [{
        ...mockCompanyMetrics[0],
        isConfidential: true
      }];

      const result = await exportService.generateCSVExport(
        sensitiveMetrics,
        mockBenchmarkData,
        { includeHeaders: true }
      );

      // Verify sensitive data handling
      expect(result).not.toContain('isConfidential');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing confidential metrics for export',
        expect.any(Object)
      );
    });

    it('should validate data before generating CSV', async () => {
      const invalidBenchmarks = [{
        ...mockBenchmarkData[0],
        p90: -10 // Invalid negative percentile
      }];

      await expect(
        exportService.generateCSVExport(mockCompanyMetrics, invalidBenchmarks)
      ).rejects.toThrow('Invalid benchmark value');
    });
  });

  describe('validateExportData', () => {
    it('should validate metric values against rules', async () => {
      const invalidMetrics = [{
        ...mockCompanyMetrics[0],
        value: 1000000001 // Exceeds maximum value
      }];

      await expect(
        exportService.generatePDFReport(invalidMetrics, mockBenchmarkData, 'user-1')
      ).rejects.toThrow('Invalid metric value');
    });

    it('should validate benchmark data completeness', async () => {
      const incompleteBenchmarks = [{
        ...mockBenchmarkData[0],
        p50: undefined // Missing required percentile
      }];

      await expect(
        exportService.generateCSVExport(mockCompanyMetrics, incompleteBenchmarks)
      ).rejects.toThrow('Invalid benchmark data');
    });
  });
});