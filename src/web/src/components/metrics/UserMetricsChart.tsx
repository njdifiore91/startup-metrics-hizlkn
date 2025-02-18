import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  TimeScale,
  LineController,
  LogarithmicScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';
import styled from '@emotion/styled';
import { api } from '../../services/api';

interface MetricType {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: string;
  valueType: string;
  frequency: string;
  unit: string;
  precision: number;
}

interface UserMetric {
  value: number;
  id: string;
  companyId: string;
  metricId: string;
  date: string;
  source: string;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metric: MetricType;
}

interface ApiResponse {
  data: {
    data: UserMetric[];
    meta: {
      responseTime: number;
      correlationId: string;
    };
  }
}

interface ApiError {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
    stack?: string;
  };
}

// Register ChartJS components and set defaults
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Set the default locale for date-fns adapter
ChartJS.defaults.locale = 'en-US';
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;

const ChartContainer = styled.div`
  width: 100%;
  margin: var(--spacing-md) 0;
  padding: var(--spacing-xl);
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  min-height: 500px;
  height: 100%;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* Ensure the chart container takes up the full height */
  & > div {
    height: 100% !important;
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
`;

const ErrorMessage = styled.div`
  color: var(--color-error);
  text-align: center;
  padding: var(--spacing-md);
  background-color: var(--color-error-light);
  border-radius: var(--border-radius-md);
  margin: var(--spacing-md) 0;
`;

interface UserMetricsChartProps {
  userId: string;
}

// Professional color palette with better contrast
const chartColors = [
  { border: '#2563EB', background: 'rgba(37, 99, 235, 0.1)' }, // Blue
  { border: '#059669', background: 'rgba(5, 150, 105, 0.1)' }, // Green
  { border: '#DC2626', background: 'rgba(220, 38, 38, 0.1)' }, // Red
  { border: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)' }, // Purple
  { border: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }, // Yellow
];

// Cache for storing metrics data
const metricsCache = new Map<string, {
  data: UserMetric[];
  timestamp: number;
}>();

// Increased cache duration and added more conservative rate limiting
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown after rate limit
const BURST_LIMIT = 5; // Reduced burst limit to be more conservative
const RETRY_DELAY = 5000; // 5 seconds between retries

// Track rate limit state globally
const rateLimitState = {
  requestCount: 0,
  lastReset: Date.now(),
  isInCooldown: false,
  cooldownTimeout: null as NodeJS.Timeout | null,
  lastRequestTime: Date.now(),
};

export const UserMetricsChart: React.FC<UserMetricsChartProps> = ({ userId }) => {
  const [metrics, setMetrics] = useState<UserMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Reference to chart instance and canvas
  const chartInstanceRef = useRef<ChartJS | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);

  // Cleanup function for chart instance and timeout
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Reset rate limit counter periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      rateLimitState.requestCount = 0;
      rateLimitState.lastReset = Date.now();
    }, 60 * 1000); // Reset every minute

    return () => {
      clearInterval(resetInterval);
      if (rateLimitState.cooldownTimeout) {
        clearTimeout(rateLimitState.cooldownTimeout);
      }
    };
  }, []);

  const fetchMetricsWithCache = useCallback(async () => {
    const now = Date.now();
    const cachedData = metricsCache.get(userId);
    
    // Return cached data if it's still valid
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      setMetrics(cachedData.data);
      setLoading(false);
      return;
    }

    // Enforce minimum time between requests
    const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
    if (timeSinceLastRequest < DEBOUNCE_DELAY) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => {
        fetchMetricsWithCache();
      }, DEBOUNCE_DELAY - timeSinceLastRequest);
      return;
    }

    // Check if in rate limit cooldown
    if (rateLimitState.isInCooldown) {
      setError('Rate limit reached. Please wait a few minutes before retrying.');
      setLoading(false);
      return;
    }

    // Check burst limit
    if (rateLimitState.requestCount >= BURST_LIMIT) {
      rateLimitState.isInCooldown = true;
      setError('Request limit reached. Cooling down for 5 minutes.');
      setLoading(false);
      
      if (rateLimitState.cooldownTimeout) {
        clearTimeout(rateLimitState.cooldownTimeout);
      }
      rateLimitState.cooldownTimeout = setTimeout(() => {
        rateLimitState.isInCooldown = false;
        rateLimitState.requestCount = 0;
        // Retry fetch after cooldown
        fetchMetricsWithCache();
      }, RATE_LIMIT_COOLDOWN);
      
      return;
    }

    try {
      setLoading(true);
      setError(null);
      rateLimitState.lastRequestTime = now;
      rateLimitState.requestCount++;
      
      const response = await api.get<ApiResponse>(`/api/v1/metrics/user/${userId}`);
      
      if ('error' in response.data) {
        const errorData = response.data.error as { code: string; message: string };
        
        if (errorData.code === 'BUS_005' || response.status === 429) {
          // Rate limit hit - enter cooldown
          rateLimitState.isInCooldown = true;
          if (rateLimitState.cooldownTimeout) {
            clearTimeout(rateLimitState.cooldownTimeout);
          }
          rateLimitState.cooldownTimeout = setTimeout(() => {
            rateLimitState.isInCooldown = false;
            rateLimitState.requestCount = 0;
            // Retry fetch after cooldown
            fetchMetricsWithCache();
          }, RATE_LIMIT_COOLDOWN);
          
          throw new Error('Rate limit exceeded. System will automatically retry after cooling down.');
        }
        
        throw new Error(
          `API Error: ${errorData.message} (Code: ${errorData.code})`
        );
      }

      const validMetrics = response.data.data.data.filter(
        (metric: UserMetric) => metric.value !== null && !isNaN(metric.value)
      );

      // Cache the fetched data
      metricsCache.set(userId, {
        data: validMetrics,
        timestamp: now
      });

      setMetrics(validMetrics);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to fetch metrics data';
      
      setError(errorMessage);
      
      // If it's not a rate limit error and we haven't exceeded retry attempts,
      // schedule a retry
      if (!errorMessage.includes('Rate limit') && retryCount < MAX_RETRIES) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchMetricsWithCache();
        }, RETRY_DELAY);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, retryCount]);

  // Effect to trigger initial fetch
  useEffect(() => {
    fetchMetricsWithCache();
  }, [fetchMetricsWithCache]);

  // Enhanced date handling
  const uniqueDates = React.useMemo(() => {
    // Get all dates and sort them
    const dates = metrics.map(metric => new Date(metric.date));
    return Array.from(new Set(dates.map(d => d.getTime())))
      .sort((a, b) => a - b)
      .map(timestamp => new Date(timestamp).toISOString().split('T')[0]);
  }, [metrics]);

  // Group metrics by metric type and ensure proper sorting
  const groupedMetrics = React.useMemo(() => {
    const groups = new Map<string, UserMetric[]>();
    
    // First pass: group by metric type
    metrics.forEach(metric => {
      const key = metric.metric.id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push({
        ...metric,
        value: Number(metric.value) // Ensure value is a number
      });
    });

    // Second pass: sort and deduplicate each group
    return Array.from(groups.entries()).map(([_, metrics]) => {
      const sortedMetrics = metrics.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Remove duplicates keeping the latest value for each date
      const uniqueMetrics = new Map<string, UserMetric>();
      sortedMetrics.forEach(metric => {
        const dateKey = new Date(metric.date).toISOString().split('T')[0];
        const existing = uniqueMetrics.get(dateKey);
        if (!existing || new Date(metric.updatedAt) > new Date(existing.updatedAt)) {
          uniqueMetrics.set(dateKey, metric);
        }
      });

      return Array.from(uniqueMetrics.values());
    });
  }, [metrics]);

  // Memoize chart options to prevent unnecessary re-renders
  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'point',
      intersect: true,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 20,
          font: {
            size: 13,
            weight: 'bold',
            family: "'Inter', system-ui, sans-serif",
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        bodyFont: {
          size: 13,
          family: "'Inter', system-ui, sans-serif",
        },
        titleFont: {
          size: 14,
          weight: 'bold',
          family: "'Inter', system-ui, sans-serif",
        },
        padding: 12,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 4,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        mode: 'point',
        intersect: true,
        callbacks: {
          title: (tooltipItems) => {
            if (!tooltipItems.length) return '';
            const timestamp = tooltipItems[0].parsed.x;
            return new Date(timestamp).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          },
          label: (context) => {
            const value = context.parsed.y;
            if (value === null || typeof value !== 'number' || isNaN(value)) return '';
            
            const metricGroup = groupedMetrics[context.datasetIndex];
            if (!metricGroup?.[0]) return '';

            const metric = metricGroup[0].metric;
            const unit = metric.unit || '';
            const precision = metric.precision || 0;
            
            const formattedValue = new Intl.NumberFormat('en-US', {
              style: metric.valueType === 'currency' ? 'currency' : 'decimal',
              currency: 'USD',
              maximumFractionDigits: precision,
              minimumFractionDigits: precision,
            }).format(value);
            
            return ` ${metric.displayName || metric.name}: ${formattedValue}${unit ? ` ${unit}` : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          parser: 'yyyy-MM-dd',
          displayFormats: {
            day: 'MMM d, yyyy',
            week: 'MMM d, yyyy',
            month: 'MMM yyyy',
            quarter: 'MMM yyyy',
            year: 'yyyy'
          },
          tooltipFormat: 'PP'
        },
        adapters: {
          date: {
            locale: enUS
          }
        },
        display: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true,
          drawTicks: true
        },
        border: {
          display: true,
          color: 'rgba(0, 0, 0, 0.3)',
          width: 1
        },
        ticks: {
          source: 'data',
          autoSkip: true,
          maxRotation: 45,
          minRotation: 45,
          padding: 12,
          font: {
            size: 12,
            weight: 'bold',
            family: "'Inter', system-ui, sans-serif",
          },
          color: '#374151',
          maxTicksLimit: 10,
          display: true,
          align: 'center',
          major: {
            enabled: true
          }
        },
        title: {
          display: true,
          text: 'Timeline',
          color: '#1f2937',
          font: {
            size: 14,
            weight: 'bold',
            family: "'Inter', system-ui, sans-serif",
          },
          padding: { top: 20 },
        },
      },
      y: {
        type: 'logarithmic',
        display: true,
        position: 'left',
        min: 1,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        border: {
          display: false,
        },
        ticks: {
          padding: 20,
          autoSkip: true,
          maxTicksLimit: 5,
          font: {
            size: 11,
            weight: 'normal',
            family: "'Inter', system-ui, sans-serif",
          },
          callback: (value) => {
            if (typeof value !== 'number') return '';
            if (value >= 1000000) {
              return `${Math.round(value / 100000) / 10}M`;
            } else if (value >= 1000) {
              return `${Math.round(value / 100) / 10}K`;
            }
            return value.toFixed(value < 10 ? 1 : 0);
          },
        },
        title: {
          display: true,
          text: 'Value (Log Scale)',
          font: {
            size: 12,
            weight: 'bold',
            family: "'Inter', system-ui, sans-serif",
          },
          padding: { bottom: 25 },
        },
      },
    },
    animation: {
      duration: 0 // Disable animations for smoother updates
    },
    transitions: {
      active: {
        animation: {
          duration: 0 // Disable transitions
        }
      }
    },
  }), [groupedMetrics]); // Only depends on groupedMetrics for tooltip callbacks

  // Memoize chart data to prevent unnecessary re-renders
  const chartData: ChartData<'line'> = useMemo(() => ({
    datasets: groupedMetrics.map((metricGroup, index) => {
      if (metricGroup.length === 0) return null;

      const metric = metricGroup[0].metric;
      const data = metricGroup.map(m => ({
        x: new Date(m.date).getTime(),
        y: Number(m.value)
      })).sort((a, b) => a.x - b.x);

      return {
        label: metric.displayName || metric.name,
        data: data,
        borderColor: chartColors[index % chartColors.length].border,
        backgroundColor: chartColors[index % chartColors.length].background,
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: chartColors[index % chartColors.length].border,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: chartColors[index % chartColors.length].border,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        fill: true,
        spanGaps: true,
      };
    }).filter((dataset): dataset is NonNullable<typeof dataset> => dataset !== null),
  }), [groupedMetrics]); // Only depends on groupedMetrics

  // Effect to handle chart initialization and updates with debounce
  useEffect(() => {
    if (loading || error || metrics.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    // Use debounce for chart updates
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      // Only destroy and recreate if necessary
      if (chartInstanceRef.current) {
        chartInstanceRef.current.data = chartData;
        chartInstanceRef.current.options = options;
        chartInstanceRef.current.update('none'); // Update without animation
      } else {
        chartInstanceRef.current = new ChartJS(ctx, {
          type: 'line',
          data: chartData,
          options: options
        });
      }
    }, 100); // Small delay to batch updates

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [metrics, loading, error, chartData, options]);

  return (
    <ChartContainer>
      {loading && (
        <LoadingMessage>
          {retryCount > 0 
            ? `Rate limit reached. Retrying (${retryCount}/${MAX_RETRIES})...`
            : 'Loading metrics data...'}
        </LoadingMessage>
      )}

      {error && (
        <ErrorMessage>
          {error}
          {error.includes('Rate limit') && (
            <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
              Please wait a moment before trying again.
            </div>
          )}
        </ErrorMessage>
      )}

      {!loading && !error && metrics.length === 0 && (
        <LoadingMessage>No metrics data available</LoadingMessage>
      )}

      {!loading && !error && metrics.length > 0 && (
        <Line
          data={chartData}
          options={options}
        />
      )}
    </ChartContainer>
  );
};

