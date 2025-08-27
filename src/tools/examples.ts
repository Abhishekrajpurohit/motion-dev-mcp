/**
 * Code examples retrieval tool implementation
 * Handles filtering and organizing Motion.dev code examples
 */

import { DocumentationFetcher } from '../docs/fetcher.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError, createValidationError } from '../utils/errors.js';
import { 
  DocumentationEndpoint, 
  CodeExample, 
  Framework, 
  DocumentationCategory,
  ParsedDocument 
} from '../types/motion.js';

export interface GetExamplesByCategoryParams {
  category: DocumentationCategory;
  framework: Framework;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  limit?: number;
}

export interface GetExamplesByCategoryResponse {
  success: boolean;
  category: DocumentationCategory;
  framework: Framework;
  complexity?: string;
  examples: CodeExample[];
  totalFound: number;
  fetchTime: number;
  error?: string;
}

export interface ExampleFilter {
  framework?: Framework;
  category?: DocumentationCategory;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  tags?: string[];
  minLength?: number;
  maxLength?: number;
}

export class ExamplesTool {
  private fetcher: DocumentationFetcher;
  private endpoints: DocumentationEndpoint[] = [];
  private exampleCache: Map<string, CodeExample[]> = new Map();

  constructor(fetcher: DocumentationFetcher) {
    this.fetcher = fetcher;
  }

  updateEndpoints(endpoints: DocumentationEndpoint[]): void {
    this.endpoints = endpoints;
    // Clear cache when endpoints change
    this.exampleCache.clear();
    logger.debug(`Examples tool updated with ${endpoints.length} endpoints`);
  }

  async getExamplesByCategory(params: GetExamplesByCategoryParams): Promise<GetExamplesByCategoryResponse> {
    const startTime = Date.now();
    logger.logToolExecution('get_examples_by_category', params);

    try {
      // Validate parameters
      if (!params.category) {
        throw createValidationError('category', params.category, 'Category is required');
      }

      if (!params.framework) {
        throw createValidationError('framework', params.framework, 'Framework is required');
      }

      if (params.limit && (params.limit < 1 || params.limit > 50)) {
        throw createValidationError('limit', params.limit, 'Limit must be between 1 and 50');
      }

      const limit = params.limit || 5;

      // Find relevant endpoints
      const relevantEndpoints = this.endpoints.filter(endpoint => 
        endpoint.framework === params.framework &&
        endpoint.category === params.category
      );

      if (relevantEndpoints.length === 0) {
        return {
          success: true,
          category: params.category,
          framework: params.framework,
          complexity: params.complexity,
          examples: [],
          totalFound: 0,
          fetchTime: Date.now() - startTime
        };
      }

      // Collect examples from relevant endpoints
      const allExamples = await this.collectExamplesFromEndpoints(
        relevantEndpoints.slice(0, 10) // Limit endpoint fetching to avoid overwhelming
      );

      // Filter by complexity if specified
      let filteredExamples = allExamples;
      if (params.complexity) {
        filteredExamples = allExamples.filter(example => 
          example.complexity === params.complexity
        );
      }

      // Sort by complexity and title
      filteredExamples.sort((a, b) => {
        const complexityOrder = { basic: 1, intermediate: 2, advanced: 3 };
        const aComplexity = complexityOrder[a.complexity];
        const bComplexity = complexityOrder[b.complexity];
        
        if (aComplexity !== bComplexity) {
          return aComplexity - bComplexity;
        }
        
        return a.title.localeCompare(b.title);
      });

      // Limit results
      const limitedExamples = filteredExamples.slice(0, limit);

      const response: GetExamplesByCategoryResponse = {
        success: true,
        category: params.category,
        framework: params.framework,
        complexity: params.complexity,
        examples: limitedExamples,
        totalFound: filteredExamples.length,
        fetchTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('get_examples_by_category', response.fetchTime, 'ms');
      logger.info(`Retrieved ${response.examples.length} examples for ${params.framework}/${params.category}`);

      return response;

    } catch (error) {
      logger.error(`Examples retrieval failed: ${params.category}/${params.framework}`, error as Error);

      return {
        success: false,
        category: params.category,
        framework: params.framework,
        complexity: params.complexity,
        examples: [],
        totalFound: 0,
        fetchTime: Date.now() - startTime,
        error: error instanceof MotionMCPError ? error.message : String(error)
      };
    }
  }

  private async collectExamplesFromEndpoints(endpoints: DocumentationEndpoint[]): Promise<CodeExample[]> {
    const allExamples: CodeExample[] = [];
    const fetchPromises = endpoints.map(async (endpoint) => {
      try {
        const cacheKey = `examples_${endpoint.url}`;
        
        // Check cache first
        if (this.exampleCache.has(cacheKey)) {
          return this.exampleCache.get(cacheKey) || [];
        }

        // Fetch documentation and extract examples
        const response = await this.fetcher.fetchDoc(endpoint.url);
        if (response.success && response.document) {
          const examples = response.document.examples || [];
          this.exampleCache.set(cacheKey, examples);
          return examples;
        }

        return [];
      } catch (error) {
        logger.warn(`Failed to fetch examples from: ${endpoint.url}`, { 
          error: (error as Error).message 
        });
        return [];
      }
    });

    const exampleArrays = await Promise.all(fetchPromises);
    
    // Flatten and deduplicate
    for (const examples of exampleArrays) {
      allExamples.push(...examples);
    }

    // Remove duplicates based on code content
    const uniqueExamples = allExamples.filter((example, index, array) => 
      array.findIndex(e => e.code === example.code) === index
    );

    return uniqueExamples;
  }

  async getExamplesByComplexity(
    complexity: 'basic' | 'intermediate' | 'advanced',
    framework?: Framework,
    limit: number = 10
  ): Promise<CodeExample[]> {
    try {
      let relevantEndpoints = this.endpoints;

      if (framework) {
        relevantEndpoints = relevantEndpoints.filter(
          endpoint => endpoint.framework === framework
        );
      }

      const allExamples = await this.collectExamplesFromEndpoints(
        relevantEndpoints.slice(0, 15)
      );

      const complexityExamples = allExamples
        .filter(example => example.complexity === complexity)
        .slice(0, limit);

      logger.debug(`Found ${complexityExamples.length} ${complexity} examples`);
      return complexityExamples;

    } catch (error) {
      logger.error(`Failed to get examples by complexity: ${complexity}`, error as Error);
      return [];
    }
  }

  async getExamplesByTags(
    tags: string[], 
    framework?: Framework,
    limit: number = 10
  ): Promise<CodeExample[]> {
    try {
      let relevantEndpoints = this.endpoints;

      if (framework) {
        relevantEndpoints = relevantEndpoints.filter(
          endpoint => endpoint.framework === framework
        );
      }

      const allExamples = await this.collectExamplesFromEndpoints(
        relevantEndpoints.slice(0, 15)
      );

      // Filter examples that have any of the specified tags
      const taggedExamples = allExamples.filter(example =>
        tags.some(tag => 
          example.tags.some(exampleTag => 
            exampleTag.toLowerCase().includes(tag.toLowerCase())
          )
        )
      ).slice(0, limit);

      logger.debug(`Found ${taggedExamples.length} examples with tags: ${tags.join(', ')}`);
      return taggedExamples;

    } catch (error) {
      logger.error(`Failed to get examples by tags: ${tags.join(', ')}`, error as Error);
      return [];
    }
  }

  async filterExamples(examples: CodeExample[], filter: ExampleFilter): Promise<CodeExample[]> {
    try {
      let filtered = examples;

      // Framework filter
      if (filter.framework) {
        filtered = filtered.filter(example => example.framework === filter.framework);
      }

      // Complexity filter
      if (filter.complexity) {
        filtered = filtered.filter(example => example.complexity === filter.complexity);
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter(example =>
          filter.tags!.some(tag =>
            example.tags.some(exampleTag =>
              exampleTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Length filters
      if (filter.minLength) {
        filtered = filtered.filter(example => example.code.length >= filter.minLength!);
      }

      if (filter.maxLength) {
        filtered = filtered.filter(example => example.code.length <= filter.maxLength!);
      }

      return filtered;

    } catch (error) {
      logger.error('Example filtering failed', error as Error);
      return examples; // Return original examples if filtering fails
    }
  }

  async getExampleStats(): Promise<{
    totalExamples: number;
    byFramework: Record<Framework, number>;
    byComplexity: Record<string, number>;
    byCategory: Record<DocumentationCategory, number>;
    averageCodeLength: number;
    topTags: Array<{ tag: string; count: number }>;
  }> {
    try {
      // Collect all examples
      const allExamples = await this.collectExamplesFromEndpoints(this.endpoints.slice(0, 20));

      const stats = {
        totalExamples: allExamples.length,
        byFramework: {} as Record<Framework, number>,
        byComplexity: {} as Record<string, number>,
        byCategory: {} as Record<DocumentationCategory, number>,
        averageCodeLength: 0,
        topTags: [] as Array<{ tag: string; count: number }>
      };

      // Calculate stats
      let totalCodeLength = 0;
      const tagCounts: Record<string, number> = {};

      for (const example of allExamples) {
        // Framework counts
        stats.byFramework[example.framework] = (stats.byFramework[example.framework] || 0) + 1;

        // Complexity counts
        stats.byComplexity[example.complexity] = (stats.byComplexity[example.complexity] || 0) + 1;

        // Code length
        totalCodeLength += example.code.length;

        // Tag counts
        for (const tag of example.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      // Calculate averages
      stats.averageCodeLength = allExamples.length > 0 ? 
        Math.round(totalCodeLength / allExamples.length) : 0;

      // Top tags
      stats.topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      return stats;

    } catch (error) {
      logger.error('Failed to calculate example stats', error as Error);
      return {
        totalExamples: 0,
        byFramework: {} as Record<Framework, number>,
        byComplexity: {},
        byCategory: {} as Record<DocumentationCategory, number>,
        averageCodeLength: 0,
        topTags: []
      };
    }
  }

  async getFrameworkSpecificExamples(framework: Framework): Promise<{
    basic: CodeExample[];
    intermediate: CodeExample[];
    advanced: CodeExample[];
  }> {
    try {
      const frameworkEndpoints = this.endpoints.filter(
        endpoint => endpoint.framework === framework
      );

      const allExamples = await this.collectExamplesFromEndpoints(frameworkEndpoints);

      return {
        basic: allExamples.filter(e => e.complexity === 'basic').slice(0, 5),
        intermediate: allExamples.filter(e => e.complexity === 'intermediate').slice(0, 5),
        advanced: allExamples.filter(e => e.complexity === 'advanced').slice(0, 5)
      };

    } catch (error) {
      logger.error(`Failed to get ${framework} examples`, error as Error);
      return { basic: [], intermediate: [], advanced: [] };
    }
  }
}