import type { Config } from '@jest/types';

// Comprehensive Jest configuration for backend testing
const config: Config.InitialOptions = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Node environment for backend testing
  testEnvironment: 'node',
  
  // Test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  
  // TypeScript transformation
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Path alias mapping matching tsconfig
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1'
  },
  
  // Global test setup file
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'json',
    'html',
    'cobertura'  // For CI pipeline integration
  ],
  
  // Coverage exclusions
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/setup.ts',
    '/src/types/',
    '/src/migrations/'
  ],
  
  // Strict coverage thresholds (80% minimum)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: true
    }
  },
  
  // Supported file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Additional settings for better testing experience
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Performance optimization
  maxWorkers: '50%'
};

export default config;