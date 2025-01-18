import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useA11y } from '@react-aria/i18n'; // v3.0.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import { useProgress } from '@progress/hooks'; // v1.0.0

// Internal imports
import ReportGenerator from '../components/reports/ReportGenerator';
import ExportButton from '../components/reports/ExportButton';
import useMetrics from '../hooks/useMetrics';
import useBenchmarks from '../hooks/useBenchmarks';
import { useToast } from '../hooks/useToast';

// Types and interfaces
import { IMetric } from '../interfaces/IMetric';
import { ExportFormat } from '../services/export';

// Constants
const MAX_METRICS_PER_REPORT = 10;

// Interface for component state
interface ReportPageState {
  selectedMetrics: IMetric[];
  selectedRevenueRange: string;
  exportFormat: ExportFormat;
  loadingStates: Record<string, boolean>;
  exportProgress: number;
  error: Error | null;
  retryCount: number;
}

const Reports: React.FC = () => {
  // State management
  const [state, setState] = useState<ReportPageState>({
    selectedMetrics: [],
    selectedRevenueRange: '',
    exportFormat: 'PDF',
    loadingStates: {},
    exportProgress: 0,
    error: null,
    retryCount: 0
  });

  // Custom hooks
  const { getMetricsByCategory } = useMetrics();
  const { benchmarks, fetchBenchmarkData } = useBenchmarks();
  const { announce } = useA11y();
  const { startProgress, updateProgress, completeProgress } = useProgress();
  const { showToast } = useToast();

  // Refs for cleanup and abort control
  const abortController = useRef<AbortController>();
  const progressTimer = useRef<NodeJS.Timeout>();

  // Initialize component
  useEffect(() => {
    const initializeReports = async () => {
      try {
        setState(prev => ({ ...prev, loadingStates: { ...prev.loadingStates, init: true } }));
        await getMetricsByCategory('financial');
        setState(prev => ({ 
          ...prev, 
          loadingStates: { ...prev.loadingStates, init: false }
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
  const handleError = useCallback((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setState(prev => ({ ...prev, error: new Error(errorMessage) }));
    showToast(errorMessage, 'error', 'top-right');
    announce(`Error: ${errorMessage}`, 'assertive');
  }, [announce, showToast]);

  // Metric selection handler
  const handleMetricSelection = useCallback(async (metrics: IMetric[]) => {
    try {
      if (metrics.length > MAX_METRICS_PER_REPORT) {
        throw new Error(`Maximum of ${MAX_METRICS_PER_REPORT} metrics can be selected`);
      }

      setState(prev => ({
        ...prev,
        selectedMetrics: metrics,
        loadingStates: { ...prev.loadingStates, metricSelection: true }
      }));

      // Fetch benchmark data for selected metrics
      await Promise.all(
        metrics.map(metric => 
          fetchBenchmarkData(metric.id, state.selectedRevenueRange)
        )
      );

      announce(
        `Selected ${metrics.length} metrics for report generation`,
        'polite'
      );

      setState(prev => ({
        ...prev,
        loadingStates: { ...prev.loadingStates, metricSelection: false }
      }));
    } catch (error) {
      handleError(error);
    }
  }, [state.selectedRevenueRange, fetchBenchmarkData, announce]);

  // Export handler
  const handleExportStart = useCallback(async (format: ExportFormat) => {
    if (!state.selectedMetrics.length || !benchmarks.length) {
      handleError(new Error('Please select metrics and ensure benchmark data is available'));
      return;
    }

    try {
      // Initialize progress tracking
      setState(prev => ({
        ...prev,
        exportFormat: format,
        exportProgress: 0,
        loadingStates: { ...prev.loadingStates, export: true }
      }));

      abortController.current = new AbortController();
      startProgress();

      // Track progress
      progressTimer.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          exportProgress: Math.min(prev.exportProgress + 10, 90)
        }));
      }, 500);

      announce('Starting report export', 'polite');

      // Generate report
      const reportData = {
        metrics: state.selectedMetrics,
        benchmarks,
        revenueRange: state.selectedRevenueRange,
        format
      };

      await ReportGenerator.generateReport(reportData, {
        onProgress: (progress: number) => {
          updateProgress(progress);
          setState(prev => ({ ...prev, exportProgress: progress }));
          announce(`Export progress: ${progress}%`, 'polite');
        },
        signal: abortController.current.signal
      });

      // Cleanup and complete
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
      completeProgress();
      setState(prev => ({
        ...prev,
        exportProgress: 100,
        loadingStates: { ...prev.loadingStates, export: false }
      }));

      announce('Report export completed successfully', 'polite');
      showToast('Report exported successfully', 'success', 'top-right');

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        announce('Export cancelled', 'polite');
        return;
      }
      handleError(error);
    }
  }, [state.selectedMetrics, benchmarks, state.selectedRevenueRange, announce, startProgress, updateProgress, completeProgress, showToast]);

  // Cancel export handler
  const handleExportCancel = useCallback(() => {
    abortController.current?.abort();
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    setState(prev => ({
      ...prev,
      exportProgress: 0,
      loadingStates: { ...prev.loadingStates, export: false }
    }));
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => (
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
            onMetricSelect={handleMetricSelection}
            onRevenueRangeChange={(range) => 
              setState(prev => ({ ...prev, selectedRevenueRange: range }))
            }
            disabled={state.loadingStates.export}
          />

          <div className="export-controls" aria-label="Export options">
            <ExportButton
              format="PDF"
              metrics={state.selectedMetrics}
              benchmarks={benchmarks}
              revenueRange={state.selectedRevenueRange}
              disabled={!state.selectedMetrics.length || state.loadingStates.export}
              onProgress={(progress) => 
                setState(prev => ({ ...prev, exportProgress: progress }))
              }
              onCancel={handleExportCancel}
            />
            <ExportButton
              format="CSV"
              metrics={state.selectedMetrics}
              benchmarks={benchmarks}
              revenueRange={state.selectedRevenueRange}
              disabled={!state.selectedMetrics.length || state.loadingStates.export}
              onProgress={(progress) => 
                setState(prev => ({ ...prev, exportProgress: progress }))
              }
              onCancel={handleExportCancel}
            />
          </div>

          {state.loadingStates.export && (
            <div 
              role="progressbar" 
              aria-valuenow={state.exportProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="export-progress"
            >
              <div 
                className="progress-bar"
                style={{ width: `${state.exportProgress}%` }}
              />
              <span className="progress-label">
                {state.exportProgress}% Complete
              </span>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
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