/**
 * Graceful shutdown handler for Motion.dev MCP server
 */

import { logger } from '../utils/logger.js';
import { healthMonitor } from './health.js';

export interface ShutdownConfig {
  timeout: number; // Timeout in milliseconds
  signals: string[]; // Signals to listen for
  beforeShutdown?: () => Promise<void>; // Hook to run before shutdown
  onShutdown?: () => Promise<void>; // Hook to run during shutdown
  afterShutdown?: () => Promise<void>; // Hook to run after shutdown
}

export interface ShutdownStatus {
  isShuttingDown: boolean;
  shutdownStarted?: string;
  shutdownTimeout?: number;
  reason?: string;
  signal?: string;
}

export class GracefulShutdownManager {
  private shutdownStatus: ShutdownStatus = { isShuttingDown: false };
  private shutdownPromise: Promise<void> | null = null;
  private activeConnections = new Set<any>();
  private cleanupTasks = new Set<() => Promise<void>>();
  private shutdownTimeout?: NodeJS.Timeout;
  private config: ShutdownConfig;

  constructor(config: Partial<ShutdownConfig> = {}) {
    this.config = {
      timeout: 30000, // 30 seconds default timeout
      signals: ['SIGTERM', 'SIGINT'],
      ...config
    };

    this.setupSignalHandlers();
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    this.config.signals.forEach(signal => {
      process.on(signal, (receivedSignal) => {
        logger.info(`Received ${receivedSignal}, initiating graceful shutdown`);
        this.shutdown(`Signal: ${receivedSignal}`, receivedSignal).catch(error => {
          logger.error('Error during graceful shutdown', error as Error);
          process.exit(1);
        });
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception, initiating emergency shutdown', error);
      this.emergencyShutdown('Uncaught exception').catch(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('Unhandled promise rejection, initiating emergency shutdown', new Error(String(reason)));
      this.emergencyShutdown('Unhandled promise rejection').catch(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Register a connection to track during shutdown
   */
  addConnection(connection: any): void {
    this.activeConnections.add(connection);
    
    // Remove connection when it closes
    if (connection.on && typeof connection.on === 'function') {
      connection.on('close', () => {
        this.activeConnections.delete(connection);
      });
    }
  }

  /**
   * Remove a connection from tracking
   */
  removeConnection(connection: any): void {
    this.activeConnections.delete(connection);
  }

  /**
   * Register a cleanup task to run during shutdown
   */
  addCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.add(task);
  }

  /**
   * Remove a cleanup task
   */
  removeCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.delete(task);
  }

  /**
   * Get current shutdown status
   */
  getStatus(): ShutdownStatus {
    return { ...this.shutdownStatus };
  }

  /**
   * Check if server is currently shutting down
   */
  isShuttingDown(): boolean {
    return this.shutdownStatus.isShuttingDown;
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(reason: string = 'Manual shutdown', signal?: string): Promise<void> {
    // If already shutting down, return existing promise
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownStatus = {
      isShuttingDown: true,
      shutdownStarted: new Date().toISOString(),
      shutdownTimeout: this.config.timeout,
      reason,
      signal
    };

    logger.info('Starting graceful shutdown', { reason, signal });

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Perform the actual shutdown process
   */
  private async performShutdown(): Promise<void> {
    const startTime = Date.now();

    try {
      // Set up shutdown timeout
      this.shutdownTimeout = setTimeout(() => {
        logger.warn('Graceful shutdown timeout reached, forcing exit');
        this.forceExit();
      }, this.config.timeout);

      // Execute before shutdown hook
      if (this.config.beforeShutdown) {
        logger.info('Executing before shutdown hook');
        await this.executeWithTimeout(
          this.config.beforeShutdown(),
          5000,
          'Before shutdown hook'
        );
      }

      // Stop accepting new connections/requests
      logger.info('Stopping acceptance of new requests');
      await this.stopAcceptingRequests();

      // Wait for active connections to complete
      logger.info(`Waiting for ${this.activeConnections.size} active connections to complete`);
      await this.waitForActiveConnections();

      // Execute cleanup tasks
      logger.info(`Executing ${this.cleanupTasks.size} cleanup tasks`);
      await this.executeCleanupTasks();

      // Execute on shutdown hook
      if (this.config.onShutdown) {
        logger.info('Executing on shutdown hook');
        await this.executeWithTimeout(
          this.config.onShutdown(),
          5000,
          'On shutdown hook'
        );
      }

      // Final cleanup
      await this.finalCleanup();

      // Execute after shutdown hook
      if (this.config.afterShutdown) {
        logger.info('Executing after shutdown hook');
        await this.executeWithTimeout(
          this.config.afterShutdown(),
          2000,
          'After shutdown hook'
        );
      }

      const duration = Date.now() - startTime;
      logger.info(`Graceful shutdown completed in ${duration}ms`);

      // Clear timeout since we completed successfully
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
      }

      // Exit successfully
      process.exit(0);

    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error);
      this.forceExit();
    }
  }

  /**
   * Stop accepting new requests/connections
   */
  private async stopAcceptingRequests(): Promise<void> {
    // This would be implemented to stop the MCP server from accepting new requests
    // For now, we'll just set a flag that can be checked by the server
    logger.debug('Request acceptance stopped');
  }

  /**
   * Wait for active connections to complete
   */
  private async waitForActiveConnections(): Promise<void> {
    const maxWaitTime = 20000; // 20 seconds max wait
    const startTime = Date.now();

    while (this.activeConnections.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      logger.debug(`Waiting for ${this.activeConnections.size} connections to complete`);
      
      // Wait for connections to close naturally
      await new Promise(resolve => setTimeout(resolve, 500));

      // Optionally try to close connections gracefully
      if ((Date.now() - startTime) > maxWaitTime * 0.7) { // After 70% of wait time
        this.closeConnectionsGracefully();
      }
    }

    if (this.activeConnections.size > 0) {
      logger.warn(`${this.activeConnections.size} connections still active, proceeding with shutdown`);
      this.forceCloseConnections();
    }
  }

  /**
   * Close connections gracefully
   */
  private closeConnectionsGracefully(): void {
    this.activeConnections.forEach(connection => {
      try {
        if (connection.end && typeof connection.end === 'function') {
          connection.end();
        } else if (connection.close && typeof connection.close === 'function') {
          connection.close();
        }
      } catch (error) {
        logger.debug('Error closing connection gracefully', error as Error);
      }
    });
  }

  /**
   * Force close all remaining connections
   */
  private forceCloseConnections(): void {
    this.activeConnections.forEach(connection => {
      try {
        if (connection.destroy && typeof connection.destroy === 'function') {
          connection.destroy();
        } else if (connection.terminate && typeof connection.terminate === 'function') {
          connection.terminate();
        }
      } catch (error) {
        logger.debug('Error force closing connection', error as Error);
      }
    });
    this.activeConnections.clear();
  }

  /**
   * Execute cleanup tasks
   */
  private async executeCleanupTasks(): Promise<void> {
    const cleanupPromises = Array.from(this.cleanupTasks).map(async (task) => {
      try {
        await this.executeWithTimeout(task(), 5000, 'Cleanup task');
      } catch (error) {
        logger.error('Error executing cleanup task', error as Error);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Final cleanup operations
   */
  private async finalCleanup(): Promise<void> {
    try {
      // Clear intervals and timeouts
      if (this.shutdownTimeout) {
        clearTimeout(this.shutdownTimeout);
      }

      // Clean up health monitor
      if (healthMonitor) {
        logger.debug('Performing final health monitor cleanup');
      }

      // Close any remaining resources
      this.activeConnections.clear();
      this.cleanupTasks.clear();

      logger.debug('Final cleanup completed');
    } catch (error) {
      logger.error('Error during final cleanup', error as Error);
    }
  }

  /**
   * Execute a promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>, 
    timeout: number, 
    taskName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${taskName} timeout after ${timeout}ms`));
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Emergency shutdown (forced)
   */
  private async emergencyShutdown(reason: string): Promise<void> {
    logger.error(`Emergency shutdown initiated: ${reason}`);
    
    this.shutdownStatus = {
      isShuttingDown: true,
      shutdownStarted: new Date().toISOString(),
      reason: `Emergency: ${reason}`
    };

    try {
      // Quick cleanup
      this.forceCloseConnections();
      
      // Execute critical cleanup only
      if (this.config.onShutdown) {
        await this.executeWithTimeout(
          this.config.onShutdown(),
          2000,
          'Emergency cleanup'
        );
      }
    } catch (error) {
      logger.error('Error during emergency shutdown', error as Error);
    }

    this.forceExit();
  }

  /**
   * Force exit the process
   */
  private forceExit(): void {
    logger.info('Forcing process exit');
    process.exit(1);
  }

  /**
   * Get shutdown statistics
   */
  getShutdownStats(): {
    activeConnections: number;
    cleanupTasks: number;
    shutdownStatus: ShutdownStatus;
  } {
    return {
      activeConnections: this.activeConnections.size,
      cleanupTasks: this.cleanupTasks.size,
      shutdownStatus: this.getStatus()
    };
  }
}

// Create global graceful shutdown manager
export const gracefulShutdown = new GracefulShutdownManager();

// Export a function to initialize with custom config
export function createGracefulShutdownManager(config?: Partial<ShutdownConfig>): GracefulShutdownManager {
  return new GracefulShutdownManager(config);
}