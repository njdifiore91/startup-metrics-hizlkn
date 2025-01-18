import React, { useRef, useEffect, useCallback } from 'react';
import { Chart, ChartData } from 'chart.js/auto';
import { useDebounce } from 'use-debounce';
import { CHART_COLORS } from '../../config/chart';
import { generateChartOptions } from '../../utils/chartHelpers';

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

const CHART_DEFAULT_HEIGHT = 300;

const BarChart: React.FC<IBarChartProps> = React.memo(({
  data,
  labels,
  height = CHART_DEFAULT_HEIGHT,
  width,
  className = '',
  onBarClick,
  ariaLabel,
  highContrastMode = false
}) => {
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [debouncedResize] = useDebounce(() => {
    if (chartRef.current) {
      chartRef.current.resize();
    }
  }, 250);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const initializeChart = useCallback(() => {
    if (!canvasRef.current) return;

    const chartData: ChartData = {
      labels,
      datasets: [{
        data: data.map(d => d.value),
        backgroundColor: highContrastMode ? 
          CHART_COLORS.background : 
          `${CHART_COLORS.primary}CC`,
        borderColor: highContrastMode ? 
          CHART_COLORS.text : 
          CHART_COLORS.primary,
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 'flex',
        maxBarThickness: 64,
        minBarLength: 4
      }]
    };

    const options = generateChartOptions('bar', {
      onClick: (event: unknown, elements: { index: number }[]) => {
        if (onBarClick && elements.length > 0) {
          const index = elements[0].index;
          onBarClick(index, data[index].value);
        }
      },
      plugins: {
        accessibility: {
          enabled: true,
          announceOnRender: true,
          description: ariaLabel
        },
        tooltip: {
          enabled: true,
          backgroundColor: highContrastMode ? 
            CHART_COLORS.text : 
            `${CHART_COLORS.primary}E6`,
          titleFont: {
            family: 'Inter',
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            family: 'Inter',
            size: 13
          },
          padding: 12,
          cornerRadius: 4,
          callbacks: {
            label: (context: { raw: number }) => {
              const value = context.raw;
              return `Value: ${value.toLocaleString()}`;
            }
          }
        }
      }
    });

    try {
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(canvasRef.current, {
        type: 'bar',
        data: chartData,
        options
      });
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }, [data, labels, onBarClick, ariaLabel, highContrastMode]);

  useEffect(() => {
    initializeChart();
  }, [initializeChart]);

  useEffect(() => {
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, [debouncedResize]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!chartRef.current) return;

    const key = event.key;
    const currentIndex = chartRef.current.getActiveElements()[0]?.index ?? -1;

    switch (key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        event.preventDefault();
        const direction = key === 'ArrowRight' ? 1 : -1;
        const newIndex = Math.max(0, Math.min(data.length - 1, currentIndex + direction));
        chartRef.current.setActiveElements([{
          datasetIndex: 0,
          index: newIndex
        }]);
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
  }, [data, onBarClick]);

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
});

BarChart.displayName = 'BarChart';

export default BarChart;