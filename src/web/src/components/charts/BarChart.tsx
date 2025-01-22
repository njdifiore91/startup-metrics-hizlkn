import React, { useRef, useEffect, useCallback } from 'react';
import { Chart, ChartData, ChartOptions } from 'chart.js/auto'; // chart.js@4.0.0
import { CHART_COLORS } from '../../config/chart';
import { generateChartOptions } from '../../utils/chartHelpers';

// Enhanced interface for bar chart data points
interface IBarChartProps {
  data: Array<{ value: number; label: string }>;
  labels: string[];
  height?: number;
  width?: number;
  className?: string;
  onBarClick?: (index: number, value: number) => void;
  ariaLabel: string;
  highContrastMode?: boolean;
}

// Default chart dimensions
const CHART_DEFAULT_HEIGHT = 300;

// Custom high contrast colors
const HIGH_CONTRAST_COLORS = {
  background: '#000000',
  border: '#FFFFFF',
  tooltip: '#333333',
} as const;

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;
}

// Memoized bar chart component for performance optimization
const BarChart: React.FC<IBarChartProps> = React.memo(
  ({
    data,
    labels,
    height = CHART_DEFAULT_HEIGHT,
    width,
    className = '',
    onBarClick,
    ariaLabel,
    highContrastMode = false,
  }) => {
    // Chart instance reference
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Debounced resize handler for performance
    const debouncedResize = useDebounce(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 250);

    // Cleanup chart instance on unmount
    useEffect(() => {
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy();
        }
      };
    }, []);

    // Initialize chart with accessibility features
    const initializeChart = useCallback(() => {
      if (!canvasRef.current) return;

      // Configure chart data with WCAG-compliant colors
      const chartData: ChartData = {
        labels,
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: highContrastMode
              ? HIGH_CONTRAST_COLORS.background
              : `${CHART_COLORS.primary}CC`,
            borderColor: highContrastMode ? HIGH_CONTRAST_COLORS.border : CHART_COLORS.primary,
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 'flex',
            maxBarThickness: 64,
            minBarLength: 4,
            label: `${ariaLabel} data series`,
          },
        ],
      };

      // Enhanced chart options with accessibility support
      const options = generateChartOptions('bar', {
        onClick: (event, elements) => {
          if (onBarClick && elements.length > 0) {
            const index = elements[0].index;
            onBarClick(index, data[index].value);
          }
        },
        plugins: {
          accessibility: {
            enabled: true,
            announceOnRender: true,
            description: ariaLabel,
          },
          tooltip: {
            enabled: true,
            backgroundColor: highContrastMode
              ? HIGH_CONTRAST_COLORS.tooltip
              : `${CHART_COLORS.primary}E6`,
            titleFont: {
              family: 'Inter',
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              family: 'Inter',
              size: 13,
            },
            padding: 12,
            cornerRadius: 4,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `Value: ${value.toLocaleString()}`;
              },
            },
          },
        },
      });

      // Initialize chart with error boundary
      try {
        if (chartRef.current) {
          chartRef.current.destroy();
        }

        chartRef.current = new Chart(canvasRef.current, {
          type: 'bar',
          data: chartData,
          options,
        });
      } catch (error) {
        console.error('Error initializing chart:', error);
        // Implement error boundary fallback UI if needed
      }
    }, [data, labels, onBarClick, ariaLabel, highContrastMode]);

    // Handle chart updates
    useEffect(() => {
      initializeChart();
    }, [initializeChart]);

    // Handle resize events
    useEffect(() => {
      window.addEventListener('resize', debouncedResize);
      return () => {
        window.removeEventListener('resize', debouncedResize);
      };
    }, [debouncedResize]);

    // Setup keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (!chartRef.current) return;

        const key = event.key;
        const currentIndex = chartRef.current.getActiveElements()[0]?.index ?? -1;

        switch (key) {
          case 'ArrowRight':
          case 'ArrowLeft': {
            event.preventDefault();
            const direction = key === 'ArrowRight' ? 1 : -1;
            const newIndex = Math.max(0, Math.min(data.length - 1, currentIndex + direction));
            chartRef.current.setActiveElements([
              {
                datasetIndex: 0,
                index: newIndex,
              },
            ]);
            chartRef.current.update();
            break;
          }
          case 'Enter':
          case ' ': {
            event.preventDefault();
            if (currentIndex >= 0 && onBarClick) {
              onBarClick(currentIndex, data[currentIndex].value);
            }
            break;
          }
        }
      },
      [data, onBarClick]
    );

    return (
      <div
        className={`bar-chart-container ${className}`}
        style={{ height, width: width || '100%' }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }
);

BarChart.displayName = 'BarChart';

export default BarChart;
