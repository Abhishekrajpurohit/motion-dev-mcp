#!/usr/bin/env node
/**
 * Motion.dev Documentation Rebuild Script
 * Downloads and processes all Motion.dev documentation for offline use
 */

import * as fs from 'fs';
import * as path from 'path';
import { createDatabaseAdapter } from '../database/database-adapter';
import { MotionRepository } from '../database/motion-repository';
import { MotionDocumentationFetcher } from './motion-doc-fetcher';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

interface RebuildStats {
  totalPages: number;
  successful: number;
  failed: number;
  reactDocs: number;
  jsDocs: number;
  vueDocs: number;
  examples: number;
  components: number;
  withApiReference: number;
}

async function rebuild() {
  logger.info('🚀 Rebuilding Motion.dev documentation database...');
  
  const dbPath = process.env.MOTION_DB_PATH || './docs/motion-docs.db';
  const db = await createDatabaseAdapter(dbPath);
  const repository = new MotionRepository(db);
  const fetcher = new MotionDocumentationFetcher();
  
  // Initialize database with schema
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  
  // Clear existing data
  db.exec('DELETE FROM motion_docs');
  db.exec('DELETE FROM motion_components'); 
  db.exec('DELETE FROM motion_examples');
  logger.info('🗑️  Cleared existing documentation data\n');
  
  const stats: RebuildStats = {
    totalPages: 0,
    successful: 0,
    failed: 0,
    reactDocs: 0,
    jsDocs: 0,
    vueDocs: 0,
    examples: 0,
    components: 0,
    withApiReference: 0
  };

  // Motion.dev documentation URLs to fetch
  const documentationUrls = await fetcher.getDocumentationUrls();
  stats.totalPages = documentationUrls.length;
  
  logger.info(`📚 Found ${documentationUrls.length} documentation pages to process\n`);

  // Process each documentation page
  for (const urlInfo of documentationUrls) {
    try {
      logger.info(`📄 Processing: ${urlInfo.url} (${urlInfo.framework})`);
      
      const docData = await fetcher.fetchDocumentationPage(urlInfo);
      
      if (!docData) {
        throw new Error('Failed to fetch documentation data');
      }

      // Save main documentation
      repository.saveDoc(docData.doc);
      
      // Save components if found
      if (docData.components && docData.components.length > 0) {
        for (const component of docData.components) {
          repository.saveComponent(component);
        }
        stats.components += docData.components.length;
      }
      
      // Save examples if found  
      if (docData.examples && docData.examples.length > 0) {
        for (const example of docData.examples) {
          repository.saveExample(example);
        }
        stats.examples += docData.examples.length;
      }
      
      // Update stats
      stats.successful++;
      if (docData.doc.framework === 'react') stats.reactDocs++;
      if (docData.doc.framework === 'js') stats.jsDocs++;
      if (docData.doc.framework === 'vue') stats.vueDocs++;
      if (docData.doc.apiReference) stats.withApiReference++;
      
      logger.info(`  ✅ Saved: ${docData.doc.title} [Components: ${docData.components?.length || 0}, Examples: ${docData.examples?.length || 0}]`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      stats.failed++;
      logger.error(`  ❌ Failed to process ${urlInfo.url}: ${(error as Error).message}`);
    }
  }

  // Validation check
  logger.info('\n🔍 Running validation checks...');
  const validationResults = await validateDatabase(repository);
  
  // Summary
  logger.info('\n📊 Rebuild Summary:');
  logger.info(`   Total pages: ${stats.totalPages}`);
  logger.info(`   Successful: ${stats.successful}`);
  logger.info(`   Failed: ${stats.failed}`);
  logger.info(`   React docs: ${stats.reactDocs}`);
  logger.info(`   JavaScript docs: ${stats.jsDocs}`);
  logger.info(`   Vue docs: ${stats.vueDocs}`);
  logger.info(`   Components: ${stats.components}`);
  logger.info(`   Examples: ${stats.examples}`);
  logger.info(`   With API reference: ${stats.withApiReference}`);
  
  if (!validationResults.passed) {
    logger.info('\n⚠️  Validation Issues:');
    validationResults.issues.forEach(issue => logger.info(`   • ${issue}`));
  }
  
  // Final database statistics
  const dbStats = repository.getStatistics();
  logger.info('\n💾 Final Database Statistics:');
  logger.info(`   Total docs: ${dbStats.totalDocs}`);
  logger.info(`   Total components: ${dbStats.totalComponents}`);
  logger.info(`   Total examples: ${dbStats.totalExamples}`);
  logger.info(`   FTS5 support: ${dbStats.hasFTS5 ? 'Yes' : 'No'}`);
  
  if (dbStats.frameworkCounts && dbStats.frameworkCounts.length > 0) {
    logger.info('   Framework breakdown:');
    dbStats.frameworkCounts.forEach((count: { framework: string, count: number }) => {
      logger.info(`     ${count.framework}: ${count.count}`);
    });
  }
  
  db.close();
  logger.info('\n✨ Rebuild completed successfully!');
}

async function validateDatabase(repository: MotionRepository) {
  const issues: string[] = [];
  let passed = true;
  
  try {
    // Check for empty database
    const stats = repository.getStatistics();
    if (stats.totalDocs === 0) {
      issues.push('No documents found in database');
      passed = false;
    }
    
    // Check framework distribution
    if (stats.frameworkCounts) {
      const frameworks = stats.frameworkCounts.map((fc: { framework: string }) => fc.framework);
      const requiredFrameworks: string[] = ['react', 'js', 'vue'];
      
      for (const framework of requiredFrameworks) {
        if (!frameworks.includes(framework)) {
          issues.push(`Missing documentation for framework: ${framework}`);
          passed = false;
        }
      }
    }
    
    // Check for essential documentation
    const essentialDocs = [
      'https://motion.dev/docs/react',
      'https://motion.dev/docs/quick-start',
      'https://motion.dev/docs/vue'
    ];
    
    for (const url of essentialDocs) {
      const doc = repository.getDocByUrl(url);
      if (!doc) {
        issues.push(`Missing essential documentation: ${url}`);
        passed = false;
      }
    }
    
  } catch (error) {
    issues.push(`Validation error: ${(error as Error).message}`);
    passed = false;
  }
  
  return { passed, issues };
}

// Run rebuild if this script is executed directly
if (require.main === module) {
  rebuild().catch(error => {
    logger.error('\n💥 Rebuild failed:', error);
    process.exit(1);
  });
}

export { rebuild };