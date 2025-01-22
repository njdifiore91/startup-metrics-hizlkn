import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { renderWithProviders } from '@testing-library/react-hooks';
import Dashboard from '../../../src/pages/Dashboard';
import { useMetrics } from '../../../src/hooks/useMetrics';
import { useBenchmarks } from '../../../src/hooks/useBenchmarks';
import type { IMetric } from '../../../src/interfaces/IMetric';
import type { IBenchmark } from '../../../src/interfaces/IBenchmark';

expect.extend(toHaveNoViolations);

// Mock hooks
vi.mock('../../../src/hooks/useMetrics');
vi.mock('../../../src/hooks/useBenchmarks');

// Mock analytics
vi.mock('@segment/analytics-next', () => ({
  analytics: {
    track: vi.fn(),
  },
}));

// Mock test data
const mockMetrics: IMetric[] = [
  {
    id: 'arr-growth',
    name: 'ARR Growth',
    category: 'financial',
    valueType: 'percentage',
    value: 75.5,
    description: 'Annual Recurring Revenue Growth Rate',
    isActive: true,
    displayOrder: 1,
    tags: ['financial', 'growth'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    validationRules: {
      min: 0,
      max: 1000,
      precision: 2,
    },
  },
  {
    id: 'ndr',
    name: 'Net Dollar Retention',
    category: 'growth',
    valueType: 'percentage',
    value: 120,
    description: 'Net Dollar Retention Rate',
    isActive: true,
    displayOrder: 2,
    tags: ['growth', 'retention'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    validationRules: {
      min: 0,
      max: 200,
      precision: 2,
    },
  },
];

const mockBenchmarks: IBenchmark = {
  metricId: 'arr-growth',
  revenueRange: '$1M-$5M',
  p10: 10,
  p25: 25,
  p50: 50,
  p75: 75,
  p90: 90,
  id: 'benchmark-1',
  metric: mockMetrics[0],
  reportDate: new Date(),
  sourceId: 'source-1',
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (useMetrics as Mock).mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      getMetricsByCategory: vi.fn(),
    });

    (useBenchmarks as Mock).mockReturnValue({
      benchmarks: mockBenchmarks,
      loading: false,
      error: null,
      fetchBenchmarkData: vi.fn(),
      compareBenchmark: vi.fn(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render dashboard with metric cards', async () => {
    render(<Dashboard />);

    // Verify dashboard layout
    expect(screen.getByRole('search', { name: /metric filters/i })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: /metrics grid/i })).toBeInTheDocument();

    // Verify metric cards
    const metricCards = screen.getAllByTestId(/^metric-card-/);
    expect(metricCards).toHaveLength(mockMetrics.length);

    // Verify first metric card content
    const firstCard = within(metricCards[0]);
    expect(firstCard.getByText('ARR Growth')).toBeInTheDocument();
    expect(firstCard.getByText('75.5%')).toBeInTheDocument();
  });

  it('should handle metric category filtering', async () => {
    const getMetricsByCategory = vi.fn();
    (useMetrics as Mock).mockReturnValue({
      metrics: mockMetrics,
      loading: false,
      error: null,
      getMetricsByCategory,
    });

    render(<Dashboard />);

    // Select growth category
    const categorySelect = screen.getByLabelText(/select metric category/i);
    await userEvent.selectOptions(categorySelect, 'growth');

    // Verify category filter was called
    expect(getMetricsByCategory).toHaveBeenCalledWith('growth');

    // Verify filtered metrics
    await waitFor(() => {
      const metricCards = screen.getAllByTestId(/^metric-card-/);
      expect(metricCards.length).toBe(1);
      expect(within(metricCards[0]).getByText('Net Dollar Retention')).toBeInTheDocument();
    });
  });

  it('should handle metric selection and comparison view', async () => {
    const fetchBenchmarkData = vi.fn();
    (useBenchmarks as Mock).mockReturnValue({
      benchmarks: mockBenchmarks,
      loading: false,
      error: null,
      fetchBenchmarkData,
      compareBenchmark: vi.fn(),
    });

    render(<Dashboard />);

    // Click on a metric card
    const metricCard = screen.getByTestId('metric-card-arr-growth');
    await userEvent.click(metricCard);

    // Verify benchmark data was fetched
    expect(fetchBenchmarkData).toHaveBeenCalledWith('arr-growth', '$1M-$5M');

    // Verify comparison section appears
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /benchmark comparison/i })).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const error = new Error('Failed to fetch metrics');
    (useMetrics as Mock).mockReturnValue({
      metrics: [],
      loading: false,
      error,
      getMetricsByCategory: vi.fn(),
    });

    render(<Dashboard />);

    // Verify error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent(error.message);
  });

  it('should meet accessibility requirements', async () => {
    const { container } = render(<Dashboard />);

    // Run axe accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verify keyboard navigation
    const categorySelect = screen.getByLabelText(/select metric category/i);
    categorySelect.focus();
    expect(document.activeElement).toBe(categorySelect);

    // Verify ARIA labels
    expect(screen.getByRole('search')).toHaveAttribute('aria-label', 'Metric filters');
    expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Metrics grid');
  });

  it('should handle revenue range filtering', async () => {
    render(<Dashboard />);

    // Select revenue range
    const revenueSelect = screen.getByLabelText(/select revenue range/i);
    await userEvent.selectOptions(revenueSelect, '$5M-$20M');

    // Verify revenue range was updated
    expect(revenueSelect).toHaveValue('$5M-$20M');
  });

  it('should track user interactions', async () => {
    const { analytics } = require('@segment/analytics-next');
    render(<Dashboard />);

    // Click metric card
    const metricCard = screen.getByTestId('metric-card-arr-growth');
    await userEvent.click(metricCard);

    // Verify analytics event was tracked
    expect(analytics.track).toHaveBeenCalledWith('Metric Selected', {
      metricId: 'arr-growth',
      category: 'financial',
      revenueRange: expect.any(String),
    });
  });
});
