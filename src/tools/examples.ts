/**
 * Code examples retrieval tool implementation
 * Handles filtering and organizing Motion.dev code examples with SQLite backend
 */

import { MotionDocService } from '../services/motion-doc-service';
import { MotionExample } from '../database/motion-repository';
import { Logger } from '../utils/logger';
import { MotionMCPError, createValidationError } from '../utils/errors';
import { Framework } from '../types/motion';

export interface GetExamplesByCategoryParams {
  category: string;
  framework?: Framework;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

export interface GetExamplesByCategoryResponse {
  success: boolean;
  category: string;
  framework?: Framework;
  difficulty?: string;
  examples: MotionExample[];
  totalFound: number;
  queryTime: number;
  error?: string;
}

export interface SearchExamplesParams {
  query: string;
  framework?: Framework;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

export interface ExampleFilter {
  framework?: Framework;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  minLength?: number;
  maxLength?: number;
}

export class ExamplesTool {
  private docService: MotionDocService;
  private logger = Logger.getInstance();

  constructor(docService: MotionDocService) {
    this.docService = docService;
  }

  async getExamplesByCategory(params: GetExamplesByCategoryParams): Promise<GetExamplesByCategoryResponse> {
    const startTime = Date.now();
    this.logger.info('get_examples_by_category called', params);

    try {
      // Validate parameters
      if (!params.category) {
        throw createValidationError('category', params.category, 'Category is required');
      }

      if (params.limit && (params.limit < 1 || params.limit > 50)) {
        throw createValidationError('limit', params.limit, 'Limit must be between 1 and 50');
      }

      const limit = params.limit || 20;

      // Get examples from database
      const examples = await this.docService.getExamplesByCategory(
        params.category,
        params.framework
      );

      // Filter by difficulty if specified
      let filteredExamples = examples;
      if (params.difficulty) {
        filteredExamples = examples.filter(example => 
          example.difficulty === params.difficulty
        );
      }

      // Sort by difficulty and title
      filteredExamples.sort((a, b) => {
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        const aDifficulty = difficultyOrder[a.difficulty || 'beginner'];
        const bDifficulty = difficultyOrder[b.difficulty || 'beginner'];
        
        if (aDifficulty !== bDifficulty) {
          return aDifficulty - bDifficulty;
        }
        
        return a.title.localeCompare(b.title);
      });

      // Limit results
      const limitedExamples = filteredExamples.slice(0, limit);

      const response: GetExamplesByCategoryResponse = {
        success: true,
        category: params.category,
        framework: params.framework,
        difficulty: params.difficulty,
        examples: limitedExamples,
        totalFound: filteredExamples.length,
        queryTime: Date.now() - startTime
      };

      this.logger.info(`Retrieved ${response.examples.length} examples for ${params.framework || 'all'}/${params.category}`);

      return response;

    } catch (error) {
      this.logger.error(`Examples retrieval failed: ${params.category}/${params.framework}`, error as Error);

      return {
        success: false,
        category: params.category,
        framework: params.framework,
        difficulty: params.difficulty,
        examples: [],
        totalFound: 0,
        queryTime: Date.now() - startTime,
        error: error instanceof MotionMCPError ? error.message : String(error)
      };
    }
  }

  async searchExamples(params: SearchExamplesParams): Promise<GetExamplesByCategoryResponse> {
    const startTime = Date.now();
    this.logger.info('search_examples called', params);

    try {
      const examples = await this.docService.searchExamples(params.query, {
        framework: params.framework,
        category: params.category,
        limit: params.limit || 20
      });

      // Filter by difficulty if specified
      let filteredExamples = examples;
      if (params.difficulty) {
        filteredExamples = examples.filter(example => 
          example.difficulty === params.difficulty
        );
      }

      return {
        success: true,
        category: params.category || 'search',
        framework: params.framework,
        difficulty: params.difficulty,
        examples: filteredExamples,
        totalFound: filteredExamples.length,
        queryTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('Examples search failed', error as Error);

      return {
        success: false,
        category: params.category || 'search',
        framework: params.framework,
        difficulty: params.difficulty,
        examples: [],
        totalFound: 0,
        queryTime: Date.now() - startTime,
        error: error instanceof MotionMCPError ? error.message : String(error)
      };
    }
  }

  async getExamplesByDifficulty(
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    framework?: Framework,
    limit: number = 10
  ): Promise<MotionExample[]> {
    try {
      // Search for examples with empty query but filter by difficulty and framework
      const examples = await this.docService.searchExamples('', {
        framework,
        limit: limit * 2 // Get more to filter from
      });

      const difficultyExamples = examples
        .filter(example => example.difficulty === difficulty)
        .slice(0, limit);

      this.logger.debug(`Found ${difficultyExamples.length} ${difficulty} examples`);
      return difficultyExamples;

    } catch (error) {
      this.logger.error(`Failed to get examples by difficulty: ${difficulty}`, error as Error);
      return [];
    }
  }

  async getExamplesByTags(
    tags: string[], 
    framework?: Framework,
    limit: number = 10
  ): Promise<MotionExample[]> {
    try {
      // Use search with tag keywords
      const tagQuery = tags.join(' ');
      const examples = await this.docService.searchExamples(tagQuery, {
        framework,
        limit: limit * 2 // Get more to filter from
      });

      // Filter examples that have any of the specified tags
      const taggedExamples = examples.filter(example => {
        if (!example.tags) return false;
        
        const exampleTags = JSON.parse(example.tags) as string[];
        return tags.some(tag => 
          exampleTags.some(exampleTag => 
            exampleTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
      }).slice(0, limit);

      this.logger.debug(`Found ${taggedExamples.length} examples with tags: ${tags.join(', ')}`);
      return taggedExamples;

    } catch (error) {
      this.logger.error(`Failed to get examples by tags: ${tags.join(', ')}`, error as Error);
      return [];
    }
  }

  async filterExamples(examples: MotionExample[], filter: ExampleFilter): Promise<MotionExample[]> {
    try {
      let filtered = examples;

      // Framework filter
      if (filter.framework) {
        filtered = filtered.filter(example => example.framework === filter.framework);
      }

      // Difficulty filter
      if (filter.difficulty) {
        filtered = filtered.filter(example => example.difficulty === filter.difficulty);
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter(example => {
          if (!example.tags) return false;
          
          try {
            const exampleTags = JSON.parse(example.tags) as string[];
            return filter.tags!.some(tag =>
              exampleTags.some(exampleTag =>
                exampleTag.toLowerCase().includes(tag.toLowerCase())
              )
            );
          } catch {
            return false;
          }
        });
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
      this.logger.error('Example filtering failed', error as Error);
      return examples; // Return original examples if filtering fails
    }
  }

  async getExampleStats(): Promise<{
    totalExamples: number;
    byFramework: Record<Framework, number>;
    byDifficulty: Record<string, number>;
    byCategory: Record<string, number>;
    averageCodeLength: number;
    topTags: Array<{ tag: string; count: number }>;
  }> {
    try {
      const dbStats = this.docService.getStatistics();
      
      // Get all examples for detailed stats
      const allExamples = await this.docService.searchExamples('', { limit: 1000 });

      const stats = {
        totalExamples: dbStats.totalExamples,
        byFramework: {} as Record<Framework, number>,
        byDifficulty: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        averageCodeLength: 0,
        topTags: [] as Array<{ tag: string; count: number }>
      };

      // Calculate stats from examples
      let totalCodeLength = 0;
      const tagCounts: Record<string, number> = {};

      for (const example of allExamples) {
        // Framework counts
        stats.byFramework[example.framework] = (stats.byFramework[example.framework] || 0) + 1;

        // Difficulty counts
        const difficulty = example.difficulty || 'beginner';
        stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;

        // Category counts
        if (example.category) {
          stats.byCategory[example.category] = (stats.byCategory[example.category] || 0) + 1;
        }

        // Code length
        totalCodeLength += example.code.length;

        // Tag counts
        if (example.tags) {
          try {
            const tags = JSON.parse(example.tags) as string[];
            for (const tag of tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          } catch {
            // Ignore parsing errors
          }
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
      this.logger.error('Failed to calculate example stats', error as Error);
      return {
        totalExamples: 0,
        byFramework: {} as Record<Framework, number>,
        byDifficulty: {},
        byCategory: {} as Record<string, number>,
        averageCodeLength: 0,
        topTags: []
      };
    }
  }

  async getFrameworkSpecificExamples(framework: Framework): Promise<{
    beginner: MotionExample[];
    intermediate: MotionExample[];
    advanced: MotionExample[];
  }> {
    try {
      const allExamples = await this.docService.searchExamples('', {
        framework,
        limit: 100
      });

      return {
        beginner: allExamples.filter(e => e.difficulty === 'beginner').slice(0, 5),
        intermediate: allExamples.filter(e => e.difficulty === 'intermediate').slice(0, 5),
        advanced: allExamples.filter(e => e.difficulty === 'advanced').slice(0, 5)
      };

    } catch (error) {
      this.logger.error(`Failed to get ${framework} examples`, error as Error);
      return { beginner: [], intermediate: [], advanced: [] };
    }
  }
}