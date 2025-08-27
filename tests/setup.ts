/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeEach(() => {
  // Restore console for each test
  Object.assign(console, originalConsole);
});

// Mock process.env for consistent testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies that should not make real HTTP calls in tests
jest.mock('node-fetch');

// Test utilities
export const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock MCP client for integration tests
export const mockMCPClient = {
  request: jest.fn(),
  notification: jest.fn(),
  close: jest.fn()
};

// Test data generators
export const generateMockMotionDoc = () => ({
  url: 'https://motion.dev/docs/test',
  title: 'Test Documentation',
  content: 'Test content for Motion.dev documentation',
  framework: 'react' as const,
  category: 'animation',
  lastModified: new Date().toISOString()
});

export const generateMockAnimationPattern = () => ({
  id: 'test-pattern',
  name: 'Test Pattern',
  category: 'entrance' as const,
  description: 'A test animation pattern',
  performance: {
    score: 85,
    bundleSize: 1024,
    renderComplexity: 'medium' as const
  },
  accessibility: {
    respectsReducedMotion: true,
    hasAltText: true,
    score: 95
  },
  frameworks: {
    react: {
      code: 'const TestComponent = () => <div>Test</div>;',
      imports: ['React'],
      dependencies: []
    },
    js: {
      code: 'function testAnimation() { return "test"; }',
      imports: [],
      dependencies: []
    },
    vue: {
      code: '<template><div>Test</div></template>',
      imports: ['vue'],
      dependencies: []
    }
  }
});