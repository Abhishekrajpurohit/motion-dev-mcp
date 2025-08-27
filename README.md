# Motion.dev MCP Server

## Overview
A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to Motion.dev animation library documentation, code examples, and best practices. This server enables LLMs to generate Motion animations for React, JavaScript, and Vue with proper documentation backing.

## Project Structure
```
motion-dev-mcp/
├── README.md              # This file
├── IMPLEMENTATION_PLAN.md # Detailed implementation roadmap
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts         # Main MCP server entry point
│   ├── docs/            # Documentation fetcher and parser
│   ├── tools/           # MCP tools for code generation
│   ├── resources/       # MCP resources for documentation access
│   └── types/           # TypeScript type definitions
└── docs/               # Cached documentation
```

## Key Features

### 🎯 Documentation Access
- **React Documentation**: Complete Motion for React (prev Framer Motion) docs
- **JavaScript Documentation**: Vanilla JS Motion animation guides  
- **Vue Documentation**: Motion for Vue components and animations
- **API References**: Motion values, easing, springs, and utilities

### 🛠️ MCP Tools

#### Documentation Fetching Tools
- `get_motion_docs` - Fetch specific documentation pages by URL or topic
- `search_motion_docs` - Search across all Motion.dev documentation
- `get_component_api` - Get API reference for specific Motion components
- `get_examples_by_category` - Fetch code examples by animation type
- `get_framework_guide` - Get complete framework-specific guides (React/JS/Vue)

#### Code Generation Tools
- `generate_motion_component` - Generate Motion components with proper syntax
- `create_animation_sequence` - Build complex animation timelines
- `optimize_motion_code` - Performance optimization suggestions
- `convert_between_frameworks` - Convert animations between React/JS/Vue
- `validate_motion_syntax` - Validate Motion code syntax and patterns

### 📚 MCP Resources
- `motion_react_docs` - React-specific documentation and examples
- `motion_js_docs` - JavaScript documentation and vanilla implementations
- `motion_vue_docs` - Vue-specific guides and components
- `motion_examples` - Curated code examples by category
- `motion_best_practices` - Performance and accessibility guidelines

## Technology Stack

### Framework Choice: FastMCP
Using **FastMCP** (https://github.com/punkpeye/fastmcp) for rapid development:
- ✅ Production-ready with 700+ GitHub stars
- ✅ TypeScript-first development
- ✅ Built-in authentication support
- ✅ Streaming responses and SSE transport
- ✅ Session management for client contexts

### Alternative: MCP Framework
Backup option: **MCP Framework** (https://github.com/QuantGeekDev/mcp-framework):
- ✅ Automatic directory-based discovery
- ✅ Multiple transport support (stdio, SSE, HTTP)
- ✅ JWT and API Key authentication
- ✅ Full type safety

## Motion.dev Documentation Endpoints

### React Documentation
Based on sitemap analysis, key endpoints include:
```
/docs/react                    # Core React guide
/docs/react-animation         # Animation fundamentals
/docs/react-gestures          # Gesture system
/docs/react-layout-animations # Layout animations
/docs/react-scroll-animations # Scroll-linked animations
/docs/react-motion-component  # Motion component API
/docs/react-animate-presence  # Exit animations
/docs/react-transitions       # Transition configurations
```

### JavaScript Documentation
```
/docs/quick-start            # Getting started
/docs/animate                # Core animate() function
/docs/scroll                 # Scroll animations
/docs/hover                  # Hover gestures
/docs/inview                 # Viewport detection
/docs/spring                 # Spring generator
/docs/transform              # Value transformations
```

### Vue Documentation
```
/docs/vue                    # Vue integration
/docs/vue-animation         # Vue animations
/docs/vue-gestures          # Vue gesture system
/docs/vue-layout-animations # Vue layout animations
/docs/vue-motion-component  # Vue motion component
```

### Utility Documentation
```
/docs/easing-functions       # Easing reference
/docs/motion-value          # Motion values
/docs/performance           # Performance optimization
/docs/accessibility         # A11y best practices
```

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Claude Code or compatible MCP client

### Quick Start
```bash
# Clone or create the project
cd /path/to/claudeui/mcp/motion-dev-mcp

# Install dependencies
npm install fastmcp @types/node typescript

# Initialize FastMCP project
npx create-fastmcp-server motion-dev

# Start development
npm run dev
```

### MCP Client Configuration
Add to your Claude Code configuration:
```json
{
  "mcpServers": {
    "motion-dev": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/claudeui/mcp/motion-dev-mcp"
    }
  }
}
```

## Development Workflow

### Phase 1: Core Setup
1. Initialize FastMCP server structure
2. Implement documentation fetcher
3. Create basic MCP resources
4. Set up TypeScript configuration

### Phase 2: Documentation Integration  
1. Parse Motion.dev sitemap endpoints
2. Implement documentation fetching tools:
   - `get_motion_docs` - Fetch docs by URL with caching
   - `search_motion_docs` - Full-text search across docs
   - `get_component_api` - Component API extraction
   - `get_examples_by_category` - Example code retrieval
3. Create resource handlers for each framework
4. Add search and filtering capabilities
5. Implement documentation caching and indexing

### Phase 3: Code Generation Tools
1. Build Motion component generators
2. Create animation sequence builders
3. Implement framework conversion tools
4. Add performance optimization suggestions

### Phase 4: Advanced Features
1. Add streaming responses for large docs
2. Implement session-based user preferences
3. Create interactive code examples
4. Build testing and validation tools

## Usage Examples

### Documentation Fetching Tools

#### Get Specific Documentation
```typescript
// MCP Tool: get_motion_docs
{
  "url": "/docs/react-animation",
  "format": "markdown", // or "json", "raw"
  "includeExamples": true,
  "includeApiRef": true
}
```

#### Search Documentation
```typescript
// MCP Tool: search_motion_docs
{
  "query": "spring animations",
  "framework": "react", // optional filter
  "category": "animations", // optional filter
  "limit": 10
}
```

#### Get Component API Reference
```typescript
// MCP Tool: get_component_api
{
  "component": "motion.div",
  "framework": "react",
  "includeProps": true,
  "includeExamples": true
}
```

#### Get Examples by Category
```typescript
// MCP Tool: get_examples_by_category
{
  "category": "scroll-animations",
  "framework": "react",
  "complexity": "intermediate", // basic, intermediate, advanced
  "format": "code-only" // or "with-explanation"
}
```

### Code Generation Tools

#### Generate Motion Component
```typescript
// MCP Tool: generate_motion_component
{
  "framework": "react",
  "component": "FadeInButton",
  "animations": ["fadeIn", "hover", "tap"],
  "props": ["children", "onClick"],
  "typescript": true
}
```

#### Create Animation Sequence
```typescript
// MCP Tool: create_animation_sequence
{
  "framework": "react",
  "sequence": [
    {"element": "container", "animate": {"opacity": 1}, "delay": 0},
    {"element": "title", "animate": {"y": 0}, "delay": 0.2},
    {"element": "content", "animate": {"scale": 1}, "delay": 0.4}
  ],
  "stagger": true
}
```

#### Convert Between Frameworks
```typescript
// MCP Tool: convert_between_frameworks
{
  "from": "react",
  "to": "vue", 
  "code": "<motion.div animate={{ x: 100 }} />",
  "preserveComments": true
}
```

### Resource Access Examples

#### Access Framework Documentation
```typescript
// MCP Resource: motion_react_docs
{
  "section": "layout-animations",
  "format": "markdown",
  "includeExamples": true
}
```

#### Get Cached Examples
```typescript
// MCP Resource: motion_examples
{
  "filter": {
    "framework": "vue",
    "category": "gestures",
    "complexity": "basic"
  }
}
```

## Contributing

### Development Guidelines
1. Follow existing ClaudeUI project conventions
2. Use TypeScript for all source code
3. Include comprehensive JSDoc comments
4. Add unit tests for all tools and resources
5. Update documentation with new features

### Testing Strategy
- Unit tests for documentation parsers
- Integration tests for MCP protocol compliance
- End-to-end tests with Claude Code client
- Performance benchmarks for large documentation sets

## Integration with ClaudeUI

This MCP server directly supports the ClaudeUI project goals:
- **Visual Design Agent**: Motion animation code generation
- **Component Assembly Agent**: Animated component composition
- **Full-Stack UI Agent**: Complete app animations
- **Mobile-First Agent**: Touch gestures and mobile animations

## Resources & References

### Motion.dev Resources
- **Website**: https://motion.dev
- **Documentation**: https://motion.dev/docs
- **Sitemap**: https://motion.dev/sitemap.xml
- **GitHub**: https://github.com/motiondivision/motion

### MCP Resources  
- **FastMCP**: https://github.com/punkpeye/fastmcp
- **Official SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **MCP Framework**: https://github.com/QuantGeekDev/mcp-framework
- **Protocol Docs**: https://modelcontextprotocol.io

### Development Resources
- **FreeCodeCamp Guide**: How to Build a Custom MCP Server with TypeScript
- **Hackteam Tutorial**: Build Your First MCP Server in Under 10 Minutes
- **Medium Comparison**: MCP Server Frameworks Analysis

---

**Status**: 🚧 Planning Phase  
**Next Steps**: Initialize FastMCP project structure and implement documentation fetcher