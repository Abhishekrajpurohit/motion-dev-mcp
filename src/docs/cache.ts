/**
 * Intelligent caching system with TTL and invalidation for Motion.dev MCP server
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { CacheMetadata } from '../types/mcp.js';
import { 
  createCacheError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CachedItem<T = any> {
  data: T;
  metadata: CacheMetadata;
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  oldestItem: string;
  newestItem: string;
}

export class DocumentationCache {
  private readonly cacheDir: string;
  private readonly defaultTTL: number;
  private readonly maxCacheSize: number;
  private memoryCache: Map<string, CachedItem> = new Map();
  private hits: number = 0;
  private misses: number = 0;

  constructor(
    cacheDir: string = './docs/cache',
    defaultTTL: number = 24 * 60 * 60 * 1000, // 24 hours
    maxCacheSize: number = 100 * 1024 * 1024 // 100MB
  ) {
    this.cacheDir = cacheDir;
    this.defaultTTL = defaultTTL;
    this.maxCacheSize = maxCacheSize;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadMemoryCache();
      logger.info('Documentation cache initialized', {
        cacheDir: this.cacheDir,
        defaultTTL: this.defaultTTL,
        maxCacheSize: this.maxCacheSize
      });
    } catch (error) {
      logger.error('Failed to initialize cache', error as Error);
      throw createCacheError('initialize', this.cacheDir, (error as Error).message);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.generateCacheKey(key);
    
    try {
      // Check memory cache first
      const memoryItem = this.memoryCache.get(cacheKey);
      if (memoryItem && !this.isExpired(memoryItem.metadata)) {
        this.hits++;
        logger.logCacheOperation('hit', cacheKey, { source: 'memory' });
        return memoryItem.data as T;
      }

      // Check disk cache
      const diskItem = await this.getFromDisk<T>(cacheKey);
      if (diskItem && !this.isExpired(diskItem.metadata)) {
        // Promote to memory cache
        this.memoryCache.set(cacheKey, diskItem);
        this.hits++;
        logger.logCacheOperation('hit', cacheKey, { source: 'disk' });
        return diskItem.data;
      }

      // Cache miss
      this.misses++;
      logger.logCacheOperation('miss', cacheKey);
      return null;

    } catch (error) {
      logger.error(`Cache get failed for key: ${cacheKey}`, error as Error);
      this.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    const serializedValue = JSON.stringify(value);
    const metadata: CacheMetadata = {
      key: cacheKey,
      timestamp: Date.now(),
      ttl: expiresAt,
      size: Buffer.byteLength(serializedValue, 'utf8')
    };

    const cachedItem: CachedItem<T> = {
      data: value,
      metadata
    };

    try {
      // Store in memory cache
      this.memoryCache.set(cacheKey, cachedItem);
      
      // Store on disk
      await this.setToDisk(cacheKey, cachedItem);
      
      // Check cache size and cleanup if needed
      await this.performCleanupIfNeeded();
      
      logger.logCacheOperation('write', cacheKey, {
        size: metadata.size,
        ttl: ttl || this.defaultTTL
      });

    } catch (error) {
      logger.error(`Cache set failed for key: ${cacheKey}`, error as Error);
      throw createCacheError('write', cacheKey, (error as Error).message);
    }
  }

  async invalidate(key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    
    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from disk cache
      const diskPath = this.getDiskPath(cacheKey);
      try {
        await fs.unlink(diskPath);
      } catch (error) {
        // File might not exist, which is fine
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
      
      logger.logCacheOperation('invalidate', cacheKey);

    } catch (error) {
      logger.error(`Cache invalidation failed for key: ${cacheKey}`, error as Error);
      throw createCacheError('invalidate', cacheKey, (error as Error).message);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear disk cache
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(join(this.cacheDir, file)))
      );
      
      // Reset stats
      this.hits = 0;
      this.misses = 0;
      
      logger.info('Cache cleared completely');

    } catch (error) {
      logger.error('Failed to clear cache', error as Error);
      throw createCacheError('clear', 'all', (error as Error).message);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;
      let oldestItem = '';
      let newestItem = '';

      for (const file of files) {
        try {
          const filePath = join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;

          // Read metadata to get timestamps
          const content = await fs.readFile(filePath, 'utf8');
          const cached = JSON.parse(content) as CachedItem;
          
          if (cached.metadata.timestamp < oldestTimestamp) {
            oldestTimestamp = cached.metadata.timestamp;
            oldestItem = file;
          }
          
          if (cached.metadata.timestamp > newestTimestamp) {
            newestTimestamp = cached.metadata.timestamp;
            newestItem = file;
          }
        } catch (error) {
          // Skip corrupted files
          logger.warn(`Skipping corrupted cache file: ${file}`);
        }
      }

      const totalRequests = this.hits + this.misses;
      const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

      return {
        totalItems: files.length,
        totalSize,
        hitRate,
        oldestItem,
        newestItem
      };

    } catch (error) {
      logger.error('Failed to get cache stats', error as Error);
      throw createCacheError('stats', 'all', (error as Error).message);
    }
  }

  private async loadMemoryCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let loadedCount = 0;

      for (const file of files) {
        try {
          const filePath = join(this.cacheDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const cachedItem = JSON.parse(content) as CachedItem;

          if (!this.isExpired(cachedItem.metadata)) {
            this.memoryCache.set(file, cachedItem);
            loadedCount++;
          } else {
            // Remove expired file
            await fs.unlink(filePath);
          }
        } catch (error) {
          logger.warn(`Failed to load cache file: ${file}`, { error: (error as Error).message });
        }
      }

      logger.debug(`Loaded ${loadedCount} items into memory cache`);

    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error('Failed to load memory cache', error as Error);
      }
    }
  }

  private async getFromDisk<T>(cacheKey: string): Promise<CachedItem<T> | null> {
    try {
      const filePath = this.getDiskPath(cacheKey);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content) as CachedItem<T>;
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to read cache file: ${cacheKey}`, error as Error);
      }
      return null;
    }
  }

  private async setToDisk<T>(cacheKey: string, cachedItem: CachedItem<T>): Promise<void> {
    const filePath = this.getDiskPath(cacheKey);
    
    // Ensure directory exists
    await fs.mkdir(dirname(filePath), { recursive: true });
    
    const content = JSON.stringify(cachedItem, null, 2);
    await fs.writeFile(filePath, content, 'utf8');
  }

  private getDiskPath(cacheKey: string): string {
    return join(this.cacheDir, `${cacheKey}.json`);
  }

  private generateCacheKey(key: string): string {
    // Create a safe filename from the key
    return key
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  private isExpired(metadata: CacheMetadata): boolean {
    return Date.now() > metadata.ttl;
  }

  private async performCleanupIfNeeded(): Promise<void> {
    try {
      const stats = await this.getStats();
      
      if (stats.totalSize > this.maxCacheSize) {
        await this.cleanupOldestItems();
      }
    } catch (error) {
      logger.warn('Cache cleanup failed', { error: (error as Error).message });
    }
  }

  private async cleanupOldestItems(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const fileInfos: Array<{ file: string; timestamp: number }> = [];

      // Get timestamps for all files
      for (const file of files) {
        try {
          const filePath = join(this.cacheDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const cached = JSON.parse(content) as CachedItem;
          fileInfos.push({
            file,
            timestamp: cached.metadata.timestamp
          });
        } catch (error) {
          // Skip corrupted files
        }
      }

      // Sort by timestamp (oldest first)
      fileInfos.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25% of files
      const toRemove = Math.floor(fileInfos.length * 0.25);
      const filesToRemove = fileInfos.slice(0, toRemove);

      for (const { file } of filesToRemove) {
        try {
          await fs.unlink(join(this.cacheDir, file));
          this.memoryCache.delete(file);
        } catch (error) {
          // Continue with cleanup even if individual files fail
        }
      }

      logger.info(`Cache cleanup completed: removed ${filesToRemove.length} old items`);

    } catch (error) {
      logger.error('Failed to cleanup old cache items', error as Error);
    }
  }

  // Utility methods for cache management
  async warmup(keys: string[]): Promise<void> {
    logger.info(`Starting cache warmup for ${keys.length} keys`);
    
    const promises = keys.map(async key => {
      try {
        await this.get(key);
      } catch (error) {
        logger.warn(`Cache warmup failed for key: ${key}`);
      }
    });

    await Promise.all(promises);
    logger.info('Cache warmup completed');
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    logger.debug('Cache stats reset');
  }
}