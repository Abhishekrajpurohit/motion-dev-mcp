import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';

/**
 * Unified database interface that abstracts better-sqlite3 and sql.js
 */
export interface DatabaseAdapter {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  close(): void;
  pragma(key: string, value?: any): any;
  readonly inTransaction: boolean;
  transaction<T>(fn: () => T): T;
  checkFTS5Support(): boolean;
}

export interface PreparedStatement {
  run(...params: any[]): RunResult;
  get(...params: any[]): any;
  all(...params: any[]): any[];
  iterate(...params: any[]): IterableIterator<any>;
  pluck(_toggle?: boolean): this;
  expand(_toggle?: boolean): this;
  raw(_toggle?: boolean): this;
  columns(): ColumnDefinition[];
  bind(...params: any[]): this;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface ColumnDefinition {
  name: string;
  column: string | null;
  table: string | null;
  database: string | null;
  type: string | null;
}

/**
 * Factory function to create a database adapter
 * Tries better-sqlite3 first, falls back to sql.js if needed
 */
export async function createDatabaseAdapter(dbPath: string): Promise<DatabaseAdapter> {
  const logger = Logger.getInstance();
  
  // Log Node.js version information
  if (process.env.MCP_MODE !== 'stdio') {
    logger.info(`Node.js version: ${process.version}`);
    logger.info(`Platform: ${process.platform} ${process.arch}`);
  }
  
  // First, try to use better-sqlite3
  try {
    if (process.env.MCP_MODE !== 'stdio') {
      logger.info('Attempting to use better-sqlite3...');
    }
    const adapter = await createBetterSQLiteAdapter(dbPath);
    if (process.env.MCP_MODE !== 'stdio') {
      logger.info('Successfully initialized better-sqlite3 adapter');
    }
    return adapter;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a version mismatch error
    if (errorMessage.includes('NODE_MODULE_VERSION') || errorMessage.includes('was compiled against a different Node.js version')) {
      if (process.env.MCP_MODE !== 'stdio') {
        logger.warn(`Node.js version mismatch detected. Better-sqlite3 was compiled for a different Node.js version.`);
        logger.warn(`Current Node.js version: ${process.version}`);
      }
    }
    
    if (process.env.MCP_MODE !== 'stdio') {
      logger.warn('Failed to initialize better-sqlite3, falling back to sql.js', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Fall back to sql.js
    try {
      const adapter = await createSQLJSAdapter(dbPath);
      if (process.env.MCP_MODE !== 'stdio') {
        logger.info('Successfully initialized sql.js adapter (pure JavaScript, no native dependencies)');
      }
      return adapter;
    } catch (sqlJsError) {
      if (process.env.MCP_MODE !== 'stdio') {
        logger.error('Failed to initialize sql.js adapter', sqlJsError instanceof Error ? sqlJsError : new Error(String(sqlJsError)));
      }
      throw new Error('Failed to initialize any database adapter');
    }
  }
}

/**
 * Create better-sqlite3 adapter
 */
async function createBetterSQLiteAdapter(dbPath: string): Promise<DatabaseAdapter> {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    
    return new BetterSQLiteAdapter(db);
  } catch (error) {
    throw new Error(`Failed to create better-sqlite3 adapter: ${error}`);
  }
}

/**
 * Create sql.js adapter with persistence
 */
async function createSQLJSAdapter(dbPath: string): Promise<DatabaseAdapter> {
  const logger = Logger.getInstance();
  let initSqlJs;
  
  try {
    initSqlJs = require('sql.js');
  } catch (error) {
    logger.error('Failed to load sql.js module:', error instanceof Error ? error : new Error(String(error)));
    throw new Error('sql.js module not found. This might be an issue with npm package installation.');
  }
  
  // Initialize sql.js
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        // Try multiple paths to find the WASM file
        const possiblePaths = [
          path.join(__dirname, '../../node_modules/sql.js/dist/', file),
          path.join(__dirname, '../../../sql.js/dist/', file),
          path.join(process.cwd(), 'node_modules/sql.js/dist/', file),
          path.join(path.dirname(require.resolve('sql.js')), '../dist/', file)
        ];
        
        // Find the first existing path
        for (const tryPath of possiblePaths) {
          if (fsSync.existsSync(tryPath)) {
            if (process.env.MCP_MODE !== 'stdio') {
              logger.debug(`Found WASM file at: ${tryPath}`);
            }
            return tryPath;
          }
        }
        
        // If not found, try the last resort - require.resolve
        try {
          const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
          if (process.env.MCP_MODE !== 'stdio') {
            logger.debug(`Found WASM file via require.resolve: ${wasmPath}`);
          }
          return wasmPath;
        } catch (e) {
          logger.warn(`Could not find WASM file, using default path: ${file}`);
          return file;
        }
      }
      return file;
    }
  });
  
  // Try to load existing database
  let db: any;
  try {
    const data = await fs.readFile(dbPath);
    db = new SQL.Database(new Uint8Array(data));
    logger.info(`Loaded existing database from ${dbPath}`);
  } catch (error) {
    // Create new database if file doesn't exist
    db = new SQL.Database();
    logger.info(`Created new database at ${dbPath}`);
  }
  
  return new SQLJSAdapter(db, dbPath);
}

/**
 * Adapter for better-sqlite3
 */
class BetterSQLiteAdapter implements DatabaseAdapter {
  constructor(private db: any) {}
  
  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    return new BetterSQLiteStatement(stmt);
  }
  
  exec(sql: string): void {
    this.db.exec(sql);
  }
  
  close(): void {
    this.db.close();
  }
  
  pragma(key: string, value?: any): any {
    return this.db.pragma(key, value);
  }
  
  get inTransaction(): boolean {
    return this.db.inTransaction;
  }
  
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
  
  checkFTS5Support(): boolean {
    try {
      this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS test_fts5 USING fts5(content);");
      this.exec("DROP TABLE IF EXISTS test_fts5;");
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Adapter for sql.js with persistence
 */
class SQLJSAdapter implements DatabaseAdapter {
  private saveTimer: NodeJS.Timeout | null = null;
  private logger = Logger.getInstance();
  
  constructor(private db: any, private dbPath: string) {
    this.scheduleSave();
  }
  
  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    this.scheduleSave();
    return new SQLJSStatement(stmt, () => this.scheduleSave());
  }
  
  exec(sql: string): void {
    this.db.exec(sql);
    this.scheduleSave();
  }
  
  close(): void {
    this.saveToFile();
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.db.close();
  }
  
  pragma(key: string, value?: any): any {
    if (key === 'journal_mode' && value === 'WAL') {
      return 'memory';
    }
    return null;
  }
  
  get inTransaction(): boolean {
    return false;
  }
  
  transaction<T>(fn: () => T): T {
    try {
      this.exec('BEGIN');
      const result = fn();
      this.exec('COMMIT');
      return result;
    } catch (error) {
      this.exec('ROLLBACK');
      throw error;
    }
  }
  
  checkFTS5Support(): boolean {
    try {
      this.exec("CREATE VIRTUAL TABLE IF NOT EXISTS test_fts5 USING fts5(content);");
      this.exec("DROP TABLE IF EXISTS test_fts5;");
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.saveToFile();
    }, 100);
  }
  
  private saveToFile(): void {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fsSync.writeFileSync(this.dbPath, buffer);
      this.logger.debug(`Database saved to ${this.dbPath}`);
    } catch (error) {
      this.logger.error('Failed to save database', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Statement wrapper for better-sqlite3
 */
class BetterSQLiteStatement implements PreparedStatement {
  constructor(private stmt: any) {}
  
  run(...params: any[]): RunResult {
    return this.stmt.run(...params);
  }
  
  get(...params: any[]): any {
    return this.stmt.get(...params);
  }
  
  all(...params: any[]): any[] {
    return this.stmt.all(...params);
  }
  
  iterate(...params: any[]): IterableIterator<any> {
    return this.stmt.iterate(...params);
  }
  
  pluck(_toggle?: boolean): this {
    this.stmt.pluck(_toggle);
    return this;
  }
  
  expand(_toggle?: boolean): this {
    this.stmt.expand(_toggle);
    return this;
  }
  
  raw(_toggle?: boolean): this {
    this.stmt.raw(_toggle);
    return this;
  }
  
  columns(): ColumnDefinition[] {
    return this.stmt.columns();
  }
  
  bind(...params: any[]): this {
    this.stmt.bind(...params);
    return this;
  }
}

/**
 * Statement wrapper for sql.js
 */
class SQLJSStatement implements PreparedStatement {
  private boundParams: any = null;
  
  constructor(private stmt: any, private onModify: () => void) {}
  
  run(...params: any[]): RunResult {
    if (params.length > 0) {
      this.bindParams(params);
      this.stmt.bind(this.boundParams);
    }
    
    this.stmt.run();
    this.onModify();
    
    return {
      changes: 0,
      lastInsertRowid: 0
    };
  }
  
  get(...params: any[]): any {
    if (params.length > 0) {
      this.bindParams(params);
    }
    
    this.stmt.bind(this.boundParams);
    
    if (this.stmt.step()) {
      const result = this.stmt.getAsObject();
      this.stmt.reset();
      return this.convertTypes(result);
    }
    
    this.stmt.reset();
    return undefined;
  }
  
  all(...params: any[]): any[] {
    if (params.length > 0) {
      this.bindParams(params);
    }
    
    this.stmt.bind(this.boundParams);
    
    const results: any[] = [];
    while (this.stmt.step()) {
      results.push(this.convertTypes(this.stmt.getAsObject()));
    }
    
    this.stmt.reset();
    return results;
  }
  
  iterate(...params: any[]): IterableIterator<any> {
    return this.all(...params)[Symbol.iterator]();
  }
  
  pluck(_toggle?: boolean): this {
    return this;
  }
  
  expand(_toggle?: boolean): this {
    return this;
  }
  
  raw(_toggle?: boolean): this {
    return this;
  }
  
  columns(): ColumnDefinition[] {
    return [];
  }
  
  bind(...params: any[]): this {
    this.bindParams(params);
    return this;
  }
  
  private bindParams(params: any[]): void {
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      this.boundParams = params[0];
    } else {
      this.boundParams = params;
    }
  }
  
  private convertTypes(row: any): any {
    if (!row) return row;
    
    const converted = { ...row };
    const integerColumns = ['is_deprecated', 'is_react', 'is_js', 'is_vue'];
    
    for (const col of integerColumns) {
      if (col in converted && typeof converted[col] === 'string') {
        converted[col] = parseInt(converted[col], 10);
      }
    }
    
    return converted;
  }
}