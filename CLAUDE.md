# Motion.dev MCP Server - Development Guide

## Project Overview
A Model Context Protocol (MCP) server that provides comprehensive access to Motion.dev animation library documentation, code examples, and best practices. This enables AI assistants to generate production-quality Motion animations for React, JavaScript, and Vue with proper documentation backing.

## Development Status
✅ **Phase 1 Complete**: Foundation & Setup (100%)
✅ **Phase 2 Complete**: Documentation Integration & MCP Tools (100%)
✅ **Phase 3 Complete**: Code Generation System (100%)
🚧 **Current Phase**: Testing & Production Features (0%)
📋 **Ready**: Claude Code Integration & Deployment

## Project Structure ✅ CREATED
```
motion-dev-mcp/
├── README.md                    # Main project documentation  
├── CLAUDE.md                   # This file - development instructions
├── OUTPUT.md                   # Target output specification
├── plan.md                     # Detailed implementation plan
├── package.json                # Dependencies and scripts ✅
├── tsconfig.json               # TypeScript configuration ✅
├── .gitignore                  # Git ignore patterns ✅
├── .eslintrc.js               # ESLint configuration ✅
├── .prettierrc                # Prettier configuration ✅
├── jest.config.js             # Jest testing configuration ✅
├── src/                       # Source code
│   ├── index.ts               # Main MCP server entry point ✅
│   ├── docs/                  # Documentation system ✅
│   │   ├── fetcher.ts         # HTTP client with retry logic ✅
│   │   ├── cache.ts           # Intelligent caching system ✅
│   │   └── sitemap.ts         # Sitemap processing ✅
│   ├── tools/                 # MCP tools (pending)
│   ├── resources/             # MCP resources (pending)
│   ├── types/                 # TypeScript definitions ✅
│   │   ├── motion.ts          # Motion.dev types ✅
│   │   ├── mcp.ts             # MCP protocol types ✅
│   │   └── index.ts           # Type exports ✅
│   └── utils/                 # Utility functions ✅
│       ├── errors.ts          # Error handling system ✅
│       ├── logger.ts          # Structured logging ✅
│       └── validators.ts      # Input validation with Zod ✅
├── docs/                      # Cached documentation directories ✅
│   ├── react/                 # React docs cache
│   ├── js/                    # JavaScript docs cache  
│   ├── vue/                   # Vue docs cache
│   └── examples/              # Examples cache
└── tests/                     # Test suites (pending)
```

## Key Technologies
- **@modelcontextprotocol/sdk**: Official MCP SDK for TypeScript
- **TypeScript**: Full type safety and documentation (100% coverage)
- **Motion.dev API**: Complete documentation integration
- **Node.js 18+**: Runtime environment
- **Zod**: Runtime type validation and schema validation
- **Cheerio**: HTML parsing for documentation extraction
- **Turndown**: HTML to Markdown conversion

## Development Priorities
1. **Documentation First**: All Motion.dev docs accessible via MCP
2. **Code Generation**: Production-ready component generators
3. **Framework Support**: React, JavaScript, Vue equivalency
4. **Performance**: Caching, streaming, optimized responses
5. **Type Safety**: Full TypeScript coverage

## MCP Tools to Implement
### Documentation Access
- `get_motion_docs` - Fetch specific documentation by URL/topic
- `search_motion_docs` - Full-text search across docs
- `get_component_api` - Component API reference extraction
- `get_examples_by_category` - Code examples by animation type
- `get_framework_guide` - Complete framework-specific guides

### Code Generation
- `generate_motion_component` - Motion component with proper syntax
- `create_animation_sequence` - Complex animation timeline builder
- `optimize_motion_code` - Performance optimization suggestions
- `convert_between_frameworks` - Cross-framework code conversion
- `validate_motion_syntax` - Code validation and pattern checking

## MCP Resources to Implement
- `motion_react_docs` - React-specific docs and examples
- `motion_js_docs` - JavaScript vanilla implementations
- `motion_vue_docs` - Vue-specific guides and components
- `motion_examples` - Curated examples by category
- `motion_best_practices` - Performance and accessibility guidelines

## Development Guidelines
### Code Standards
- **TypeScript First**: All code must be properly typed
- **JSDoc Comments**: Comprehensive documentation for all functions
- **Error Handling**: Graceful failures with helpful error messages
- **Performance**: Implement caching for documentation and examples
- **Testing**: Unit tests for all tools and resources

### Motion.dev Integration
- **Documentation Coverage**: All endpoints from sitemap.xml
- **API Accuracy**: Match official Motion.dev API exactly
- **Example Quality**: Production-ready code examples only
- **Framework Parity**: Equal feature support across React/JS/Vue

### MCP Compliance
- **Protocol Standards**: Follow MCP specification exactly
- **Tool Definitions**: Clear parameter schemas and descriptions
- **Resource Management**: Efficient resource handling and caching
- **Session Handling**: Proper client session management

## Testing Strategy
- **Unit Tests**: Documentation parsers and code generators
- **Integration Tests**: MCP protocol compliance
- **End-to-End Tests**: Full Claude Code client integration
- **Performance Tests**: Documentation caching and large response handling

## Configuration
### Required Dependencies (✅ Installed)
```json
{
  "@modelcontextprotocol/sdk": "^1.17.4",
  "@types/node": "^24.3.0",
  "typescript": "^5.9.2",
  "node-fetch": "^3.3.2",
  "cheerio": "^1.1.2",
  "turndown": "^7.2.1",
  "fuse.js": "^7.1.0",
  "zod": "^3.25.76"
}
```

### MCP Client Setup
```json
{
  "mcpServers": {
    "motion-dev": {
      "command": "node",
      "args": ["./dist/index.js"],
      "cwd": "/path/to/motion-dev-mcp"
    }
  }
}
```

## Documentation Endpoints (Key URLs)
### React
- `/docs/react` - Core React guide
- `/docs/react-animation` - Animation fundamentals
- `/docs/react-gestures` - Gesture system
- `/docs/react-layout-animations` - Layout animations
- `/docs/react-scroll-animations` - Scroll-linked animations

### JavaScript
- `/docs/quick-start` - Getting started
- `/docs/animate` - Core animate() function
- `/docs/scroll` - Scroll animations
- `/docs/spring` - Spring generator

### Vue
- `/docs/vue` - Vue integration
- `/docs/vue-animation` - Vue animations
- `/docs/vue-gestures` - Vue gesture system

## Implementation Phases
### Phase 1: Foundation ✅ COMPLETED
- [x] Project documentation and planning
- [x] Initialize npm project with all dependencies
- [x] Set up TypeScript configuration with strict settings
- [x] Create comprehensive project structure
- [x] Implement error handling system (MotionMCPError, ErrorCodes)
- [x] Build structured logging system (Logger class)
- [x] Set up development tooling (ESLint, Prettier, Jest)
- [x] Create comprehensive type definitions (Motion.dev & MCP types)
- [x] Implement input validation system with Zod schemas

### Phase 2: Documentation Integration ✅ COMPLETED (100%)
- [x] Implement documentation fetcher with retry logic
- [x] Build intelligent caching system with TTL  
- [x] Parse Motion.dev sitemap and endpoint mapping
- [x] Create MCP server with @modelcontextprotocol/sdk
- [x] Implement 4 documentation MCP tools (get_motion_docs, search_motion_docs, get_component_api, get_examples_by_category)
- [x] Create 5 MCP resources for framework-specific access (React, JS, Vue, Examples, Best Practices)
- [x] Add full-text search capabilities with Fuse.js
- [x] Build comprehensive tool and resource management system

### Phase 3: Code Generation ✅ COMPLETED (100%)
- [x] Build AST-based code generation system (Babel AST parser, transformer, generator)
- [x] Create animation templates and patterns library (15+ pre-built patterns)
- [x] Implement 5 code generation MCP tools:
  - [x] generate_motion_component - Creates Motion components from animation patterns
  - [x] create_animation_sequence - Builds complex animation sequences with staggering
  - [x] optimize_motion_code - Performance, accessibility, and bundle size optimization
  - [x] convert_between_frameworks - Cross-framework code conversion (React/JS/Vue)
  - [x] validate_motion_syntax - Code validation with best practice suggestions
- [x] Add framework conversion capabilities with intelligent AST transformation
- [x] Performance optimization suggestions with automated code analysis

### Phase 4: Production Ready 📋 PENDING
- [ ] Build main MCP server with official SDK
- [ ] Add comprehensive error handling
- [ ] Create testing suite with >90% coverage
- [ ] Performance optimization and monitoring
- [ ] Health checks and graceful shutdown

## Git Configuration
- **Author**: Abhishek Rajpurohit <abhishekrajpuohit@gmail.com>
- **Branch**: main (for all commits)
- **Commit Style**: Conventional commits preferred

## Integration with ClaudeUI
This MCP server directly supports ClaudeUI project agents:
- **Visual Design Agent**: Motion animation code generation from designs
- **Component Assembly Agent**: Animated component composition
- **Full-Stack UI Agent**: Complete application animations
- **Mobile-First Agent**: Touch gestures and mobile animations

## Security & Performance
- **No Malicious Code**: Defensive security only, no offensive capabilities
- **Rate Limiting**: Prevent API abuse with documentation fetching
- **Caching Strategy**: Minimize repeated documentation requests
- **Memory Management**: Efficient handling of large documentation sets

## Success Metrics
- **Documentation Coverage**: 100% of Motion.dev endpoints accessible
- **Response Speed**: <200ms for cached responses, <2s for fresh fetches
- **Code Quality**: All generated code passes TypeScript compilation
- **Framework Parity**: Equivalent functionality across React/JS/Vue
- **Error Rate**: <1% failed requests under normal usage

---

**Development Notes:**
- Always check existing implementations before creating new patterns
- Use Motion.dev official documentation as the single source of truth
- Prioritize production-ready code generation over demo examples
- Maintain backward compatibility when updating MCP protocol versions