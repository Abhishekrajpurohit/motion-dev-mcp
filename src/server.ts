/**
 * Motion.dev MCP Server Implementation
 * Main MCP server providing Motion.dev documentation and code generation tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DocumentationFetcher } from './docs/fetcher.js';
import { DocumentationCache } from './docs/cache.js';
import { SitemapProcessor } from './docs/sitemap.js';
import { DocumentationTool } from './tools/documentation.js';
import { SearchTool } from './tools/search.js';
import { ExamplesTool } from './tools/examples.js';
import { ApiTool } from './tools/api.js';
import { CodeGenerationTool } from './tools/generation.js';
import { FrameworkDocsManager } from './resources/framework-docs.js';
import { ExamplesLibraryManager } from './resources/examples-library.js';
import { BestPracticesManager } from './resources/best-practices.js';
import { logger } from './utils/logger.js';
import { 
  createToolError, 
  createValidationError,
  MotionMCPError,
  ErrorCodes
} from './utils/errors.js';
import { 
  validateGetMotionDocsParams,
  validateSearchMotionDocsParams,
  validateGetComponentApiParams,
  validateGetExamplesByCategoryParams
} from './utils/validators.js';
import { 
  DocumentationEndpoint,
  CategorizedEndpoints,
  ParsedDocument
} from './types/motion.js';

export class MotionMCPServer {
  private server: Server;
  private fetcher: DocumentationFetcher;
  private cache: DocumentationCache;
  private sitemapProcessor: SitemapProcessor;
  private endpoints: DocumentationEndpoint[] = [];
  private categorizedEndpoints: CategorizedEndpoints = {
    react: [],
    js: [],
    vue: [],
    general: []
  };

  // Tools
  private documentationTool: DocumentationTool;
  private searchTool: SearchTool;
  private examplesTool: ExamplesTool;
  private apiTool: ApiTool;
  private codeGenerationTool: CodeGenerationTool;

  // Resources
  private frameworkDocsManager: FrameworkDocsManager;
  private examplesLibraryManager: ExamplesLibraryManager;
  private bestPracticesManager: BestPracticesManager;

  constructor() {
    this.server = new Server(
      {
        name: 'motion-dev-mcp',
        version: '1.0.0',
        description: 'Model Context Protocol server for Motion.dev animation library'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.fetcher = new DocumentationFetcher();
    this.cache = new DocumentationCache();
    this.sitemapProcessor = new SitemapProcessor();

    // Initialize tools
    this.documentationTool = new DocumentationTool(this.fetcher, this.cache);
    this.searchTool = new SearchTool();
    this.examplesTool = new ExamplesTool(this.fetcher);
    this.apiTool = new ApiTool(this.fetcher);
    this.codeGenerationTool = new CodeGenerationTool();

    // Initialize resources
    this.frameworkDocsManager = new FrameworkDocsManager();
    this.examplesLibraryManager = new ExamplesLibraryManager();
    this.bestPracticesManager = new BestPracticesManager();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_motion_docs',
            description: 'Fetch specific Motion.dev documentation by URL or topic',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Documentation URL or endpoint path'
                },
                useCache: {
                  type: 'boolean',
                  description: 'Whether to use cached content (default: true)',
                  default: true
                }
              },
              required: ['url']
            }
          },
          {
            name: 'search_motion_docs',
            description: 'Full-text search across Motion.dev documentation',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query string'
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue', 'general'],
                  description: 'Filter by framework (optional)'
                },
                category: {
                  type: 'string',
                  enum: ['animation', 'gestures', 'layout-animations', 'scroll-animations', 'components', 'api-reference', 'guides', 'examples', 'best-practices'],
                  description: 'Filter by category (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 10)',
                  default: 10
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_component_api',
            description: 'Extract component API reference and props documentation',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  description: 'Component name (e.g., motion.div, Transition)'
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Target framework for API reference'
                }
              },
              required: ['component', 'framework']
            }
          },
          {
            name: 'get_examples_by_category',
            description: 'Retrieve code examples by animation category and complexity',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['animation', 'gestures', 'layout-animations', 'scroll-animations', 'components'],
                  description: 'Animation category'
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Target framework'
                },
                complexity: {
                  type: 'string',
                  enum: ['basic', 'intermediate', 'advanced'],
                  description: 'Code complexity level (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of examples (default: 5)',
                  default: 5
                }
              },
              required: ['category', 'framework']
            }
          },
          {
            name: 'generate_motion_component',
            description: 'Generate Motion.dev component code for React, JavaScript, or Vue',
            inputSchema: {
              type: 'object',
              properties: {
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Target framework for code generation'
                },
                componentName: {
                  type: 'string',
                  description: 'Name of the component to generate'
                },
                animations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of animation pattern IDs to include'
                },
                props: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional component props',
                  default: []
                },
                typescript: {
                  type: 'boolean',
                  description: 'Generate TypeScript code (default: true)',
                  default: true
                },
                styleSystem: {
                  type: 'string',
                  enum: ['css', 'styled-components', 'emotion', 'tailwind'],
                  description: 'CSS styling system to use (optional)'
                }
              },
              required: ['framework', 'componentName', 'animations']
            }
          },
          {
            name: 'create_animation_sequence',
            description: 'Create complex animation sequences with staggering and timeline control',
            inputSchema: {
              type: 'object',
              properties: {
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Target framework'
                },
                sequence: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      element: { type: 'string', description: 'Element selector or type' },
                      animate: { type: 'object', description: 'Animation properties' },
                      delay: { type: 'number', description: 'Animation delay in seconds' },
                      duration: { type: 'number', description: 'Animation duration in seconds' },
                      easing: { type: 'string', description: 'Easing function' }
                    },
                    required: ['element', 'animate']
                  },
                  description: 'Array of animation steps'
                },
                stagger: {
                  type: 'boolean',
                  description: 'Enable staggered animations (default: false)',
                  default: false
                },
                timeline: {
                  type: 'boolean',
                  description: 'Create timeline-based sequence (default: false)',
                  default: false
                }
              },
              required: ['framework', 'sequence']
            }
          },
          {
            name: 'optimize_motion_code',
            description: 'Optimize Motion.dev code for performance, accessibility, and bundle size',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Motion.dev code to optimize'
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Framework of the provided code'
                },
                focusAreas: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['performance', 'accessibility', 'bundle-size']
                  },
                  description: 'Areas to focus optimization on (optional)'
                },
                target: {
                  type: 'string',
                  enum: ['production', 'development'],
                  description: 'Optimization target environment',
                  default: 'production'
                }
              },
              required: ['code', 'framework']
            }
          },
          {
            name: 'convert_between_frameworks',
            description: 'Convert Motion.dev code between React, JavaScript, and Vue',
            inputSchema: {
              type: 'object',
              properties: {
                from: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Source framework'
                },
                to: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Target framework'
                },
                code: {
                  type: 'string',
                  description: 'Source code to convert'
                },
                preserveComments: {
                  type: 'boolean',
                  description: 'Preserve code comments (default: true)',
                  default: true
                },
                optimization: {
                  type: 'boolean',
                  description: 'Apply optimizations during conversion (default: false)',
                  default: false
                }
              },
              required: ['from', 'to', 'code']
            }
          },
          {
            name: 'validate_motion_syntax',
            description: 'Validate Motion.dev code syntax and suggest improvements',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Motion.dev code to validate'
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'js', 'vue'],
                  description: 'Framework of the provided code'
                },
                strict: {
                  type: 'boolean',
                  description: 'Enable strict validation mode (default: false)',
                  default: false
                },
                rules: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific validation rules to apply (optional)'
                }
              },
              required: ['code', 'framework']
            }
          }
        ]
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'motion://docs/react',
            name: 'React Motion Documentation',
            description: 'Complete React-specific Motion.dev documentation'
          },
          {
            uri: 'motion://docs/js',
            name: 'JavaScript Motion Documentation', 
            description: 'Vanilla JavaScript Motion.dev documentation'
          },
          {
            uri: 'motion://docs/vue',
            name: 'Vue Motion Documentation',
            description: 'Vue-specific Motion.dev integration guides'
          },
          {
            uri: 'motion://examples',
            name: 'Motion Examples Library',
            description: 'Curated code examples by category and framework'
          },
          {
            uri: 'motion://best-practices',
            name: 'Motion Best Practices',
            description: 'Performance and accessibility guidelines for Motion.dev'
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_motion_docs':
            return await this.handleGetMotionDocs(args);
          case 'search_motion_docs':
            return await this.handleSearchMotionDocs(args);
          case 'get_component_api':
            return await this.handleGetComponentApi(args);
          case 'get_examples_by_category':
            return await this.handleGetExamplesByCategory(args);
          case 'generate_motion_component':
            return await this.handleGenerateMotionComponent(args);
          case 'create_animation_sequence':
            return await this.handleCreateAnimationSequence(args);
          case 'optimize_motion_code':
            return await this.handleOptimizeMotionCode(args);
          case 'convert_between_frameworks':
            return await this.handleConvertBetweenFrameworks(args);
          case 'validate_motion_syntax':
            return await this.handleValidateMotionSyntax(args);
          default:
            throw createToolError(name, `Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Tool execution failed: ${name}`, error as Error);
        throw error;
      }
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
        return await this.handleReadResource(uri);
      } catch (error) {
        logger.error(`Resource read failed: ${uri}`, error as Error);
        throw error;
      }
    });
  }

  private async handleGetMotionDocs(args: any) {
    const params = validateGetMotionDocsParams(args);
    const response = await this.documentationTool.getMotionDocs(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleSearchMotionDocs(args: any) {
    const params = validateSearchMotionDocsParams(args);
    const response = await this.searchTool.searchMotionDocs(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleGetComponentApi(args: any) {
    const params = validateGetComponentApiParams(args);
    const response = await this.apiTool.getComponentApi(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleGetExamplesByCategory(args: any) {
    const params = validateGetExamplesByCategoryParams(args);
    const response = await this.examplesTool.getExamplesByCategory(params);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  // Code generation tool handlers
  private async handleGenerateMotionComponent(args: any) {
    const response = await this.codeGenerationTool.generateMotionComponent(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleCreateAnimationSequence(args: any) {
    const response = await this.codeGenerationTool.createAnimationSequence(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleOptimizeMotionCode(args: any) {
    const response = await this.codeGenerationTool.optimizeMotionCode(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleConvertBetweenFrameworks(args: any) {
    const response = await this.codeGenerationTool.convertBetweenFrameworks(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleValidateMotionSyntax(args: any) {
    const response = await this.codeGenerationTool.validateMotionSyntax(args);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleReadResource(uri: string) {
    logger.debug(`Reading resource: ${uri}`);
    const startTime = Date.now();

    try {
      switch (uri) {
        case 'motion://docs/react':
          const reactDocs = this.frameworkDocsManager.getReactDocs();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(reactDocs, null, 2)
            }]
          };

        case 'motion://docs/js':
          const jsDocs = this.frameworkDocsManager.getJavaScriptDocs();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(jsDocs, null, 2)
            }]
          };

        case 'motion://docs/vue':
          const vueDocs = this.frameworkDocsManager.getVueDocs();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(vueDocs, null, 2)
            }]
          };

        case 'motion://examples':
          const examplesLibrary = this.examplesLibraryManager.getExamplesLibrary();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(examplesLibrary, null, 2)
            }]
          };

        case 'motion://best-practices':
          const bestPractices = this.bestPracticesManager.getBestPractices();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(bestPractices, null, 2)
            }]
          };

        default:
          throw createValidationError('resource', uri, 'Unknown resource URI');
      }

    } catch (error) {
      logger.error(`Resource read failed: ${uri}`, error as Error);
      throw error;
    } finally {
      logger.logPerformanceMetric('read_resource', Date.now() - startTime, 'ms');
    }
  }

  async start(): Promise<void> {
    logger.info('Initializing Motion.dev MCP Server...');

    try {
      // Initialize cache
      await this.cache.initialize();
      
      // Load sitemap and endpoints
      await this.loadDocumentationEndpoints();
      
      // Update tools and resources with loaded data
      this.updateToolsAndResources();
      
      // Start server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Motion.dev MCP Server initialized successfully', {
        totalEndpoints: this.endpoints.length,
        byFramework: this.sitemapProcessor.getFrameworkCounts(this.endpoints)
      });

    } catch (error) {
      logger.error('Failed to start MCP server', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Shutting down Motion.dev MCP Server...');
    
    try {
      await this.server.close();
      logger.info('MCP Server shutdown completed');
    } catch (error) {
      logger.error('Error during server shutdown', error as Error);
      throw error;
    }
  }

  private updateToolsAndResources(): void {
    // Update tools with endpoint data
    this.searchTool.updateEndpoints(this.endpoints);
    this.searchTool.updateCategorizedEndpoints(this.categorizedEndpoints);
    this.examplesTool.updateEndpoints(this.endpoints);
    this.apiTool.updateEndpoints(this.endpoints);

    // Update resources with categorized data
    this.frameworkDocsManager.updateEndpoints(this.categorizedEndpoints);
    this.bestPracticesManager.updateEndpoints(this.endpoints);

    // Collect examples for the examples library
    this.collectExamplesForLibrary();

    logger.debug('Updated all tools and resources with endpoint data');
  }

  private async collectExamplesForLibrary(): Promise<void> {
    try {
      // Get a sample of examples from various endpoints to populate the library
      const sampleEndpoints = this.endpoints.slice(0, 10); // Start with a sample
      const examplePromises = sampleEndpoints.map(async (endpoint) => {
        try {
          const response = await this.fetcher.fetchDoc(endpoint.url);
          return response.success && response.document ? response.document.examples || [] : [];
        } catch (error) {
          logger.warn(`Failed to fetch examples from ${endpoint.url}`, { error: (error as Error).message });
          return [];
        }
      });

      const exampleArrays = await Promise.all(examplePromises);
      const allExamples = exampleArrays.flat();

      this.examplesLibraryManager.updateExamples(allExamples);
      logger.debug(`Collected ${allExamples.length} examples for library`);

    } catch (error) {
      logger.warn('Failed to collect examples for library', { error: (error as Error).message });
    }
  }

  private async loadDocumentationEndpoints(): Promise<void> {
    try {
      // Fetch sitemap
      const sitemapUrls = await this.fetcher.fetchSitemap();
      logger.info(`Found ${sitemapUrls.length} URLs in sitemap`);

      // Parse endpoints from sitemap
      const sitemapXml = await this.getSitemapXml();
      this.endpoints = await this.sitemapProcessor.parseDocumentationUrls(sitemapXml);
      
      // Categorize endpoints by framework
      this.categorizedEndpoints = this.sitemapProcessor.categorizeEndpoints(this.endpoints);
      
      logger.info('Documentation endpoints loaded', {
        total: this.endpoints.length,
        react: this.categorizedEndpoints.react.length,
        js: this.categorizedEndpoints.js.length,
        vue: this.categorizedEndpoints.vue.length,
        general: this.categorizedEndpoints.general.length
      });

    } catch (error) {
      logger.error('Failed to load documentation endpoints', error as Error);
      throw error;
    }
  }

  private async getSitemapXml(): Promise<string> {
    const cached = await this.cache.get<string>('sitemap.xml');
    if (cached) {
      return cached;
    }

    // This would normally fetch from the actual sitemap URL
    // For now, we'll create a mock sitemap with key Motion.dev URLs
    const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://motion.dev/docs/react</loc></url>
  <url><loc>https://motion.dev/docs/react-animation</loc></url>
  <url><loc>https://motion.dev/docs/react-gestures</loc></url>
  <url><loc>https://motion.dev/docs/react-layout-animations</loc></url>
  <url><loc>https://motion.dev/docs/react-scroll-animations</loc></url>
  <url><loc>https://motion.dev/docs/quick-start</loc></url>
  <url><loc>https://motion.dev/docs/animate</loc></url>
  <url><loc>https://motion.dev/docs/scroll</loc></url>
  <url><loc>https://motion.dev/docs/spring</loc></url>
  <url><loc>https://motion.dev/docs/vue</loc></url>
  <url><loc>https://motion.dev/docs/vue-animation</loc></url>
  <url><loc>https://motion.dev/docs/vue-gestures</loc></url>
</urlset>`;

    await this.cache.set('sitemap.xml', mockSitemap);
    return mockSitemap;
  }
}