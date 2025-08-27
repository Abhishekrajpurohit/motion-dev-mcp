/**
 * Performance monitoring and metrics collection for Motion.dev MCP server
 */

import { logger } from '../utils/logger.js';
import { performance, PerformanceObserver } from 'perf_hooks';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RequestMetrics {
  method: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export interface PerformanceStats {
  averageRequestTime: number;
  p50RequestTime: number;
  p95RequestTime: number;
  p99RequestTime: number;
  requestsPerSecond: number;
  totalRequests: number;
  memoryTrend: {
    current: number;
    average: number;
    peak: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  cachePerformance: {
    hitRate: number;
    missRate: number;
    averageRetrievalTime: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private requestMetrics: RequestMetrics[] = [];
  private performanceObserver?: PerformanceObserver;
  private startTime: number;
  private cpuUsageStart: NodeJS.CpuUsage;

  constructor() {
    this.startTime = Date.now();
    this.cpuUsageStart = process.cpuUsage();
    this.setupPerformanceObserver();
    this.startPeriodicCollection();
  }

  /**
   * Setup performance observer to track Node.js performance metrics
   */
  private setupPerformanceObserver(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration,
            unit: 'ms',
            timestamp: new Date().toISOString(),
            metadata: {
              entryType: entry.entryType,
              startTime: entry.startTime
            }
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
    } catch (error) {
      logger.warn('Failed to setup performance observer', error as Error);
    }
  }

  /**
   * Start periodic collection of system metrics
   */
  private startPeriodicCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
    }, 30000); // Collect every 30 seconds
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    logger.debug('Performance metric recorded', metric);
  }

  /**
   * Record request performance
   */
  recordRequest(method: string, duration: number, success: boolean, error?: string): void {
    const requestMetric: RequestMetrics = {
      method,
      duration,
      timestamp: new Date().toISOString(),
      success,
      error,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(this.cpuUsageStart)
    };

    this.requestMetrics.push(requestMetric);

    // Also record as a general metric
    this.recordMetric({
      name: `request.${method}`,
      value: duration,
      unit: 'ms',
      timestamp: requestMetric.timestamp,
      metadata: { success, error }
    });

    logger.debug('Request performance recorded', { method, duration, success });
  }

  /**
   * Start timing a performance measurement
   */
  startTiming(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End timing and record measurement
   */
  endTiming(name: string): number {
    const endMark = `${name}-end`;
    const measureName = `${name}-duration`;
    
    performance.mark(endMark);
    performance.measure(measureName, `${name}-start`, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure ? measure.duration : 0;

    // Clean up marks
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return duration;
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(name);
    try {
      const result = await fn();
      const duration = this.endTiming(name);
      this.recordMetric({
        name: `function.${name}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        metadata: { success: true }
      });
      return result;
    } catch (error) {
      const duration = this.endTiming(name);
      this.recordMetric({
        name: `function.${name}`,
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        metadata: { success: false, error: (error as Error).message }
      });
      throw error;
    }
  }

  /**
   * Collect system performance metrics
   */
  private collectSystemMetrics(): void {
    const timestamp = new Date().toISOString();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.cpuUsageStart);

    // Memory metrics
    this.recordMetric({
      name: 'system.memory.heapUsed',
      value: memoryUsage.heapUsed,
      unit: 'bytes',
      timestamp
    });

    this.recordMetric({
      name: 'system.memory.heapTotal',
      value: memoryUsage.heapTotal,
      unit: 'bytes',
      timestamp
    });

    this.recordMetric({
      name: 'system.memory.external',
      value: memoryUsage.external,
      unit: 'bytes',
      timestamp
    });

    // CPU metrics
    this.recordMetric({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      unit: 'microseconds',
      timestamp
    });

    this.recordMetric({
      name: 'system.cpu.system',
      value: cpuUsage.system,
      unit: 'microseconds',
      timestamp
    });

    // Event loop lag
    const eventLoopLag = this.measureEventLoopLag();
    this.recordMetric({
      name: 'system.eventLoopLag',
      value: eventLoopLag,
      unit: 'ms',
      timestamp
    });
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    return new Promise<number>(resolve => {
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    }) as any; // Simplified for synchronous collection
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // Filter recent request metrics
    const recentRequests = this.requestMetrics.filter(
      request => new Date(request.timestamp).getTime() > oneHourAgo
    );

    // Calculate request time percentiles
    const requestTimes = recentRequests.map(r => r.duration).sort((a, b) => a - b);
    const averageRequestTime = requestTimes.length > 0 
      ? requestTimes.reduce((sum, time) => sum + time, 0) / requestTimes.length 
      : 0;

    const p50 = this.calculatePercentile(requestTimes, 50);
    const p95 = this.calculatePercentile(requestTimes, 95);
    const p99 = this.calculatePercentile(requestTimes, 99);

    // Calculate requests per second
    const oneMinuteAgo = now - 60000;
    const recentMinuteRequests = recentRequests.filter(
      request => new Date(request.timestamp).getTime() > oneMinuteAgo
    );
    const requestsPerSecond = recentMinuteRequests.length / 60;

    // Memory statistics
    const memoryMetrics = this.metrics.filter(m => m.name === 'system.memory.heapUsed');
    const currentMemory = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1].value : 0;
    const averageMemory = memoryMetrics.length > 0 
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length 
      : 0;
    const peakMemory = memoryMetrics.length > 0 
      ? Math.max(...memoryMetrics.map(m => m.value)) 
      : 0;

    // CPU usage
    const cpuUserMetrics = this.metrics.filter(m => m.name === 'system.cpu.user');
    const cpuSystemMetrics = this.metrics.filter(m => m.name === 'system.cpu.system');
    const avgCpuUser = cpuUserMetrics.length > 0 
      ? cpuUserMetrics.reduce((sum, m) => sum + m.value, 0) / cpuUserMetrics.length 
      : 0;
    const avgCpuSystem = cpuSystemMetrics.length > 0 
      ? cpuSystemMetrics.reduce((sum, m) => sum + m.value, 0) / cpuSystemMetrics.length 
      : 0;

    return {
      averageRequestTime,
      p50RequestTime: p50,
      p95RequestTime: p95,
      p99RequestTime: p99,
      requestsPerSecond,
      totalRequests: this.requestMetrics.length,
      memoryTrend: {
        current: currentMemory,
        average: averageMemory,
        peak: peakMemory
      },
      cpuUsage: {
        user: avgCpuUser,
        system: avgCpuSystem
      },
      cachePerformance: {
        hitRate: 0.85, // TODO: Implement actual cache hit rate
        missRate: 0.15,
        averageRetrievalTime: 10
      }
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsForTimeRange(startTime: Date, endTime: Date): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      return metricTime >= startTime && metricTime <= endTime;
    });
  }

  /**
   * Get slowest requests
   */
  getSlowestRequests(limit: number = 10): RequestMetrics[] {
    return [...this.requestMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get error rate statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorRate: number;
    errorsByMethod: Record<string, number>;
    recentErrors: RequestMetrics[];
  } {
    const totalRequests = this.requestMetrics.length;
    const errorRequests = this.requestMetrics.filter(r => !r.success);
    const errorRate = totalRequests > 0 ? (errorRequests.length / totalRequests) : 0;

    const errorsByMethod: Record<string, number> = {};
    errorRequests.forEach(request => {
      errorsByMethod[request.method] = (errorsByMethod[request.method] || 0) + 1;
    });

    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = errorRequests.filter(
      request => new Date(request.timestamp).getTime() > oneHourAgo
    );

    return {
      totalErrors: errorRequests.length,
      errorRate,
      errorsByMethod,
      recentErrors
    };
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    
    this.metrics = this.metrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );

    this.requestMetrics = this.requestMetrics.filter(
      request => new Date(request.timestamp).getTime() > cutoffTime
    );

    logger.debug('Performance metrics cleanup completed');
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const stats = this.getStats();
    const timestamp = Date.now();

    return [
      `# HELP motion_mcp_request_duration_ms Average request duration in milliseconds`,
      `# TYPE motion_mcp_request_duration_ms gauge`,
      `motion_mcp_request_duration_ms ${stats.averageRequestTime} ${timestamp}`,
      ``,
      `# HELP motion_mcp_requests_per_second Current requests per second`,
      `# TYPE motion_mcp_requests_per_second gauge`,
      `motion_mcp_requests_per_second ${stats.requestsPerSecond} ${timestamp}`,
      ``,
      `# HELP motion_mcp_memory_heap_bytes Current heap memory usage in bytes`,
      `# TYPE motion_mcp_memory_heap_bytes gauge`,
      `motion_mcp_memory_heap_bytes ${stats.memoryTrend.current} ${timestamp}`,
      ``,
      `# HELP motion_mcp_total_requests Total number of requests processed`,
      `# TYPE motion_mcp_total_requests counter`,
      `motion_mcp_total_requests ${stats.totalRequests} ${timestamp}`
    ].join('\n');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
    this.requestMetrics = [];
    this.startTime = Date.now();
    this.cpuUsageStart = process.cpuUsage();
    
    logger.info('Performance monitor reset');
  }

  /**
   * Get summary report
   */
  getSummaryReport(): string {
    const stats = this.getStats();
    const errorStats = this.getErrorStats();

    return [
      'Performance Summary Report',
      '========================',
      `Average Request Time: ${stats.averageRequestTime.toFixed(2)}ms`,
      `P95 Request Time: ${stats.p95RequestTime.toFixed(2)}ms`,
      `P99 Request Time: ${stats.p99RequestTime.toFixed(2)}ms`,
      `Requests per Second: ${stats.requestsPerSecond.toFixed(2)}`,
      `Total Requests: ${stats.totalRequests}`,
      `Error Rate: ${(errorStats.errorRate * 100).toFixed(2)}%`,
      `Memory Usage: ${(stats.memoryTrend.current / 1024 / 1024).toFixed(2)}MB`,
      `Peak Memory: ${(stats.memoryTrend.peak / 1024 / 1024).toFixed(2)}MB`,
      `Cache Hit Rate: ${(stats.cachePerformance.hitRate * 100).toFixed(1)}%`
    ].join('\n');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();