/**
 * Test suite for documentation caching system
 */

import { DocumentationCache } from '../../src/docs/cache.js';
import { generateMockMotionDoc } from '../setup.js';

describe('DocumentationCache', () => {
  let cache: DocumentationCache;
  const mockDoc = generateMockMotionDoc();

  beforeEach(() => {
    cache = new DocumentationCache({ ttl: 1000, maxSize: 100 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve documents', () => {
      const key = 'test-doc';
      cache.set(key, mockDoc);

      const retrieved = cache.get(key);
      expect(retrieved).toEqual(mockDoc);
    });

    test('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    test('should check if key exists', () => {
      const key = 'test-doc';
      expect(cache.has(key)).toBe(false);

      cache.set(key, mockDoc);
      expect(cache.has(key)).toBe(true);
    });

    test('should delete entries', () => {
      const key = 'test-doc';
      cache.set(key, mockDoc);
      expect(cache.has(key)).toBe(true);

      cache.delete(key);
      expect(cache.has(key)).toBe(false);
    });

    test('should clear all entries', () => {
      cache.set('doc1', mockDoc);
      cache.set('doc2', mockDoc);
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire entries after TTL', (done) => {
      const shortTTLCache = new DocumentationCache({ ttl: 50, maxSize: 100 });
      const key = 'test-doc';
      
      shortTTLCache.set(key, mockDoc);
      expect(shortTTLCache.has(key)).toBe(true);

      setTimeout(() => {
        expect(shortTTLCache.has(key)).toBe(false);
        done();
      }, 100);
    });

    test('should refresh TTL when accessing entry', (done) => {
      const shortTTLCache = new DocumentationCache({ ttl: 100, maxSize: 100 });
      const key = 'test-doc';
      
      shortTTLCache.set(key, mockDoc);
      
      setTimeout(() => {
        // Access the entry to refresh TTL
        shortTTLCache.get(key);
        
        setTimeout(() => {
          // Should still be available after refresh
          expect(shortTTLCache.has(key)).toBe(true);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('Size Limits', () => {
    test('should respect max size limit', () => {
      const smallCache = new DocumentationCache({ ttl: 10000, maxSize: 2 });
      
      smallCache.set('doc1', mockDoc);
      smallCache.set('doc2', mockDoc);
      expect(smallCache.size()).toBe(2);

      // Adding third entry should evict the oldest
      smallCache.set('doc3', mockDoc);
      expect(smallCache.size()).toBe(2);
      expect(smallCache.has('doc1')).toBe(false); // Should be evicted
      expect(smallCache.has('doc2')).toBe(true);
      expect(smallCache.has('doc3')).toBe(true);
    });

    test('should use LRU eviction strategy', () => {
      const smallCache = new DocumentationCache({ ttl: 10000, maxSize: 2 });
      
      smallCache.set('doc1', mockDoc);
      smallCache.set('doc2', mockDoc);
      
      // Access doc1 to make it recently used
      smallCache.get('doc1');
      
      // Add doc3, should evict doc2 (least recently used)
      smallCache.set('doc3', mockDoc);
      
      expect(smallCache.has('doc1')).toBe(true);
      expect(smallCache.has('doc2')).toBe(false);
      expect(smallCache.has('doc3')).toBe(true);
    });
  });

  describe('Cache Statistics', () => {
    test('should track hit/miss statistics', () => {
      const key = 'test-doc';
      
      // Miss
      cache.get(key);
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);

      // Hit
      cache.set(key, mockDoc);
      cache.get(key);
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);
    });

    test('should calculate hit rate correctly', () => {
      const key = 'test-doc';
      cache.set(key, mockDoc);
      
      // 3 hits, 1 miss
      cache.get(key); // hit
      cache.get(key); // hit
      cache.get(key); // hit
      cache.get('non-existent'); // miss
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.75); // 3/4 = 0.75
    });
  });

  describe('Memory Management', () => {
    test('should handle large documents', () => {
      const largeDoc = {
        ...mockDoc,
        content: 'x'.repeat(10000) // 10KB content
      };
      
      cache.set('large-doc', largeDoc);
      const retrieved = cache.get('large-doc');
      
      expect(retrieved?.content).toBe(largeDoc.content);
    });

    test('should handle special characters in keys', () => {
      const specialKey = 'docs/react-animations#section-1?param=value';
      
      cache.set(specialKey, mockDoc);
      expect(cache.has(specialKey)).toBe(true);
      expect(cache.get(specialKey)).toEqual(mockDoc);
    });
  });

  describe('Concurrent Access', () => {
    test('should handle concurrent read/write operations', async () => {
      const promises: Promise<any>[] = [];
      
      // Concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise(resolve => {
            cache.set(`doc-${i}`, { ...mockDoc, url: `test-${i}` });
            resolve(cache.get(`doc-${i}`));
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      // All operations should complete successfully
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.url).toBe(`test-${index}`);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle null/undefined values gracefully', () => {
      expect(() => cache.set('null-test', null as any)).not.toThrow();
      expect(() => cache.set('undefined-test', undefined as any)).not.toThrow();
      
      expect(cache.get('null-test')).toBeNull();
      expect(cache.get('undefined-test')).toBeUndefined();
    });

    test('should handle invalid TTL values', () => {
      expect(() => new DocumentationCache({ ttl: -1, maxSize: 100 })).toThrow();
      expect(() => new DocumentationCache({ ttl: 0, maxSize: 100 })).not.toThrow();
    });

    test('should handle invalid maxSize values', () => {
      expect(() => new DocumentationCache({ ttl: 1000, maxSize: 0 })).toThrow();
      expect(() => new DocumentationCache({ ttl: 1000, maxSize: -1 })).toThrow();
    });
  });
});