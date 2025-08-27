/**
 * Test suite for sitemap processing and endpoint extraction
 */

import { SitemapProcessor } from '../../src/docs/sitemap.js';
import fetch from 'node-fetch';

// Mock node-fetch
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('SitemapProcessor', () => {
  let processor: SitemapProcessor;

  beforeEach(() => {
    processor = new SitemapProcessor();
    jest.clearAllMocks();
  });

  describe('Sitemap Parsing', () => {
    test('should parse valid sitemap XML', async () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://motion.dev/docs/react</loc>
    <lastmod>2024-01-15T10:00:00Z</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://motion.dev/docs/vue</loc>
    <lastmod>2024-01-16T12:00:00Z</lastmod>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://motion.dev/docs/quick-start</loc>
    <lastmod>2024-01-17T14:00:00Z</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(sitemapXml)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      expect(endpoints).toHaveLength(3);
      expect(endpoints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: 'https://motion.dev/docs/react',
            lastModified: '2024-01-15T10:00:00Z',
            priority: 0.8,
            framework: 'react',
            category: 'documentation'
          }),
          expect.objectContaining({
            url: 'https://motion.dev/docs/vue',
            framework: 'vue'
          }),
          expect.objectContaining({
            url: 'https://motion.dev/docs/quick-start',
            framework: 'js'
          })
        ])
      );
    });

    test('should handle empty sitemap', async () => {
      const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(emptySitemap)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      expect(endpoints).toHaveLength(0);
    });

    test('should handle malformed XML gracefully', async () => {
      const malformedXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://motion.dev/docs/react</loc>
    <lastmod>2024-01-15T10:00:00Z
  </url>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(malformedXml)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(
        processor.extractEndpoints('https://motion.dev/sitemap.xml')
      ).rejects.toThrow('Failed to parse sitemap XML');
    });
  });

  describe('Endpoint Classification', () => {
    test('should classify React endpoints correctly', async () => {
      const reactEndpoints = [
        'https://motion.dev/docs/react',
        'https://motion.dev/docs/react-animation',
        'https://motion.dev/docs/react-gestures',
        'https://motion.dev/docs/react-layout-animations'
      ];

      for (const url of reactEndpoints) {
        const result = processor.classifyEndpoint(url);
        expect(result.framework).toBe('react');
      }
    });

    test('should classify Vue endpoints correctly', async () => {
      const vueEndpoints = [
        'https://motion.dev/docs/vue',
        'https://motion.dev/docs/vue-animation',
        'https://motion.dev/docs/vue-gestures'
      ];

      for (const url of vueEndpoints) {
        const result = processor.classifyEndpoint(url);
        expect(result.framework).toBe('vue');
      }
    });

    test('should classify JavaScript endpoints correctly', async () => {
      const jsEndpoints = [
        'https://motion.dev/docs/quick-start',
        'https://motion.dev/docs/animate',
        'https://motion.dev/docs/scroll',
        'https://motion.dev/docs/spring'
      ];

      for (const url of jsEndpoints) {
        const result = processor.classifyEndpoint(url);
        expect(result.framework).toBe('js');
      }
    });

    test('should categorize by content type', () => {
      const testCases = [
        { url: 'https://motion.dev/docs/react-animation', category: 'animation' },
        { url: 'https://motion.dev/docs/gestures', category: 'gestures' },
        { url: 'https://motion.dev/docs/layout-animations', category: 'layout' },
        { url: 'https://motion.dev/docs/scroll', category: 'scroll' },
        { url: 'https://motion.dev/docs/spring', category: 'spring' },
        { url: 'https://motion.dev/examples/hero', category: 'examples' },
        { url: 'https://motion.dev/guides/best-practices', category: 'guides' }
      ];

      for (const { url, category } of testCases) {
        const result = processor.classifyEndpoint(url);
        expect(result.category).toBe(category);
      }
    });

    test('should determine priority based on URL patterns', () => {
      const testCases = [
        { url: 'https://motion.dev/docs/react', priority: 0.9 },
        { url: 'https://motion.dev/docs/quick-start', priority: 0.9 },
        { url: 'https://motion.dev/docs/react-animation', priority: 0.8 },
        { url: 'https://motion.dev/examples/basic', priority: 0.7 },
        { url: 'https://motion.dev/guides/advanced', priority: 0.6 }
      ];

      for (const { url, priority } of testCases) {
        const result = processor.classifyEndpoint(url);
        expect(result.priority).toBe(priority);
      }
    });
  });

  describe('Filtering and Processing', () => {
    test('should filter documentation URLs only', async () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://motion.dev/docs/react</loc></url>
  <url><loc>https://motion.dev/about</loc></url>
  <url><loc>https://motion.dev/docs/vue</loc></url>
  <url><loc>https://motion.dev/pricing</loc></url>
  <url><loc>https://motion.dev/examples/hero</loc></url>
</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(sitemapXml)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      expect(endpoints).toHaveLength(3);
      expect(endpoints.every(ep => 
        ep.url.includes('/docs/') || ep.url.includes('/examples/')
      )).toBe(true);
    });

    test('should sort endpoints by priority and framework', async () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://motion.dev/examples/basic</loc></url>
  <url><loc>https://motion.dev/docs/react</loc></url>
  <url><loc>https://motion.dev/docs/vue-animation</loc></url>
  <url><loc>https://motion.dev/docs/quick-start</loc></url>
</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(sitemapXml)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      // Should be sorted by priority (high to low), then by framework
      expect(endpoints[0].url).toContain('react');
      expect(endpoints[1].url).toContain('quick-start');
      expect(endpoints[0].priority).toBeGreaterThanOrEqual(endpoints[1].priority);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        processor.extractEndpoints('https://motion.dev/sitemap.xml')
      ).rejects.toThrow('Failed to fetch sitemap');
    });

    test('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(
        processor.extractEndpoints('https://motion.dev/sitemap.xml')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle invalid XML structure', async () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<invalid>
  <structure>Content</structure>
</invalid>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(invalidXml)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      // Should return empty array for invalid structure
      expect(endpoints).toHaveLength(0);
    });
  });

  describe('Framework Detection', () => {
    test('should detect framework from URL path', () => {
      const testCases = [
        { url: 'https://motion.dev/docs/react-hooks', framework: 'react' },
        { url: 'https://motion.dev/docs/vue-composables', framework: 'vue' },
        { url: 'https://motion.dev/docs/animate-function', framework: 'js' },
        { url: 'https://motion.dev/docs/installation', framework: 'js' } // default
      ];

      for (const { url, framework } of testCases) {
        const result = processor.classifyEndpoint(url);
        expect(result.framework).toBe(framework);
      }
    });

    test('should handle edge cases in framework detection', () => {
      const edgeCases = [
        { url: 'https://motion.dev/docs/react-vs-vue', framework: 'js' }, // ambiguous
        { url: 'https://motion.dev/docs/reactive-programming', framework: 'js' }, // contains 'react' but not framework
        { url: 'https://motion.dev/docs/overview', framework: 'js' } // no specific framework
      ];

      for (const { url, framework } of edgeCases) {
        const result = processor.classifyEndpoint(url);
        expect(result.framework).toBe(framework);
      }
    });
  });

  describe('Caching and Performance', () => {
    test('should cache processed endpoints', async () => {
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://motion.dev/docs/react</loc></url>
</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(sitemapXml)
      };

      mockedFetch.mockResolvedValue(mockResponse as any);

      // First call
      const endpoints1 = await processor.extractEndpoints('https://motion.dev/sitemap.xml');
      
      // Second call should use cache
      const endpoints2 = await processor.extractEndpoints('https://motion.dev/sitemap.xml');

      expect(endpoints1).toEqual(endpoints2);
      expect(mockedFetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    test('should handle large sitemaps efficiently', async () => {
      // Generate large sitemap
      const urls = Array.from({ length: 1000 }, (_, i) => 
        `<url><loc>https://motion.dev/docs/page-${i}</loc></url>`
      ).join('');

      const largeSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(largeSitemap)
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const startTime = Date.now();
      const endpoints = await processor.extractEndpoints('https://motion.dev/sitemap.xml');
      const endTime = Date.now();

      expect(endpoints.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});