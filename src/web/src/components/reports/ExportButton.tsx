import React, { useState, useRef, useCallback } from 'react';
import Button, { ButtonProps } from '../common/Button';
import { exportService } from '../../services/export';
import { useToast, ToastPosition } from '../../hooks/useToast';
import { IMetric } from '../../interfaces/IMetric';
import { IBenchmark } from '../../interfaces/IBenchmark';

// Export format type
export type ExportFormat = 'PDF' | 'CSV';

// Enhanced props interface for ExportButton
export interface ExportButtonProps {
  format: ExportFormat;
  metrics: IMetric[];
  benchmarks: IBenchmark[];
  revenueRange: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  disabled?: boolean;
  onProgress?: (progress: number) => void;
  onCancel?: () => void;
}

/**
 * Enhanced ExportButton component for handling benchmark and metric exports
 * with progress tracking and accessibility features
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  format,
  metrics,
  benchmarks,
  revenueRange,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onProgress,
  onCancel
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef<() => void>();
  const { showToast } = useToast();

  // Export handler with enhanced error handling
  const handleExport = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!metrics.length || !benchmarks.length) {
      showToast('No data available for export', 'error', ToastPosition.TOP_RIGHT);
      return;
    }

    try {
      setIsLoading(true);
      setProgress(0);

      // Create ARIA live region for progress announcements
      const liveRegion = document.createElement('div');
      liveRegion.id = 'export-progress';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);

      // Configure export options
      const exportOptions = {
        format,
        metrics,
        benchmarks,
        revenueRange,
        includeCharts: true,
        customFileName: `benchmark_report_${revenueRange}_${new Date().toISOString().split('T')[0]}`,
        onProgress: (currentProgress: number) => {
          setProgress(currentProgress);
          onProgress?.(currentProgress);
          if (liveRegion) {
            liveRegion.textContent = `Export progress: ${currentProgress}%`;
          }
        }
      };

      // Set up cancellation handler
      cancelRef.current = () => {
        setIsLoading(false);
        setProgress(0);
        onCancel?.();
      };

      // Execute export based on type
      if (format === 'PDF') {
        await exportService.exportBenchmarkReport(exportOptions);
      } else {
        await exportService.exportMetricComparison(exportOptions);
      }

      // Success notification
      showToast(
        `Export completed successfully. Your ${format} file is ready.`,
        'success',
        ToastPosition.TOP_RIGHT
      );

      // Clean up
      document.body.removeChild(liveRegion);
      setIsLoading(false);
      setProgress(0);

    } catch (error) {
      console.error('Export failed:', error);
      
      // Enhanced error feedback
      showToast(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        'error',
        ToastPosition.TOP_RIGHT
      );

      setIsLoading(false);
      setProgress(0);
    }
  }, [format, metrics, benchmarks, revenueRange, showToast, onProgress, onCancel]);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isLoading}
        onClick={handleExport}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        role="button"
        className={`export-button ${isLoading ? 'loading' : ''}`}
      >
        {isLoading ? (
          <>
            <span className="visually-hidden">
              Exporting... {progress}% complete
            </span>
            <span aria-hidden="true">
              Exporting... {progress}%
            </span>
          </>
        ) : (
          <>
            Export {format}
          </>
        )}
      </Button>

      {isLoading && onCancel && (
        <Button
          variant="text"
          size="small"
          onClick={() => cancelRef.current?.()}
          className="cancel-button"
          aria-label="Cancel export"
        >
          Cancel
        </Button>
      )}

      {/* Progress indicator for visual feedback */}
      {isLoading && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="export-progress"
        >
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  );
};

export default ExportButton;