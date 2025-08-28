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

import { MotionDocService } from './services/motion-doc-service.js';
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
  createValidationError
} from './utils/errors.js';
import { 
  validateGetMotionDocsParams,
  validateSearchMotionDocsParams,
  validateGetComponentApiParams,
  validateGetExamplesByCategoryParams
} from './utils/validators.js';

export class MotionMCPServer {
  private server: Server;
  private docService: MotionDocService;

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

  private isInitialized = false;
  private logger = logger;

  constructor(dbPath: string = 'docs/motion-docs.db') {
    this.server = new Server(
      {
        name: 'motion-dev-mcp',
        version: '1.0.0',
        description: 'Model Context Protocol server for Motion.dev animation library with SQLite backend'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    // Initialize documentation service
    this.docService = new MotionDocService(undefined, undefined, dbPath);

    // Initialize tools with doc service
    this.documentationTool = new DocumentationTool(this.docService);
    this.searchTool = new SearchTool();
    this.examplesTool = new ExamplesTool(this.docService);
    this.apiTool = new ApiTool(this.docService);
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
      // Ensure database is initialized and populated
      await this.ensureInitialized();
      
      // Start server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      // Get database statistics for logging
      const stats = this.docService.getStatistics();
      logger.info('Motion.dev MCP Server initialized successfully', stats);

    } catch (error) {
      logger.error('Failed to start MCP server', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Shutting down Motion.dev MCP Server...');
    
    try {
      await this.server.close();
      this.docService.close();
      logger.info('MCP Server shutdown completed');
    } catch (error) {
      logger.error('Error during server shutdown', error as Error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    this.logger.info('Initializing documentation database...');
    
    try {
      // Check if database has content, populate if empty
      const stats = this.docService.getStatistics();
      
      if (stats.totalDocs === 0) {
        this.logger.info('Database is empty, populating with Motion.dev documentation...');
        await this.docService.populateDatabase();
        this.logger.info('Database population completed');
      } else {
        this.logger.info('Database already populated', stats);
      }
      
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize documentation database', error as Error);
      throw error;
    }
  }

}