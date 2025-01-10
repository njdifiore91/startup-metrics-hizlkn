import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart } from 'chart.js/auto';
import { jest, expect, describe, it, beforeEach, afterEach } from '@jest/globals';

import BenchmarkChart from '../../../../src/components/charts/BenchmarkChart';
import { IBenchmark } from '../../../../src/interfaces/IBenchmark';

// Mock Chart.js to prevent canvas rendering
jest.mock('chart.js/auto', () => {
  return {
    Chart: jest.fn().mockImplementation(() => ({
      destroy: jest.fn(),
      update: jest.fn(),
      resize: jest.fn(),
      data: {},
      options: {}
    }))
  };
});

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

global.ResizeObserver = mockResizeObserver;

describe('BenchmarkChart Component', () => {
  // Sample test data
  const mockBenchmarkData: IBenchmark = {
    id: '1',
    metricId: 'metric1',
    metric: {
      id: 'metric1',
      name: 'ARR Growth',
      description: 'Annual Recurring Revenue Growth',
      category: 'financial',
      valueType: 'percentage',
      validationRules: {},
      isActive: true,
      displayOrder: 1,
      tags: ['financial', 'growth'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    },
    revenueRange: '$1M-$5M',
    p10: 10,
    p25: 25,
    p50: 50,
    p75: 75,
    p90: 90,
    reportDate: new Date(),
    sourceId: 'source1'
  };

  const defaultProps = {
    benchmark: mockBenchmarkData,
    height: '400px',
    className: 'test-chart',
    ariaLabel: 'Test Benchmark Chart'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (Chart as jest.Mock).mockClear();
    mockResizeObserver.mockClear();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.resetAllMocks();
  });

  it('renders with required props and accessibility features', () => {
    render(<BenchmarkChart {...defaultProps} />);
    
    const canvas = screen.getByRole('img');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('aria-label', defaultProps.ariaLabel);
    expect(canvas).toHaveAttribute('tabIndex', '0');
  });

  it('initializes Chart.js with correct configuration', () => {
    render(<BenchmarkChart {...defaultProps} />);
    
    expect(Chart).toHaveBeenCalledTimes(1);
    const chartConfig = (Chart as jest.Mock).mock.calls[0][1];
    
    expect(chartConfig.type).toBe('bar');
    expect(chartConfig.options.plugins.accessibility.enabled).toBe(true);
    expect(chartConfig.data.datasets).toBeDefined();
  });

  it('updates chart when company metric is provided', async () => {
    const companyMetric = 65;
    render(<BenchmarkChart {...defaultProps} companyMetric={companyMetric} />);
    
    await waitFor(() => {
      const chartInstance = (Chart as jest.Mock).mock.instances[0];
      expect(chartInstance.update).toHaveBeenCalled();
      
      const chartData = chartInstance.data;
      expect(chartData.datasets).toHaveLength(2); // Benchmark + Company metric
      expect(chartData.datasets[1].data).toEqual(Array(5).fill(companyMetric));
    });
  });

  it('handles responsive behavior with ResizeObserver', () => {
    render(<BenchmarkChart {...defaultProps} />);
    
    expect(mockResizeObserver).toHaveBeenCalledTimes(1);
    expect(mockResizeObserver.mock.instances[0].observe).toHaveBeenCalled();
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = render(<BenchmarkChart {...defaultProps} />);
    const chartInstance = (Chart as jest.Mock).mock.instances[0];
    
    unmount();
    
    expect(chartInstance.destroy).toHaveBeenCalled();
    expect(mockResizeObserver.mock.instances[0].disconnect).toHaveBeenCalled();
  });

  it('handles keyboard navigation', async () => {
    render(<BenchmarkChart {...defaultProps} />);
    const canvas = screen.getByRole('img');
    
    // Test Enter key
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(canvas).toHaveFocus();
    
    // Test Space key
    fireEvent.keyDown(canvas, { key: ' ' });
    expect(canvas).toHaveFocus();
  });

  it('applies custom height and className', () => {
    const customProps = {
      ...defaultProps,
      height: '600px',
      className: 'custom-chart'
    };
    
    render(<BenchmarkChart {...customProps} />);
    const chartContainer = screen.getByTestId('benchmark-chart');
    
    expect(chartContainer).toHaveStyle({ height: '600px' });
    expect(chartContainer).toHaveClass('custom-chart');
  });

  it('debounces chart updates for performance', async () => {
    jest.useFakeTimers();
    
    const { rerender } = render(<BenchmarkChart {...defaultProps} />);
    const chartInstance = (Chart as jest.Mock).mock.instances[0];
    
    // Update props multiple times rapidly
    for (let i = 0; i < 5; i++) {
      rerender(<BenchmarkChart {...defaultProps} companyMetric={i} />);
    }
    
    expect(chartInstance.update).not.toHaveBeenCalled();
    
    // Fast-forward debounce timeout
    jest.runAllTimers();
    
    expect(chartInstance.update).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
  });

  it('handles error states gracefully', () => {
    // Mock console.error to prevent error logging
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock Chart.js constructor to throw error
    (Chart as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Chart initialization failed');
    });
    
    render(<BenchmarkChart {...defaultProps} />);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(screen.getByRole('img')).toBeInTheDocument(); // Canvas still renders
    
    consoleSpy.mockRestore();
  });

  it('memoizes component for performance', () => {
    const { rerender } = render(<BenchmarkChart {...defaultProps} />);
    const initialRenderCount = (Chart as jest.Mock).mock.calls.length;
    
    // Rerender with same props
    rerender(<BenchmarkChart {...defaultProps} />);
    
    expect((Chart as jest.Mock).mock.calls.length).toBe(initialRenderCount);
  });
});