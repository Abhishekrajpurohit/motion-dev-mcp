# Motion.dev MCP Server

## Overview
A Model Context Protocol (MCP) server that provides AI assistants with comprehensive access to Motion.dev animation library documentation, code examples, and best practices. This server uses a SQLite-based offline documentation system, similar to n8n-mcp, enabling LLMs to generate Motion animations for React, JavaScript, and Vue with proper documentation backing.

## Project Structure
```
motion-dev-mcp/
├── README.md              # This file
├── IMPLEMENTATION_PLAN.md # Detailed implementation roadmap
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── index.ts           # Main MCP server entry point
│   ├── database/          # SQLite database adapters and repositories
│   ├── services/          # Documentation processing services
│   ├── scripts/           # Rebuild and maintenance scripts
│   ├── tools/             # MCP tools for code generation
│   ├── resources/         # MCP resources for documentation access
│   └── types/             # TypeScript type definitions
└── docs/                  # SQLite database storage
```

## Key Features

### 🎯 SQLite-Based Documentation System
- **Offline Storage**: All Motion.dev documentation stored locally in SQLite
- **Full-Text Search**: FTS5 search across all documentation when supported
- **Fast Queries**: No internet dependency after initial population
- **Structured Data**: Organized docs, components, and examples by framework

### 📥 Documentation Rebuild System
- **Automated Fetching**: Downloads all Motion.dev documentation
- **Smart Parsing**: Extracts components, examples, and API references
- **Multi-Framework**: React, JavaScript, and Vue documentation
- **Progress Tracking**: Detailed statistics and validation reporting

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

### Database System
- **SQLite**: Primary database using better-sqlite3 with sql.js fallback
- **FTS5**: Full-text search when supported, LIKE search fallback
- **Schema**: Structured tables for docs, components, and examples
- **Caching**: Intelligent caching with TTL and compression
- **Migrations**: Schema versioning and safe updates

### MCP Protocol
- **Official SDK**: @modelcontextprotocol/sdk for TypeScript
- **Tools**: 10+ tools for documentation access and code generation
- **Resources**: 5 resources for framework-specific documentation
- **Streaming**: Efficient handling of large documentation responses
- **Error Handling**: Comprehensive error types and graceful fallbacks

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
# Clone the project
cd /path/to/claudeui/mcp/motion-dev-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Rebuild documentation database (first time setup)
npm run rebuild

# Start the MCP server
node dist/index.js
```

### Documentation Rebuild
```bash
# Rebuild all Motion.dev documentation
npm run rebuild

# Check database statistics
npm run stats

# Custom database path
MOTION_DB_PATH=./custom/path/docs.db npm run rebuild
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

### Phase 2: SQLite Documentation System
1. Design and implement SQLite database schema
2. Create database adapter with better-sqlite3/sql.js fallback
3. Build Motion repository for CRUD operations
4. Implement documentation fetching and parsing service
5. Create rebuild script for downloading all documentation
6. Add FTS5 full-text search with LIKE fallback
7. Implement MCP tools for documentation access

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

**Status**: ✅ Production Ready  
**Next Steps**: Deploy to Claude Code and integrate with ClaudeUI agents

## SQLite Database Architecture

### Database Schema
The system uses a comprehensive SQLite schema:

```sql
-- Documentation pages
CREATE TABLE motion_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  framework TEXT NOT NULL CHECK (framework IN ('react', 'js', 'vue')),
  category TEXT,
  description TEXT,
  content TEXT NOT NULL,
  examples TEXT, -- JSON array
  api_reference TEXT, -- JSON object
  tags TEXT, -- JSON array
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Motion components and functions
CREATE TABLE motion_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  framework TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('component', 'function', 'hook', 'utility')),
  description TEXT,
  props TEXT, -- JSON object
  methods TEXT, -- JSON object
  examples TEXT, -- JSON array
  related_docs_id INTEGER,
  FOREIGN KEY (related_docs_id) REFERENCES motion_docs(id)
);

-- Code examples
CREATE TABLE motion_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  framework TEXT NOT NULL,
  category TEXT,
  code TEXT NOT NULL,
  tags TEXT, -- JSON array
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  related_docs_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_docs_id) REFERENCES motion_docs(id)
);
```

### Rebuild Process

1. **Initialize Database**: Create SQLite file with schema and FTS5 tables
2. **Fetch Documentation**: Download all React, JavaScript, and Vue docs
3. **Parse Content**: Extract HTML, convert to Markdown, identify components
4. **Store Data**: Save structured data with proper relationships
5. **Generate Examples**: Create framework-specific code examples
6. **Build Indexes**: Create FTS5 search indexes for fast queries
7. **Validate**: Check data integrity and provide statistics

### Performance Features

- **Connection Pooling**: Efficient database connection management
- **Prepared Statements**: SQL injection protection and performance
- **FTS5 Search**: Lightning-fast full-text search when available
- **Indexed Queries**: Optimized queries for common access patterns
- **Batch Operations**: Efficient bulk insertions during rebuild
- **Error Recovery**: Graceful handling of network and parsing errors

### Database Operations

```typescript
// Search documentation
const docs = repository.searchDocs('spring animation', {
  framework: 'react',
  limit: 10
});

// Get component API
const component = repository.getComponent('motion.div', 'react');

// Find examples by category
const examples = repository.getExamplesByCategory('animations', 'vue');

// Get statistics
const stats = repository.getStatistics();
// Returns: { totalDocs, totalComponents, totalExamples, frameworkCounts, hasFTS5 }
```