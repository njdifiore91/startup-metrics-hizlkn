/**
 * Global constants for the Startup Metrics Benchmarking Platform frontend
 * @version 1.0.0
 */

import { MetricValueType } from '@/interfaces/IMetric';

// Interfaces for type safety
interface IApiConfig {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  API_VERSION: string;
  API_ENDPOINTS: Record<string, string>;
  ERROR_LOGGING_ENABLED: boolean;
}

interface IMetricType {
  FINANCIAL: string;
  GROWTH: string;
  OPERATIONAL: string;
}

interface IChartConfig {
  DIMENSIONS: Record<string, string>;
  MARGINS: Record<string, number>;
  COLORS: readonly string[];
}

/**
 * API configuration constants
 * Used for service communication and endpoint management
 */
export const API_CONFIG: IApiConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  API_TIMEOUT: 30000,
  API_VERSION: 'v1',
  API_ENDPOINTS: {
    AUTH: '/auth',
    METRICS: '/metrics',
    BENCHMARKS: '/benchmarks',
    COMPANY_METRICS: '/company-metrics',
    EXPORTS: '/exports',
    USERS: '/users',
  },
  ERROR_LOGGING_ENABLED: import.meta.env.MODE === 'development',
} as const;

/**
 * Metric type constants
 * Used for categorizing different types of metrics
 */
export const METRIC_TYPES: IMetricType = {
  FINANCIAL: 'financial',
  GROWTH: 'growth',
  OPERATIONAL: 'operational',
} as const;

/**
 * Revenue range constants
 * Used for filtering and categorizing companies by revenue
 */
export const REVENUE_RANGES = {
  ranges: ['0-1M', '1M-5M', '5M-20M', '20M-50M', '50M+'],
} as const;

/**
 * UI layout constants
 * Used for consistent spacing and responsive design
 */
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: '250px',
  HEADER_HEIGHT: '64px',
  BREAKPOINTS: {
    MOBILE: '768px',
    TABLET: '1024px',
    DESKTOP: '1440px',
  },
  SPACING: {
    DEFAULT_PADDING: '24px',
    DEFAULT_MARGIN: '16px',
  },
} as const;

/**
 * Authentication constants
 * Used for token management and session handling
 */
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
} as const;

/**
 * Chart visualization constants
 * Used for consistent chart rendering and styling
 */
export const CHART_CONSTANTS: IChartConfig = {
  DIMENSIONS: {
    DEFAULT_HEIGHT: '400px',
    DEFAULT_WIDTH: '100%',
  },
  MARGINS: {
    top: 20,
    right: 30,
    bottom: 30,
    left: 40,
  },
  COLORS: ['#151e2d', '#46608C', '#168947', '#DBEAAC'],
} as const;

// Type exports for consuming components
export type ApiEndpoints = typeof API_CONFIG.API_ENDPOINTS;
export type MetricType = keyof typeof METRIC_TYPES;
export type RevenueRange = (typeof REVENUE_RANGES.ranges)[number];
export type Breakpoint = keyof typeof UI_CONSTANTS.BREAKPOINTS;
export type ChartColor = (typeof CHART_CONSTANTS.COLORS)[number];
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLES = {
  USER: 'user',
  ANALYST: 'analyst',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export const METRIC_VALIDATION_RULES: Record<
  MetricValueType,
  {
    min: number;
    max: number;
    required: boolean;
    format: RegExp;
    decimalPrecision: number;
    errorMessage: string;
    sanitization: 'trim';
    allowNegative: boolean;
    currencySymbol?: string;
  }
> = {
  percentage: {
    min: 0,
    max: 100,
    required: true,
    format: /^\d+(\.\d{1,2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Percentage must be between 0 and 100 with up to 2 decimal places',
    sanitization: 'trim',
    allowNegative: false,
  },

  currency: {
    min: 0,
    max: 1000000000, // $1B limit
    required: true,
    format: /^\d+(\.\d{2})?$/,
    decimalPrecision: 2,
    errorMessage: 'Currency must be between 0 and 1B with exactly 2 decimal places',
    sanitization: 'trim',
    allowNegative: false,
    currencySymbol: '$',
  },

  number: {
    min: 0,
    max: 1000000, // 1M limit
    required: true,
    format: /^\d+$/,
    decimalPrecision: 0,
    errorMessage: 'Number must be between 0 and 1M with no decimal places',
    sanitization: 'trim',
    allowNegative: false,
  },

  ratio: {
    min: 0,
    max: 1000,
    required: true,
    format: /^\d+(\.\d{1,3})?$/,
    decimalPrecision: 3,
    errorMessage: 'Ratio must be between 0 and 1000 with up to 3 decimal places',
    sanitization: 'trim',
    allowNegative: false,
  },
} as const;
