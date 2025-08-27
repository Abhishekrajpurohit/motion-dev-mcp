/**
 * Structured logging system for Motion.dev MCP server
 */

import { LogEntry } from '../types/mcp.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private enabledLevels: Set<LogLevel>;

  private constructor() {
    this.enabledLevels = this.getEnabledLevels();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.enabledLevels = this.getEnabledLevels();
  }

  private getEnabledLevels(): Set<LogLevel> {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    return new Set(levels.slice(currentIndex));
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.log('info', message, meta);
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, meta);
    }
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const errorMeta = error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        ...meta
      } : meta;
      
      this.log('error', message, errorMeta);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabledLevels.has(level);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };

    const formattedMessage = this.formatLogEntry(logEntry);
    
    // Use stderr for error/warn, stdout for info/debug
    // This keeps stdout clean for MCP protocol communication
    const output = level === 'error' || level === 'warn' ? console.error : console.log;
    output(formattedMessage);
  }

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, metadata } = entry;
    
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      formatted += ` ${JSON.stringify(metadata)}`;
    }
    
    return formatted;
  }

  // Performance logging helpers
  time(label: string): void {
    this.debug(`Timer started: ${label}`, { timerStart: label });
  }

  timeEnd(label: string): void {
    this.debug(`Timer ended: ${label}`, { timerEnd: label });
  }

  // Tool execution logging
  logToolStart(toolName: string, params: Record<string, any>): void {
    this.info(`Tool execution started: ${toolName}`, { 
      tool: toolName, 
      params,
      executionId: this.generateExecutionId()
    });
  }

  logToolEnd(
    toolName: string, 
    success: boolean, 
    duration: number, 
    error?: Error
  ): void {
    const level = success ? 'info' : 'error';
    const message = `Tool execution ${success ? 'completed' : 'failed'}: ${toolName}`;
    
    const meta = {
      tool: toolName,
      success,
      duration,
      ...(error && { error: { name: error.name, message: error.message } })
    };

    if (success) {
      this.info(message, meta);
    } else {
      this.error(message, error, meta);
    }
  }

  // Resource access logging
  logResourceAccess(uri: string, cached: boolean): void {
    this.debug(`Resource accessed: ${uri}`, { 
      resource: uri, 
      cached,
      accessTime: Date.now()
    });
  }

  // Tool execution logging
  logToolExecution(toolName: string, params: any): void {
    this.debug(`Tool executed: ${toolName}`, { tool: toolName, params });
  }

  // Cache operation logging
  logCacheOperation(
    operation: 'hit' | 'miss' | 'write' | 'invalidate',
    key: string,
    details?: Record<string, any>
  ): void {
    this.debug(`Cache ${operation}: ${key}`, { 
      cache: { operation, key },
      ...details
    });
  }

  // Network request logging
  logNetworkRequest(url: string, method: string, status?: number): void {
    this.debug(`Network request: ${method} ${url}`, {
      network: { url, method, status },
      timestamp: Date.now()
    });
  }

  // Performance metrics logging
  logPerformanceMetric(metric: string, value: number, unit: string): void {
    this.debug(`Performance metric: ${metric}`, {
      performance: { metric, value, unit },
      timestamp: Date.now()
    });
  }

  private generateExecutionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const logger = Logger.getInstance();