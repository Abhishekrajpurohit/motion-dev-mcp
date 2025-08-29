import { DatabaseAdapter } from './database-adapter';
import { Logger } from '../utils/logger';

/**
 * Motion.dev documentation types
 */
export interface MotionDoc {
  id?: number;
  url: string;
  title: string;
  framework: 'react' | 'js' | 'vue';
  category?: string;
  description?: string;
  content: string;
  examples?: string; // JSON string
  apiReference?: string; // JSON string
  isDeprecated?: boolean;
  isReact?: boolean;
  isJs?: boolean;
  isVue?: boolean;
  tags?: string; // JSON string
  lastUpdated?: string;
  createdAt?: string;
}

export interface MotionComponent {
  id?: number;
  name: string;
  framework: 'react' | 'js' | 'vue';
  type: 'component' | 'function' | 'hook' | 'utility';
  description?: string;
  props?: string; // JSON string
  methods?: string; // JSON string
  examples?: string; // JSON string
  relatedDocsId?: number;
}

export interface MotionExample {
  id?: number;
  title: string;
  description?: string;
  framework: 'react' | 'js' | 'vue';
  category?: string;
  code: string;
  tags?: string; // JSON string
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  relatedDocsId?: number;
  createdAt?: string;
}

export interface SearchOptions {
  framework?: 'react' | 'js' | 'vue';
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Repository for Motion.dev documentation data
 */
export class MotionRepository {
  private db: DatabaseAdapter;
  private logger = Logger.getInstance();
  private hasFTS5: boolean = false;

  constructor(db: DatabaseAdapter) {
    this.db = db;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      // Read and execute schema
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema);
      
      // Check FTS5 support and create FTS tables if available
      this.hasFTS5 = this.db.checkFTS5Support();
      if (this.hasFTS5) {
        this.initializeFTS5();
      }
      
      this.logger.info(`Motion.dev database initialized. FTS5 support: ${this.hasFTS5}`);
    } catch (error) {
      this.logger.error('Failed to initialize Motion.dev database', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private initializeFTS5(): void {
    try {
      // Create FTS5 tables for full-text search
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS motion_docs_fts USING fts5(
          title, description, content, tags,
          content='motion_docs',
          content_rowid='id'
        );
        
        CREATE VIRTUAL TABLE IF NOT EXISTS motion_examples_fts USING fts5(
          title, description, code, tags,
          content='motion_examples',
          content_rowid='id'
        );
        
        -- Triggers to keep FTS in sync
        CREATE TRIGGER IF NOT EXISTS motion_docs_fts_insert AFTER INSERT ON motion_docs BEGIN
          INSERT INTO motion_docs_fts(rowid, title, description, content, tags)
          VALUES (new.id, new.title, new.description, new.content, new.tags);
        END;
        
        CREATE TRIGGER IF NOT EXISTS motion_docs_fts_delete AFTER DELETE ON motion_docs BEGIN
          DELETE FROM motion_docs_fts WHERE rowid = old.id;
        END;
        
        CREATE TRIGGER IF NOT EXISTS motion_docs_fts_update AFTER UPDATE ON motion_docs BEGIN
          DELETE FROM motion_docs_fts WHERE rowid = old.id;
          INSERT INTO motion_docs_fts(rowid, title, description, content, tags)
          VALUES (new.id, new.title, new.description, new.content, new.tags);
        END;
        
        CREATE TRIGGER IF NOT EXISTS motion_examples_fts_insert AFTER INSERT ON motion_examples BEGIN
          INSERT INTO motion_examples_fts(rowid, title, description, code, tags)
          VALUES (new.id, new.title, new.description, new.code, new.tags);
        END;
        
        CREATE TRIGGER IF NOT EXISTS motion_examples_fts_delete AFTER DELETE ON motion_examples BEGIN
          DELETE FROM motion_examples_fts WHERE rowid = old.id;
        END;
        
        CREATE TRIGGER IF NOT EXISTS motion_examples_fts_update AFTER UPDATE ON motion_examples BEGIN
          DELETE FROM motion_examples_fts WHERE rowid = old.id;
          INSERT INTO motion_examples_fts(rowid, title, description, code, tags)
          VALUES (new.id, new.title, new.description, new.code, new.tags);
        END;
      `);
    } catch (error) {
      this.logger.warn('Failed to initialize FTS5 tables', { error: error instanceof Error ? error.message : String(error) });
      this.hasFTS5 = false;
    }
  }

  /**
   * Save documentation entry
   */
  saveDoc(doc: MotionDoc): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO motion_docs (
        url, title, framework, category, description, content,
        examples, api_reference, is_deprecated, is_react, is_js, is_vue,
        tags, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      doc.url,
      doc.title,
      doc.framework,
      doc.category || null,
      doc.description || null,
      doc.content,
      doc.examples || null,
      doc.apiReference || null,
      doc.isDeprecated ? 1 : 0,
      doc.isReact ? 1 : 0,
      doc.isJs ? 1 : 0,
      doc.isVue ? 1 : 0,
      doc.tags || null
    );
  }

  /**
   * Get documentation by URL
   */
  getDocByUrl(url: string): MotionDoc | null {
    const stmt = this.db.prepare(`
      SELECT * FROM motion_docs WHERE url = ?
    `);
    
    const row = stmt.get(url);
    if (!row) return null;
    
    return this.mapDocRow(row);
  }

  /**
   * Get documentation by ID
   */
  getDocById(id: number): MotionDoc | null {
    const stmt = this.db.prepare(`
      SELECT * FROM motion_docs WHERE id = ?
    `);
    
    const row = stmt.get(id);
    if (!row) return null;
    
    return this.mapDocRow(row);
  }

  /**
   * Search documentation
   */
  searchDocs(query: string, options: SearchOptions = {}): MotionDoc[] {
    const { framework, category, limit = 20, offset = 0 } = options;

    let sql: string;
    let params: any[] = [];

    if (this.hasFTS5 && query.trim()) {
      // Use FTS5 for full-text search
      sql = `
        SELECT d.* FROM motion_docs d
        JOIN motion_docs_fts fts ON d.id = fts.rowid
        WHERE motion_docs_fts MATCH ?
      `;
      params.push(query);
    } else {
      // Fallback to LIKE search
      sql = `
        SELECT * FROM motion_docs
        WHERE (title LIKE ? OR description LIKE ? OR content LIKE ?)
      `;
      const likeQuery = `%${query}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }

    // Add filters
    if (framework) {
      sql += ` AND framework = ?`;
      params.push(framework);
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY last_updated DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapDocRow(row));
  }

  /**
   * Get all documentation for a framework
   */
  getDocsByFramework(framework: 'react' | 'js' | 'vue', options: SearchOptions = {}): MotionDoc[] {
    const { category, limit = 100, offset = 0 } = options;
    
    let sql = `SELECT * FROM motion_docs WHERE framework = ?`;
    let params: any[] = [framework];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY title LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapDocRow(row));
  }

  /**
   * Get documentation categories
   */
  getCategories(framework?: 'react' | 'js' | 'vue'): string[] {
    let sql = `SELECT DISTINCT category FROM motion_docs WHERE category IS NOT NULL`;
    let params: any[] = [];

    if (framework) {
      sql += ` AND framework = ?`;
      params.push(framework);
    }

    sql += ` ORDER BY category`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map((row: any) => row.category);
  }

  /**
   * Save component information
   */
  saveComponent(component: MotionComponent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO motion_components (
        name, framework, type, description, props, methods, examples, related_docs_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      component.name,
      component.framework,
      component.type,
      component.description || null,
      component.props || null,
      component.methods || null,
      component.examples || null,
      component.relatedDocsId || null
    );
  }

  /**
   * Get component by name and framework
   */
  getComponent(name: string, framework: 'react' | 'js' | 'vue'): MotionComponent | null {
    const stmt = this.db.prepare(`
      SELECT * FROM motion_components WHERE name = ? AND framework = ?
    `);
    
    const row = stmt.get(name, framework);
    if (!row) return null;
    
    return this.mapComponentRow(row);
  }

  /**
   * Save example
   */
  saveExample(example: MotionExample): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO motion_examples (
        title, description, framework, category, code, tags, difficulty, related_docs_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      example.title,
      example.description || null,
      example.framework,
      example.category || null,
      example.code,
      example.tags || null,
      example.difficulty || null,
      example.relatedDocsId || null
    );
  }

  /**
   * Search examples
   */
  searchExamples(query: string, options: SearchOptions = {}): MotionExample[] {
    const { framework, category, limit = 20, offset = 0 } = options;

    let sql: string;
    let params: any[] = [];

    // Check if query contains FTS5 special characters
    const hasFTSSpecialChars = /[.()&|"*:]/.test(query);
    
    if (this.hasFTS5 && query.trim() && !hasFTSSpecialChars) {
      // Use FTS5 for clean queries
      sql = `
        SELECT e.* FROM motion_examples e
        JOIN motion_examples_fts fts ON e.id = fts.rowid
        WHERE motion_examples_fts MATCH ?
      `;
      params.push(query);
    } else {
      // Fall back to LIKE for special characters or when FTS5 is not available
      sql = `
        SELECT * FROM motion_examples
        WHERE (title LIKE ? OR description LIKE ? OR code LIKE ?)
      `;
      const likeQuery = `%${query}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }

    if (framework) {
      sql += ` AND framework = ?`;
      params.push(framework);
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapExampleRow(row));
  }

  /**
   * Get examples by category
   */
  getExamplesByCategory(category: string, framework?: 'react' | 'js' | 'vue'): MotionExample[] {
    let sql = `SELECT * FROM motion_examples WHERE category = ?`;
    let params: any[] = [category];

    if (framework) {
      sql += ` AND framework = ?`;
      params.push(framework);
    }

    sql += ` ORDER BY title`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapExampleRow(row));
  }

  /**
   * Get database statistics
   */
  getStatistics() {
    const docsCount = this.db.prepare(`SELECT COUNT(*) as count FROM motion_docs`).get();
    const componentsCount = this.db.prepare(`SELECT COUNT(*) as count FROM motion_components`).get();
    const examplesCount = this.db.prepare(`SELECT COUNT(*) as count FROM motion_examples`).get();
    
    const frameworkCounts = this.db.prepare(`
      SELECT framework, COUNT(*) as count FROM motion_docs GROUP BY framework
    `).all();

    return {
      totalDocs: docsCount.count,
      totalComponents: componentsCount.count,
      totalExamples: examplesCount.count,
      frameworkCounts,
      hasFTS5: this.hasFTS5
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private mapDocRow(row: any): MotionDoc {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      framework: row.framework,
      category: row.category,
      description: row.description,
      content: row.content,
      examples: row.examples,
      apiReference: row.api_reference,
      isDeprecated: !!row.is_deprecated,
      isReact: !!row.is_react,
      isJs: !!row.is_js,
      isVue: !!row.is_vue,
      tags: row.tags,
      lastUpdated: row.last_updated,
      createdAt: row.created_at
    };
  }

  private mapComponentRow(row: any): MotionComponent {
    return {
      id: row.id,
      name: row.name,
      framework: row.framework,
      type: row.type,
      description: row.description,
      props: row.props,
      methods: row.methods,
      examples: row.examples,
      relatedDocsId: row.related_docs_id
    };
  }

  private mapExampleRow(row: any): MotionExample {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      framework: row.framework,
      category: row.category,
      code: row.code,
      tags: row.tags,
      difficulty: row.difficulty,
      relatedDocsId: row.related_docs_id,
      createdAt: row.created_at
    };
  }

}