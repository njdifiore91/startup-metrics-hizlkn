import React, { useState, useRef, useCallback } from 'react';
import styled from '@emotion/styled';
import Button, { ButtonProps } from '../common/Button';
import { exportService, ExportFormat, ExportOptions } from '../../services/export';
import { useToast, ToastPosition, ToastType } from '../../hooks/useToast';
import { IMetric } from '../../interfaces/IMetric';
import { IBenchmark } from '../../interfaces/IBenchmark';

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const ProgressContainer = styled.div`
  width: 100%;
  height: 4px;
  background-color: var(--color-background-secondary);
  border-radius: var(--border-radius-sm);
  margin-top: var(--spacing-xs);
  overflow: hidden;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: ${({ progress }) => `${progress}%`};
  height: 100%;
  background-color: var(--color-primary);
  transition: width 0.3s ease-in-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

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
  onCancel,
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef<(() => void) | undefined>();
  const { showToast } = useToast();

  // Progress tracking handler
  const handleProgress = useCallback(
    (currentProgress: number) => {
      setProgress(currentProgress);
      onProgress?.(currentProgress);

      // Update ARIA live region for screen readers
      const liveRegion = document.getElementById('export-progress');
      if (liveRegion) {
        liveRegion.textContent = `Export progress: ${currentProgress}%`;
      }
    },
    [onProgress]
  );

  // Export handler with enhanced error handling
  const handleExport = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();

      if (!metrics.length || !benchmarks.length) {
        showToast('No data available for export', ToastType.ERROR, ToastPosition.TOP_RIGHT);
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
        const exportOptions: ExportOptions = {
          format,
          metrics,
          benchmarks,
          revenueRange,
          includeCharts: true,
          customFileName: `benchmark_report_${revenueRange}_${
            new Date().toISOString().split('T')[0]
          }`,
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
          ToastType.SUCCESS,
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
          `Export failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }. Please try again.`,
          ToastType.ERROR,
          ToastPosition.TOP_RIGHT
        );

        setIsLoading(false);
        setProgress(0);
      }
    },
    [format, metrics, benchmarks, revenueRange, showToast, onCancel]
  );

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
      >
        {isLoading ? (
          <>
            <VisuallyHidden>Exporting... {progress}% complete</VisuallyHidden>
            <span aria-hidden="true">Exporting... {progress}%</span>
          </>
        ) : (
          <>Export {format}</>
        )}
      </Button>

      {isLoading && onCancel && (
        <Button
          variant="text"
          size="small"
          onClick={() => cancelRef.current?.()}
          aria-label="Cancel export"
        >
          Cancel
        </Button>
      )}

      {/* Progress indicator for visual feedback */}
      {isLoading && (
        <ProgressContainer
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <ProgressBar progress={progress} />
        </ProgressContainer>
      )}
    </>
  );
};

export default ExportButton;
