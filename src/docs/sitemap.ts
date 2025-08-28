/**
 * Motion.dev sitemap parsing and endpoint extraction
 */

import * as cheerio from 'cheerio';
import { 
  DocumentationEndpoint, 
  CategorizedEndpoints,
  Framework, 
  DocumentationCategory 
} from '../types/motion.js';
import { 
  createParseError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class SitemapProcessor {
  private readonly _baseUrl = 'https://motion.dev';
  
  async parseDocumentationUrls(sitemapXml: string): Promise<DocumentationEndpoint[]> {
    logger.debug('Parsing sitemap XML for documentation URLs');
    
    try {
      const $ = cheerio.load(sitemapXml, { xmlMode: true });
      const endpoints: DocumentationEndpoint[] = [];
      
      $('url loc').each((_index, element) => {
        const url = $(element).text().trim();
        
        // Only process documentation URLs
        if (this.isDocumentationUrl(url)) {
          const endpoint = this.createEndpointFromUrl(url);
          if (endpoint) {
            endpoints.push(endpoint);
          }
        }
      });
      
      logger.info(`Parsed ${endpoints.length} documentation endpoints from sitemap`);
      return this.sortEndpoints(endpoints);
      
    } catch (error) {
      logger.error('Failed to parse sitemap XML', error as Error);
      throw createParseError('sitemap XML', sitemapXml, (error as Error).message);
    }
  }

  categorizeEndpoints(endpoints: DocumentationEndpoint[]): CategorizedEndpoints {
    const categorized: CategorizedEndpoints = {
      react: [],
      js: [],
      vue: [],
      general: []
    };

    for (const endpoint of endpoints) {
      switch (endpoint.framework) {
        case 'react':
          categorized.react.push(endpoint);
          break;
        case 'js':
          categorized.js.push(endpoint);
          break;
        case 'vue':
          categorized.vue.push(endpoint);
          break;
        default:
          categorized.general.push(endpoint);
          break;
      }
    }

    logger.debug('Endpoints categorized by framework', {
      react: categorized.react.length,
      js: categorized.js.length,
      vue: categorized.vue.length,
      general: categorized.general.length
    });

    return categorized;
  }

  private isDocumentationUrl(url: string): boolean {
    // Check if URL contains documentation paths
    const docPatterns = [
      '/docs/',
      '/guide/',
      '/api/',
      '/tutorial/',
      '/examples/'
    ];
    
    return docPatterns.some(pattern => url.includes(pattern));
  }

  private createEndpointFromUrl(url: string): DocumentationEndpoint | null {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Extract the relative path for our endpoint
      const docPath = path.startsWith('/docs/') ? path : `/docs${path}`;
      
      return {
        url: docPath,
        framework: this.extractFrameworkFromUrl(path),
        category: this.extractCategoryFromUrl(path),
        title: this.generateTitleFromPath(path),
        lastModified: new Date().toISOString()
      };
      
    } catch (error) {
      logger.warn(`Failed to create endpoint from URL: ${url}`, { error: (error as Error).message });
      return null;
    }
  }

  private extractFrameworkFromUrl(path: string): Framework | 'general' {
    const lowerPath = path.toLowerCase();
    
    // Check for explicit framework mentions
    if (lowerPath.includes('/react') || lowerPath.includes('react-')) {
      return 'react';
    }
    if (lowerPath.includes('/vue') || lowerPath.includes('vue-')) {
      return 'vue';
    }
    if (lowerPath.includes('/js') || lowerPath.includes('/javascript') || lowerPath.includes('vanilla')) {
      return 'js';
    }
    
    // Check for framework-specific patterns
    const reactPatterns = [
      'component',
      'jsx',
      'hook',
      'framer-motion',
      'animate-presence'
    ];
    
    const vuePatterns = [
      'transition',
      'v-motion',
      'composable'
    ];
    
    const jsPatterns = [
      'vanilla',
      'animate-function',
      'dom-animation'
    ];
    
    if (reactPatterns.some(pattern => lowerPath.includes(pattern))) {
      return 'react';
    }
    if (vuePatterns.some(pattern => lowerPath.includes(pattern))) {
      return 'vue';
    }
    if (jsPatterns.some(pattern => lowerPath.includes(pattern))) {
      return 'js';
    }
    
    return 'general';
  }

  private extractCategoryFromUrl(path: string): DocumentationCategory {
    const lowerPath = path.toLowerCase();
    
    // Category mapping patterns
    const categoryPatterns: Array<{ patterns: string[]; category: DocumentationCategory }> = [
      {
        patterns: ['animation', 'animate', 'motion', 'keyframe', 'transition'],
        category: 'animation'
      },
      {
        patterns: ['gesture', 'drag', 'hover', 'tap', 'pan', 'pinch'],
        category: 'gestures'
      },
      {
        patterns: ['layout', 'shared-layout', 'layout-animation'],
        category: 'layout-animations'
      },
      {
        patterns: ['scroll', 'scroll-trigger', 'inview', 'viewport'],
        category: 'scroll-animations'
      },
      {
        patterns: ['component', 'motion-component', 'api'],
        category: 'components'
      },
      {
        patterns: ['api', 'reference', 'props', 'methods'],
        category: 'api-reference'
      },
      {
        patterns: ['example', 'demo', 'showcase', 'tutorial'],
        category: 'examples'
      },
      {
        patterns: ['best-practice', 'performance', 'optimization', 'accessibility', 'tips'],
        category: 'best-practices'
      }
    ];
    
    for (const { patterns, category } of categoryPatterns) {
      if (patterns.some(pattern => lowerPath.includes(pattern))) {
        return category;
      }
    }
    
    return 'guides'; // Default category
  }

  private generateTitleFromPath(path: string): string {
    // Extract the last segment and clean it up
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    
    // Convert kebab-case or snake_case to Title Case
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim() || 'Documentation';
  }

  private sortEndpoints(endpoints: DocumentationEndpoint[]): DocumentationEndpoint[] {
    return endpoints.sort((a, b) => {
      // First sort by framework
      if (a.framework !== b.framework) {
        const frameworkOrder = ['react', 'js', 'vue', 'general'];
        const aIndex = frameworkOrder.indexOf(a.framework as string);
        const bIndex = frameworkOrder.indexOf(b.framework as string);
        return aIndex - bIndex;
      }
      
      // Then by category
      if (a.category !== b.category) {
        const categoryOrder: DocumentationCategory[] = [
          'guides',
          'animation',
          'components',
          'gestures',
          'scroll-animations',
          'layout-animations',
          'api-reference',
          'examples',
          'best-practices'
        ];
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        return aIndex - bIndex;
      }
      
      // Finally by title
      return a.title.localeCompare(b.title);
    });
  }

  // Utility methods for endpoint analysis
  getFrameworkCounts(endpoints: DocumentationEndpoint[]): Record<string, number> {
    const counts: Record<string, number> = {
      react: 0,
      js: 0,
      vue: 0,
      general: 0
    };
    
    for (const endpoint of endpoints) {
      counts[endpoint.framework as string] = (counts[endpoint.framework as string] || 0) + 1;
    }
    
    return counts;
  }

  getCategoryCounts(endpoints: DocumentationEndpoint[]): Record<DocumentationCategory, number> {
    const counts = {} as Record<DocumentationCategory, number>;
    
    for (const endpoint of endpoints) {
      counts[endpoint.category] = (counts[endpoint.category] || 0) + 1;
    }
    
    return counts;
  }

  filterEndpoints(
    endpoints: DocumentationEndpoint[], 
    filters: {
      framework?: Framework | 'general';
      category?: DocumentationCategory;
      search?: string;
    }
  ): DocumentationEndpoint[] {
    return endpoints.filter(endpoint => {
      if (filters.framework && endpoint.framework !== filters.framework) {
        return false;
      }
      
      if (filters.category && endpoint.category !== filters.category) {
        return false;
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          endpoint.title.toLowerCase().includes(searchLower) ||
          endpoint.url.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }

  validateEndpoint(endpoint: DocumentationEndpoint): boolean {
    // Basic validation
    if (!endpoint.url || !endpoint.title || !endpoint.framework || !endpoint.category) {
      return false;
    }
    
    // URL validation
    if (!endpoint.url.startsWith('/')) {
      return false;
    }
    
    // Framework validation
    const validFrameworks = ['react', 'js', 'vue', 'general'];
    if (!validFrameworks.includes(endpoint.framework as string)) {
      return false;
    }
    
    // Category validation
    const validCategories: DocumentationCategory[] = [
      'animation',
      'gestures',
      'layout-animations',
      'scroll-animations',
      'components',
      'api-reference',
      'guides',
      'examples',
      'best-practices'
    ];
    if (!validCategories.includes(endpoint.category)) {
      return false;
    }
    
    return true;
  }

  // Debug and analysis methods
  analyzeEndpoints(endpoints: DocumentationEndpoint[]): {
    total: number;
    byFramework: Record<string, number>;
    byCategory: Record<DocumentationCategory, number>;
    coverage: {
      reactCoverage: number;
      vueCoverage: number;
      jsCoverage: number;
    };
  } {
    const total = endpoints.length;
    const byFramework = this.getFrameworkCounts(endpoints);
    const byCategory = this.getCategoryCounts(endpoints);
    
    const coverage = {
      reactCoverage: byFramework.react / total,
      vueCoverage: byFramework.vue / total,
      jsCoverage: byFramework.js / total
    };
    
    return {
      total,
      byFramework,
      byCategory,
      coverage
    };
  }

  generateSummaryReport(endpoints: DocumentationEndpoint[]): string {
    const analysis = this.analyzeEndpoints(endpoints);
    
    return `
Motion.dev Documentation Endpoints Summary
==========================================

Total Endpoints: ${analysis.total}

Framework Distribution:
- React: ${analysis.byFramework.react} (${(analysis.coverage.reactCoverage * 100).toFixed(1)}%)
- JavaScript: ${analysis.byFramework.js} (${(analysis.coverage.jsCoverage * 100).toFixed(1)}%)
- Vue: ${analysis.byFramework.vue} (${(analysis.coverage.vueCoverage * 100).toFixed(1)}%)
- General: ${analysis.byFramework.general}

Category Distribution:
${Object.entries(analysis.byCategory)
  .map(([category, count]) => `- ${category}: ${count}`)
  .join('\n')}

Coverage Analysis:
- React has the highest coverage at ${(analysis.coverage.reactCoverage * 100).toFixed(1)}%
- Vue coverage: ${(analysis.coverage.vueCoverage * 100).toFixed(1)}%
- JavaScript coverage: ${(analysis.coverage.jsCoverage * 100).toFixed(1)}%
`.trim();
  }
}