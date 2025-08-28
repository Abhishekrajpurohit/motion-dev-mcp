-- Motion.dev MCP Documentation Database Schema
-- Stores Motion.dev documentation, examples, and component information

-- Main documentation table
CREATE TABLE IF NOT EXISTS motion_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  framework TEXT NOT NULL CHECK(framework IN ('react', 'js', 'vue')),
  category TEXT,
  description TEXT,
  content TEXT NOT NULL,
  examples TEXT, -- JSON array of code examples
  api_reference TEXT, -- JSON object of API information
  is_deprecated INTEGER DEFAULT 0,
  is_react INTEGER DEFAULT 0,
  is_js INTEGER DEFAULT 0,
  is_vue INTEGER DEFAULT 0,
  tags TEXT, -- JSON array of tags
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Component/API reference table
CREATE TABLE IF NOT EXISTS motion_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  framework TEXT NOT NULL CHECK(framework IN ('react', 'js', 'vue')),
  type TEXT CHECK(type IN ('component', 'function', 'hook', 'utility')),
  description TEXT,
  props TEXT, -- JSON object of props/parameters
  methods TEXT, -- JSON array of methods
  examples TEXT, -- JSON array of examples
  related_docs_id INTEGER,
  FOREIGN KEY (related_docs_id) REFERENCES motion_docs(id)
);

-- Examples and patterns table
CREATE TABLE IF NOT EXISTS motion_examples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  framework TEXT NOT NULL CHECK(framework IN ('react', 'js', 'vue')),
  category TEXT,
  code TEXT NOT NULL,
  tags TEXT, -- JSON array of tags
  difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  related_docs_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (related_docs_id) REFERENCES motion_docs(id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_motion_docs_framework ON motion_docs(framework);
CREATE INDEX IF NOT EXISTS idx_motion_docs_category ON motion_docs(category);
CREATE INDEX IF NOT EXISTS idx_motion_docs_url ON motion_docs(url);
CREATE INDEX IF NOT EXISTS idx_motion_components_framework ON motion_components(framework);
CREATE INDEX IF NOT EXISTS idx_motion_components_name ON motion_components(name);
CREATE INDEX IF NOT EXISTS idx_motion_examples_framework ON motion_examples(framework);
CREATE INDEX IF NOT EXISTS idx_motion_examples_category ON motion_examples(category);

-- Full-text search tables (created conditionally at runtime if FTS5 is supported)
-- CREATE VIRTUAL TABLE motion_docs_fts USING fts5(title, description, content, tags);
-- CREATE VIRTUAL TABLE motion_examples_fts USING fts5(title, description, code, tags);