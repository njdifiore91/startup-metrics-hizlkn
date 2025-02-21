import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import styled from '@emotion/styled';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CompanyMetricForm } from '../components/metrics/CompanyMetricForm';
import { MetricCard } from '../components/metrics/MetricCard';
import { useCompanyMetrics } from '../hooks/useCompanyMetrics';
import { useToast, ToastType } from '../hooks/useToast';
import { ICompanyMetric } from '../interfaces/ICompanyMetric';
import { IMetric } from '../interfaces/IMetric';
import { 
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Alert,
  Typography,
  Box,
  Paper,
  Chip,
  Tooltip,
  Divider,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Add as AddIcon, FilterList as FilterIcon, Sort as SortIcon, Close as CloseIcon } from '@mui/icons-material';
import { AnalyticsBrowser } from '@segment/analytics-next';
import { useAuth } from '../hooks/useAuth';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Initialize analytics
let analytics: AnalyticsBrowser | undefined;
try {
  const writeKey = import.meta.env.VITE_SEGMENT_WRITE_KEY;
  if (!writeKey) {
    console.warn('Segment Analytics write key is not configured. Analytics will be disabled.');
  } else {
    analytics = AnalyticsBrowser.load({ writeKey });
  }
} catch (error) {
  console.warn('Failed to initialize Segment Analytics:', error);
}

// Styled components with improved design
const PageContainer = styled.div`
  padding: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color-light);
`;

const HeaderTitle = styled.div`
  h1 {
    font-size: 2.25rem;
    font-weight: var(--font-weight-bold);
    margin-bottom: var(--spacing-sm);
    color: var(--color-text-dark);
    line-height: 1.2;
  }

  p {
    color: var(--color-text-light);
    font-size: 1.1rem;
    line-height: 1.5;
    max-width: 600px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: var(--spacing-md);
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
  background-color: var(--color-background-light);
  border-radius: 12px;
  border: 1px solid var(--border-color-light);

  .MuiTextField-root {
    background-color: white;
    border-radius: 8px;
    min-width: 200px;
  }

  .MuiInputLabel-root {
    font-weight: var(--font-weight-medium);
  }
`;

const MetricsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-lg);
`;

const StyledButton = styled(Button)`
  &.MuiButton-contained {
    background-color: var(--color-primary);
    color: white;
    font-weight: var(--font-weight-medium);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: 8px;
    text-transform: none;
    font-size: 1rem;

    &:hover {
      background-color: var(--color-primary-dark);
    }
  }
`;

const StatsContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
`;

const StatCard = styled(Paper)`
  padding: var(--spacing-lg);
  text-align: center;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-color-light);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all var(--transition-fast);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  h3 {
    color: var(--color-text-light);
    font-size: 1rem;
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-sm);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    font-size: 2.25rem;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    line-height: 1.2;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  font-size: 1.1rem;
  color: var(--color-text-dark);
  font-weight: var(--font-weight-medium);
`;

// Constants for performance tuning
const METRICS_FETCH_DEBOUNCE = 5000; // Increased to 5 seconds
const CACHE_TTL = 10 * 60 * 1000; // Increased to 10 minutes
const SESSION_CHECK_INTERVAL = 300000; // Increased to 5 minutes
const ANALYTICS_DEBOUNCE = 30000; // 30 seconds for analytics

// Cache entry type
interface CacheEntry<T> {
  data: T;
  cacheTimestamp: number;
}

// Metric data type
interface MetricData {
  metrics: ICompanyMetric[];
  lastUpdated: number;
}

// Add interface for API error
interface ApiError {
  message: string;
  details?: Record<string, any>;
}

// Update the state interface to properly type the error
interface CompanyMetricsState {
  selectedMetric: ICompanyMetric | null;
  isFormOpen: boolean;
  errors: Record<string, string>;
  loadingStates: Record<string, boolean>;
  lastUpdated: Record<string, number>;
  dateRange: {
    start: Date;
    end: Date;
  };
}

const CompanyMetrics: React.FC = () => {
  // Initialize state with current month range
  const [state, setState] = useState<CompanyMetricsState>(() => ({
    selectedMetric: null,
    isFormOpen: false,
    errors: {},
    loadingStates: {},
    lastUpdated: {},
    dateRange: {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    }
  }));

  // Custom hooks
  const { metrics, loading, error, fetchMetrics, createMetric, updateMetric, deleteMetric } =
    useCompanyMetrics();
  const { validateSession } = useAuth();
  const toast = useToast();

  // Refs for caching and validation
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  const lastValidationRef = useRef<number>(0);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize handlers
  const handleMetricSelect = useCallback((metric: ICompanyMetric) => {
    setState((prev) => ({ ...prev, selectedMetric: metric, isFormOpen: true }));
  }, []);

  const handleFormClose = useCallback(() => {
    setState((prev) => ({ ...prev, selectedMetric: null, isFormOpen: false }));
  }, []);

  const handleMetricSubmit = useCallback(
    async (metricData: ICompanyMetric) => {
      try {
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, submit: true },
        }));

        const result = await (metricData.id
          ? updateMetric(metricData.id, metricData)
          : createMetric(metricData));

        // Update cache
        const cacheKey = 'metrics_init';
        const now = Date.now();
        cacheRef.current.set(cacheKey, {
          data: {
            metrics: result,
            lastUpdated: now,
          },
          cacheTimestamp: now,
        });

        setState((prev) => ({
          ...prev,
          selectedMetric: null,
          isFormOpen: false,
          loadingStates: { ...prev.loadingStates, submit: false },
        }));

        toast.showToast('Metric saved successfully', ToastType.SUCCESS);
        
        // Refresh the metrics list without redirecting
        await fetchMetrics();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save metric';
        toast.showToast(errorMessage, ToastType.ERROR);
        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, submit: false },
        }));
      }
    },
    [createMetric, updateMetric, toast, fetchMetrics]
  );

  // Filter metrics based on date range
  const filteredMetrics = useMemo(() => {
    if (!metrics?.length) return [];
    
    // Group metrics by metricId
    const groupedMetrics = metrics.reduce((acc, metric) => {
      if (!acc[metric.metricId]) {
        acc[metric.metricId] = [];
      }
      acc[metric.metricId].push(metric);
      return acc;
    }, {} as Record<string, ICompanyMetric[]>);

    // Get the latest metric for each group that falls within the date range
    return Object.values(groupedMetrics).map(group => {
      const sortedGroup = [...group].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return {
        current: sortedGroup[0],
        historical: sortedGroup.filter(metric => 
          isWithinInterval(new Date(metric.date), {
            start: state.dateRange.start,
            end: state.dateRange.end
          })
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
    });
  }, [metrics, state.dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!metrics?.length) return null;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime());
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now.getTime());
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMetrics = metrics.filter(m => new Date(m.date) >= thirtyDaysAgo);
    const weeklyMetrics = metrics.filter(m => new Date(m.date) >= sevenDaysAgo);
    
    // Only return stats if we have meaningful data
    if (metrics.length === 0) return null;

    const dates = metrics.map(m => new Date(m.date));
    const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    const monthsDiff = Math.max(1, 
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
      (lastDate.getMonth() - firstDate.getMonth()) + 1
    );

    return {
      total: metrics.length,
      thisMonth: recentMetrics.length,
      thisWeek: weeklyMetrics.length,
      averagePerMonth: Math.round((metrics.length / monthsDiff) * 10) / 10
    };
  }, [metrics]);

  // Remove the session validation effect and keep only the data initialization
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeMetrics = async () => {
      try {
        const now = Date.now();
        const cacheKey = 'metrics_init';
        const cachedData = cacheRef.current.get(cacheKey);

        if (cachedData && now - cachedData.cacheTimestamp < CACHE_TTL) {
          return;
        }

        if (!mounted) return;

        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: true },
          errors: {},
        }));

        const result = await fetchMetrics();

        if (!mounted) return;

        cacheRef.current.set(cacheKey, {
          data: { metrics: result, lastUpdated: now },
          cacheTimestamp: now,
        });

        setState((prev) => ({
          ...prev,
          loadingStates: { ...prev.loadingStates, init: false },
          lastUpdated: { ...prev.lastUpdated, metrics: now },
          errors: {},
        }));

        // Debounced analytics
        if (analyticsTimeoutRef.current) {
          clearTimeout(analyticsTimeoutRef.current);
        }
        analyticsTimeoutRef.current = setTimeout(() => {
          analytics?.track('Company Metrics Page Loaded', {
            metricsCount: metrics?.length ?? 0,
            lastUpdated: new Date().toISOString(),
          });
        }, ANALYTICS_DEBOUNCE);
      } catch (error) {
        if (!mounted) return;

        const errorMessage = error instanceof Error ? error.message : 'Failed to load metrics';
        console.error('Error loading metrics:', error);
        toast.showToast(errorMessage, ToastType.ERROR);

        setState((prev) => ({
          ...prev,
          errors: { ...prev.errors, init: errorMessage },
          loadingStates: { ...prev.loadingStates, init: false },
        }));
      }
    };

    timeoutId = setTimeout(initializeMetrics, METRICS_FETCH_DEBOUNCE);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (analyticsTimeoutRef.current) {
        clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, [fetchMetrics, metrics?.length, toast]);

  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <PageContainer>
          <Header>
            <HeaderTitle>
              <Typography variant="h1">Company Metrics</Typography>
              <Typography variant="subtitle1">
                Track, analyze, and manage your company's key performance indicators in real-time
              </Typography>
            </HeaderTitle>
            <HeaderActions>
              <StyledButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setState(prev => ({ ...prev, isFormOpen: true }))}
              >
                Add New Metric
              </StyledButton>
            </HeaderActions>
          </Header>

          {stats && (
            <StatsContainer>
              <StatCard elevation={0}>
                <h3>Total Metrics</h3>
                <div className="value">{stats.total}</div>
              </StatCard>
              <StatCard elevation={0}>
                <h3>This Month</h3>
                <div className="value">{stats.thisMonth}</div>
              </StatCard>
              <StatCard elevation={0}>
                <h3>This Week</h3>
                <div className="value">{stats.thisWeek}</div>
              </StatCard>
              <StatCard elevation={0}>
                <h3>Average Per Month</h3>
                <div className="value">{stats.averagePerMonth}</div>
              </StatCard>
            </StatsContainer>
          )}

          <FilterContainer>
            <DatePicker
              label="Start Date"
              value={state.dateRange.start}
              onChange={(newValue) => {
                if (newValue) {
                  setState(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: newValue }
                  }));
                }
              }}
              slotProps={{
                textField: {
                  variant: "outlined",
                  size: "medium",
                  fullWidth: true
                }
              }}
            />
            <DatePicker
              label="End Date"
              value={state.dateRange.end}
              onChange={(newValue) => {
                if (newValue) {
                  setState(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: newValue }
                  }));
                }
              }}
              slotProps={{
                textField: {
                  variant: "outlined",
                  size: "medium",
                  fullWidth: true
                }
              }}
            />
          </FilterContainer>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: '8px',
                '& .MuiAlert-message': {
                  fontSize: '1rem'
                }
              }} 
              onClose={() => setState(prev => ({ ...prev, errors: {} }))}
            >
              {typeof error === 'string' ? error : (error as ApiError).message || 'An unexpected error occurred'}
            </Alert>
          )}

          {loading ? (
            <LoadingOverlay>
              Loading metrics...
            </LoadingOverlay>
          ) : (
            <MetricsGrid>
              {filteredMetrics.map(({ current, historical }) => (
                <Box key={current.id}>
                  <MetricCard
                    metric={current}
                    historicalRecords={historical}
                    onEdit={() => handleMetricSelect(current)}
                    onDelete={deleteMetric}
                  />
                </Box>
              ))}
              
              {filteredMetrics.length === 0 && (
                <Alert
                  severity="info"
                  sx={{
                    borderRadius: '8px',
                    '& .MuiAlert-message': {
                      width: '100%',
                      textAlign: 'center',
                      py: 2
                    },
                  }}
                >
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>
                    No metrics found for the selected date range.
                  </p>
                  <p style={{ margin: '8px 0 0 0', color: 'var(--color-text-light)' }}>
                    {metrics.length === 0 
                      ? 'Use the button above to add your first metric.'
                      : 'Try adjusting the date range to see more metrics.'}
                  </p>
                </Alert>
              )}
            </MetricsGrid>
          )}

          <Dialog
            open={state.isFormOpen}
            onClose={handleFormClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: '12px',
                padding: '24px'
              }
            }}
          >
            <DialogTitle sx={{ 
              fontSize: '1.5rem', 
              fontWeight: 600,
              p: 0,
              mb: 3
            }}>
              {state.selectedMetric ? 'Edit Metric' : 'Add New Metric'}
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <CompanyMetricForm
                initialData={state.selectedMetric || undefined}
                onSubmitSuccess={handleMetricSubmit}
                onCancel={handleFormClose}
                isSubmitting={state.loadingStates['submit']}
              />
            </DialogContent>
          </Dialog>
        </PageContainer>
      </LocalizationProvider>
    </ErrorBoundary>
  );
};

export default React.memo(CompanyMetrics);
