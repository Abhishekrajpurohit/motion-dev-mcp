/**
 * Integration tests for MCP server protocol compliance
 */

import { MotionMCPServer } from '../../src/server.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Mock the transport for testing
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

describe('MCP Server Integration', () => {
  let server: MotionMCPServer;
  let mockTransport: jest.Mocked<StdioServerTransport>;

  beforeEach(async () => {
    mockTransport = {
      start: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;

    (StdioServerTransport as jest.Mock).mockReturnValue(mockTransport);

    server = new MotionMCPServer();
    await server.initialize();
  });

  afterEach(async () => {
    if (server) {
      await server.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    test('should initialize server with correct configuration', () => {
      expect(server).toBeInstanceOf(MotionMCPServer);
      expect(server.getServerInfo().name).toBe('motion-dev-mcp');
      expect(server.getServerInfo().version).toBeDefined();
    });

    test('should register all required tools', () => {
      const tools = server.listTools();
      
      // Documentation tools
      expect(tools.some(tool => tool.name === 'get_motion_docs')).toBe(true);
      expect(tools.some(tool => tool.name === 'search_motion_docs')).toBe(true);
      expect(tools.some(tool => tool.name === 'get_component_api')).toBe(true);
      expect(tools.some(tool => tool.name === 'get_examples_by_category')).toBe(true);

      // Code generation tools
      expect(tools.some(tool => tool.name === 'generate_motion_component')).toBe(true);
      expect(tools.some(tool => tool.name === 'create_animation_sequence')).toBe(true);
      expect(tools.some(tool => tool.name === 'optimize_motion_code')).toBe(true);
      expect(tools.some(tool => tool.name === 'convert_between_frameworks')).toBe(true);
      expect(tools.some(tool => tool.name === 'validate_motion_syntax')).toBe(true);
    });

    test('should register all required resources', () => {
      const resources = server.listResources();
      
      expect(resources.some(resource => resource.uri === 'motion://docs/react')).toBe(true);
      expect(resources.some(resource => resource.uri === 'motion://docs/js')).toBe(true);
      expect(resources.some(resource => resource.uri === 'motion://docs/vue')).toBe(true);
      expect(resources.some(resource => resource.uri === 'motion://examples')).toBe(true);
      expect(resources.some(resource => resource.uri === 'motion://best-practices')).toBe(true);
    });
  });

  describe('MCP Protocol Compliance', () => {
    test('should handle initialize request correctly', async () => {
      const initializeRequest = {
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await server.handleRequest(initializeRequest);

      expect(response.capabilities).toBeDefined();
      expect(response.capabilities.tools).toBeDefined();
      expect(response.capabilities.resources).toBeDefined();
      expect(response.serverInfo).toBeDefined();
      expect(response.protocolVersion).toBe('2024-11-05');
    });

    test('should handle tools/list request', async () => {
      const toolsListRequest = {
        method: 'tools/list',
        params: {}
      };

      const response = await server.handleRequest(toolsListRequest);

      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBeGreaterThan(0);

      // Check tool schema compliance
      response.tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });

    test('should handle resources/list request', async () => {
      const resourcesListRequest = {
        method: 'resources/list',
        params: {}
      };

      const response = await server.handleRequest(resourcesListRequest);

      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBeGreaterThan(0);

      // Check resource schema compliance
      response.resources.forEach((resource: any) => {
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
        expect(resource.mimeType).toBeDefined();
      });
    });

    test('should handle tools/call request for documentation tools', async () => {
      const toolCallRequest = {
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            url: 'https://motion.dev/docs/react'
          }
        }
      };

      const response = await server.handleRequest(toolCallRequest);

      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      
      if (response.content.length > 0) {
        expect(response.content[0].type).toBeDefined();
        expect(response.content[0].text || response.content[0].data).toBeDefined();
      }
    });

    test('should handle tools/call request for code generation tools', async () => {
      const toolCallRequest = {
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react',
            componentName: 'TestComponent'
          }
        }
      };

      const response = await server.handleRequest(toolCallRequest);

      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('import React');
    });

    test('should handle resources/read request', async () => {
      const resourceReadRequest = {
        method: 'resources/read',
        params: {
          uri: 'motion://docs/react'
        }
      };

      const response = await server.handleRequest(resourceReadRequest);

      expect(response.contents).toBeDefined();
      expect(Array.isArray(response.contents)).toBe(true);
      
      if (response.contents.length > 0) {
        expect(response.contents[0].uri).toBe('motion://docs/react');
        expect(response.contents[0].mimeType).toBeDefined();
        expect(response.contents[0].text || response.contents[0].blob).toBeDefined();
      }
    });

    test('should handle invalid method gracefully', async () => {
      const invalidRequest = {
        method: 'invalid/method',
        params: {}
      };

      await expect(server.handleRequest(invalidRequest)).rejects.toThrow();
    });

    test('should handle malformed requests gracefully', async () => {
      const malformedRequest = {
        // Missing method
        params: {}
      };

      await expect(server.handleRequest(malformedRequest as any)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle tool call with invalid parameters', async () => {
      const invalidToolCall = {
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            // Missing required URL parameter
          }
        }
      };

      const response = await server.handleRequest(invalidToolCall);

      expect(response.isError).toBe(true);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Missing required parameter');
    });

    test('should handle tool call with non-existent tool', async () => {
      const nonExistentToolCall = {
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {}
        }
      };

      await expect(server.handleRequest(nonExistentToolCall)).rejects.toThrow();
    });

    test('should handle resource read with invalid URI', async () => {
      const invalidResourceRead = {
        method: 'resources/read',
        params: {
          uri: 'invalid://resource'
        }
      };

      await expect(server.handleRequest(invalidResourceRead)).rejects.toThrow();
    });

    test('should handle server shutdown gracefully', async () => {
      await expect(server.shutdown()).resolves.not.toThrow();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent tool calls', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react',
            componentName: `Component${i}`
          }
        }
      }));

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => server.handleRequest(req))
      );
      const endTime = Date.now();

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.content).toBeDefined();
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000);
    });

    test('should handle large documentation requests', async () => {
      const largeDocRequest = {
        method: 'tools/call',
        params: {
          name: 'search_motion_docs',
          arguments: {
            query: 'animation', // Broad query that might return many results
            limit: 100
          }
        }
      };

      const startTime = Date.now();
      const response = await server.handleRequest(largeDocRequest);
      const endTime = Date.now();

      expect(response.content).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should maintain memory usage within limits', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple operations
      for (let i = 0; i < 50; i++) {
        await server.handleRequest({
          method: 'tools/call',
          params: {
            name: 'generate_motion_component',
            arguments: {
              pattern: 'fade-in',
              framework: 'react'
            }
          }
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Session Management', () => {
    test('should maintain session state across requests', async () => {
      // First request
      const firstRequest = {
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            url: 'https://motion.dev/docs/react'
          }
        }
      };

      await server.handleRequest(firstRequest);

      // Second request should benefit from cache
      const secondRequest = {
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            url: 'https://motion.dev/docs/react'
          }
        }
      };

      const startTime = Date.now();
      const response = await server.handleRequest(secondRequest);
      const endTime = Date.now();

      expect(response.content).toBeDefined();
      // Second request should be faster due to caching
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle session cleanup on shutdown', async () => {
      // Create some session state
      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            url: 'https://motion.dev/docs/react'
          }
        }
      });

      // Shutdown should clean up properly
      await expect(server.shutdown()).resolves.not.toThrow();

      // New requests after shutdown should fail
      await expect(
        server.handleRequest({
          method: 'tools/list',
          params: {}
        })
      ).rejects.toThrow();
    });
  });

  describe('Security and Validation', () => {
    test('should validate all tool parameters', async () => {
      const toolsToTest = [
        {
          name: 'get_motion_docs',
          invalidArgs: { url: 'not-a-valid-url' }
        },
        {
          name: 'generate_motion_component',
          invalidArgs: { pattern: '', framework: 'invalid' }
        },
        {
          name: 'create_animation_sequence',
          invalidArgs: { steps: 'not-an-array' }
        }
      ];

      for (const { name, invalidArgs } of toolsToTest) {
        const response = await server.handleRequest({
          method: 'tools/call',
          params: {
            name,
            arguments: invalidArgs
          }
        });

        expect(response.isError).toBe(true);
        expect(response.content[0].text).toContain('Invalid parameter');
      }
    });

    test('should sanitize user inputs', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      const response = await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react',
            componentName: maliciousInput
          }
        }
      });

      expect(response.content[0].text).not.toContain('<script>');
      expect(response.content[0].text).not.toContain('alert(');
    });

    test('should handle resource URI validation', async () => {
      const maliciousURIs = [
        'file:///etc/passwd',
        'http://malicious.com/steal-data',
        'javascript:alert("xss")',
        '../../../etc/passwd'
      ];

      for (const uri of maliciousURIs) {
        await expect(
          server.handleRequest({
            method: 'resources/read',
            params: { uri }
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Monitoring and Health Checks', () => {
    test('should provide server health status', () => {
      const health = server.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memoryUsage).toBeDefined();
      expect(health.requestCount).toBeGreaterThanOrEqual(0);
    });

    test('should track request metrics', async () => {
      const initialMetrics = server.getMetrics();

      await server.handleRequest({
        method: 'tools/list',
        params: {}
      });

      const finalMetrics = server.getMetrics();

      expect(finalMetrics.totalRequests).toBeGreaterThan(initialMetrics.totalRequests);
      expect(finalMetrics.successfulRequests).toBeGreaterThan(initialMetrics.successfulRequests);
    });

    test('should provide performance metrics', async () => {
      const startTime = Date.now();

      await server.handleRequest({
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react'
          }
        }
      });

      const metrics = server.getMetrics();

      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeLessThan(5000);
    });
  });
});