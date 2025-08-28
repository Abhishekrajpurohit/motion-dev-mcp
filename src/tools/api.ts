/**
 * API reference extraction tool implementation
 * Handles Motion.dev component API documentation and reference extraction
 */

import { DocumentationFetcher } from '../docs/fetcher.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError, createValidationError } from '../utils/errors.js';
import { 
  DocumentationEndpoint, 
  ApiReference, 
  Framework, 
  CodeExample 
} from '../types/motion.js';

export interface GetComponentApiParams {
  component: string;
  framework: Framework;
}

export interface GetComponentApiResponse {
  success: boolean;
  component: string;
  framework: Framework;
  apiReference?: ApiReference;
  examples: CodeExample[];
  relatedComponents: string[];
  fetchTime: number;
  error?: string;
}

export interface ComponentInfo {
  name: string;
  framework: Framework;
  description: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    defaultValue?: any;
  }>;
  methods?: Array<{
    name: string;
    signature: string;
    description: string;
  }>;
  events?: Array<{
    name: string;
    payload: string;
    description: string;
  }>;
}

export class ApiTool {
  private fetcher: DocumentationFetcher;
  private endpoints: DocumentationEndpoint[] = [];
  private apiCache: Map<string, ApiReference> = new Map();

  constructor(fetcher: DocumentationFetcher) {
    this.fetcher = fetcher;
  }

  updateEndpoints(endpoints: DocumentationEndpoint[]): void {
    this.endpoints = endpoints;
    // Clear cache when endpoints change
    this.apiCache.clear();
    logger.debug(`API tool updated with ${endpoints.length} endpoints`);
  }

  async getComponentApi(params: GetComponentApiParams): Promise<GetComponentApiResponse> {
    const startTime = Date.now();
    logger.logToolExecution('get_component_api', params);

    try {
      // Validate parameters
      if (!params.component || params.component.trim().length === 0) {
        throw createValidationError('component', params.component, 'Component name is required');
      }

      if (!params.framework) {
        throw createValidationError('framework', params.framework, 'Framework is required');
      }

      // Find relevant endpoints for the component
      const componentEndpoints = this.findComponentEndpoints(params.component, params.framework);

      if (componentEndpoints.length === 0) {
        return {
          success: false,
          component: params.component,
          framework: params.framework,
          examples: [],
          relatedComponents: [],
          fetchTime: Date.now() - startTime,
          error: `No API documentation found for component: ${params.component}`
        };
      }

      // Get API reference from the most relevant endpoint
      const primaryEndpoint = componentEndpoints[0];
      const apiReference = await this.extractApiReference(primaryEndpoint);

      // Collect examples from all relevant endpoints
      const examples = await this.collectComponentExamples(componentEndpoints, params.component);

      // Find related components
      const relatedComponents = this.findRelatedComponents(params.component, params.framework);

      const response: GetComponentApiResponse = {
        success: true,
        component: params.component,
        framework: params.framework,
        apiReference,
        examples,
        relatedComponents,
        fetchTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('get_component_api', response.fetchTime, 'ms');
      logger.info(`Retrieved API for ${params.component} (${params.framework})`);

      return response;

    } catch (error) {
      logger.error(`Component API retrieval failed: ${params.component}`, error as Error);

      return {
        success: false,
        component: params.component,
        framework: params.framework,
        examples: [],
        relatedComponents: [],
        fetchTime: Date.now() - startTime,
        error: error instanceof MotionMCPError ? error.message : String(error)
      };
    }
  }

  private findComponentEndpoints(component: string, framework: Framework): DocumentationEndpoint[] {
    const componentLower = component.toLowerCase();
    
    return this.endpoints
      .filter(endpoint => 
        endpoint.framework === framework &&
        (endpoint.title.toLowerCase().includes(componentLower) ||
         endpoint.url.toLowerCase().includes(componentLower) ||
         endpoint.category === 'components' ||
         endpoint.category === 'api-reference')
      )
      .sort((a, b) => {
        // Prioritize exact matches and components category
        const aScore = this.calculateRelevanceScore(a, component);
        const bScore = this.calculateRelevanceScore(b, component);
        return bScore - aScore;
      });
  }

  private calculateRelevanceScore(endpoint: DocumentationEndpoint, component: string): number {
    let score = 0;
    const componentLower = component.toLowerCase();
    const titleLower = endpoint.title.toLowerCase();
    const urlLower = endpoint.url.toLowerCase();

    // Exact title match
    if (titleLower === componentLower) score += 100;
    
    // Title contains component
    if (titleLower.includes(componentLower)) score += 50;
    
    // URL contains component
    if (urlLower.includes(componentLower)) score += 30;
    
    // Components or API reference category
    if (endpoint.category === 'components') score += 20;
    if (endpoint.category === 'api-reference') score += 15;
    
    return score;
  }

  private async extractApiReference(endpoint: DocumentationEndpoint): Promise<ApiReference | undefined> {
    try {
      const cacheKey = `api_${endpoint.url}`;
      
      // Check cache first
      if (this.apiCache.has(cacheKey)) {
        return this.apiCache.get(cacheKey);
      }

      // Fetch documentation
      const response = await this.fetcher.fetchDoc(endpoint.url);
      if (response.success && response.document?.apiReference) {
        const apiRef = response.document.apiReference;
        this.apiCache.set(cacheKey, apiRef);
        return apiRef;
      }

      return undefined;

    } catch (error) {
      logger.warn(`Failed to extract API reference from: ${endpoint.url}`, { 
        error: (error as Error).message 
      });
      return undefined;
    }
  }

  private async collectComponentExamples(
    endpoints: DocumentationEndpoint[], 
    component: string
  ): Promise<CodeExample[]> {
    const examples: CodeExample[] = [];
    const componentLower = component.toLowerCase();

    const fetchPromises = endpoints.slice(0, 3).map(async (endpoint) => {
      try {
        const response = await this.fetcher.fetchDoc(endpoint.url);
        if (response.success && response.document) {
          // Filter examples related to the specific component
          const componentExamples = (response.document.examples || [])
            .filter(example => 
              example.title.toLowerCase().includes(componentLower) ||
              example.code.toLowerCase().includes(componentLower)
            );
          return componentExamples;
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
    
    for (const componentExamples of exampleArrays) {
      examples.push(...componentExamples);
    }

    // Remove duplicates and limit
    const uniqueExamples = examples.filter((example, index, array) => 
      array.findIndex(e => e.code === example.code) === index
    );

    return uniqueExamples.slice(0, 10);
  }

  private findRelatedComponents(component: string, framework: Framework): string[] {
    const related = new Set<string>();
    const componentLower = component.toLowerCase();

    // Component relationship patterns
    const relationships: Record<string, string[]> = {
      'motion': ['animate', 'transition', 'variants'],
      'animate': ['spring', 'keyframes', 'timeline'],
      'drag': ['gesture', 'constraint', 'momentum'],
      'scroll': ['trigger', 'progress', 'parallax'],
      'layout': ['shared', 'reorder', 'flip'],
      'transition': ['animate', 'variants', 'orchestration']
    };

    // Find related by pattern matching
    for (const [key, relatedList] of Object.entries(relationships)) {
      if (componentLower.includes(key)) {
        relatedList.forEach(rel => related.add(rel));
      }
    }

    // Find related by similar endpoints
    const similarEndpoints = this.endpoints
      .filter(endpoint => 
        endpoint.framework === framework &&
        endpoint.category === 'components' &&
        !endpoint.title.toLowerCase().includes(componentLower)
      )
      .slice(0, 5);

    similarEndpoints.forEach(endpoint => {
      const componentName = this.extractComponentName(endpoint.title);
      if (componentName) {
        related.add(componentName);
      }
    });

    return Array.from(related).slice(0, 6);
  }

  private extractComponentName(title: string): string | null {
    // Extract component name from title
    const patterns = [
      /^(\w+)\s+(component|api)/i,
      /(\w+\.\w+)/,
      /motion\.(\w+)/i,
      /^(\w+)/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  async getAllComponents(framework?: Framework): Promise<Array<{
    name: string;
    framework: Framework;
    category: string;
    description: string;
    url: string;
  }>> {
    try {
      let componentEndpoints = this.endpoints.filter(
        endpoint => endpoint.category === 'components' || endpoint.category === 'api-reference'
      );

      if (framework) {
        componentEndpoints = componentEndpoints.filter(
          endpoint => endpoint.framework === framework
        );
      }

      return componentEndpoints.map(endpoint => ({
        name: this.extractComponentName(endpoint.title) || endpoint.title,
        framework: endpoint.framework as Framework,
        category: endpoint.category,
        description: endpoint.title,
        url: endpoint.url
      }));

    } catch (error) {
      logger.error('Failed to get all components', error as Error);
      return [];
    }
  }

  async getApiDocumentationUrls(framework: Framework): Promise<string[]> {
    try {
      return this.endpoints
        .filter(endpoint => 
          endpoint.framework === framework &&
          (endpoint.category === 'api-reference' || endpoint.category === 'components')
        )
        .map(endpoint => endpoint.url);

    } catch (error) {
      logger.error(`Failed to get API URLs for ${framework}`, error as Error);
      return [];
    }
  }

  async validateComponentExists(component: string, framework: Framework): Promise<boolean> {
    try {
      const endpoints = this.findComponentEndpoints(component, framework);
      return endpoints.length > 0;
    } catch (error) {
      logger.warn(`Component validation failed: ${component}`, { error: (error as Error).message });
      return false;
    }
  }

  async getComponentsByCategory(
    framework: Framework, 
    category: string
  ): Promise<Array<{ name: string; description: string; url: string }>> {
    try {
      const categoryEndpoints = this.endpoints.filter(endpoint => 
        endpoint.framework === framework &&
        endpoint.title.toLowerCase().includes(category.toLowerCase())
      );

      return categoryEndpoints.map(endpoint => ({
        name: this.extractComponentName(endpoint.title) || endpoint.title,
        description: endpoint.title,
        url: endpoint.url
      }));

    } catch (error) {
      logger.error(`Failed to get ${category} components for ${framework}`, error as Error);
      return [];
    }
  }
}