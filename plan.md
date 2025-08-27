# Motion.dev MCP Server - Detailed Implementation Plan

## Project Overview
Build a production-ready Model Context Protocol (MCP) server that provides comprehensive Motion.dev animation capabilities to AI assistants, enabling generation of production-quality animations for React, JavaScript, and Vue.

**Timeline**: 25-35 hours total development time  
**Framework**: FastMCP with TypeScript  
**Target**: Production-ready MCP server with 9 tools and 5 resources

---

## Phase 1: Project Foundation (2-3 hours)

### 1.1 Project Setup & Configuration

#### NPM Package Initialization
```bash
npm init -y
npm install --save fastmcp @types/node typescript ts-node
npm install --save-dev jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

#### Required Dependencies
```json
{
  "dependencies": {
    "fastmcp": "latest",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "node-fetch": "^3.3.0",
    "cheerio": "^1.0.0",
    "turndown": "^7.1.0",
    "fuse.js": "^7.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "prettier": "^3.2.0"
  }
}
```

#### TypeScript Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### Package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts"
  }
}
```

#### .gitignore Configuration
```
node_modules/
dist/
*.log
.env
.DS_Store
docs/cache/
coverage/
.nyc_output/
```

### 1.2 Project Structure Creation

```
motion-dev-mcp/
├── README.md                    # Usage and setup guide
├── CLAUDE.md                   # Development guide  
├── OUTPUT.md                   # Target specification
├── plan.md                     # This detailed plan
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config
├── .gitignore                  # Version control ignore
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── jest.config.js             # Jest testing config
├── src/
│   ├── index.ts               # MCP server entry point
│   ├── server.ts              # FastMCP server setup
│   ├── docs/
│   │   ├── fetcher.ts         # Documentation fetcher
│   │   ├── parser.ts          # HTML/Markdown parser
│   │   ├── cache.ts           # Caching mechanism
│   │   └── sitemap.ts         # Sitemap processing
│   ├── tools/
│   │   ├── docs-tools.ts      # Documentation tools
│   │   ├── generator-tools.ts # Code generation tools
│   │   └── utility-tools.ts   # Conversion and validation
│   ├── resources/
│   │   ├── docs-resources.ts  # Documentation resources
│   │   └── examples-resources.ts # Example resources
│   ├── types/
│   │   ├── motion.ts          # Motion.dev type definitions
│   │   ├── mcp.ts             # MCP protocol types
│   │   └── index.ts           # Type exports
│   └── utils/
│       ├── validators.ts      # Input validation
│       ├── formatters.ts      # Response formatting
│       ├── errors.ts          # Error handling
│       └── logger.ts          # Logging utilities
├── docs/                      # Cached documentation
│   ├── react/                # React docs cache
│   ├── js/                   # JavaScript docs cache  
│   ├── vue/                  # Vue docs cache
│   └── examples/             # Examples cache
└── tests/                    # Test suites
    ├── tools.test.ts         # Tool tests
    ├── resources.test.ts     # Resource tests
    └── integration.test.ts   # E2E tests
```

### 1.3 Core Architecture Setup

#### Main Entry Point (`src/index.ts`)
```typescript
#!/usr/bin/env node

/**
 * Motion.dev MCP Server
 * Entry point for the Model Context Protocol server providing Motion.dev capabilities
 */

import { MotionMCPServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const server = new MotionMCPServer();
    await server.start();
    
    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start Motion MCP Server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}
```

---

## Phase 2: Documentation Integration (6-8 hours)

### 2.1 Documentation Fetcher System

#### HTTP Client with Retry Logic (`src/docs/fetcher.ts`)
```typescript
/**
 * Documentation fetcher with intelligent caching and retry logic
 */
export class DocumentationFetcher {
  private baseUrl = 'https://motion.dev';
  private retryAttempts = 3;
  private retryDelay = 1000;
  
  async fetchDoc(url: string, useCache = true): Promise<DocumentResponse>
  async fetchSitemap(): Promise<string[]>
  async fetchWithRetry(url: string, attempts = this.retryAttempts): Promise<Response>
  private parseHtmlContent(html: string): ParsedDocument
  private extractCodeExamples(html: string): CodeExample[]
  private extractApiReference(html: string): ApiReference
}
```

#### Caching System (`src/docs/cache.ts`)
```typescript
/**
 * Intelligent caching system with TTL and invalidation
 */
export class DocumentationCache {
  private cacheDir = './docs/cache';
  private defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  
  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T, ttl?: number): Promise<void>
  async invalidate(key: string): Promise<void>
  async clear(): Promise<void>
  private isExpired(metadata: CacheMetadata): boolean
  private generateCacheKey(url: string): string
}
```

#### Sitemap Processing (`src/docs/sitemap.ts`)
```typescript
/**
 * Motion.dev sitemap parsing and endpoint extraction
 */
export class SitemapProcessor {
  async fetchSitemap(): Promise<string>
  parseDocumentationUrls(sitemapXml: string): DocumentationEndpoint[]
  categorizeEndpoints(endpoints: DocumentationEndpoint[]): CategorizedEndpoints
  private extractFrameworkFromUrl(url: string): Framework
  private extractCategoryFromUrl(url: string): DocumentationCategory
}

// Expected 100+ endpoints:
// React: /docs/react, /docs/react-animation, /docs/react-gestures, etc.
// JS: /docs/quick-start, /docs/animate, /docs/scroll, etc.
// Vue: /docs/vue, /docs/vue-animation, /docs/vue-gestures, etc.
```

### 2.2 Documentation Tools Implementation

#### Tool 1: get_motion_docs
```typescript
async function getMotionDocs(params: {
  url: string;
  format?: 'markdown' | 'json' | 'raw';
  includeExamples?: boolean;
  includeApiRef?: boolean;
}): Promise<ToolResponse<DocumentationResponse>> {
  // Implementation:
  // 1. Validate URL parameter
  // 2. Check cache first
  // 3. Fetch from motion.dev if not cached
  // 4. Parse HTML to markdown/json
  // 5. Extract code examples if requested
  // 6. Extract API reference if requested
  // 7. Cache response
  // 8. Return formatted response
}
```

#### Tool 2: search_motion_docs
```typescript
async function searchMotionDocs(params: {
  query: string;
  framework?: 'react' | 'js' | 'vue';
  category?: string;
  limit?: number;
}): Promise<ToolResponse<SearchResponse>> {
  // Implementation:
  // 1. Validate search parameters
  // 2. Load search index (Fuse.js)
  // 3. Apply framework and category filters
  // 4. Execute fuzzy search
  // 5. Rank results by relevance
  // 6. Return top N results with snippets
}
```

#### Tool 3: get_component_api
```typescript
async function getComponentAPI(params: {
  component: string;
  framework: 'react' | 'js' | 'vue';
  includeProps?: boolean;
  includeExamples?: boolean;
}): Promise<ToolResponse<ComponentAPIResponse>> {
  // Implementation:
  // 1. Validate component name and framework
  // 2. Fetch component-specific documentation
  // 3. Parse API reference section
  // 4. Extract props/parameters if requested
  // 5. Extract usage examples if requested
  // 6. Return structured API data
}
```

#### Tool 4: get_examples_by_category
```typescript
async function getExamplesByCategory(params: {
  category: string;
  framework?: 'react' | 'js' | 'vue';
  complexity?: 'basic' | 'intermediate' | 'advanced';
  format?: 'code-only' | 'with-explanation';
}): Promise<ToolResponse<ExamplesResponse>> {
  // Implementation:
  // 1. Validate category and filters
  // 2. Query examples database/cache
  // 3. Filter by framework and complexity
  // 4. Format code examples
  // 5. Add explanations if requested
  // 6. Return curated examples
}
```

---

## Phase 3: Code Generation Engine (8-10 hours)

### 3.1 Component Generator System

#### AST-Based Code Generation (`src/tools/generator-core.ts`)
```typescript
/**
 * AST-based code generation for Motion components
 */
export class ComponentGenerator {
  generateReactComponent(config: ComponentConfig): GeneratedComponent
  generateJavaScriptCode(config: ComponentConfig): GeneratedComponent
  generateVueComponent(config: ComponentConfig): GeneratedComponent
  
  private buildComponentAST(config: ComponentConfig): ComponentAST
  private generateTypeScriptInterface(props: PropDefinition[]): string
  private generateImportStatements(framework: Framework): string[]
  private generateAnimationProps(animations: Animation[]): AnimationProps
}
```

#### Animation Templates (`src/tools/templates.ts`)
```typescript
/**
 * Pre-built animation templates for common use cases
 */
export const AnimationTemplates = {
  fadeIn: (duration?: number) => AnimationConfig,
  slideIn: (direction: Direction, distance?: number) => AnimationConfig,
  scaleIn: (scale?: number) => AnimationConfig,
  rotate: (degrees: number, duration?: number) => AnimationConfig,
  spring: (config: SpringConfig) => AnimationConfig,
  stagger: (children: AnimationConfig[], delay: number) => AnimationConfig
};
```

### 3.2 Code Generation Tools Implementation

#### Tool 5: generate_motion_component
```typescript
async function generateMotionComponent(params: {
  framework: 'react' | 'js' | 'vue';
  componentName: string;
  animations: string[];
  props?: string[];
  typescript?: boolean;
}): Promise<ToolResponse<GeneratedComponentResponse>> {
  // Implementation:
  // 1. Validate component parameters
  // 2. Generate component configuration
  // 3. Build AST for target framework
  // 4. Generate TypeScript interfaces if requested
  // 5. Add proper imports and dependencies
  // 6. Format code with Prettier
  // 7. Validate generated code syntax
  // 8. Return complete component with metadata
}
```

#### Tool 6: create_animation_sequence
```typescript
async function createAnimationSequence(params: {
  framework: 'react' | 'js' | 'vue';
  sequence: AnimationStep[];
  stagger?: boolean;
  options?: SequenceOptions;
}): Promise<ToolResponse<AnimationSequenceResponse>> {
  // Implementation:
  // 1. Validate sequence steps
  // 2. Calculate timing and delays
  // 3. Generate timeline configuration
  // 4. Apply stagger effects if requested
  // 5. Build framework-specific implementation
  // 6. Optimize for performance
  // 7. Return complete sequence code
}
```

#### Tool 7: optimize_motion_code
```typescript
async function optimizeMotionCode(params: {
  code: string;
  framework: 'react' | 'js' | 'vue';
  focusAreas?: ('performance' | 'accessibility' | 'bundle-size')[];
}): Promise<ToolResponse<OptimizationResponse>> {
  // Implementation:
  // 1. Parse input code AST
  // 2. Analyze performance bottlenecks
  // 3. Check accessibility compliance
  // 4. Identify bundle size optimizations
  // 5. Generate optimization suggestions
  // 6. Provide refactored code examples
  // 7. Return detailed optimization report
}
```

#### Tool 8: convert_between_frameworks
```typescript
async function convertBetweenFrameworks(params: {
  from: 'react' | 'js' | 'vue';
  to: 'react' | 'js' | 'vue';
  code: string;
  preserveComments?: boolean;
}): Promise<ToolResponse<ConversionResponse>> {
  // Implementation:
  // 1. Parse source code AST
  // 2. Extract animation configurations
  // 3. Map framework-specific patterns
  // 4. Generate target framework code
  // 5. Preserve comments if requested
  // 6. Validate converted code syntax
  // 7. Return converted code with notes
}
```

#### Tool 9: validate_motion_syntax
```typescript
async function validateMotionSyntax(params: {
  code: string;
  framework: 'react' | 'js' | 'vue';
  strict?: boolean;
}): Promise<ToolResponse<ValidationResponse>> {
  // Implementation:
  // 1. Parse code with framework-specific parser
  // 2. Check Motion.dev API usage
  // 3. Validate prop types and values
  // 4. Check for deprecated patterns
  // 5. Verify import statements
  // 6. Run syntax validation
  // 7. Return validation report with fixes
}
```

---

## Phase 4: MCP Resources Implementation (3-4 hours)

### 4.1 Resource System Architecture

#### Base Resource Class (`src/resources/base-resource.ts`)
```typescript
/**
 * Base class for all MCP resources
 */
export abstract class BaseResource {
  abstract uri: string;
  abstract name: string;
  abstract description: string;
  
  abstract async read(uri: string): Promise<ResourceResponse>;
  protected abstract validateUri(uri: string): boolean;
  protected formatResponse<T>(data: T): ResourceResponse<T>;
}
```

### 4.2 Framework-Specific Resources

#### Resource 1: motion_react_docs
```typescript
export class ReactDocsResource extends BaseResource {
  uri = 'motion://docs/react';
  name = 'Motion React Documentation';
  description = 'Complete React Motion documentation and examples';
  
  async read(uri: string): Promise<ResourceResponse> {
    // Implementation:
    // 1. Parse URI for specific React doc section
    // 2. Fetch React-specific documentation
    // 3. Include React code examples
    // 4. Format for React developers
    // 5. Return structured React doc data
  }
}
```

#### Resource 2: motion_js_docs
```typescript
export class JavaScriptDocsResource extends BaseResource {
  uri = 'motion://docs/js';
  name = 'Motion JavaScript Documentation';
  description = 'Vanilla JavaScript Motion documentation';
  
  async read(uri: string): Promise<ResourceResponse> {
    // Implementation:
    // 1. Parse URI for JS-specific sections
    // 2. Fetch vanilla JavaScript documentation
    // 3. Include plain JS examples
    // 4. Format for JavaScript developers
    // 5. Return structured JS doc data
  }
}
```

#### Resource 3: motion_vue_docs
```typescript
export class VueDocsResource extends BaseResource {
  uri = 'motion://docs/vue';
  name = 'Motion Vue Documentation';
  description = 'Vue Motion documentation and components';
  
  async read(uri: string): Promise<ResourceResponse> {
    // Implementation:
    // 1. Parse URI for Vue-specific sections
    // 2. Fetch Vue documentation and guides
    // 3. Include Vue component examples
    // 4. Format for Vue developers
    // 5. Return structured Vue doc data
  }
}
```

#### Resource 4: motion_examples
```typescript
export class MotionExamplesResource extends BaseResource {
  uri = 'motion://examples';
  name = 'Motion Code Examples';
  description = 'Curated Motion code examples by category';
  
  async read(uri: string): Promise<ResourceResponse> {
    // Implementation:
    // 1. Parse URI for category/framework filters
    // 2. Query examples database
    // 3. Filter by complexity and framework
    // 4. Include working code examples
    // 5. Return curated examples collection
  }
}
```

#### Resource 5: motion_best_practices
```typescript
export class BestPracticesResource extends BaseResource {
  uri = 'motion://best-practices';
  name = 'Motion Best Practices';
  description = 'Performance and accessibility guidelines';
  
  async read(uri: string): Promise<ResourceResponse> {
    // Implementation:
    // 1. Parse URI for specific practice areas
    // 2. Fetch best practices documentation
    // 3. Include performance guidelines
    // 4. Add accessibility recommendations
    // 5. Return structured best practices
  }
}
```

---

## Phase 5: Testing & Quality Assurance (4-5 hours)

### 5.1 Test Suite Development

#### Unit Tests (`tests/tools.test.ts`)
```typescript
describe('Documentation Tools', () => {
  describe('get_motion_docs', () => {
    it('should fetch and cache documentation');
    it('should handle invalid URLs gracefully');
    it('should return markdown format by default');
    it('should include examples when requested');
  });
  
  describe('search_motion_docs', () => {
    it('should return relevant search results');
    it('should filter by framework');
    it('should limit results correctly');
  });
});

describe('Code Generation Tools', () => {
  describe('generate_motion_component', () => {
    it('should generate valid React components');
    it('should generate valid Vue components');
    it('should include TypeScript interfaces when requested');
    it('should handle complex animation configurations');
  });
});
```

#### Integration Tests (`tests/integration.test.ts`)
```typescript
describe('MCP Protocol Integration', () => {
  it('should handle tool registration');
  it('should handle resource registration');
  it('should respond to capability queries');
  it('should handle concurrent requests');
  it('should gracefully handle network failures');
});

describe('Performance Tests', () => {
  it('should respond to cached docs within 200ms');
  it('should fetch fresh docs within 2s');
  it('should handle 10+ concurrent requests');
  it('should maintain stable memory usage');
});
```

### 5.2 Code Quality Standards

#### ESLint Configuration (`.eslintrc.js`)
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
  },
};
```

#### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

---

## Phase 6: Production Ready (2-3 hours)

### 6.1 Production Features

#### Error Handling (`src/utils/errors.ts`)
```typescript
/**
 * Comprehensive error handling system
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export const ErrorCodes = {
  INVALID_PARAMS: 'INVALID_PARAMS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  GENERATION_ERROR: 'GENERATION_ERROR'
} as const;
```

#### Logging System (`src/utils/logger.ts`)
```typescript
/**
 * Structured logging with different levels
 */
export class Logger {
  info(message: string, meta?: object): void
  error(message: string, error?: Error, meta?: object): void
  warn(message: string, meta?: object): void
  debug(message: string, meta?: object): void
  
  private formatLogEntry(level: LogLevel, message: string, meta?: object): string
  private shouldLog(level: LogLevel): boolean
}
```

### 6.2 Performance Monitoring

#### Performance Metrics (`src/utils/metrics.ts`)
```typescript
/**
 * Performance monitoring and metrics collection
 */
export class MetricsCollector {
  recordToolExecutionTime(toolName: string, duration: number): void
  recordCacheHitRate(hit: boolean): void
  recordMemoryUsage(): void
  recordErrorRate(error: boolean): void
  
  generateReport(): MetricsReport
  private calculateAverages(): AverageMetrics
}
```

### 6.3 Health Checks

#### Health Check System (`src/utils/health.ts`)
```typescript
/**
 * System health monitoring
 */
export class HealthChecker {
  async checkOverallHealth(): Promise<HealthStatus>
  async checkDocumentationFetcher(): Promise<ComponentHealth>
  async checkCacheSystem(): Promise<ComponentHealth>
  async checkMemoryUsage(): Promise<ComponentHealth>
  
  private checkNetworkConnectivity(): Promise<boolean>
  private checkDiskSpace(): Promise<boolean>
}
```

---

## Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Initialize npm project with all dependencies
- [ ] Set up TypeScript configuration with strict settings
- [ ] Create comprehensive project structure
- [ ] Implement basic error handling and logging
- [ ] Set up development scripts and tooling

### Phase 2: Documentation Integration ✅
- [ ] Build documentation fetcher with retry logic
- [ ] Implement intelligent caching system
- [ ] Parse Motion.dev sitemap (100+ endpoints)
- [ ] Create 4 documentation tools (get_motion_docs, search_motion_docs, get_component_api, get_examples_by_category)
- [ ] Add full-text search capabilities

### Phase 3: Code Generation Engine ✅
- [ ] Build AST-based code generation system
- [ ] Create animation templates and patterns
- [ ] Implement 5 code generation tools (generate_motion_component, create_animation_sequence, optimize_motion_code, convert_between_frameworks, validate_motion_syntax)
- [ ] Add framework conversion capabilities
- [ ] Ensure generated code compiles and runs

### Phase 4: MCP Resources ✅
- [ ] Implement 5 MCP resources (motion_react_docs, motion_js_docs, motion_vue_docs, motion_examples, motion_best_practices)
- [ ] Create framework-specific documentation access
- [ ] Add examples and best practices resources
- [ ] Ensure proper resource URI handling

### Phase 5: Testing & Quality ✅
- [ ] Create comprehensive unit test suite (>90% coverage)
- [ ] Implement integration tests for MCP protocol
- [ ] Add performance benchmarks and testing
- [ ] Set up code quality tools (ESLint, Prettier)
- [ ] Validate all generated code syntax

### Phase 6: Production Ready ✅
- [ ] Add comprehensive error handling and logging
- [ ] Implement performance monitoring and metrics
- [ ] Create health check system
- [ ] Add graceful shutdown handling
- [ ] Optimize for production deployment

---

## Success Validation

### Functional Testing Checklist
- [ ] MCP server starts without errors (`npm start`)
- [ ] All 9 tools respond correctly to valid inputs
- [ ] All 5 resources return proper data
- [ ] Documentation fetching works for all endpoints
- [ ] Code generation produces compilable code
- [ ] Framework conversion maintains functionality
- [ ] Caching improves performance as expected

### Performance Testing Checklist  
- [ ] <200ms response time for cached documentation
- [ ] <2s response time for fresh documentation fetches
- [ ] <1s response time for code generation tools
- [ ] Handles 10+ concurrent requests without degradation
- [ ] Memory usage remains stable under load
- [ ] Error rate <1% under normal usage conditions

### Integration Testing Checklist
- [ ] Works seamlessly with Claude Code client
- [ ] Handles MCP protocol handshake correctly
- [ ] Proper error responses for invalid inputs
- [ ] Session management works correctly
- [ ] Graceful degradation on network failures

---

## Final Deliverable

A production-ready Motion.dev MCP server that enables AI assistants to:

1. **Access Complete Documentation** - All 100+ Motion.dev endpoints with intelligent caching
2. **Generate Production Code** - Compilable Motion animations for React, JavaScript, and Vue
3. **Convert Between Frameworks** - Maintain functionality across framework boundaries
4. **Optimize Performance** - Provide actionable optimization suggestions
5. **Validate Syntax** - Ensure code quality and best practices

**Timeline**: 25-35 hours total development time across 6 phases
**Quality Standards**: 100% TypeScript, >90% test coverage, MCP 1.0 compliance
**Integration**: Seamless Claude Code client integration with proper error handling

This plan provides step-by-step implementation details that any TypeScript developer can follow to build a complete, production-ready Motion.dev MCP server.