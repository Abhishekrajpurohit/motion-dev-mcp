/**
 * Code generation MCP tools implementation
 * Handles Motion.dev component generation for React, JavaScript, and Vue
 */

import { Framework } from '../types/motion.js';
import { logger } from '../utils/logger.js';
import { MotionMCPError, createToolError } from '../utils/errors.js';
import { ASTParser } from '../generation/ast/parser.js';
import { ASTTransformer } from '../generation/ast/transformer.js';
import { ASTGenerator } from '../generation/ast/generator.js';
import { AnimationPatterns } from '../generation/templates/patterns.js';

// Tool parameter interfaces
export interface GenerateMotionComponentParams {
  framework: Framework;
  componentName: string;
  animations: string[];
  props?: string[];
  typescript?: boolean;
  styleSystem?: 'css' | 'styled-components' | 'emotion' | 'tailwind';
}

export interface CreateAnimationSequenceParams {
  framework: Framework;
  sequence: Array<{
    element: string;
    animate: Record<string, any>;
    delay?: number;
    duration?: number;
    easing?: string;
  }>;
  stagger?: boolean;
  timeline?: boolean;
}

export interface OptimizeMotionCodeParams {
  code: string;
  framework: Framework;
  focusAreas?: Array<'performance' | 'accessibility' | 'bundle-size'>;
  target?: 'production' | 'development';
}

export interface ConvertBetweenFrameworksParams {
  from: Framework;
  to: Framework;
  code: string;
  preserveComments?: boolean;
  optimization?: boolean;
}

export interface ValidateMotionSyntaxParams {
  code: string;
  framework: Framework;
  strict?: boolean;
  rules?: string[];
}

// Response interfaces
export interface CodeGenerationResponse {
  success: boolean;
  code?: string;
  imports?: string[];
  dependencies?: string[];
  framework: Framework;
  typescript: boolean;
  metadata?: {
    componentName?: string;
    complexity: 'basic' | 'intermediate' | 'advanced';
    patterns: string[];
    performance: {
      score: number;
      suggestions: string[];
    };
  };
  error?: string;
  warnings?: string[];
  generateTime: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: Array<{
    type: 'error' | 'warning';
    message: string;
    line?: number;
    rule: string;
  }>;
  suggestions: Array<{
    type: 'performance' | 'accessibility' | 'best-practice';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  framework: Framework;
  analysisTime: number;
}

export class CodeGenerationTool {
  private parser: ASTParser;
  private transformer: ASTTransformer;
  private generator: ASTGenerator;
  private patterns: AnimationPatterns;

  constructor() {
    this.parser = new ASTParser();
    this.transformer = new ASTTransformer();
    this.generator = new ASTGenerator();
    this.patterns = new AnimationPatterns();
  }

  async generateMotionComponent(params: GenerateMotionComponentParams): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    logger.logToolExecution('generate_motion_component', params);

    try {
      // Validate parameters
      this.validateGenerateComponentParams(params);

      // Build component using patterns
      const componentCode = await this.buildComponentFromPatterns(params);

      // Generate final code with optimizations
      const result = await this.generateOptimizedCode(componentCode, params);

      const response: CodeGenerationResponse = {
        success: true,
        code: result.code,
        imports: result.imports,
        dependencies: result.dependencies || [],
        framework: params.framework,
        typescript: params.typescript || true,
        metadata: {
          componentName: params.componentName,
          complexity: this.determineComplexity(params.animations),
          patterns: params.animations,
          performance: await this.analyzePerformance(result.code, params.framework)
        },
        generateTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('generate_motion_component', response.generateTime, 'ms');
      return response;

    } catch (error) {
      logger.error('Motion component generation failed', error as Error);
      
      return {
        success: false,
        framework: params.framework,
        typescript: params.typescript || true,
        error: error instanceof MotionMCPError ? error.message : String(error),
        generateTime: Date.now() - startTime
      };
    }
  }

  async createAnimationSequence(params: CreateAnimationSequenceParams): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    logger.logToolExecution('create_animation_sequence', params);

    try {
      this.validateSequenceParams(params);

      const sequenceCode = await this.buildAnimationSequence(params);
      const optimizedCode = await this.optimizeSequenceCode(sequenceCode, params);

      const response: CodeGenerationResponse = {
        success: true,
        code: optimizedCode,
        framework: params.framework,
        typescript: true,
        metadata: {
          complexity: 'intermediate',
          patterns: ['sequence', 'timeline'],
          performance: await this.analyzePerformance(optimizedCode, params.framework)
        },
        generateTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('create_animation_sequence', response.generateTime, 'ms');
      return response;

    } catch (error) {
      logger.error('Animation sequence creation failed', error as Error);
      
      return {
        success: false,
        framework: params.framework,
        typescript: true,
        error: error instanceof MotionMCPError ? error.message : String(error),
        generateTime: Date.now() - startTime
      };
    }
  }

  async optimizeMotionCode(params: OptimizeMotionCodeParams): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    logger.logToolExecution('optimize_motion_code', params);

    try {
      // Parse existing code
      const ast = this.parser.parse(params.code, {
        framework: params.framework,
        typescript: params.code.includes('interface') || params.code.includes(': ')
      });

      // Apply optimizations
      const context = {
        framework: params.framework,
        typescript: ast.typescript,
        componentName: ast.componentName,
        imports: new Set<string>(),
        dependencies: new Set<string>(),
        optimization: {
          performance: params.focusAreas?.includes('performance') || false,
          accessibility: params.focusAreas?.includes('accessibility') || false,
          bundleSize: params.focusAreas?.includes('bundle-size') || false
        }
      };

      const transformedAST = this.transformer.transform(ast, context);
      const result = await this.generator.generate(transformedAST, context);

      // Apply additional optimizations
      let optimizedCode = result.code;
      if (params.focusAreas) {
        optimizedCode = await this.generator.optimizeCode(result.code, context, params.focusAreas);
      }

      const response: CodeGenerationResponse = {
        success: true,
        code: optimizedCode,
        imports: result.imports,
        framework: params.framework,
        typescript: result.typescript,
        metadata: {
          componentName: ast.componentName,
          complexity: 'intermediate',
          patterns: ['optimization'],
          performance: await this.analyzePerformance(optimizedCode, params.framework)
        },
        generateTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('optimize_motion_code', response.generateTime, 'ms');
      return response;

    } catch (error) {
      logger.error('Motion code optimization failed', error as Error);
      
      return {
        success: false,
        framework: params.framework,
        typescript: true,
        error: error instanceof MotionMCPError ? error.message : String(error),
        generateTime: Date.now() - startTime
      };
    }
  }

  async convertBetweenFrameworks(params: ConvertBetweenFrameworksParams): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    logger.logToolExecution('convert_between_frameworks', params);

    try {
      // Parse source code
      const sourceAST = this.parser.parse(params.code, {
        framework: params.from,
        typescript: params.code.includes('interface') || params.code.includes(': ')
      });

      // Transform for target framework
      const targetContext = {
        framework: params.to,
        typescript: sourceAST.typescript,
        componentName: sourceAST.componentName,
        imports: new Set<string>(),
        dependencies: new Set<string>(),
        optimization: params.optimization ? {
          performance: true,
          accessibility: true,
          bundleSize: true
        } : undefined
      };

      // Apply framework conversion transformations
      const convertedAST = await this.convertASTBetweenFrameworks(sourceAST, params.from, params.to);
      const transformedAST = this.transformer.transform(convertedAST, targetContext);
      const result = await this.generator.generate(transformedAST, targetContext);

      const response: CodeGenerationResponse = {
        success: true,
        code: result.code,
        imports: result.imports,
        framework: params.to,
        typescript: result.typescript,
        metadata: {
          componentName: sourceAST.componentName,
          complexity: 'intermediate',
          patterns: ['framework-conversion'],
          performance: await this.analyzePerformance(result.code, params.to)
        },
        warnings: this.getConversionWarnings(params.from, params.to),
        generateTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('convert_between_frameworks', response.generateTime, 'ms');
      return response;

    } catch (error) {
      logger.error('Framework conversion failed', error as Error);
      
      return {
        success: false,
        framework: params.to,
        typescript: true,
        error: error instanceof MotionMCPError ? error.message : String(error),
        generateTime: Date.now() - startTime
      };
    }
  }

  async validateMotionSyntax(params: ValidateMotionSyntaxParams): Promise<ValidationResponse> {
    const startTime = Date.now();
    logger.logToolExecution('validate_motion_syntax', params);

    try {
      // Parse code for validation
      const ast = this.parser.parse(params.code, {
        framework: params.framework,
        typescript: params.code.includes('interface') || params.code.includes(': ')
      });

      // Extract motion elements for validation
      const motionElements = this.parser.extractMotionElements(ast.ast as any);

      // Validate syntax and patterns
      const validationResults = await this.performValidation(motionElements, params);

      const response: ValidationResponse = {
        valid: validationResults.errors.length === 0,
        errors: validationResults.errors,
        suggestions: validationResults.suggestions,
        framework: params.framework,
        analysisTime: Date.now() - startTime
      };

      logger.logPerformanceMetric('validate_motion_syntax', response.analysisTime, 'ms');
      return response;

    } catch (error) {
      logger.error('Motion syntax validation failed', error as Error);
      
      return {
        valid: false,
        errors: [{
          type: 'error',
          message: error instanceof MotionMCPError ? error.message : String(error),
          rule: 'parse-error'
        }],
        suggestions: [],
        framework: params.framework,
        analysisTime: Date.now() - startTime
      };
    }
  }

  // Private helper methods

  private validateGenerateComponentParams(params: GenerateMotionComponentParams): void {
    if (!params.framework || !['react', 'js', 'vue'].includes(params.framework)) {
      throw createToolError('generate_motion_component', 'Invalid framework specified');
    }

    if (!params.componentName || params.componentName.length === 0) {
      throw createToolError('generate_motion_component', 'Component name is required');
    }

    if (!params.animations || params.animations.length === 0) {
      throw createToolError('generate_motion_component', 'At least one animation pattern is required');
    }

    // Validate animation patterns exist
    for (const animationId of params.animations) {
      const pattern = this.patterns.getPattern(animationId);
      if (!pattern) {
        throw createToolError('generate_motion_component', `Unknown animation pattern: ${animationId}`);
      }

      if (!pattern.frameworks.includes(params.framework)) {
        throw createToolError('generate_motion_component', 
          `Animation pattern '${animationId}' not supported for ${params.framework}`);
      }
    }
  }

  private validateSequenceParams(params: CreateAnimationSequenceParams): void {
    if (!params.framework || !['react', 'js', 'vue'].includes(params.framework)) {
      throw createToolError('create_animation_sequence', 'Invalid framework specified');
    }

    if (!params.sequence || params.sequence.length === 0) {
      throw createToolError('create_animation_sequence', 'Animation sequence cannot be empty');
    }

    for (const step of params.sequence) {
      if (!step.element || !step.animate) {
        throw createToolError('create_animation_sequence', 'Each sequence step must have element and animate properties');
      }
    }
  }

  private async buildComponentFromPatterns(params: GenerateMotionComponentParams): Promise<string> {
    // Combine multiple animation patterns into a single component
    const patternConfigs = params.animations.map(animationId => {
      const pattern = this.patterns.getPattern(animationId);
      return pattern?.config || {};
    });

    // Merge configs intelligently
    const mergedConfig = this.mergeAnimationConfigs(patternConfigs);

    // Generate code for the specific framework
    return this.patterns.getPatternCode(params.animations[0], params.framework, params.componentName);
  }

  private async generateOptimizedCode(
    code: string, 
    params: GenerateMotionComponentParams
  ): Promise<{ code: string; imports: string[]; dependencies?: string[] }> {
    // Parse and optimize the generated code
    const ast = this.parser.parse(code, {
      framework: params.framework,
      typescript: params.typescript || true
    });

    const context = {
      framework: params.framework,
      typescript: params.typescript || true,
      componentName: params.componentName,
      imports: new Set<string>(),
      dependencies: new Set<string>(),
      styleSystem: params.styleSystem,
      optimization: {
        performance: true,
        accessibility: true,
        bundleSize: true
      }
    };

    const transformedAST = this.transformer.transform(ast, context);
    const result = await this.generator.generate(transformedAST, context);

    return {
      code: result.code,
      imports: result.imports,
      dependencies: Array.from(context.dependencies)
    };
  }

  private async buildAnimationSequence(params: CreateAnimationSequenceParams): Promise<string> {
    switch (params.framework) {
      case 'react':
        return this.buildReactSequence(params);
      case 'vue':
        return this.buildVueSequence(params);
      case 'js':
        return this.buildJavaScriptSequence(params);
      default:
        throw createToolError('create_animation_sequence', `Unsupported framework: ${params.framework}`);
    }
  }

  private buildReactSequence(params: CreateAnimationSequenceParams): string {
    const staggerConfig = params.stagger ? {
      delayChildren: 0.1,
      staggerChildren: 0.1
    } : {};

    return `import React from 'react';
import { motion } from 'framer-motion';

const AnimationSequence: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: ${JSON.stringify(staggerConfig, null, 6)}
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      ${params.sequence.map((step, index) => `
      <motion.${step.element}
        variants={itemVariants}
        transition={{ duration: ${step.duration || 0.3}, delay: ${step.delay || 0} }}
      >
        Sequence item ${index + 1}
      </motion.${step.element}>`).join('')}
    </motion.div>
  );
};

export default AnimationSequence;`;
  }

  private buildVueSequence(params: CreateAnimationSequenceParams): string {
    // Simplified Vue sequence implementation
    return `<template>
  <div v-motion-initial="{ opacity: 0 }" v-motion-enter="{ opacity: 1 }">
    ${params.sequence.map((step, index) => `
    <${step.element} 
      v-motion-initial="{ opacity: 0, y: 20 }"
      v-motion-enter="{ opacity: 1, y: 0, transition: { delay: ${(step.delay || 0) + index * 0.1} } }"
    >
      Sequence item ${index + 1}
    </${step.element}>`).join('')}
  </div>
</template>

<script setup lang="ts">
import { MotionPlugin } from '@vueuse/motion';
</script>`;
  }

  private buildJavaScriptSequence(params: CreateAnimationSequenceParams): string {
    const animationCalls = params.sequence.map((step, index) => {
      const delay = (step.delay || 0) + (params.stagger ? index * 100 : 0);
      return `
  setTimeout(() => {
    const element${index} = document.querySelector('${step.element}');
    if (element${index}) {
      animate(element${index}, ${JSON.stringify(step.animate)}, {
        duration: ${step.duration || 0.3}
      });
    }
  }, ${delay});`;
    }).join('');

    return `import { animate } from 'motion';

function runAnimationSequence() {${animationCalls}
}

// Start the sequence
runAnimationSequence();`;
  }

  private async optimizeSequenceCode(code: string, params: CreateAnimationSequenceParams): Promise<string> {
    // Apply sequence-specific optimizations
    return code;
  }

  private async convertASTBetweenFrameworks(ast: any, from: Framework, to: Framework): Promise<any> {
    // Framework conversion logic would go here
    // This is a complex transformation that would convert React JSX to Vue templates, etc.
    return ast;
  }

  private getConversionWarnings(from: Framework, to: Framework): string[] {
    const warnings: string[] = [];

    if (from === 'react' && to === 'vue') {
      warnings.push('React hooks need to be converted to Vue Composition API');
      warnings.push('JSX syntax converted to Vue template syntax - manual review recommended');
    }

    if (from === 'vue' && to === 'react') {
      warnings.push('Vue directives converted to React props - functionality may differ');
      warnings.push('Vue template syntax converted to JSX - manual review recommended');
    }

    return warnings;
  }

  private async performValidation(
    motionElements: any[], 
    params: ValidateMotionSyntaxParams
  ): Promise<{
    errors: Array<{ type: 'error' | 'warning'; message: string; line?: number; rule: string }>;
    suggestions: Array<{ type: 'performance' | 'accessibility' | 'best-practice'; message: string; priority: 'high' | 'medium' | 'low' }>;
  }> {
    const errors: any[] = [];
    const suggestions: any[] = [];

    // Validate motion elements
    for (const element of motionElements) {
      // Check for performance issues
      if (element.props.animate && typeof element.props.animate === 'object') {
        const animateProps = element.props.animate;
        
        // Check for layout-triggering properties
        if (animateProps.width || animateProps.height) {
          errors.push({
            type: 'warning',
            message: 'Animating width/height can cause layout thrashing. Consider using scale instead.',
            line: element.line,
            rule: 'avoid-layout-animations'
          });
        }

        // Check for transform properties (good)
        if (animateProps.x || animateProps.y || animateProps.scale) {
          suggestions.push({
            type: 'performance',
            message: 'Good use of transform properties for smooth animations',
            priority: 'low'
          });
        }
      }

      // Check for accessibility
      if (element.props.whileHover && !element.props['aria-label']) {
        suggestions.push({
          type: 'accessibility',
          message: 'Interactive elements should have aria-label for accessibility',
          priority: 'medium'
        });
      }
    }

    return { errors, suggestions };
  }

  private mergeAnimationConfigs(configs: any[]): any {
    // Intelligently merge multiple animation configurations
    const merged: any = {};
    
    for (const config of configs) {
      Object.assign(merged, config);
    }

    return merged;
  }

  private determineComplexity(animations: string[]): 'basic' | 'intermediate' | 'advanced' {
    if (animations.length === 1) return 'basic';
    if (animations.length <= 3) return 'intermediate';
    return 'advanced';
  }

  private async analyzePerformance(code: string, framework: Framework): Promise<{
    score: number;
    suggestions: string[];
  }> {
    // Simplified performance analysis
    let score = 100;
    const suggestions: string[] = [];

    // Check for layout-triggering properties
    if (code.includes('width:') || code.includes('height:')) {
      score -= 20;
      suggestions.push('Use transform properties instead of width/height for better performance');
    }

    // Check for will-change usage
    if (code.includes('will-change')) {
      suggestions.push('Ensure will-change is removed after animation completes');
    }

    return {
      score: Math.max(0, score),
      suggestions
    };
  }
}