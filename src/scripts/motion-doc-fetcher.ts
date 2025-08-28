import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { MotionDoc, MotionComponent, MotionExample } from '../database/motion-repository';
import { Logger } from '../utils/logger';

export interface DocumentationUrl {
  url: string;
  framework: 'react' | 'js' | 'vue';
  category: string;
  priority: number;
}

export interface FetchedDocData {
  doc: MotionDoc;
  components?: MotionComponent[];
  examples?: MotionExample[];
}

export class MotionDocumentationFetcher {
  private readonly logger = Logger.getInstance();
  private readonly turndown: TurndownService = new TurndownService();
  private readonly baseUrl: string = 'https://motion.dev';
  
  // Rate limiting
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 300; // 300ms between requests

  constructor() {
    this.setupTurndown();
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

    this.turndown.addRule('links', {
      filter: ['a'],
      replacement: (content, node) => {
        const href = node.getAttribute('href');
        if (!href || href.startsWith('#')) return content;
        
        // Convert relative links to absolute
        const absoluteHref = href.startsWith('/') ? `${this.baseUrl}${href}` : href;
        return `[${content}](${absoluteHref})`;
      }
    });
  }

  async getDocumentationUrls(): Promise<DocumentationUrl[]> {
    // Motion.dev documentation structure based on actual sitemap.xml
    const urls: DocumentationUrl[] = [
      // React Documentation (verified from sitemap)
      { url: `${this.baseUrl}/docs/react`, framework: 'react', category: 'getting-started', priority: 1 },
      { url: `${this.baseUrl}/docs/react-animation`, framework: 'react', category: 'animations', priority: 2 },
      { url: `${this.baseUrl}/docs/react-gestures`, framework: 'react', category: 'gestures', priority: 3 },
      { url: `${this.baseUrl}/docs/react-layout-animations`, framework: 'react', category: 'layout', priority: 3 },
      { url: `${this.baseUrl}/docs/react-scroll-animations`, framework: 'react', category: 'scroll', priority: 3 },
      { url: `${this.baseUrl}/docs/react-svg-animation`, framework: 'react', category: 'animations', priority: 4 },
      { url: `${this.baseUrl}/docs/react-transitions`, framework: 'react', category: 'animations', priority: 4 },

      // JavaScript Documentation (verified from sitemap)
      { url: `${this.baseUrl}/docs/quick-start`, framework: 'js', category: 'getting-started', priority: 1 },
      { url: `${this.baseUrl}/docs/animate`, framework: 'js', category: 'animations', priority: 2 },
      { url: `${this.baseUrl}/docs/scroll`, framework: 'js', category: 'scroll', priority: 3 },
      { url: `${this.baseUrl}/docs/spring`, framework: 'js', category: 'springs', priority: 3 },
      { url: `${this.baseUrl}/docs/animate-view`, framework: 'js', category: 'animations', priority: 4 },
      { url: `${this.baseUrl}/docs/stagger`, framework: 'js', category: 'animations', priority: 4 },
      { url: `${this.baseUrl}/docs/hover`, framework: 'js', category: 'gestures', priority: 4 },
      { url: `${this.baseUrl}/docs/inview`, framework: 'js', category: 'scroll', priority: 4 },
      { url: `${this.baseUrl}/docs/press`, framework: 'js', category: 'gestures', priority: 4 },
      { url: `${this.baseUrl}/docs/resize`, framework: 'js', category: 'utilities', priority: 5 },
      { url: `${this.baseUrl}/docs/transform`, framework: 'js', category: 'utilities', priority: 5 },

      // Vue Documentation (verified from sitemap)
      { url: `${this.baseUrl}/docs/vue`, framework: 'vue', category: 'getting-started', priority: 1 },
      { url: `${this.baseUrl}/docs/vue-animation`, framework: 'vue', category: 'animations', priority: 2 },
      { url: `${this.baseUrl}/docs/vue-gestures`, framework: 'vue', category: 'gestures', priority: 3 },
      { url: `${this.baseUrl}/docs/vue-layout-animations`, framework: 'vue', category: 'layout', priority: 3 },
      { url: `${this.baseUrl}/docs/vue-scroll-animations`, framework: 'vue', category: 'scroll', priority: 3 },
      { url: `${this.baseUrl}/docs/vue-transitions`, framework: 'vue', category: 'animations', priority: 4 },

      // Core Motion Concepts (framework-agnostic)
      { url: `${this.baseUrl}/docs/easing-functions`, framework: 'js', category: 'reference', priority: 5 },
      { url: `${this.baseUrl}/docs/motion-value`, framework: 'js', category: 'reference', priority: 5 }
    ];

    // Sort by priority to fetch most important docs first
    return urls.sort((a, b) => a.priority - b.priority);
  }

  async fetchDocumentationPage(urlInfo: DocumentationUrl): Promise<FetchedDocData | null> {
    await this.rateLimit();
    
    try {
      this.logger.debug(`Fetching: ${urlInfo.url}`);
      
      const response = await fetch(urlInfo.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Motion.dev MCP Documentation Fetcher)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = this.extractTitle($);
      
      // Extract description
      const description = this.extractDescription($);
      
      // Clean and extract main content
      this.cleanHtml($);
      const content = this.extractMainContent($);
      
      // Convert to markdown
      const markdownContent = this.turndown.turndown(content);
      
      // Extract structured data
      const components = this.extractComponents($, urlInfo.framework);
      const examples = this.extractExamples($, urlInfo.framework);
      const apiReference = this.extractApiReference($);
      
      // Create documentation entry
      const doc: MotionDoc = {
        url: urlInfo.url,
        title,
        framework: urlInfo.framework,
        category: urlInfo.category,
        description,
        content: markdownContent,
        examples: examples.length > 0 ? JSON.stringify(examples) : undefined,
        apiReference: apiReference ? JSON.stringify(apiReference) : undefined,
        isReact: urlInfo.framework === 'react',
        isJs: urlInfo.framework === 'js', 
        isVue: urlInfo.framework === 'vue',
        tags: JSON.stringify(this.extractTags(urlInfo, title, markdownContent))
      };

      return {
        doc,
        components,
        examples: examples.map(ex => ({
          title: ex.title,
          description: ex.description,
          framework: urlInfo.framework,
          category: urlInfo.category,
          code: ex.code,
          difficulty: ex.difficulty,
          tags: JSON.stringify(ex.tags || [])
        }))
      };

    } catch (error) {
      this.logger.error(`Failed to fetch ${urlInfo.url}`, error as Error);
      return null;
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try various title selectors
    const titleSelectors = [
      'h1',
      'title',
      '.page-title',
      '.docs-title',
      '.content h1',
      'main h1'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    return 'Motion.dev Documentation';
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    // Try meta description first
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription && metaDescription.trim()) {
      return metaDescription.trim();
    }

    // Try first paragraph after h1
    const firstP = $('h1').next('p');
    if (firstP.length && firstP.text().trim()) {
      return firstP.text().trim();
    }

    // Try first paragraph in main content
    const mainP = $('main p, .content p, .docs-content p').first();
    if (mainP.length && mainP.text().trim()) {
      return mainP.text().trim();
    }

    return '';
  }

  private cleanHtml($: cheerio.CheerioAPI): void {
    // Remove navigation, headers, footers
    $('nav, header, footer, .nav, .navbar, .header, .footer').remove();
    
    // Remove ads, tracking, social widgets
    $('.ad, .ads, .advertisement, .social-share, .cookie-banner').remove();
    
    // Remove script and style tags
    $('script, style, noscript').remove();
    
    // Remove comment nodes
    $('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try various main content selectors
    const contentSelectors = [
      'main',
      '.content',
      '.docs-content', 
      '.documentation',
      '.page-content',
      'article',
      '.main-content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length && element.html()) {
        return element.html() || '';
      }
    }

    // Fallback to body content
    const body = $('body').html();
    return body || '';
  }

  private extractComponents($: cheerio.CheerioAPI, framework: 'react' | 'js' | 'vue'): MotionComponent[] {
    const components: MotionComponent[] = [];
    const componentNames = new Set<string>();

    // Look for component mentions in headings
    $('h1, h2, h3, h4').each((_, element) => {
      const heading = $(element).text().trim();
      const motionComponents = this.findComponentNames(heading);
      motionComponents.forEach(name => componentNames.add(name));
    });

    // Look for components in code examples
    $('code, pre code').each((_, element) => {
      const code = $(element).text();
      const motionComponents = this.findComponentNames(code);
      motionComponents.forEach(name => componentNames.add(name));
    });

    // Create component entries
    componentNames.forEach(name => {
      if (name && name.length > 2) {
        components.push({
          name,
          framework,
          type: name.startsWith('motion.') ? 'component' : 'function',
          description: `Motion.dev ${name} ${name.startsWith('motion.') ? 'component' : 'function'}`
        });
      }
    });

    return components;
  }

  private extractExamples($: cheerio.CheerioAPI, framework: 'react' | 'js' | 'vue'): any[] {
    const examples: any[] = [];

    $('pre code, .code-block code').each((i, element) => {
      const code = $(element).text().trim();
      
      if (code && code.length > 20) { // Filter out very short snippets
        const language = $(element).attr('class')?.replace('language-', '') || framework;
        
        // Try to find a title from nearby heading or text
        let title = `Example ${i + 1}`;
        let description = '';
        
        const nearbyHeading = $(element).closest('div, section').prevAll('h1, h2, h3, h4, h5, h6').first();
        if (nearbyHeading.length) {
          title = nearbyHeading.text().trim() || title;
        }

        const nearbyP = $(element).closest('pre').prev('p');
        if (nearbyP.length) {
          description = nearbyP.text().trim();
        }

        // Determine difficulty based on code complexity
        const difficulty = this.determineDifficulty(code);
        
        examples.push({
          title,
          description,
          code,
          language,
          difficulty,
          tags: this.extractCodeTags(code, framework)
        });
      }
    });

    return examples;
  }

  private extractApiReference($: cheerio.CheerioAPI): any | null {
    const apiInfo: any = {
      props: [],
      methods: [],
      types: []
    };

    // Look for API tables
    $('.api-table tr, .props-table tr, table tr').each((_, row) => {
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

    // Look for method definitions in code
    $('code').each((_, element) => {
      const code = $(element).text();
      const methodMatches = code.match(/(\w+)\([^)]*\)/g);
      
      if (methodMatches) {
        methodMatches.forEach(match => {
          const methodName = match.split('(')[0];
          if (methodName && !apiInfo.methods.find((m: any) => m.name === methodName)) {
            apiInfo.methods.push({
              name: methodName,
              signature: match,
              description: `${methodName} method`
            });
          }
        });
      }
    });

    return apiInfo.props.length > 0 || apiInfo.methods.length > 0 ? apiInfo : null;
  }

  private findComponentNames(text: string): string[] {
    const names: string[] = [];
    
    // Motion.dev specific patterns
    const patterns = [
      /motion\.\w+/g,              // motion.div, motion.button, etc.
      /\b(animate|spring|scroll|timeline|stagger|glide)\b/g,  // JS functions
      /\b(Motion|Transition|AnimatePresence)\b/g,             // Vue/React components
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 2) {
            names.push(match.trim());
          }
        });
      }
    });

    return [...new Set(names)]; // Remove duplicates
  }

  private determineDifficulty(code: string): 'beginner' | 'intermediate' | 'advanced' {
    // Simple heuristics based on code complexity
    const lines = code.split('\n').length;
    const hasAdvancedFeatures = /keyframes|timeline|stagger|spring.*{|easing:|complex|advanced/i.test(code);
    const hasTypeScript = /interface|type\s+\w+|:\s*\w+/.test(code);
    
    if (lines > 50 || hasAdvancedFeatures) return 'advanced';
    if (lines > 20 || hasTypeScript) return 'intermediate';
    return 'beginner';
  }

  private extractCodeTags(code: string, framework: string): string[] {
    const tags = [framework];
    
    // Add feature-based tags
    const featureMap = {
      'animation': ['animate', 'transition', 'duration'],
      'gesture': ['drag', 'hover', 'tap', 'gesture'],
      'scroll': ['scroll', 'viewport', 'parallax'],
      'spring': ['spring', 'stiffness', 'damping'],
      'layout': ['layout', 'layoutId', 'shared'],
      'keyframes': ['keyframes', 'steps'],
      'timeline': ['timeline', 'sequence'],
      'stagger': ['stagger', 'delay']
    };

    Object.entries(featureMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => code.toLowerCase().includes(keyword))) {
        tags.push(tag);
      }
    });

    return tags;
  }

  private extractTags(urlInfo: DocumentationUrl, title: string, content: string): string[] {
    const tags = [urlInfo.framework, urlInfo.category];
    
    // Add tags based on URL path
    const urlParts = urlInfo.url.split('/').pop()?.split('-') || [];
    urlParts.forEach(part => {
      if (part && part.length > 2) {
        tags.push(part);
      }
    });

    // Add tags based on content analysis
    const contentLower = (title + ' ' + content).toLowerCase();
    const featureKeywords = [
      'animation', 'gesture', 'scroll', 'spring', 'drag', 'layout',
      'keyframes', 'timeline', 'stagger', 'motion', 'transition'
    ];
    
    featureKeywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }
}