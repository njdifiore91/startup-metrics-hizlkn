/**
 * Export service module for handling metric data export functionality
 * Supports PDF and CSV exports with enhanced error handling and progress tracking
 * @version 1.0.0
 */

// External imports
import { saveAs } from 'file-saver'; // v2.0.5
import { AxiosProgressEvent } from 'axios';

// Internal imports
import { api } from './api';
import { IMetric } from '../interfaces/IMetric';
import { IBenchmark } from '../interfaces/IBenchmark';

/**
 * Supported export format types with MIME type validation
 */
export type ExportFormat = 'PDF' | 'CSV';

/**
 * Interface for configuring export options with enhanced features
 */
export interface ExportOptions {
  format: ExportFormat;
  metrics: IMetric[];
  benchmarks: IBenchmark[];
  revenueRange: string;
  includeCharts?: boolean;
  customFileName?: string;
}

/**
 * API endpoints for export functionality
 */
const API_ENDPOINTS = {
  REPORTS: '/api/v1/reports',
  COMPARISON: '/api/v1/reports/comparison'
} as const;

/**
 * MIME types for supported export formats
 */
const CONTENT_TYPES = {
  PDF: 'application/pdf',
  CSV: 'text/csv'
} as const;

/**
 * Validates file size and returns appropriate unit
 * @param size - File size in bytes
 * @returns Formatted size string with unit
 */
const formatFileSize = (size: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let formattedSize = size;
  let unitIndex = 0;

  while (formattedSize >= 1024 && unitIndex < units.length - 1) {
    formattedSize /= 1024;
    unitIndex++;
  }

  return `${formattedSize.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Sanitizes custom file names for security
 * @param fileName - User provided file name
 * @returns Sanitized file name
 */
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

/**
 * Export service object containing export-related functions
 */
export const exportService = {
  /**
   * Generates and downloads a benchmark report with enhanced error handling
   * @param options - Export configuration options
   */
  async exportBenchmarkReport(options: ExportOptions): Promise<void> {
    try {
      // Validate and prepare file name
      const fileName = options.customFileName
        ? sanitizeFileName(options.customFileName)
        : `benchmark_report_${new Date().toISOString().split('T')[0]}`;
      
      const extension = options.format.toLowerCase();
      const fullFileName = `${fileName}.${extension}`;

      // Create form data with export options
      const formData = new FormData();
      formData.append('format', options.format);
      formData.append('metrics', JSON.stringify(options.metrics));
      formData.append('benchmarks', JSON.stringify(options.benchmarks));
      formData.append('revenueRange', options.revenueRange);
      formData.append('includeCharts', String(options.includeCharts ?? true));

      // Configure request with progress tracking
      const response = await api.post(API_ENDPOINTS.REPORTS, formData, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
          // Dispatch progress event for UI updates
          window.dispatchEvent(new CustomEvent('exportProgress', {
            detail: { progress: percentCompleted }
          }));
        }
      });

      // Validate response type
      const blob = new Blob([response.data], { 
        type: CONTENT_TYPES[options.format] 
      });

      // Validate file size
      const fileSize = formatFileSize(blob.size);
      console.info(`Export file size: ${fileSize}`);

      // Trigger download with accessibility announcement
      saveAs(blob, fullFileName);
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.textContent = `Export completed. File ${fullFileName} is ready for download.`;
      document.body.appendChild(liveRegion);

      // Clean up live region after announcement
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 3000);

    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to generate benchmark report. Please try again.');
    }
  },

  /**
   * Exports a comparison of company metrics against benchmarks
   * @param options - Export configuration options
   */
  async exportMetricComparison(options: ExportOptions): Promise<void> {
    try {
      // Validate and prepare file name
      const fileName = options.customFileName
        ? sanitizeFileName(options.customFileName)
        : `metric_comparison_${new Date().toISOString().split('T')[0]}`;
      
      const extension = options.format.toLowerCase();
      const fullFileName = `${fileName}.${extension}`;

      // Create form data with export options
      const formData = new FormData();
      formData.append('format', options.format);
      formData.append('metrics', JSON.stringify(options.metrics));
      formData.append('benchmarks', JSON.stringify(options.benchmarks));
      formData.append('revenueRange', options.revenueRange);
      formData.append('includeCharts', String(options.includeCharts ?? true));

      // Configure request with progress tracking
      const response = await api.post(API_ENDPOINTS.COMPARISON, formData, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
          // Dispatch progress event for UI updates
          window.dispatchEvent(new CustomEvent('exportProgress', {
            detail: { progress: percentCompleted }
          }));
        }
      });

      // Validate response type
      const blob = new Blob([response.data], { 
        type: CONTENT_TYPES[options.format] 
      });

      // Validate file size
      const fileSize = formatFileSize(blob.size);
      console.info(`Export file size: ${fileSize}`);

      // Trigger download with accessibility announcement
      saveAs(blob, fullFileName);
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.textContent = `Export completed. File ${fullFileName} is ready for download.`;
      document.body.appendChild(liveRegion);

      // Clean up live region after announcement
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 3000);

    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to generate metric comparison. Please try again.');
    }
  }
};