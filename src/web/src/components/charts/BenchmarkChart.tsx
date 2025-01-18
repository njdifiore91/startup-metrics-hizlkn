import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Chart, ChartData } from 'chart.js/auto'; // chart.js@4.0.0
import debounce from 'lodash/debounce';

import { IBenchmark } from '../../interfaces/IBenchmark';
import { benchmarkChartOptions } from '../../config/chart';
import { prepareBenchmarkData } from '../../utils/chartHelpers';

/**
 * Props interface for the BenchmarkChart component with comprehensive validation
 */
interface BenchmarkChartProps {
  /** Benchmark data to visualize */
  benchmark: IBenchmark;
  /** Optional company metric for comparison */
  companyMetric?: number;
  /** Optional height override (default: 400px) */
  height?: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional ARIA label for accessibility */
  ariaLabel?: string;
}

/**
 * A highly optimized and accessible benchmark comparison chart component
 * Implements WCAG 2.1 compliance and performance best practices
 * @version 1.0.0
 */
const BenchmarkChart: React.FC<BenchmarkChartProps> = memo(({
  benchmark,
  companyMetric,
  height = '400px',
  className = '',
  ariaLabel
}) => {
  // Refs for chart instance and canvas element
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  /**
   * Initializes the chart with accessibility features and optimized rendering
   */
  const initializeChart = useCallback(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare initial chart data with accessibility metadata
    const chartData = prepareBenchmarkData(benchmark, {
      description: ariaLabel || `Benchmark comparison chart for ${benchmark.metric.name}`
    });

    // Add company metric overlay if provided
    if (typeof companyMetric === 'number') {
      chartData.datasets.push({
        label: 'Your Company',
        data: Array(5).fill(companyMetric),
        borderColor: '#168947',
        backgroundColor: '#16894720',
        fill: false,
        'aria-label': `Your company's ${benchmark.metric.name} value`,
        role: 'graphics-symbol'
      });
    }

    // Initialize chart with accessibility and performance optimizations
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: chartData as ChartData,
      options: {
        ...benchmarkChartOptions,
        plugins: {
          ...benchmarkChartOptions.plugins,
          title: {
            display: true,
            text: chartData.metadata.description
          }
        }
      }
    });
  }, [benchmark, companyMetric, ariaLabel]);

  /**
   * Updates chart data with debouncing for performance
   */
  const updateChart = useCallback(debounce(() => {
    if (!chartInstance.current) return;

    const chartData = prepareBenchmarkData(benchmark, {
      description: ariaLabel || `Benchmark comparison chart for ${benchmark.metric.name}`
    });

    if (typeof companyMetric === 'number') {
      chartData.datasets.push({
        label: 'Your Company',
        data: Array(5).fill(companyMetric),
        borderColor: '#168947',
        backgroundColor: '#16894720',
        fill: false,
        'aria-label': `Your company's ${benchmark.metric.name} value`,
        role: 'graphics-symbol'
      });
    }

    chartInstance.current.data = chartData as ChartData;
    chartInstance.current.update('none'); // Use 'none' mode for performance
  }, 150), [benchmark, companyMetric, ariaLabel]);

  /**
   * Handles responsive resizing with performance optimization
   */
  const handleResize = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.resize();
    }
  }, []);

  // Initialize chart and setup resize observer
  useEffect(() => {
    initializeChart();

    // Setup resize observer for responsive behavior
    resizeObserver.current = new ResizeObserver(handleResize);
    if (chartRef.current) {
      resizeObserver.current.observe(chartRef.current);
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
        resizeObserver.current = null;
      }
    };
  }, [initializeChart, handleResize]);

  // Update chart when data changes
  useEffect(() => {
    updateChart();
  }, [benchmark, companyMetric, updateChart]);

  // Keyboard navigation handler for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Trigger focus on chart element
      chartRef.current?.focus();
    }
  }, []);

  return (
    <div 
      className={`benchmark-chart ${className}`}
      style={{ height, width: '100%' }}
    >
      <canvas
        ref={chartRef}
        role="img"
        aria-label={ariaLabel || `Benchmark comparison chart for ${benchmark.metric.name}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ cursor: 'pointer' }}
      />
    </div>
  );
});

// Display name for debugging
BenchmarkChart.displayName = 'BenchmarkChart';

export default BenchmarkChart;