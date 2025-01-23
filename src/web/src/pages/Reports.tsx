import React, { useState, useEffect, useCallback, useRef } from 'react';
import { announce } from '@react-aria/live-announcer';
import { ErrorBoundary } from 'react-error-boundary';
import { useToast, ToastPosition, ToastType } from '../hooks/useToast';

// Internal imports
import ReportGenerator from '../components/reports/ReportGenerator';
import ExportButton from '../components/reports/ExportButton';
import { useMetrics } from '../hooks/useMetrics';
import { useBenchmarks } from '../hooks/useBenchmarks';
import { exportService, ExportOptions } from '../services/export';
import { RevenueRange } from '../store/benchmarkSlice';

// Types and interfaces
import { IMetric } from '../interfaces/IMetric';
import { IBenchmark } from '../interfaces/IBenchmark';
import { ExportFormat } from '../services/export';

// Constants
const MAX_METRICS_PER_REPORT = 10;
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};
const CACHE_CONFIG = {
  ttl: 300000, // 5 minutes
  maxSize: 100,
};

const VALID_REVENUE_RANGES = ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'] as const;
type ValidRevenueRange = (typeof VALID_REVENUE_RANGES)[number];

/**
 * Type guard to check if a string is a valid RevenueRange
 */
const isValidRevenueRange = (value: string): value is ValidRevenueRange => {
  return VALID_REVENUE_RANGES.includes(value as ValidRevenueRange);
};

// Progress hook interface
interface ProgressHook {
  startProgress: () => void;
  updateProgress: (progress: number) => void;
  completeProgress: () => void;
}

// a simple progress hook
const useProgress = (): ProgressHook => ({
  startProgress: () => {},
  updateProgress: () => {},
  completeProgress: () => {},
});

// Interface for component state
interface ReportPageState {
  selectedMetrics: IMetric[];
  selectedRevenueRange: ValidRevenueRange;
  exportFormat: ExportFormat;
  loadingStates: Record<string, boolean>;
  exportProgress: number;
  error: Error | null;
  retryCount: number;
}

// Interface for report data
interface ReportData {
  metrics: IMetric[];
  benchmarks: IBenchmark[];
  revenueRange: ValidRevenueRange;
  format: ExportFormat;
}

const Reports: React.FC = () => {
  // State management
  const [state, setState] = useState<ReportPageState>({
    selectedMetrics: [],
    selectedRevenueRange: VALID_REVENUE_RANGES[0],
    exportFormat: 'PDF',
    loadingStates: {},
    exportProgress: 0,
    error: null,
    retryCount: 0,
  });

  // Custom hooks
  const { getMetricsByCategory, validateMetricValue } = useMetrics();
  const { benchmarks, fetchBenchmarkData, compareBenchmark } = useBenchmarks();
  const { startProgress, updateProgress, completeProgress } = useProgress();
  const toast = useToast();

  // Refs for cleanup and abort control
  const abortController = useRef<AbortController>();
  const progressTimer = useRef<NodeJS.Timeout>();

  // Initialize component
  useEffect(() => {
    const initializeReports = async () => {
      try {
        setState((prev) => ({ ...prev, loadingStates: { ...prev.loadingStates, init: true } }));
        const metrics = await getMetricsByCategory('financial');
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: false },
        }));
      } catch (error) {
        handleError(error);
      }
    };

    initializeReports();

    return () => {
      abortController.current?.abort();
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, []);

  // Error handling
  const handleError = useCallback(
    (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState((prev) => ({ ...prev, error: new Error(errorMessage) }));
      toast.showToast(errorMessage, ToastType.ERROR, ToastPosition.TOP_RIGHT);
      announce(`Error: ${errorMessage}`, 'assertive');
    },
    [toast]
  );

  // Metric selection handler
  const handleMetricSelection = useCallback(
    async (metrics: IMetric[]) => {
      try {
        if (metrics.length > MAX_METRICS_PER_REPORT) {
          throw new Error(`Maximum of ${MAX_METRICS_PER_REPORT} metrics can be selected`);
        }

        setState((prev) => ({
          ...prev,
          selectedMetrics: metrics,
          loadingStates: { ...prev.loadingStates, metricSelection: true },
        }));

        // Fetch benchmark data for selected metrics
        await Promise.all(
          metrics.map((metric) => fetchBenchmarkData(metric.id, state.selectedRevenueRange))
        );

        announce(`Selected ${metrics.length} metrics for report generation`, 'polite');

        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, metricSelection: false },
        }));
      } catch (error) {
        handleError(error);
      }
    },
    [state.selectedRevenueRange, fetchBenchmarkData]
  );

  // Export handler
  const handleExportStart = useCallback(async () => {
    if (!state.selectedMetrics.length || !benchmarks.length) {
      handleError(new Error('Please select metrics and ensure benchmark data is available'));
      return;
    }

    try {
      // Initialize progress tracking
      setState((prev) => ({
        ...prev,
        exportProgress: 0,
        loadingStates: { ...prev.loadingStates, export: true },
      }));

      abortController.current = new AbortController();
      startProgress();

      // Track progress
      progressTimer.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          exportProgress: Math.min(prev.exportProgress + 10, 90),
        }));
      }, 500);

      announce('Starting report export', 'polite');

      // Generate report
      const reportData: ReportData = {
        metrics: state.selectedMetrics,
        benchmarks,
        revenueRange: state.selectedRevenueRange,
        format: state.exportFormat,
      };

      const exportOptions: ExportOptions = {
        format: state.exportFormat,
        metrics: state.selectedMetrics,
        benchmarks,
        revenueRange: state.selectedRevenueRange,
        includeCharts: true,
      };

      // Set up progress tracking
      window.addEventListener('exportProgress', ((event: CustomEvent) => {
        const progress = event.detail.progress;
        updateProgress(progress);
        setState((prev) => ({ ...prev, exportProgress: progress }));
        announce(`Export progress: ${progress}%`, 'polite');
      }) as EventListener);

      await exportService.exportBenchmarkReport(exportOptions);

      // Cleanup and complete
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      completeProgress();
      setState((prev) => ({
        ...prev,
        exportProgress: 100,
        loadingStates: { ...prev.loadingStates, export: false },
      }));

      announce('Report export completed successfully', 'polite');
      toast.showToast('Report exported successfully', ToastType.SUCCESS, ToastPosition.TOP_RIGHT);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        announce('Export cancelled', 'polite');
        return;
      }
      handleError(error);
    }
  }, [state.selectedMetrics, benchmarks, state.selectedRevenueRange, state.exportFormat, toast]);

  // Cancel export handler
  const handleExportCancel = useCallback(() => {
    abortController.current?.abort();
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    setState((prev) => ({
      ...prev,
      exportProgress: 0,
      loadingStates: { ...prev.loadingStates, export: false },
    }));
  }, []);

  return (
    <ErrorBoundary
      fallback={({ error }: { error: Error }) => (
        <div role="alert" className="error-container">
          <h2>Error Loading Reports</h2>
          <p>{error.message}</p>
        </div>
      )}
    >
      <div className="reports-page" role="main" aria-label="Report Generation">
        <header className="reports-header">
          <h1>Generate Reports</h1>
          <p className="description">
            Generate and export benchmark comparison reports in multiple formats
          </p>
        </header>

        <main className="reports-content">
          <ReportGenerator
            metrics={state.selectedMetrics}
            benchmarks={benchmarks}
            revenueRange={state.selectedRevenueRange}
            onExportStart={handleExportStart}
            onExportProgress={(progress: number) =>
              setState((prev) => ({ ...prev, exportProgress: progress }))
            }
            onExportComplete={() => {
              setState((prev) => ({
                ...prev,
                loadingStates: { ...prev.loadingStates, export: false },
              }));
            }}
            onError={handleError}
          />

          <ExportButton
            format={state.exportFormat}
            metrics={state.selectedMetrics}
            benchmarks={benchmarks}
            revenueRange={state.selectedRevenueRange}
            disabled={!state.selectedMetrics.length || !benchmarks.length}
            onProgress={(progress: number) =>
              setState((prev) => ({ ...prev, exportProgress: progress }))
            }
            onCancel={handleExportCancel}
          />
        </main>
      </div>

      <style>{`
        .reports-page {
          padding: var(--spacing-lg);
          max-width: 1200px;
          margin: 0 auto;
        }

        .reports-header {
          margin-bottom: var(--spacing-xl);
        }

        .reports-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .export-controls {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }

        .export-progress {
          margin-top: var(--spacing-md);
          background: var(--color-background);
          border-radius: var(--border-radius-md);
          overflow: hidden;
        }

        .progress-bar {
          height: 4px;
          background: var(--color-primary);
          transition: width 0.3s ease-in-out;
        }

        .progress-label {
          display: block;
          text-align: center;
          margin-top: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }

        .error-container {
          padding: var(--spacing-lg);
          border: 1px solid var(--color-error);
          border-radius: var(--border-radius-md);
          margin-top: var(--spacing-lg);
        }

        @media (max-width: 768px) {
          .export-controls {
            flex-direction: column;
          }
        }
      `}</style>
    </ErrorBoundary>
  );
};

export default Reports;
