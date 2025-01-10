import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Component and types
import MetricComparison from '../../../../src/components/metrics/MetricComparison';
import { IMetric, MetricValueType } from '../../../../src/interfaces/IMetric';
import { useBenchmarks } from '../../../../src/hooks/useBenchmarks';
import BenchmarkChart from '../../../../src/components/charts/BenchmarkChart';

// Mock dependencies
jest.mock('../../../../src/hooks/useBenchmarks');
jest.mock('../../../../src/components/charts/BenchmarkChart');
expect.extend(toHaveNoViolations);

// Test data
const mockMetric: IMetric = {
  id: 'arr-growth',
  name: 'ARR Growth',
  description: 'Annual Recurring Revenue Growth Rate',
  category: 'growth',
  valueType: 'percentage' as MetricValueType,
  validationRules: {
    min: 0,
    max: 1000,
    required: true
  },
  isActive: true,
  displayOrder: 1,
  tags: ['growth', 'revenue'],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockBenchmarks = [{
  id: 'benchmark-1',
  metricId: 'arr-growth',
  revenueRange: '$1M-$5M',
  p10: 10,
  p25: 25,
  p50: 50,
  p75: 75,
  p90: 90,
  reportDate: new Date(),
  sourceId: 'source-1',
  metric: mockMetric
}];

// Helper function to setup component render
const renderComponent = (props = {}) => {
  const user = userEvent.setup();
  const defaultProps = {
    metric: mockMetric,
    revenueRange: '$1M-$5M',
    companyValue: 45,
    onComparisonComplete: jest.fn(),
    className: 'test-class'
  };

  const mergedProps = { ...defaultProps, ...props };
  const utils = render(<MetricComparison {...mergedProps} />);

  return {
    user,
    ...utils,
    props: mergedProps
  };
};

describe('MetricComparison Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    (useBenchmarks as jest.Mock).mockReturnValue({
      benchmarks: mockBenchmarks,
      loading: false,
      error: null,
      fetchBenchmarkData: jest.fn(),
      compareBenchmark: jest.fn()
    });
    (BenchmarkChart as jest.Mock).mockImplementation(() => <div>Mock Chart</div>);
  });

  describe('Rendering States', () => {
    it('renders loading state correctly', () => {
      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: true,
        benchmarks: [],
        error: null
      });

      renderComponent();
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading comparison data...')).toBeInTheDocument();
    });

    it('renders error state with retry option', () => {
      const errorMessage = 'Failed to load benchmarks';
      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: false,
        benchmarks: [],
        error: errorMessage
      });

      renderComponent();
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('renders benchmark data correctly', async () => {
      const { props } = renderComponent();

      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        `Benchmark comparison for ${props.metric.name}`
      );
      expect(screen.getByText('Mock Chart')).toBeInTheDocument();
      
      const percentiles = screen.getAllByRole('listitem');
      expect(percentiles).toHaveLength(5);
    });
  });

  describe('User Interactions', () => {
    it('handles retry button click', async () => {
      const fetchMock = jest.fn();
      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: false,
        benchmarks: [],
        error: 'Error',
        fetchBenchmarkData: fetchMock
      });

      const { user } = renderComponent();
      const retryButton = screen.getByRole('button', { name: /retry/i });
      
      await user.click(retryButton);
      expect(fetchMock).toHaveBeenCalledWith('arr-growth', '$1M-$5M');
    });

    it('updates comparison when company value changes', async () => {
      const compareMock = jest.fn().mockResolvedValue({
        percentile: 75,
        difference: 5,
        trend: { direction: 'up', magnitude: 10 }
      });

      (useBenchmarks as jest.Mock).mockReturnValue({
        benchmarks: mockBenchmarks,
        loading: false,
        error: null,
        compareBenchmark: compareMock
      });

      const { rerender } = renderComponent({ companyValue: 45 });
      
      await waitFor(() => {
        expect(compareMock).toHaveBeenCalledWith(45, 'arr-growth');
      });

      rerender(<MetricComparison metric={mockMetric} revenueRange="$1M-$5M" companyValue={50} />);
      
      await waitFor(() => {
        expect(compareMock).toHaveBeenCalledWith(50, 'arr-growth');
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility standards', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      renderComponent();
      
      expect(screen.getByRole('region')).toHaveAttribute(
        'aria-label',
        'Benchmark comparison for ARR Growth'
      );
      expect(screen.getByLabelText('Benchmark visualization')).toBeInTheDocument();
      expect(screen.getByLabelText('Detailed percentile breakdown')).toBeInTheDocument();
    });

    it('maintains proper focus management', async () => {
      const { user } = renderComponent();
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      
      if (retryButton) {
        await user.tab();
        expect(retryButton).toHaveFocus();
      }
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const errorMessage = 'Network Error';
      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: false,
        benchmarks: [],
        error: errorMessage,
        fetchBenchmarkData: jest.fn()
      });

      renderComponent();
      
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });

    it('handles invalid metric values', async () => {
      const compareMock = jest.fn().mockRejectedValue(new Error('Invalid value'));
      (useBenchmarks as jest.Mock).mockReturnValue({
        benchmarks: mockBenchmarks,
        loading: false,
        error: null,
        compareBenchmark: compareMock
      });

      renderComponent({ companyValue: -1 });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('recovers from error states', async () => {
      const fetchMock = jest.fn().mockResolvedValue(mockBenchmarks);
      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: false,
        benchmarks: [],
        error: 'Initial error',
        fetchBenchmarkData: fetchMock
      });

      const { rerender } = renderComponent();
      
      expect(screen.getByRole('alert')).toBeInTheDocument();

      (useBenchmarks as jest.Mock).mockReturnValue({
        loading: false,
        benchmarks: mockBenchmarks,
        error: null,
        fetchBenchmarkData: fetchMock
      });

      rerender(<MetricComparison metric={mockMetric} revenueRange="$1M-$5M" />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});