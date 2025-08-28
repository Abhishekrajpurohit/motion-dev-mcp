/**
 * API reference extraction tool implementation
 * Handles Motion.dev component API documentation and reference extraction
 */

import { MotionDocService } from '../services/motion-doc-service.js';
import { GetComponentApiParams } from './documentation.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError, createValidationError } from '../utils/errors.js';
import { 
  ApiReference, 
  Framework, 
  CodeExample 
} from '../types/motion.js';

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
  private docService: MotionDocService;

  constructor(docService: MotionDocService) {
    this.docService = docService;
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

      // Get component from SQLite database
      const component = await this.docService.getComponent(params.component, params.framework);

      if (!component) {
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

      // Parse props and methods from the component data
      const apiReference: ApiReference = {
        component: component.name,
        description: component.description || '',
        props: component.props ? JSON.parse(component.props) : [],
        examples: component.examples ? JSON.parse(component.examples) : []
      };

      // Get examples from SQLite database
      const examples = await this.docService.searchExamples(params.component, { 
        framework: params.framework, 
        limit: 10 
      });

      const response: GetComponentApiResponse = {
        success: true,
        component: params.component,
        framework: params.framework,
        apiReference,
        examples: examples.map(ex => ({
          id: ex.title,
          title: ex.title,
          code: ex.code,
          framework: ex.framework,
          complexity: (ex.difficulty === 'beginner' ? 'basic' : ex.difficulty) || 'basic',
          tags: ex.tags ? JSON.parse(ex.tags) : [],
          language: 'typescript'
        })),
        relatedComponents: [], // Could be enhanced to find related components
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
}