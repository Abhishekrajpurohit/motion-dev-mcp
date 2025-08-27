/**
 * Input validation utilities for Motion.dev MCP server
 */

import { z } from 'zod';
import { Framework, DocumentationCategory, AnimationType } from '../types/motion.js';
import { createValidationError, ErrorCodes } from './errors.js';

// Framework validation
export const FrameworkSchema = z.enum(['react', 'js', 'vue']);

export function validateFramework(value: unknown): Framework {
  try {
    return FrameworkSchema.parse(value);
  } catch (error) {
    throw createValidationError('framework', value, 'react | js | vue');
  }
}

// URL validation
export const UrlSchema = z.string().url().or(
  z.string().regex(/^\/docs\/[a-z-]+$/, 'Must be a valid documentation path')
);

export function validateUrl(value: unknown): string {
  try {
    return UrlSchema.parse(value);
  } catch (error) {
    throw createValidationError('url', value, 'valid URL or documentation path');
  }
}

// Documentation category validation
export const DocumentationCategorySchema = z.enum([
  'animation',
  'gestures', 
  'layout-animations',
  'scroll-animations',
  'components',
  'api-reference',
  'guides',
  'examples',
  'best-practices'
]);

export function validateDocumentationCategory(value: unknown): DocumentationCategory {
  try {
    return DocumentationCategorySchema.parse(value);
  } catch (error) {
    throw createValidationError('category', value, 'valid documentation category');
  }
}

// Animation type validation
export const AnimationTypeSchema = z.enum([
  'fadeIn', 'fadeOut',
  'slideIn', 'slideOut', 
  'scaleIn', 'scaleOut',
  'rotate', 'spin',
  'bounce', 'pulse',
  'shake', 'wobble',
  'flip', 'zoom',
  'custom'
]);

export function validateAnimationType(value: unknown): AnimationType {
  try {
    return AnimationTypeSchema.parse(value);
  } catch (error) {
    throw createValidationError('animationType', value, 'valid animation type');
  }
}

// Component name validation
export const ComponentNameSchema = z.string()
  .min(1, 'Component name cannot be empty')
  .regex(/^[A-Z][a-zA-Z0-9]*$/, 'Component name must be PascalCase');

export function validateComponentName(value: unknown): string {
  try {
    return ComponentNameSchema.parse(value);
  } catch (error) {
    throw createValidationError('componentName', value, 'PascalCase component name');
  }
}

// Complexity level validation
export const ComplexitySchema = z.enum(['basic', 'intermediate', 'advanced']);

export function validateComplexity(value: unknown): 'basic' | 'intermediate' | 'advanced' {
  try {
    return ComplexitySchema.parse(value);
  } catch (error) {
    throw createValidationError('complexity', value, 'basic | intermediate | advanced');
  }
}

// Format validation
export const FormatSchema = z.enum(['markdown', 'json', 'raw']);

export function validateFormat(value: unknown): 'markdown' | 'json' | 'raw' {
  try {
    return FormatSchema.parse(value);
  } catch (error) {
    throw createValidationError('format', value, 'markdown | json | raw');
  }
}

// Tool parameter schemas
export const GetMotionDocsParamsSchema = z.object({
  url: UrlSchema,
  format: FormatSchema.optional().default('markdown'),
  includeExamples: z.boolean().optional().default(true),
  includeApiRef: z.boolean().optional().default(true)
});

export const SearchMotionDocsParamsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  framework: FrameworkSchema.optional(),
  category: DocumentationCategorySchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

export const GetComponentApiParamsSchema = z.object({
  component: z.string().min(1, 'Component name cannot be empty'),
  framework: FrameworkSchema,
  includeProps: z.boolean().optional().default(true),
  includeExamples: z.boolean().optional().default(true)
});

export const GetExamplesByCategoryParamsSchema = z.object({
  category: z.string().min(1, 'Category cannot be empty'),
  framework: FrameworkSchema.optional(),
  complexity: ComplexitySchema.optional(),
  format: z.enum(['code-only', 'with-explanation']).optional().default('code-only')
});

export const GenerateMotionComponentParamsSchema = z.object({
  framework: FrameworkSchema,
  componentName: ComponentNameSchema,
  animations: z.array(z.string()).min(1, 'At least one animation is required'),
  props: z.array(z.string()).optional().default([]),
  typescript: z.boolean().optional().default(true)
});

export const CreateAnimationSequenceParamsSchema = z.object({
  framework: FrameworkSchema,
  sequence: z.array(z.object({
    element: z.string().min(1),
    animate: z.record(z.any()),
    delay: z.number().optional(),
    duration: z.number().optional(),
    easing: z.string().optional()
  })).min(1, 'At least one animation step is required'),
  stagger: z.boolean().optional().default(false)
});

export const OptimizeMotionCodeParamsSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  framework: FrameworkSchema,
  focusAreas: z.array(z.enum(['performance', 'accessibility', 'bundle-size'])).optional()
});

export const ConvertBetweenFrameworksParamsSchema = z.object({
  from: FrameworkSchema,
  to: FrameworkSchema,
  code: z.string().min(1, 'Code cannot be empty'),
  preserveComments: z.boolean().optional().default(true)
});

export const ValidateMotionSyntaxParamsSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  framework: FrameworkSchema,
  strict: z.boolean().optional().default(false)
});

// Validation helper function
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.input
      }));
      
      throw createValidationError('params', params, error.errors.map(e => e.message).join(', '));
    }
    throw error;
  }
}

// Resource URI validation
export function validateResourceUri(uri: string): boolean {
  const validPrefixes = [
    'motion://docs/react',
    'motion://docs/js', 
    'motion://docs/vue',
    'motion://examples',
    'motion://best-practices'
  ];
  
  return validPrefixes.some(prefix => uri.startsWith(prefix));
}

// Code validation helper
export function validateCode(code: string): boolean {
  // Basic code validation - check for minimum length and basic structure
  if (code.length < 10) return false;
  
  // Check for obvious malicious patterns
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /document\.write/,
    /innerHTML\s*=/,
    /setTimeout\s*\(/,
    /setInterval\s*\(/
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(code));
}

// Specific validation functions for MCP tools
export function validateGetMotionDocsParams(args: any): any {
  try {
    return GetMotionDocsParamsSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw createValidationError(
        firstIssue.path.join('.'),
        args,
        firstIssue.message
      );
    }
    throw createValidationError('unknown', args, String(error));
  }
}

export function validateSearchMotionDocsParams(args: any): any {
  try {
    return SearchMotionDocsParamsSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw createValidationError(
        firstIssue.path.join('.'),
        args,
        firstIssue.message
      );
    }
    throw createValidationError('unknown', args, String(error));
  }
}

export function validateGetComponentApiParams(args: any): any {
  try {
    return GetComponentApiParamsSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw createValidationError(
        firstIssue.path.join('.'),
        args,
        firstIssue.message
      );
    }
    throw createValidationError('unknown', args, String(error));
  }
}

export function validateGetExamplesByCategoryParams(args: any): any {
  try {
    return GetExamplesByCategoryParamsSchema.parse(args);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      throw createValidationError(
        firstIssue.path.join('.'),
        args,
        firstIssue.message
      );
    }
    throw createValidationError('unknown', args, String(error));
  }
}

export { z };