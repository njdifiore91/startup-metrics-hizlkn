// ESLint configuration for backend TypeScript codebase
// Dependencies:
// @typescript-eslint/parser@^5.59.0 - TypeScript parser for ESLint
// @typescript-eslint/eslint-plugin@^5.59.0 - TypeScript linting rules

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  env: {
    node: true,
    jest: true,
    es2020: true,
  },
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',
    '@typescript-eslint/restrict-template-expressions': 'error',
    '@typescript-eslint/unbound-method': 'error',

    // General code style rules
    'no-console': ['error', {
      allow: ['warn', 'error'],
    }],
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline'],
    'eol-last': ['error', 'always'],
    'max-len': ['error', {
      code: 100,
    }],
  },
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    'jest.config.ts',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
};