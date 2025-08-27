/**
 * Documentation search tool implementation
 * Provides full-text search across Motion.dev documentation
 */

import Fuse from 'fuse.js';
import { DocumentationEndpoint, CategorizedEndpoints, Framework, DocumentationCategory } from '../types/motion.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError, createValidationError } from '../utils/errors.js';

export interface SearchMotionDocsParams {
  query: string;
  framework?: Framework | 'general';
  category?: DocumentationCategory;
  limit?: number;
}

export interface SearchResult {
  endpoint: DocumentationEndpoint;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    indices: Array<[number, number]>;
  }>;
}

export interface SearchMotionDocsResponse {
  success: boolean;
  results: SearchResult[];
  totalFound: number;
  searchTime: number;
  query: string;
  filters?: {
    framework?: string;
    category?: string;
  };
}

export class SearchTool {
  private fuse: Fuse<DocumentationEndpoint> | null = null;
  private endpoints: DocumentationEndpoint[] = [];
  private categorizedEndpoints: CategorizedEndpoints = {
    react: [],
    js: [],
    vue: [],
    general: []
  };

  constructor() {
    this.initializeFuse();
  }

  private initializeFuse(): void {
    const fuseOptions: Fuse.IFuseOptions<DocumentationEndpoint> = {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'url', weight: 0.3 },
        { name: 'framework', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true
    };

    this.fuse = new Fuse([], fuseOptions);
  }

  updateEndpoints(endpoints: DocumentationEndpoint[]): void {
    this.endpoints = endpoints;
    if (this.fuse) {
      this.fuse.setCollection(endpoints);
    }
    logger.debug(`Search index updated with ${endpoints.length} endpoints`);
  }

  updateCategorizedEndpoints(categorized: CategorizedEndpoints): void {
    this.categorizedEndpoints = categorized;
  }

  async searchMotionDocs(params: SearchMotionDocsParams): Promise<SearchMotionDocsResponse> {
    const startTime = Date.now();
    logger.logToolExecution('search_motion_docs', params);

    try {
      // Validate parameters
      if (!params.query || params.query.trim().length === 0) {
        throw createValidationError('query', params.query, 'Search query cannot be empty');
      }

      if (params.limit && (params.limit < 1 || params.limit > 100)) {
        throw createValidationError('limit', params.limit, 'Search limit must be between 1 and 100');
      }

      const limit = params.limit || 10;
      let searchEndpoints = this.endpoints;

      // Apply framework filter
      if (params.framework) {
        searchEndpoints = searchEndpoints.filter(
          endpoint => endpoint.framework === params.framework
        );
      }

      // Apply category filter
      if (params.category) {
        searchEndpoints = searchEndpoints.filter(
          endpoint => endpoint.category === params.category
        );
      }

      // Perform search
      let searchResults: SearchResult[];

      if (!this.fuse) {
        this.initializeFuse();
      }

      // Update search collection with filtered endpoints
      this.fuse!.setCollection(searchEndpoints);
      const fuseResults = this.fuse!.search(params.query.trim());

      searchResults = fuseResults
        .slice(0, limit)
        .map((result): SearchResult => ({
          endpoint: result.item,
          score: result.score || 0,
          matches: result.matches?.map(match => ({
            field: match.key || '',
            value: match.value || '',
            indices: match.indices || []
          })) || []
        }));

      const response: SearchMotionDocsResponse = {
        success: true,
        results: searchResults,
        totalFound: fuseResults.length,
        searchTime: Date.now() - startTime,
        query: params.query,
        filters: {
          framework: params.framework,
          category: params.category
        }
      };

      logger.logPerformanceMetric('search_motion_docs', response.searchTime, 'ms');
      logger.info(`Search completed: "${params.query}" returned ${response.results.length} results`);

      return response;

    } catch (error) {
      logger.error(`Search failed for query: "${params.query}"`, error as Error);

      return {
        success: false,
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        query: params.query,
        error: error instanceof MotionMCPError ? error.message : String(error)
      } as SearchMotionDocsResponse & { error: string };
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      // Extract common terms from endpoint titles
      const terms = this.endpoints
        .flatMap(endpoint => 
          endpoint.title.toLowerCase().split(/\s+/)
            .filter(term => term.length > 2)
        )
        .filter(term => term.includes(query.toLowerCase()))
        .slice(0, limit);

      return [...new Set(terms)]; // Remove duplicates
      
    } catch (error) {
      logger.warn(`Failed to generate search suggestions for: "${query}"`, { 
        error: (error as Error).message 
      });
      return [];
    }
  }

  async getPopularSearches(): Promise<Array<{ query: string; category: string }>> {
    // Return popular/common searches for Motion.dev
    return [
      { query: 'animation', category: 'animation' },
      { query: 'spring', category: 'animation' },
      { query: 'gesture', category: 'gestures' },
      { query: 'scroll', category: 'scroll-animations' },
      { query: 'layout', category: 'layout-animations' },
      { query: 'transition', category: 'animation' },
      { query: 'drag', category: 'gestures' },
      { query: 'hover', category: 'gestures' },
      { query: 'keyframes', category: 'animation' },
      { query: 'variants', category: 'animation' }
    ];
  }

  async searchByCategory(category: DocumentationCategory, limit: number = 20): Promise<DocumentationEndpoint[]> {
    try {
      const categoryEndpoints = this.endpoints.filter(
        endpoint => endpoint.category === category
      );

      return categoryEndpoints.slice(0, limit);
    } catch (error) {
      logger.error(`Category search failed: ${category}`, error as Error);
      return [];
    }
  }

  async searchByFramework(framework: Framework | 'general', limit: number = 50): Promise<DocumentationEndpoint[]> {
    try {
      const frameworkEndpoints = this.endpoints.filter(
        endpoint => endpoint.framework === framework
      );

      return frameworkEndpoints.slice(0, limit);
    } catch (error) {
      logger.error(`Framework search failed: ${framework}`, error as Error);
      return [];
    }
  }

  async getSearchStats(): Promise<{
    totalEndpoints: number;
    byFramework: Record<string, number>;
    byCategory: Record<DocumentationCategory, number>;
    searchCapabilities: string[];
  }> {
    const byFramework: Record<string, number> = {};
    const byCategory: Record<DocumentationCategory, number> = {};

    for (const endpoint of this.endpoints) {
      byFramework[endpoint.framework] = (byFramework[endpoint.framework] || 0) + 1;
      byCategory[endpoint.category] = (byCategory[endpoint.category] || 0) + 1;
    }

    return {
      totalEndpoints: this.endpoints.length,
      byFramework,
      byCategory,
      searchCapabilities: [
        'Full-text search across titles and URLs',
        'Framework filtering (react, js, vue, general)',
        'Category filtering by animation type',
        'Fuzzy matching with relevance scoring',
        'Search suggestions and popular queries',
        'Batch operations and bulk search'
      ]
    };
  }

  async bulkSearch(queries: string[], options?: {
    framework?: Framework | 'general';
    category?: DocumentationCategory;
    limit?: number;
  }): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();
    
    try {
      for (const query of queries) {
        const searchResponse = await this.searchMotionDocs({
          query,
          framework: options?.framework,
          category: options?.category,
          limit: options?.limit || 5
        });

        if (searchResponse.success) {
          results.set(query, searchResponse.results);
        } else {
          results.set(query, []);
        }
      }

      logger.info(`Bulk search completed for ${queries.length} queries`);
      return results;
      
    } catch (error) {
      logger.error('Bulk search failed', error as Error);
      return results;
    }
  }
}