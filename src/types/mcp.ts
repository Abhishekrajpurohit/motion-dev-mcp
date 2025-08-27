/**
 * MCP protocol type definitions
 */

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: MCPError;
  metadata?: ResponseMetadata;
}

export interface ResourceResponse<T = any> {
  uri: string;
  mimeType?: string;
  data: T;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  timestamp: string;
  cached: boolean;
  performance: {
    executionTime: number;
    cacheHit?: boolean;
    networkRequests?: number;
  };
  version: string;
}

export interface MCPError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number;
  size: number;
}

export interface ServerCapabilities {
  tools: ToolDefinition[];
  resources: ResourceDefinition[];
  prompts?: any[];
}

export interface ClientRequest {
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface ServerResponse {
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: string;
  metrics?: Record<string, number>;
}