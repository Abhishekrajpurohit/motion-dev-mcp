/**
 * Documentation retrieval tool implementation
 * Handles fetching and parsing Motion.dev documentation with SQLite backend
 */

import { MotionDocService } from '../services/motion-doc-service';
import { MotionDoc, MotionComponent } from '../database/motion-repository';
import { Logger } from '../utils/logger';
import { MotionMCPError } from '../utils/errors';

export interface GetMotionDocsParams {
  url?: string;
  topic?: string;
  framework?: 'react' | 'js' | 'vue';
  category?: string;
}

export interface GetMotionDocsResponse {
  success: boolean;
  documents?: MotionDoc[];
  document?: MotionDoc;
  error?: string;
  totalFound: number;
  queryTime: number;
}

export interface SearchMotionDocsParams {
  query: string;
  framework?: 'react' | 'js' | 'vue' | 'general';
  category?: string;
  limit?: number;
}

export interface GetComponentApiParams {
  component: string;
  framework: 'react' | 'js' | 'vue';
}

export class DocumentationTool {
  private docService: MotionDocService;
  private logger = Logger.getInstance();

  constructor(docService: MotionDocService) {
    this.docService = docService;
  }

  async getMotionDocs(params: GetMotionDocsParams): Promise<GetMotionDocsResponse> {
    const startTime = Date.now();
    this.logger.info('get_motion_docs called', params);

    try {
      // If URL is provided, get specific document
      if (params.url) {
        const document = await this.docService.getDocumentation(params.url);
        return {
          success: true,
          document: document || undefined,
          totalFound: document ? 1 : 0,
          queryTime: Date.now() - startTime
        };
      }

      // If topic is provided, search for it
      if (params.topic) {
        const documents = await this.docService.searchDocumentation(params.topic, {
          framework: params.framework,
          category: params.category,
          limit: 10
        });
        
        return {
          success: true,
          documents,
          totalFound: documents.length,
          queryTime: Date.now() - startTime
        };
      }

      // Otherwise, get all docs for framework/category
      const documents = await this.docService.searchDocumentation('', {
        framework: params.framework,
        category: params.category,
        limit: 50
      });

      return {
        success: true,
        documents,
        totalFound: documents.length,
        queryTime: Date.now() - startTime
      };

    } catch (error) {
      this.logger.error('Documentation fetch failed', error as Error);
      
      return {
        success: false,
        error: error instanceof MotionMCPError ? error.message : String(error),
        totalFound: 0,
        queryTime: Date.now() - startTime
      };
    }
  }

  async searchMotionDocs(params: SearchMotionDocsParams): Promise<GetMotionDocsResponse> {
    const startTime = Date.now();
    this.logger.info('search_motion_docs called', params);

    try {
      const documents = await this.docService.searchDocumentation(params.query, {
        framework: params.framework === 'general' ? undefined : params.framework,
        category: params.category,
        limit: params.limit || 20
      });

      return {
        success: true,
        documents,
        totalFound: documents.length,
        queryTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error('Documentation search failed', error as Error);
      
      return {
        success: false,
        error: error instanceof MotionMCPError ? error.message : String(error),
        totalFound: 0,
        queryTime: Date.now() - startTime
      };
    }
  }

  async getComponentApi(params: GetComponentApiParams): Promise<{ success: boolean; component?: MotionComponent; error?: string }> {
    this.logger.info('get_component_api called', params);

    try {
      const component = await this.docService.getComponent(params.component, params.framework);
      
      return {
        success: true,
        component: component || undefined
      };
    } catch (error) {
      this.logger.error('Component API fetch failed', error as Error);
      
      return {
        success: false,
        error: error instanceof MotionMCPError ? error.message : String(error)
      };
    }
  }

  async getDocumentationCategories(_framework?: 'react' | 'js' | 'vue'): Promise<string[]> {
    try {
      // This would need to be implemented in the repository
      // For now, return common categories
      const categories = ['animations', 'gestures', 'scroll', 'layout', 'springs', 'getting-started', 'general'];
      return categories;
    } catch (error) {
      this.logger.error('Failed to get categories', error as Error);
      return [];
    }
  }

  async getDatabaseStatistics() {
    try {
      return await this.docService.getStatistics();
    } catch (error) {
      this.logger.error('Failed to get database statistics', error as Error);
      return {
        totalDocs: 0,
        totalComponents: 0,
        totalExamples: 0,
        frameworkCounts: [],
        hasFTS5: false
      };
    }
  }

  async populateDatabase(): Promise<void> {
    this.logger.info('Populating Motion.dev documentation database...');
    
    try {
      await this.docService.populateDatabase();
      this.logger.info('Database population completed');
    } catch (error) {
      this.logger.error('Failed to populate database', error as Error);
      throw error;
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
      this.logger.warn(`URL validation failed: ${url}`, { error: (error as Error).message });
      return false;
    }
  }
}