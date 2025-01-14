import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2'; // react-chartjs-2@5.0.0
import { Chart as ChartJS } from 'chart.js/auto'; // chart.js@4.0.0
import { chartColors } from '../../config/chart.js';
import { generateChartOptions } from '../../utils/chartHelpers.js';

// Default height for the area chart if not specified
const DEFAULT_HEIGHT = 300;

// Interface for the AreaChart component props
interface IAreaChartProps {
  data: number[];
  labels: string[];
  title: string;
  height?: number;
  fillArea?: boolean;
  ariaLabel: string;
  onDataPointClick?: (index: number, value: number) => void;
  isLoading?: boolean;
}

/**
 * A reusable area chart component with accessibility features and performance optimizations
 * @param props - Component props of type IAreaChartProps
 * @returns Rendered area chart component
 */
const AreaChart: React.FC<IAreaChartProps> = React.memo(({
  data,
  labels,
  title,
  height = DEFAULT_HEIGHT,
  fillArea = true,
  ariaLabel,
  onDataPointClick,
  isLoading = false
}) => {
  // Memoize chart options for performance
  const chartOptions = useMemo(() => {
    return generateChartOptions('line', {
      onClick: (_: any, elements: any[]) => {
        if (elements.length > 0 && onDataPointClick) {
          const index = elements[0].index;
          onDataPointClick(index, data[index]);
        }
      },
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        accessibility: {
          enabled: true,
          description: ariaLabel
        }
      }
    }, {
      announceOnRender: true,
      description: ariaLabel
    });
  }, [title, ariaLabel, onDataPointClick, data]);

  // Memoize chart data configuration
  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      label: title,
      data: data,
      fill: fillArea,
      backgroundColor: `${chartColors.primary}40`,
      borderColor: chartColors.primary,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      'aria-label': `${title} data points`,
      role: 'graphics-symbol'
    }]
  }), [data, labels, title, fillArea]);

  // Error boundary wrapper for resilient rendering
  const renderChart = () => {
    try {
      if (isLoading) {
        return (
          <div 
            role="alert" 
            aria-busy="true"
            style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Loading chart data...
          </div>
        );
      }

      if (!data.length || !labels.length) {
        return (
          <div 
            role="alert" 
            aria-label="No data available"
            style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            No data available
          </div>
        );
      }

      return (
        <div 
          style={{ height }} 
          role="region" 
          aria-label={ariaLabel}
        >
          <Line
            data={chartData}
            options={chartOptions}
            plugins={[{
              id: 'customCanvasBackgroundColor',
              beforeDraw: (chart: ChartJS) => {
                const ctx = chart.canvas.getContext('2d');
                if (ctx) {
                  ctx.save();
                  ctx.globalCompositeOperation = 'destination-over';
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, chart.width, chart.height);
                  ctx.restore();
                }
              }
            }]}
          />
        </div>
      );
    } catch (error) {
      console.error('Error rendering area chart:', error);
      return (
        <div 
          role="alert" 
          aria-label="Error loading chart"
          style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}
        >
          Error loading chart
        </div>
      );
    }
  };

  return renderChart();
});

// Display name for debugging
AreaChart.displayName = 'AreaChart';

export default AreaChart;