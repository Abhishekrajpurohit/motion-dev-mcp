/**
 * Comprehensive error handling system for Motion.dev MCP server
 */

import { MCPError } from '../types/mcp.js';

export class MotionMCPError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string, 
    code: string, 
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MotionMCPError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, MotionMCPError.prototype);
  }

  toMCPError(): MCPError {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }

  static fromError(error: Error, code?: string): MotionMCPError {
    if (error instanceof MotionMCPError) {
      return error;
    }
    
    return new MotionMCPError(
      error.message,
      code || ErrorCodes.INTERNAL_ERROR,
      500,
      { originalError: error.name }
    );
  }
}

export const ErrorCodes = {
  // Input validation errors
  INVALID_PARAMS: 'INVALID_PARAMS',
  MISSING_REQUIRED_PARAM: 'MISSING_REQUIRED_PARAM',
  INVALID_FRAMEWORK: 'INVALID_FRAMEWORK',
  INVALID_URL: 'INVALID_URL',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DOCUMENTATION_NOT_FOUND: 'DOCUMENTATION_NOT_FOUND',
  INVALID_RESOURCE_URI: 'INVALID_RESOURCE_URI',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  FETCH_ERROR: 'FETCH_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Cache errors
  CACHE_ERROR: 'CACHE_ERROR',
  CACHE_WRITE_ERROR: 'CACHE_WRITE_ERROR',
  CACHE_READ_ERROR: 'CACHE_READ_ERROR',
  
  // Generation errors
  GENERATION_ERROR: 'GENERATION_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
  TEMPLATE_ERROR: 'TEMPLATE_ERROR',
  AST_PARSE_ERROR: 'AST_PARSE_ERROR',
  
  // Parsing errors
  PARSE_ERROR: 'PARSE_ERROR',
  MARKDOWN_PARSE_ERROR: 'MARKDOWN_PARSE_ERROR',
  HTML_PARSE_ERROR: 'HTML_PARSE_ERROR',
  SITEMAP_PARSE_ERROR: 'SITEMAP_PARSE_ERROR',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  SHUTDOWN_ERROR: 'SHUTDOWN_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  
  // Tool errors
  TOOL_ERROR: 'TOOL_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function createValidationError(
  field: string, 
  value: any, 
  expected: string
): MotionMCPError {
  return new MotionMCPError(
    `Invalid value for field '${field}': expected ${expected}, got ${typeof value}`,
    ErrorCodes.VALIDATION_ERROR,
    400,
    { field, value, expected }
  );
}

export function createNotFoundError(resource: string, id?: string): MotionMCPError {
  const message = id 
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`;
    
  return new MotionMCPError(
    message,
    ErrorCodes.RESOURCE_NOT_FOUND,
    404,
    { resource, id }
  );
}

export function createNetworkError(url: string, cause?: string): MotionMCPError {
  return new MotionMCPError(
    `Network error accessing ${url}${cause ? `: ${cause}` : ''}`,
    ErrorCodes.NETWORK_ERROR,
    502,
    { url, cause }
  );
}

export function createCacheError(operation: string, key: string, cause?: string): MotionMCPError {
  return new MotionMCPError(
    `Cache ${operation} failed for key '${key}'${cause ? `: ${cause}` : ''}`,
    ErrorCodes.CACHE_ERROR,
    500,
    { operation, key, cause }
  );
}

export function createParseError(type: string, content: string, cause?: string): MotionMCPError {
  return new MotionMCPError(
    `Failed to parse ${type} content${cause ? `: ${cause}` : ''}`,
    ErrorCodes.PARSE_ERROR,
    400,
    { type, contentLength: content.length, cause }
  );
}

export function createToolError(toolName: string, message: string): MotionMCPError {
  return new MotionMCPError(
    `Tool '${toolName}' failed: ${message}`,
    ErrorCodes.TOOL_ERROR,
    500,
    { toolName }
  );
}

export function isMotionMCPError(error: unknown): error is MotionMCPError {
  return error instanceof MotionMCPError;
}

export function handleError(error: unknown): MCPError {
  if (isMotionMCPError(error)) {
    return error.toMCPError();
  }
  
  if (error instanceof Error) {
    return MotionMCPError.fromError(error).toMCPError();
  }
  
  return {
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    details: { error: String(error) }
  };
}