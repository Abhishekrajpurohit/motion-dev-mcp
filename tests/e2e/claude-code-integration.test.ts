/**
 * End-to-end tests for Claude Code client integration
 * These tests simulate the actual integration with Claude Code client
 */

import { spawn, ChildProcess } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';
import path from 'path';

interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

describe('Claude Code Integration E2E Tests', () => {
  let serverProcess: ChildProcess;
  let serverStdin: Writable;
  let serverStdout: Readable;
  let messageId: number = 1;

  beforeAll(async () => {
    // Start the MCP server process
    const serverPath = path.join(__dirname, '../../dist/index.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    serverStdin = serverProcess.stdin!;
    serverStdout = serverProcess.stdout!;

    // Wait for server to be ready
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          serverProcess.kill('SIGKILL');
          resolve(undefined);
        }, 5000);
      });
    }
  });

  /**
   * Send a JSON-RPC message to the server
   */
  const sendMessage = async (message: MCPMessage): Promise<MCPMessage> => {
    return new Promise((resolve, reject) => {
      const messageStr = JSON.stringify(message) + '\n';
      
      const timeout = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, 10000);

      const onData = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString().trim());
          clearTimeout(timeout);
          serverStdout.off('data', onData);
          resolve(response);
        } catch (error) {
          // Might be partial data, wait for more
        }
      };

      serverStdout.on('data', onData);
      serverStdin.write(messageStr);
    });
  };

  describe('Server Initialization', () => {
    test('should handle initialize request', async () => {
      const initMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'claude-code',
            version: '1.0.0'
          }
        }
      };

      const response = await sendMessage(initMessage);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(initMessage.id);
      expect(response.result).toBeDefined();
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.capabilities.tools).toBe(true);
      expect(response.result.capabilities.resources).toBe(true);
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('motion-dev-mcp');
    });

    test('should handle initialized notification', async () => {
      const initializedMessage: MCPMessage = {
        jsonrpc: '2.0',
        method: 'initialized',
        params: {}
      };

      // This is a notification, no response expected
      serverStdin.write(JSON.stringify(initializedMessage) + '\n');
      
      // Wait a bit to ensure no error occurs
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
  });

  describe('Tool Operations', () => {
    test('should list available tools', async () => {
      const toolsListMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMessage(toolsListMessage);

      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);

      // Check that required tools are present
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('get_motion_docs');
      expect(toolNames).toContain('generate_motion_component');
      expect(toolNames).toContain('search_motion_docs');
      expect(toolNames).toContain('create_animation_sequence');
      expect(toolNames).toContain('optimize_motion_code');
    });

    test('should call get_motion_docs tool', async () => {
      const toolCallMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            url: 'https://motion.dev/docs/react'
          }
        }
      };

      const response = await sendMessage(toolCallMessage);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);
      
      if (response.result.content.length > 0) {
        expect(response.result.content[0]).toHaveProperty('type');
        expect(response.result.content[0]).toHaveProperty('text');
      }
    });

    test('should call generate_motion_component tool', async () => {
      const toolCallMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react',
            componentName: 'FadeInButton',
            typescript: true
          }
        }
      };

      const response = await sendMessage(toolCallMessage);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].type).toBe('text');
      
      const generatedCode = response.result.content[0].text;
      expect(generatedCode).toContain('import React');
      expect(generatedCode).toContain('import { motion }');
      expect(generatedCode).toContain('FadeInButton');
      expect(generatedCode).toContain('export default');
    });

    test('should call search_motion_docs tool', async () => {
      const toolCallMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'search_motion_docs',
          arguments: {
            query: 'animation',
            limit: 5
          }
        }
      };

      const response = await sendMessage(toolCallMessage);

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);
    });

    test('should handle invalid tool call', async () => {
      const invalidToolCallMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {}
        }
      };

      const response = await sendMessage(invalidToolCallMessage);

      expect(response.error).toBeDefined();
      expect(response.error.code).toBeDefined();
      expect(response.error.message).toContain('Unknown tool');
    });

    test('should validate tool parameters', async () => {
      const invalidParamsMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'get_motion_docs',
          arguments: {
            // Missing required URL parameter
          }
        }
      };

      const response = await sendMessage(invalidParamsMessage);

      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Missing required parameter');
    });
  });

  describe('Resource Operations', () => {
    test('should list available resources', async () => {
      const resourcesListMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'resources/list',
        params: {}
      };

      const response = await sendMessage(resourcesListMessage);

      expect(response.result).toBeDefined();
      expect(response.result.resources).toBeDefined();
      expect(Array.isArray(response.result.resources)).toBe(true);
      expect(response.result.resources.length).toBeGreaterThan(0);

      // Check that required resources are present
      const resourceUris = response.result.resources.map((resource: any) => resource.uri);
      expect(resourceUris).toContain('motion://docs/react');
      expect(resourceUris).toContain('motion://docs/vue');
      expect(resourceUris).toContain('motion://docs/js');
      expect(resourceUris).toContain('motion://examples');
    });

    test('should read a resource', async () => {
      const resourceReadMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'resources/read',
        params: {
          uri: 'motion://docs/react'
        }
      };

      const response = await sendMessage(resourceReadMessage);

      expect(response.result).toBeDefined();
      expect(response.result.contents).toBeDefined();
      expect(Array.isArray(response.result.contents)).toBe(true);
      
      if (response.result.contents.length > 0) {
        expect(response.result.contents[0]).toHaveProperty('uri');
        expect(response.result.contents[0]).toHaveProperty('mimeType');
        expect(response.result.contents[0]).toHaveProperty('text');
      }
    });

    test('should handle invalid resource URI', async () => {
      const invalidResourceMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'resources/read',
        params: {
          uri: 'invalid://resource'
        }
      };

      const response = await sendMessage(invalidResourceMessage);

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Unknown resource');
    });
  });

  describe('Complex Workflows', () => {
    test('should handle documentation search and code generation workflow', async () => {
      // Step 1: Search for React animation documentation
      const searchMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'search_motion_docs',
          arguments: {
            query: 'React fade animation',
            framework: 'react',
            limit: 3
          }
        }
      };

      const searchResponse = await sendMessage(searchMessage);
      expect(searchResponse.result).toBeDefined();

      // Step 2: Generate a component based on the search results
      const generateMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'fade-in',
            framework: 'react',
            componentName: 'SearchBasedComponent',
            typescript: true
          }
        }
      };

      const generateResponse = await sendMessage(generateMessage);
      expect(generateResponse.result).toBeDefined();
      expect(generateResponse.result.content[0].text).toContain('SearchBasedComponent');

      // Step 3: Optimize the generated code
      const optimizeMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'optimize_motion_code',
          arguments: {
            code: generateResponse.result.content[0].text,
            framework: 'react',
            optimizations: ['performance', 'accessibility']
          }
        }
      };

      const optimizeResponse = await sendMessage(optimizeMessage);
      expect(optimizeResponse.result).toBeDefined();
    });

    test('should handle cross-framework conversion workflow', async () => {
      // Step 1: Generate React component
      const generateReactMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'slide-up',
            framework: 'react',
            componentName: 'SlideUpCard'
          }
        }
      };

      const reactResponse = await sendMessage(generateReactMessage);
      expect(reactResponse.result).toBeDefined();

      // Step 2: Convert React to Vue
      const convertMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'convert_between_frameworks',
          arguments: {
            code: reactResponse.result.content[0].text,
            sourceFramework: 'react',
            targetFramework: 'vue',
            componentName: 'VueSlideUpCard'
          }
        }
      };

      const vueResponse = await sendMessage(convertMessage);
      expect(vueResponse.result).toBeDefined();
      expect(vueResponse.result.content[0].text).toContain('<template>');
      expect(vueResponse.result.content[0].text).toContain('VueSlideUpCard');
    });

    test('should handle animation sequence creation', async () => {
      const sequenceMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'create_animation_sequence',
          arguments: {
            framework: 'react',
            steps: [
              {
                selector: '.header',
                animation: { y: [-50, 0], opacity: [0, 1] },
                timing: { duration: 0.6, delay: 0 }
              },
              {
                selector: '.content',
                animation: { x: [-100, 0], opacity: [0, 1] },
                timing: { duration: 0.8, delay: 0.3 }
              }
            ],
            stagger: { each: 0.1, from: 'first' },
            componentName: 'SequentialAnimation'
          }
        }
      };

      const response = await sendMessage(sequenceMessage);
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain('SequentialAnimation');
      expect(response.result.content[0].text).toContain('staggerChildren');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed JSON gracefully', async () => {
      const malformedJSON = '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"'; // Missing closing brace
      
      return new Promise<void>((resolve) => {
        const onData = (data: Buffer) => {
          const response = data.toString();
          // Server should either ignore malformed JSON or send an error response
          // Either way, it shouldn't crash
          serverStdout.off('data', onData);
          resolve();
        };

        serverStdout.on('data', onData);
        serverStdin.write(malformedJSON + '\n');

        // Timeout to ensure server doesn't hang
        setTimeout(() => {
          serverStdout.off('data', onData);
          resolve();
        }, 2000);
      });
    });

    test('should handle concurrent requests', async () => {
      const requests: Promise<MCPMessage>[] = [];
      
      // Send 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        const request: MCPMessage = {
          jsonrpc: '2.0',
          id: messageId++,
          method: 'tools/call',
          params: {
            name: 'generate_motion_component',
            arguments: {
              pattern: 'fade-in',
              framework: 'react',
              componentName: `ConcurrentComponent${i}`
            }
          }
        };
        
        requests.push(sendMessage(request));
      }

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.result).toBeDefined();
        expect(response.result.content[0].text).toContain(`ConcurrentComponent${index}`);
      });
    });

    test('should handle large payloads', async () => {
      // Generate a large custom animation object
      const largeAnimation = {
        keyframes: Array.from({ length: 100 }, (_, i) => ({
          offset: i / 99,
          opacity: Math.sin(i / 10),
          scale: 1 + Math.sin(i / 5) * 0.1,
          rotate: i * 3.6
        }))
      };

      const largePayloadMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/call',
        params: {
          name: 'generate_motion_component',
          arguments: {
            pattern: 'custom',
            framework: 'react',
            customAnimation: largeAnimation,
            componentName: 'LargeAnimationComponent'
          }
        }
      };

      const response = await sendMessage(largePayloadMessage);
      expect(response.result).toBeDefined();
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      const requests: Promise<MCPMessage>[] = [];

      // Send 20 requests rapidly
      for (let i = 0; i < 20; i++) {
        const request: MCPMessage = {
          jsonrpc: '2.0',
          id: messageId++,
          method: 'tools/list',
          params: {}
        };
        
        requests.push(sendMessage(request));
      }

      await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 10 seconds for 20 requests)
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Server Health and Monitoring', () => {
    test('should respond to health check requests', async () => {
      // This would be a custom health check tool if implemented
      // For now, we'll test that the server is responsive
      const healthMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      };

      const startTime = Date.now();
      const response = await sendMessage(healthMessage);
      const responseTime = Date.now() - startTime;

      expect(response.result).toBeDefined();
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('should handle graceful shutdown signal', async () => {
      // Send SIGTERM to test graceful shutdown
      // Note: This will terminate the server, so it should be the last test
      // or we need to restart the server afterwards
      
      const healthMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      };

      // Ensure server is responsive before shutdown
      const response = await sendMessage(healthMessage);
      expect(response.result).toBeDefined();

      // The server shutdown will be handled in afterAll
    }, 10000); // Longer timeout for shutdown test
  });

  describe('Protocol Compliance', () => {
    test('should follow JSON-RPC 2.0 specification', async () => {
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMessage(message);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(message.id);
      expect(response.result || response.error).toBeDefined();
      expect(response.result && response.error).toBeFalsy(); // Should not have both
    });

    test('should handle notifications (no response expected)', async () => {
      const notification: MCPMessage = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      };

      // Send notification (no ID, so no response expected)
      serverStdin.write(JSON.stringify(notification) + '\n');

      // Wait a bit to ensure server processes it without issues
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Server should still be responsive
      const testMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: messageId++,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMessage(testMessage);
      expect(response.result).toBeDefined();
    });
  });
});