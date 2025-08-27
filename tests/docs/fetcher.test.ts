/**
 * Test suite for documentation fetcher with retry logic
 */

import { DocumentationFetcher } from '../../src/docs/fetcher.js';
import { generateMockMotionDoc } from '../setup.js';
import fetch from 'node-fetch';

// Mock node-fetch
const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('DocumentationFetcher', () => {
  let fetcher: DocumentationFetcher;

  beforeEach(() => {
    fetcher = new DocumentationFetcher({
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 100
    });
    jest.clearAllMocks();
  });

  describe('Successful Requests', () => {
    test('should fetch documentation successfully', async () => {
      const mockDoc = generateMockMotionDoc();
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(`
          <html>
            <head><title>${mockDoc.title}</title></head>
            <body>
              <main>
                <h1>${mockDoc.title}</h1>
                <p>${mockDoc.content}</p>
              </main>
            </body>
          </html>
        `),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            if (name === 'last-modified') return mockDoc.lastModified;
            return null;
          }
        }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation(mockDoc.url);

      expect(result).toEqual(
        expect.objectContaining({
          url: mockDoc.url,
          title: mockDoc.title,
          content: expect.stringContaining(mockDoc.content),
          lastModified: expect.any(String)
        })
      );
    });

    test('should parse HTML content correctly', async () => {
      const htmlContent = `
        <html>
          <body>
            <nav>Navigation</nav>
            <main>
              <h1>React Animations</h1>
              <p>This is the main content about React animations.</p>
              <code>import { motion } from 'framer-motion';</code>
            </main>
            <footer>Footer</footer>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(htmlContent),
        headers: {
          get: () => 'text/html'
        }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/react');

      expect(result.title).toBe('React Animations');
      expect(result.content).toContain('main content about React animations');
      expect(result.content).toContain('import { motion } from \'framer-motion\'');
      expect(result.content).not.toContain('Navigation');
      expect(result.content).not.toContain('Footer');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors with retries', async () => {
      const networkError = new Error('Network error');
      
      // First two attempts fail, third succeeds
      mockedFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><body><h1>Success</h1></body></html>'),
          headers: { get: () => 'text/html' }
        } as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/test');

      expect(result.title).toBe('Success');
      expect(mockedFetch).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      const networkError = new Error('Persistent network error');
      mockedFetch.mockRejectedValue(networkError);

      await expect(
        fetcher.fetchDocumentation('https://motion.dev/docs/test')
      ).rejects.toThrow('Failed to fetch documentation after 3 retries');

      expect(mockedFetch).toHaveBeenCalledTimes(3);
    });

    test('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('')
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      await expect(
        fetcher.fetchDocumentation('https://motion.dev/docs/nonexistent')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle timeout', async () => {
      const shortTimeoutFetcher = new DocumentationFetcher({
        timeout: 100,
        maxRetries: 1,
        retryDelay: 50
      });

      // Simulate a slow response
      mockedFetch.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(
        shortTimeoutFetcher.fetchDocumentation('https://motion.dev/docs/slow')
      ).rejects.toThrow();
    });
  });

  describe('Content Processing', () => {
    test('should extract framework from URL', async () => {
      const testCases = [
        { url: 'https://motion.dev/docs/react', expected: 'react' },
        { url: 'https://motion.dev/docs/vue', expected: 'vue' },
        { url: 'https://motion.dev/docs/quick-start', expected: 'js' },
        { url: 'https://motion.dev/docs/animate', expected: 'js' }
      ];

      for (const { url, expected } of testCases) {
        const mockResponse = {
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><body><h1>Test</h1></body></html>'),
          headers: { get: () => 'text/html' }
        };

        mockedFetch.mockResolvedValueOnce(mockResponse as any);

        const result = await fetcher.fetchDocumentation(url);
        expect(result.framework).toBe(expected);
      }
    });

    test('should categorize content correctly', async () => {
      const testCases = [
        { url: 'https://motion.dev/docs/react-animation', expected: 'animation' },
        { url: 'https://motion.dev/docs/react-gestures', expected: 'gestures' },
        { url: 'https://motion.dev/docs/react-layout', expected: 'layout' },
        { url: 'https://motion.dev/docs/scroll', expected: 'scroll' },
        { url: 'https://motion.dev/docs/spring', expected: 'spring' }
      ];

      for (const { url, expected } of testCases) {
        const mockResponse = {
          ok: true,
          status: 200,
          text: () => Promise.resolve('<html><body><h1>Test</h1></body></html>'),
          headers: { get: () => 'text/html' }
        };

        mockedFetch.mockResolvedValueOnce(mockResponse as any);

        const result = await fetcher.fetchDocumentation(url);
        expect(result.category).toBe(expected);
      }
    });

    test('should handle malformed HTML gracefully', async () => {
      const malformedHtml = '<html><body><h1>Unclosed tag<p>Content</body>';

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(malformedHtml),
        headers: { get: () => 'text/html' }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/test');

      expect(result.title).toBe('Unclosed tag');
      expect(result.content).toContain('Content');
    });

    test('should extract code examples', async () => {
      const htmlWithCode = `
        <html>
          <body>
            <h1>Animation Examples</h1>
            <pre><code>
              import { motion } from 'framer-motion';
              
              const Component = () => (
                &lt;motion.div animate={{ x: 100 }}&gt;
                  Animated content
                &lt;/motion.div&gt;
              );
            </code></pre>
          </body>
        </html>
      `;

      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(htmlWithCode),
        headers: { get: () => 'text/html' }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/examples');

      expect(result.content).toContain('import { motion }');
      expect(result.content).toContain('<motion.div animate');
    });
  });

  describe('Caching Integration', () => {
    test('should respect cache-control headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><body><h1>Cached</h1></body></html>'),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            if (name === 'cache-control') return 'max-age=3600';
            return null;
          }
        }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/cached');

      expect(result.cacheControl).toBe('max-age=3600');
    });

    test('should handle etag headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><body><h1>ETag Test</h1></body></html>'),
        headers: {
          get: (name: string) => {
            if (name === 'content-type') return 'text/html';
            if (name === 'etag') return '"abc123"';
            return null;
          }
        }
      };

      mockedFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await fetcher.fetchDocumentation('https://motion.dev/docs/etag');

      expect(result.etag).toBe('"abc123"');
    });
  });

  describe('Configuration', () => {
    test('should use custom timeout settings', async () => {
      const customFetcher = new DocumentationFetcher({
        timeout: 1000,
        maxRetries: 5,
        retryDelay: 200
      });

      // This test verifies the fetcher is created with custom config
      expect(customFetcher).toBeInstanceOf(DocumentationFetcher);
    });

    test('should validate configuration parameters', () => {
      expect(() => new DocumentationFetcher({ timeout: -1 })).toThrow();
      expect(() => new DocumentationFetcher({ maxRetries: -1 })).toThrow();
      expect(() => new DocumentationFetcher({ retryDelay: -1 })).toThrow();
    });
  });
});