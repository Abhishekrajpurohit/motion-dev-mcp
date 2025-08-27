/**
 * Health monitoring and metrics collection for Motion.dev MCP server
 */

import { logger } from '../utils/logger.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    timestamp: string;
    responseTime?: number;
  }[];
}

export interface ServerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  peakMemoryUsage: number;
  cacheHitRate: number;
  uptime: number;
  lastRequestTime: string;
  requestsPerMinute: number;
  errors: {
    timestamp: string;
    error: string;
    method?: string;
  }[];
}

export class HealthMonitor {
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private successCount: number = 0;
  private responseTimeHistory: number[] = [];
  private peakMemoryUsage: number = 0;
  private lastRequestTime: string = '';
  private recentErrors: Array<{ timestamp: string; error: string; method?: string }> = [];
  private requestTimestamps: number[] = [];

  constructor() {
    this.startTime = Date.now();
    
    // Start periodic cleanup of old data
    setInterval(() => {
      this.cleanupOldData();
    }, 60000); // Clean up every minute
  }

  /**
   * Record a request
   */
  recordRequest(method?: string, responseTime?: number): void {
    this.requestCount++;
    this.lastRequestTime = new Date().toISOString();
    this.requestTimestamps.push(Date.now());

    if (responseTime !== undefined) {
      this.responseTimeHistory.push(responseTime);
      
      // Keep only last 100 response times for average calculation
      if (this.responseTimeHistory.length > 100) {
        this.responseTimeHistory.shift();
      }
    }

    // Update peak memory usage
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > this.peakMemoryUsage) {
      this.peakMemoryUsage = currentMemory;
    }

    logger.debug('Request recorded', { method, responseTime, requestCount: this.requestCount });
  }

  /**
   * Record a successful request
   */
  recordSuccess(method?: string, responseTime?: number): void {
    this.successCount++;
    this.recordRequest(method, responseTime);
  }

  /**
   * Record a failed request
   */
  recordError(error: string, method?: string, responseTime?: number): void {
    this.errorCount++;
    this.recentErrors.push({
      timestamp: new Date().toISOString(),
      error,
      method
    });

    // Keep only last 50 errors
    if (this.recentErrors.length > 50) {
      this.recentErrors.shift();
    }

    this.recordRequest(method, responseTime);

    logger.warn('Request error recorded', { error, method, errorCount: this.errorCount });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const timestamp = new Date().toISOString();

    // Perform health checks
    const checks = this.performHealthChecks();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const failedChecks = checks.filter(check => check.status === 'fail');

    if (failedChecks.length > 0) {
      status = failedChecks.length > 2 ? 'unhealthy' : 'degraded';
    }

    // Check error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) : 0;
    if (errorRate > 0.1) { // More than 10% error rate
      status = errorRate > 0.25 ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      uptime,
      memoryUsage,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      lastError: this.recentErrors.length > 0 ? this.recentErrors[this.recentErrors.length - 1].error : undefined,
      timestamp,
      checks
    };
  }

  /**
   * Get detailed server metrics
   */
  getMetrics(): ServerMetrics {
    const uptime = Date.now() - this.startTime;
    const averageResponseTime = this.responseTimeHistory.length > 0 
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      : 0;

    // Calculate requests per minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    const requestsPerMinute = recentRequests.length;

    // Calculate cache hit rate (placeholder - would be implemented with actual cache)
    const cacheHitRate = 0.85; // TODO: Implement actual cache hit rate calculation

    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.errorCount,
      averageResponseTime,
      peakMemoryUsage: this.peakMemoryUsage,
      cacheHitRate,
      uptime,
      lastRequestTime: this.lastRequestTime,
      requestsPerMinute,
      errors: [...this.recentErrors]
    };
  }

  /**
   * Perform various health checks
   */
  private performHealthChecks(): HealthStatus['checks'] {
    const checks: HealthStatus['checks'] = [];
    const timestamp = new Date().toISOString();

    // Memory usage check
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    checks.push({
      name: 'memory-usage',
      status: memoryUsageMB < 512 ? 'pass' : 'fail', // Fail if using more than 512MB
      message: `Heap memory usage: ${memoryUsageMB.toFixed(2)}MB`,
      timestamp
    });

    // Response time check
    const avgResponseTime = this.responseTimeHistory.length > 0 
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      : 0;
    checks.push({
      name: 'response-time',
      status: avgResponseTime < 2000 ? 'pass' : 'fail', // Fail if average response time > 2s
      message: `Average response time: ${avgResponseTime.toFixed(2)}ms`,
      timestamp,
      responseTime: avgResponseTime
    });

    // Error rate check
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) : 0;
    checks.push({
      name: 'error-rate',
      status: errorRate < 0.05 ? 'pass' : 'fail', // Fail if error rate > 5%
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
      timestamp
    });

    // Uptime check
    const uptime = Date.now() - this.startTime;
    checks.push({
      name: 'uptime',
      status: uptime > 0 ? 'pass' : 'fail',
      message: `Uptime: ${(uptime / 1000).toFixed(0)} seconds`,
      timestamp
    });

    // Recent errors check
    const recentErrorsCount = this.recentErrors.filter(
      error => Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
    ).length;
    checks.push({
      name: 'recent-errors',
      status: recentErrorsCount < 10 ? 'pass' : 'fail', // Fail if more than 10 errors in last 5 minutes
      message: `Recent errors (5min): ${recentErrorsCount}`,
      timestamp
    });

    // Request rate check
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    const requestsPerMinute = recentRequests.length;
    checks.push({
      name: 'request-rate',
      status: requestsPerMinute < 1000 ? 'pass' : 'fail', // Fail if more than 1000 requests per minute
      message: `Requests per minute: ${requestsPerMinute}`,
      timestamp
    });

    return checks;
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    // Keep only last hour of request timestamps
    const oneHourAgo = Date.now() - 3600000;
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneHourAgo);

    // Keep only last 50 errors
    if (this.recentErrors.length > 50) {
      this.recentErrors = this.recentErrors.slice(-50);
    }

    // Keep only last 100 response times
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory = this.responseTimeHistory.slice(-100);
    }

    logger.debug('Health monitor data cleanup completed');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
    this.responseTimeHistory = [];
    this.peakMemoryUsage = 0;
    this.lastRequestTime = '';
    this.recentErrors = [];
    this.requestTimestamps = [];

    logger.info('Health monitor metrics reset');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    status: string;
    uptime: string;
    requests: number;
    errors: number;
    successRate: string;
    avgResponseTime: string;
    memoryUsage: string;
  } {
    const uptime = Date.now() - this.startTime;
    const successRate = this.requestCount > 0 ? ((this.successCount / this.requestCount) * 100) : 100;
    const avgResponseTime = this.responseTimeHistory.length > 0 
      ? this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length
      : 0;
    const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
      status: this.getHealthStatus().status,
      uptime: `${Math.floor(uptime / 1000)}s`,
      requests: this.requestCount,
      errors: this.errorCount,
      successRate: `${successRate.toFixed(1)}%`,
      avgResponseTime: `${avgResponseTime.toFixed(0)}ms`,
      memoryUsage: `${memoryUsageMB.toFixed(1)}MB`
    };
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();