import { DatabaseAdapter, createDatabaseAdapter } from '../database/database-adapter';
import { MotionRepository, MotionDoc, MotionComponent, MotionExample } from '../database/motion-repository';
import { DocumentationFetcher } from '../docs/fetcher';
import { Logger } from '../utils/logger';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

/**
 * Service for managing Motion.dev documentation in SQLite database
 */
export class MotionDocService {
  private repository!: MotionRepository;
  private fetcher: DocumentationFetcher;
  private logger = Logger.getInstance();
  private turndown = new TurndownService();
  private db!: DatabaseAdapter;
  private initialized = false;
  private initializationPromise?: Promise<void>;

  constructor(fetcher?: DocumentationFetcher, _cache?: any, dbPath: string = 'docs/motion-docs.db') {
    this.fetcher = fetcher || new DocumentationFetcher();
    this.setupTurndown();
    this.initializationPromise = this.initializeDatabase(dbPath);
  }

  private async initializeDatabase(dbPath: string): Promise<void> {
    try {
      this.db = await createDatabaseAdapter(dbPath);
      this.repository = new MotionRepository(this.db);
      this.initialized = true;
      this.logger.info('Motion.dev documentation database initialized');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize Motion.dev database', new Error(errorMessage));
      throw new Error(`Database initialization failed: ${errorMessage}`);
    }
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initialized && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private setupTurndown(): void {
    // Configure Turndown for better Markdown conversion
    this.turndown.addRule('codeBlock', {
      filter: ['pre'],
      replacement: (content, node) => {
        const code = node.querySelector('code');
        if (code) {
          const className = code.getAttribute('class') || '';
          const language = className.replace('language-', '').replace('hljs', '').trim();
          return `\`\`\`${language}\n${code.textContent}\n\`\`\``;
        }
        return `\`\`\`\n${content}\n\`\`\``;
      }
    });

    this.turndown.addRule('inlineCode', {
      filter: ['code'],
      replacement: (content) => `\`${content}\``
    });
  }

  /**
   * Populate database with Motion.dev documentation
   */
  async populateDatabase(): Promise<void> {
    this.logger.info('Starting Motion.dev documentation population...');
    
    try {
      await this.populateReactDocs();
      await this.populateJSDocs();
      await this.populateVueDocs();
      await this.populateExamples();
      
      const stats = this.repository.getStatistics();
      this.logger.info('Documentation population completed', stats);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to populate documentation database', new Error(errorMessage));
      throw new Error(`Documentation population failed: ${errorMessage}`);
    }
  }

  /**
   * Populate React documentation
   */
  private async populateReactDocs(): Promise<void> {
    this.logger.info('Populating React documentation...');
    
    const reactEndpoints = [
      '/docs/react',
      '/docs/react-animation',
      '/docs/react-gestures',
      '/docs/react-layout-animations',
      '/docs/react-scroll-animations',
      '/docs/react-exit-animations',
      '/docs/react-motion-values',
      '/docs/react-animate-presence',
      '/docs/react-drag',
      '/docs/react-in-view'
    ];

    for (const endpoint of reactEndpoints) {
      try {
        await this.fetchAndStoreDocs(endpoint, 'react');
        await this.sleep(100); // Rate limiting
      } catch (error) {
        this.logger.warn(`Failed to fetch React docs for ${endpoint}:`, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Populate JavaScript documentation
   */
  private async populateJSDocs(): Promise<void> {
    this.logger.info('Populating JavaScript documentation...');
    
    const jsEndpoints = [
      '/docs/quick-start',
      '/docs/animate',
      '/docs/scroll',
      '/docs/spring',
      '/docs/timeline',
      '/docs/stagger',
      '/docs/velocity'
    ];

    for (const endpoint of jsEndpoints) {
      try {
        await this.fetchAndStoreDocs(endpoint, 'js');
        await this.sleep(100); // Rate limiting
      } catch (error) {
        this.logger.warn(`Failed to fetch JS docs for ${endpoint}:`, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Populate Vue documentation
   */
  private async populateVueDocs(): Promise<void> {
    this.logger.info('Populating Vue documentation...');
    
    const vueEndpoints = [
      '/docs/vue',
      '/docs/vue-animation',
      '/docs/vue-gestures'
    ];

    for (const endpoint of vueEndpoints) {
      try {
        await this.fetchAndStoreDocs(endpoint, 'vue');
        await this.sleep(100); // Rate limiting
      } catch (error) {
        this.logger.warn(`Failed to fetch Vue docs for ${endpoint}:`, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Fetch and store documentation for a specific endpoint
   */
  private async fetchAndStoreDocs(endpoint: string, framework: 'react' | 'js' | 'vue'): Promise<void> {
    try {
      const url = `https://motion.dev${endpoint}`;
      const response = await this.fetcher.fetchDoc(url);
      const content = response.success && response.document ? response.document.content : null;
      
      if (!content) {
        this.logger.warn(`No content found for ${url}`);
        return;
      }

      const $ = cheerio.load(content || '');
      
      // Extract documentation data
      const title = $('h1').first().text().trim() || endpoint.replace('/docs/', '').replace('-', ' ');
      const description = $('meta[name="description"]').attr('content') || $('p').first().text().trim();
      
      // Extract main content (remove navigation, header, footer)
      $('nav, header, footer, .navigation, .sidebar').remove();
      const mainContent = $('main, .content, article, .docs-content').html() || $('body').html();
      
      if (!mainContent) {
        this.logger.warn(`No main content found for ${url}`);
        return;
      }

      // Convert HTML to Markdown
      const markdownContent = this.turndown.turndown(mainContent);
      
      // Extract code examples
      const examples = this.extractCodeExamples($, framework);
      
      // Extract API reference if present
      const apiReference = this.extractApiReference($);
      
      // Determine category from URL
      const category = this.categorizeEndpoint(endpoint);
      
      // Create documentation entry
      const doc: MotionDoc = {
        url,
        title,
        framework,
        category,
        description,
        content: markdownContent,
        examples: examples.length > 0 ? JSON.stringify(examples) : undefined,
        apiReference: apiReference ? JSON.stringify(apiReference) : undefined,
        isReact: framework === 'react',
        isJs: framework === 'js',
        isVue: framework === 'vue',
        tags: JSON.stringify(this.extractTags(endpoint, title, markdownContent))
      };

      // Save to database
      this.repository.saveDoc(doc);
      
      // Extract and save components
      const components = this.extractComponents($, framework);
      for (const component of components) {
        this.repository.saveComponent(component);
      }

      this.logger.debug(`Saved documentation for ${url}`);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch and store docs for ${endpoint}:`, new Error(errorMessage));
    }
  }

  /**
   * Extract code examples from documentation
   */
  private extractCodeExamples($: any, framework: 'react' | 'js' | 'vue'): any[] {
    const examples: any[] = [];
    
    $('pre code, .code-block code').each((_i: number, element: any) => {
      const code = $(element).text().trim();
      if (code && code.length > 10) { // Filter out very short code snippets
        const language = $(element).attr('class')?.replace('language-', '') || framework;
        
        examples.push({
          title: `Example ${_i + 1}`,
          code,
          language,
          framework
        });
      }
    });
    
    return examples;
  }

  /**
   * Extract API reference information
   */
  private extractApiReference($: any): any | null {
    const apiSections = $('.api-reference, .props-table, .method-table');
    if (apiSections.length === 0) return null;
    
    const apiInfo: any = {
      props: [],
      methods: [],
      types: []
    };

    // Extract props/parameters
    $('.props-table tr, .api-table tr').each((_i: number, row: any) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const name = $(cells[0]).text().trim();
        const description = $(cells[1]).text().trim();
        const type = cells.length > 2 ? $(cells[2]).text().trim() : 'unknown';
        
        if (name && description) {
          apiInfo.props.push({ name, type, description });
        }
      }
    });

    return apiInfo.props.length > 0 || apiInfo.methods.length > 0 ? apiInfo : null;
  }

  /**
   * Extract component information
   */
  private extractComponents($: any, framework: 'react' | 'js' | 'vue'): MotionComponent[] {
    const components: MotionComponent[] = [];
    
    // Extract component names from headings and code examples
    const componentNames = new Set<string>();
    
    // Look for common Motion.dev components in headings
    $('h1, h2, h3').each((_i: number, element: any) => {
      const heading = $(element).text().trim();
      const motionComponents = heading.match(/(motion\.\w+|animate|spring|scroll|timeline|stagger)/gi);
      if (motionComponents) {
        motionComponents.forEach((name: string) => componentNames.add(name));
      }
    });
    
    // Look for components in code examples
    $('code').each((_i: number, element: any) => {
      const code = $(element).text();
      const motionComponents = code.match(/(motion\.\w+|animate\(|spring\(|scroll\(|timeline\(|stagger\()/g);
      if (motionComponents) {
        motionComponents.forEach((match: string) => {
          const name = match.replace('(', '');
          componentNames.add(name);
        });
      }
    });
    
    // Create component entries
    componentNames.forEach(name => {
      if (name && name.length > 2) {
        const component: MotionComponent = {
          name,
          framework,
          type: name.startsWith('motion.') ? 'component' : 'function',
          description: `Motion.dev ${name} component/function`,
        };
        components.push(component);
      }
    });
    
    return components;
  }

  /**
   * Populate examples database
   */
  private async populateExamples(): Promise<void> {
    this.logger.info('Populating examples...');
    
    // Create some basic examples for each framework
    const exampleTemplates = [
      {
        title: 'Basic Animation',
        description: 'Simple fade in animation',
        category: 'basic',
        difficulty: 'beginner' as const,
        examples: {
          react: `import { motion } from "motion/react";

export function FadeIn() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      Hello World
    </motion.div>
  );
}`,
          js: `import { animate } from "motion";

animate(".fade-in", 
  { opacity: [0, 1] }, 
  { duration: 0.5 }
);`,
          vue: `<template>
  <Motion
    :initial="{ opacity: 0 }"
    :animate="{ opacity: 1 }"
    :transition="{ duration: 0.5 }"
  >
    Hello World
  </Motion>
</template>

<script setup>
import { Motion } from "motion/vue";
</script>`
        }
      },
      {
        title: 'Spring Animation',
        description: 'Bouncy spring animation',
        category: 'springs',
        difficulty: 'intermediate' as const,
        examples: {
          react: `import { motion } from "motion/react";

export function SpringAnimation() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 100,
        damping: 10
      }}
    >
      Spring Animation
    </motion.div>
  );
}`,
          js: `import { animate } from "motion";

animate(".spring", 
  { scale: [0, 1] }, 
  { 
    type: "spring",
    stiffness: 100,
    damping: 10
  }
);`,
          vue: `<template>
  <Motion
    :initial="{ scale: 0 }"
    :animate="{ scale: 1 }"
    :transition="{ 
      type: 'spring',
      stiffness: 100,
      damping: 10
    }"
  >
    Spring Animation
  </Motion>
</template>`
        }
      }
    ];

    for (const template of exampleTemplates) {
      for (const [framework, code] of Object.entries(template.examples)) {
        const example: MotionExample = {
          title: `${template.title} (${framework.toUpperCase()})`,
          description: template.description,
          framework: framework as 'react' | 'js' | 'vue',
          category: template.category,
          code,
          difficulty: template.difficulty,
          tags: JSON.stringify([framework, template.category, template.difficulty])
        };
        
        this.repository.saveExample(example);
      }
    }
  }

  /**
   * Categorize documentation endpoint
   */
  private categorizeEndpoint(endpoint: string): string {
    if (endpoint.includes('animation')) return 'animations';
    if (endpoint.includes('gesture')) return 'gestures';
    if (endpoint.includes('scroll')) return 'scroll';
    if (endpoint.includes('layout')) return 'layout';
    if (endpoint.includes('spring')) return 'springs';
    if (endpoint.includes('drag')) return 'gestures';
    if (endpoint.includes('quick-start')) return 'getting-started';
    return 'general';
  }

  /**
   * Extract tags from documentation
   */
  private extractTags(endpoint: string, title: string, content: string): string[] {
    const tags = new Set<string>();
    
    // Add framework-specific tags
    if (endpoint.includes('react')) tags.add('react');
    if (endpoint.includes('vue')) tags.add('vue');
    if (endpoint.includes('js') || endpoint.includes('javascript')) tags.add('javascript');
    
    // Add feature tags based on content
    const features = [
      'animation', 'gesture', 'scroll', 'spring', 'drag', 'layout',
      'keyframes', 'timeline', 'stagger', 'motion-values', 'variants'
    ];
    
    for (const feature of features) {
      if (title.toLowerCase().includes(feature) || content.toLowerCase().includes(feature)) {
        tags.add(feature);
      }
    }
    
    return Array.from(tags);
  }

  /**
   * Get documentation by URL
   */
  async getDocumentation(url: string): Promise<MotionDoc | null> {
    return this.repository.getDocByUrl(url);
  }

  /**
   * Search documentation
   */
  async searchDocumentation(query: string, options?: { framework?: 'react' | 'js' | 'vue'; category?: string; limit?: number }): Promise<MotionDoc[]> {
    return this.repository.searchDocs(query, options);
  }

  /**
   * Get component information
   */
  async getComponent(name: string, framework: 'react' | 'js' | 'vue'): Promise<MotionComponent | null> {
    return this.repository.getComponent(name, framework);
  }

  /**
   * Search examples
   */
  async searchExamples(query: string, options?: { framework?: 'react' | 'js' | 'vue'; category?: string; limit?: number }): Promise<MotionExample[]> {
    return this.repository.searchExamples(query, options);
  }

  /**
   * Get examples by category
   */
  async getExamplesByCategory(category: string, framework?: 'react' | 'js' | 'vue'): Promise<MotionExample[]> {
    return this.repository.getExamplesByCategory(category, framework);
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    await this.ensureInitialized();
    return this.repository.getStatistics();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.repository.close();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}