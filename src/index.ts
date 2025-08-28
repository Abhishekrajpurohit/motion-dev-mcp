#!/usr/bin/env node

/**
 * Motion.dev MCP Server
 * Entry point for the Model Context Protocol server providing Motion.dev capabilities
 */

import { MotionMCPServer } from './server';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    // Set log level from environment variable
    const logLevel = (process.env.LOG_LEVEL as any) || 'info';
    logger.setLogLevel(logLevel);
    
    logger.info('Starting Motion.dev MCP Server', {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform
    });

    const server = new MotionMCPServer();
    await server.start();
    
    logger.info('Motion.dev MCP Server started successfully');
    
    // Graceful shutdown handling
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await server.stop();
        logger.info('Server shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled rejection', new Error(String(reason)));
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start Motion MCP Server', error as Error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error as Error);
    process.exit(1);
  });
}

export { MotionMCPServer } from './server';