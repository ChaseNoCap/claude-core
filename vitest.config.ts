import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@chasenocap/di-framework': path.resolve(__dirname, './src/mocks/di-framework/index.ts'),
      '@chasenocap/logger': path.resolve(__dirname, './src/mocks/logger/index.ts'),
      '@chasenocap/event-system': path.resolve(__dirname, './src/mocks/event-system/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        'examples/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        '**/__mocks__/**',
        '**/mocks/**',
        'test-*.js',
        '**/interfaces/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
  },
});