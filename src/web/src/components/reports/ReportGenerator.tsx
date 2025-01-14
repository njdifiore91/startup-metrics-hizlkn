import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import Select from '../common/Select';
import { exportService } from '../../services/export';
import { useToast, ToastType, ToastPosition } from '../../hooks/useToast';
import { IMetric } from '../../interfaces/IMetric';
import { IBenchmark } from '../../interfaces/IBenchmark';
import type { ExportFormat } from '../../services/export';

// Constants for export options and error messages
const EXPORT_FORMAT_OPTIONS = [
  { value: 'PDF', label: 'PDF Document', ariaLabel: 'Export as PDF document' },
  { value: 'CSV', label: 'CSV Spreadsheet', ariaLabel: 'Export as CSV spreadsheet' }
];

const ERROR_MESSAGES = {
  NO_METRICS: 'Please select at least one metric for the report',
  NO_BENCHMARKS: 'Benchmark data is required for comparison',
  NO_REVENUE_RANGE: 'Please select a revenue range',
  NO_FORMAT: 'Please select an export format',
  EXPORT_FAILED: 'Failed to generate report. Please try again'
} as const;

// Props interface with comprehensive type safety
interface ReportGeneratorProps {
  metrics: IMetric[];
  benchmarks: IBenchmark[];
  revenueRange: string;
  onExportStart?: () => void;
  onExportProgress?: (progress: number) => void;
  onExportComplete?: () => void;
  onError?: (error: Error) => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  metrics,
  benchmarks,
  revenueRange,
  onExportStart,
  onExportProgress,
  onExportComplete,
  onError
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | ''>('');
  const { showToast } = useToast();

  // Validate required data before export
  const validateExportData = useCallback((): boolean => {
    if (!metrics.length) {
      showToast(ERROR_MESSAGES.NO_METRICS, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return false;
    }

    if (!benchmarks.length) {
      showToast(ERROR_MESSAGES.NO_BENCHMARKS, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return false;
    }

    if (!revenueRange) {
      showToast(ERROR_MESSAGES.NO_REVENUE_RANGE, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return false;
    }

    if (!exportFormat) {
      showToast(ERROR_MESSAGES.NO_FORMAT, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      return false;
    }

    return true;
  }, [metrics, benchmarks, revenueRange, exportFormat, showToast]);

  // Handle export process with progress tracking
  const handleExport = useCallback(async () => {
    if (!validateExportData()) return;

    try {
      setIsLoading(true);
      onExportStart?.();

      // Create export options
      const exportOptions = {
        format: exportFormat as ExportFormat,
        metrics,
        benchmarks,
        revenueRange,
        includeCharts: true
      };

      // Track export progress
      const handleProgress = (progress: number) => {
        onExportProgress?.(progress);
      };

      // Add progress event listener
      window.addEventListener('exportProgress', ((event: CustomEvent) => {
        handleProgress(event.detail.progress);
      }) as EventListener);

      // Execute export based on format
      if (exportFormat === 'PDF') {
        await exportService.exportBenchmarkReport(exportOptions);
      } else {
        await exportService.exportMetricComparison(exportOptions);
      }

      showToast(
        'Export completed successfully',
        ToastType.SUCCESS,
        ToastPosition.TOP_RIGHT
      );
      onExportComplete?.();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.EXPORT_FAILED;
      showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      onError?.(error instanceof Error ? error : new Error(ERROR_MESSAGES.EXPORT_FAILED));

    } finally {
      setIsLoading(false);
      window.removeEventListener('exportProgress', (() => {}) as EventListener);
    }
  }, [
    validateExportData,
    exportFormat,
    metrics,
    benchmarks,
    revenueRange,
    onExportStart,
    onExportProgress,
    onExportComplete,
    onError,
    showToast
  ]);

  return (
    <div className="report-generator" role="region" aria-label="Report export options">
      <div className="export-controls">
        <Select
          options={EXPORT_FORMAT_OPTIONS}
          value={exportFormat}
          onChange={(value) => setExportFormat(value as ExportFormat)}
          name="exportFormat"
          label="Export Format"
          placeholder="Select format"
          disabled={isLoading}
          required
          aria-label="Select export format"
        />

        <Button
          onClick={handleExport}
          disabled={isLoading}
          aria-busy={isLoading}
          aria-label={`Export as ${exportFormat}`}
          size="medium"
          variant="primary"
        >
          {isLoading ? 'Generating Report...' : 'Export Report'}
        </Button>
      </div>

      <style jsx>{`
        .report-generator {
          padding: var(--spacing-md);
          border-radius: var(--border-radius-md);
          background-color: var(--color-background);
        }

        .export-controls {
          display: flex;
          gap: var(--spacing-md);
          align-items: flex-end;
        }

        @media (max-width: 768px) {
          .export-controls {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportGenerator;