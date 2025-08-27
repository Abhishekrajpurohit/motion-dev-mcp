/**
 * Documentation retrieval tool implementation
 * Handles fetching and parsing Motion.dev documentation
 */

import { DocumentationFetcher, DocumentResponse } from '../docs/fetcher.js';
import { DocumentationCache } from '../docs/cache.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError } from '../utils/errors.js';
import { ParsedDocument } from '../types/motion.js';

export interface GetMotionDocsParams {
  url: string;
  useCache?: boolean;
}

export interface GetMotionDocsResponse {
  success: boolean;
  document?: ParsedDocument;
  error?: string;
  cached: boolean;
  fetchTime: number;
}

export class DocumentationTool {
  private fetcher: DocumentationFetcher;
  private cache: DocumentationCache;

  constructor(fetcher: DocumentationFetcher, cache: DocumentationCache) {
    this.fetcher = fetcher;
    this.cache = cache;
  }

  async getMotionDocs(params: GetMotionDocsParams): Promise<GetMotionDocsResponse> {
    const startTime = Date.now();
    logger.logToolExecution('get_motion_docs', params);

    try {
      // Try cache first if enabled
      if (params.useCache !== false) {
        const cached = await this.cache.get<ParsedDocument>(params.url);
        if (cached) {
          logger.logPerformanceMetric('get_motion_docs_cached', Date.now() - startTime, 'ms');
          return {
            success: true,
            document: cached,
            cached: true,
            fetchTime: Date.now() - startTime
          };
        }
      }

      // Fetch fresh documentation
      const response = await this.fetcher.fetchDoc(params.url, params.useCache);
      
      if (response.success && response.document) {
        // Cache the result for future use
        await this.cache.set(params.url, response.document);
      }

      logger.logPerformanceMetric('get_motion_docs_fresh', response.fetchTime, 'ms');
      
      return {
        success: response.success,
        document: response.document,
        error: response.error,
        cached: false,
        fetchTime: response.fetchTime
      };

    } catch (error) {
      logger.error(`Documentation fetch failed: ${params.url}`, error as Error);
      
      return {
        success: false,
        error: error instanceof MotionMCPError ? error.message : String(error),
        cached: false,
        fetchTime: Date.now() - startTime
      };
    }
  }

  async validateDocumentationUrl(url: string): Promise<boolean> {
    try {
      // Check if URL is Motion.dev documentation
      const motionDevPatterns = [
        /^https?:\/\/motion\.dev\/docs/,
        /^\/docs\//,
        /^docs\//
      ];

      return motionDevPatterns.some(pattern => pattern.test(url));
    } catch (error) {
      logger.warn(`URL validation failed: ${url}`, { error: (error as Error).message });
      return false;
    }
  }

  async getDocumentationMetadata(url: string): Promise<{
    title: string;
    framework: string;
    category: string;
    lastModified?: string;
  } | null> {
    try {
      const cached = await this.cache.get<ParsedDocument>(url);
      if (cached) {
        return {
          title: cached.title,
          framework: cached.framework,
          category: cached.category,
          lastModified: cached.lastUpdated
        };
      }

      // Would need to fetch to get metadata
      return null;
    } catch (error) {
      logger.warn(`Failed to get metadata for: ${url}`, { error: (error as Error).message });
      return null;
    }
  }

  async bulkFetchDocumentation(urls: string[]): Promise<Map<string, ParsedDocument | null>> {
    const results = new Map<string, ParsedDocument | null>();
    const batchSize = 5; // Process in batches to avoid overwhelming the server

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const response = await this.getMotionDocs({ url });
          return { url, document: response.document || null };
        } catch (error) {
          logger.warn(`Bulk fetch failed for: ${url}`, { error: (error as Error).message });
          return { url, document: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        results.set(result.url, result.document);
      }

      // Small delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info(`Bulk fetch completed for ${urls.length} URLs`);
    return results;
  }

  async preloadPopularDocumentation(): Promise<void> {
    const popularUrls = [
      '/docs/react',
      '/docs/react-animation',
      '/docs/react-gestures',
      '/docs/quick-start',
      '/docs/animate',
      '/docs/vue',
      '/docs/scroll'
    ];

    logger.info('Preloading popular documentation...');
    
    try {
      await this.bulkFetchDocumentation(popularUrls);
      logger.info(`Preloaded ${popularUrls.length} popular documentation pages`);
    } catch (error) {
      logger.error('Failed to preload documentation', error as Error);
    }
  }
}