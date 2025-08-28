/**
 * Simple test to verify the MCP server can start
 * This bypasses TypeScript compilation issues
 */

const { MotionMCPServer } = require('./dist/server');

async function testServer() {
  console.log('Starting Motion.dev MCP server test...');
  
  try {
    const server = new MotionMCPServer();
    console.log('✅ Server instance created successfully');
    
    // Test if we can start the server
    await server.start();
    console.log('✅ Server started successfully');
    
    console.log('✅ Basic server functionality test passed!');
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testServer();