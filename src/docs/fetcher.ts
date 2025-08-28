/**
 * Documentation fetcher with intelligent caching and retry logic
 */

import fetch, { Response } from 'node-fetch';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { 
  DocumentResponse, 
  ParsedDocument, 
  CodeExample, 
  ApiReference,
  Framework,
  DocumentationCategory
} from '../types/motion.js';
import { 
  MotionMCPError, 
  createNetworkError, 
  createParseError, 
  ErrorCodes 
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';


export class DocumentationFetcher {
  private readonly baseUrl = 'https://motion.dev';
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000;
  private readonly timeout = 10000;
  private readonly turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    // Configure turndown to preserve code blocks better
    this.turndown.addRule('codeblock', {
      filter: 'pre',
      replacement: (content: string, node: any): string => {
        const language = node.firstChild?.className?.match(/language-(\w+)/)?.[1] || '';
        return `\`\`\`${language}\n${content}\n\`\`\``;
      }
    });
  }

  async fetchDoc(
    url: string, 
    useCache: boolean = true
  ): Promise<DocumentResponse> {
    const startTime = Date.now();
    logger.debug(`Fetching documentation: ${url}`, { useCache });

    try {
      const fullUrl = this.buildFullUrl(url);
      const response = await this.fetchWithRetry(fullUrl);
      
      if (!response.ok) {
        throw createNetworkError(fullUrl, `HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const document = await this.parseHtmlContent(html, url);
      
      const fetchTime = Date.now() - startTime;
      logger.logPerformanceMetric('doc_fetch_time', fetchTime, 'ms');

      return {
        success: true,
        document,
        url,
        fetchTime
      };

    } catch (error) {
      logger.error(`Failed to fetch documentation: ${url}`, error as Error);
      
      return {
        success: false,
        error: error instanceof MotionMCPError ? error.message : String(error),
        url,
        fetchTime: Date.now() - startTime
      };
    }
  }

  async fetchSitemap(): Promise<string[]> {
    logger.debug('Fetching sitemap.xml');
    
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/sitemap.xml`);
      
      if (!response.ok) {
        throw createNetworkError(this.baseUrl + '/sitemap.xml', `HTTP ${response.status}`);
      }

      const sitemapXml = await response.text();
      return this.parseSitemapUrls(sitemapXml);

    } catch (error) {
      logger.error('Failed to fetch sitemap', error as Error);
      throw MotionMCPError.fromError(error as Error, ErrorCodes.FETCH_ERROR);
    }
  }

  private async fetchWithRetry(
    url: string, 
    attempts: number = this.retryAttempts
  ): Promise<Response> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        logger.logNetworkRequest(url, 'GET');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Motion.dev MCP Server/1.0.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        clearTimeout(timeoutId);
        logger.logNetworkRequest(url, 'GET', response.status);
        
        return response;

      } catch (error) {
        const isLastAttempt = attempt === attempts;
        
        if (isLastAttempt) {
          throw createNetworkError(url, (error as Error).message);
        }
        
        logger.warn(`Fetch attempt ${attempt} failed for ${url}, retrying in ${this.retryDelay}ms`);
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw createNetworkError(url, 'All retry attempts failed');
  }

  private async parseHtmlContent(html: string, url: string): Promise<ParsedDocument> {
    try {
      const $ = cheerio.load(html);
      
      // Extract basic document info
      const title = $('h1').first().text().trim() || $('title').text().trim();
      const framework = this.extractFrameworkFromUrl(url);
      const category = this.extractCategoryFromUrl(url);
      
      // Convert HTML to markdown
      const contentElement = $('main, .content, .documentation, body').first();
      const content = this.turndown.turndown(contentElement.html() || '');
      
      // Extract code examples
      const examples = this.extractCodeExamples($, framework, url);
      
      // Extract API reference if present
      const apiReference = this.extractApiReference($, framework);
      
      return {
        title,
        content,
        examples,
        apiReference,
        framework,
        category,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      throw createParseError('HTML', html, (error as Error).message);
    }
  }

  private extractCodeExamples(
    $: cheerio.CheerioAPI, 
    framework: Framework | 'general',
    url: string
  ): CodeExample[] {
    const examples: CodeExample[] = [];
    let exampleId = 1;

    $('pre code, .code-block, .example').each((_index, element) => {
      const $el = $(element);
      const code = $el.text().trim();
      
      if (code.length < 10) return; // Skip very short snippets
      
      // Try to determine language from class names
      const className = $el.attr('class') || $el.parent().attr('class') || '';
      const languageMatch = className.match(/language-(\w+)|lang-(\w+)/);
      const language = languageMatch?.[1] || languageMatch?.[2] || 'typescript';
      
      // Extract title from preceding heading or data attributes
      const title = $el.attr('data-title') || 
                   $el.prev('h1, h2, h3, h4, h5, h6').text().trim() ||
                   `Example ${exampleId}`;
      
      // Determine complexity based on code characteristics
      const complexity = this.analyzeCodeComplexity(code);
      
      // Extract tags from context
      const tags = this.extractTagsFromContext($, $el, framework);
      
      examples.push({
        id: `${url}-example-${exampleId}`,
        title,
        code,
        framework: framework === 'general' ? 'react' : framework, // Default to react for general
        complexity,
        tags,
        language: language === 'javascript' ? 'javascript' : 'typescript'
      });
      
      exampleId++;
    });

    logger.debug(`Extracted ${examples.length} code examples from ${url}`);
    return examples;
  }

  private extractApiReference($: cheerio.CheerioAPI, _framework: Framework | 'general'): ApiReference | undefined {
    // Look for API documentation sections
    const apiSection = $('.api-reference, .component-api, .props-table').first();
    if (apiSection.length === 0) return undefined;

    try {
      const component = $('h1, h2').first().text().trim();
      const description = $('.description, .component-description').first().text().trim();
      
      // Extract props from tables or lists
      const props = this.extractPropsFromApiSection($, apiSection);
      
      return {
        component,
        description,
        props,
        examples: [] // Will be populated by code examples extraction
      };
    } catch (error) {
      logger.warn('Failed to extract API reference', { error: (error as Error).message });
      return undefined;
    }
  }

  private extractPropsFromApiSection($: cheerio.CheerioAPI, apiSection: cheerio.Cheerio<any>): any[] {
    const props: any[] = [];
    
    // Try table format first
    apiSection.find('table tr').each((index: any, row: any) => {
      if (index === 0) return; // Skip header
      
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 3) {
        props.push({
          name: $(cells[0]).text().trim(),
          type: $(cells[1]).text().trim(),
          required: $(cells[2]).text().trim().toLowerCase().includes('required'),
          description: $(cells[3])?.text().trim() || ''
        });
      }
    });

    // Try definition list format if no table
    if (props.length === 0) {
      apiSection.find('dt').each((_index: any, dt: any) => {
        const $dt = $(dt);
        const $dd = $dt.next('dd');
        
        if ($dd.length > 0) {
          props.push({
            name: $dt.text().trim(),
            type: 'any', // Default type
            required: false,
            description: $dd.text().trim()
          });
        }
      });
    }

    return props;
  }

  private buildFullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return `${this.baseUrl}/docs/${url}`;
  }

  private extractFrameworkFromUrl(url: string): Framework | 'general' {
    if (url.includes('/react')) return 'react';
    if (url.includes('/vue')) return 'vue';
    if (url.includes('/js') || url.includes('/javascript')) return 'js';
    return 'general';
  }

  private extractCategoryFromUrl(url: string): DocumentationCategory {
    const path = url.toLowerCase();
    
    if (path.includes('animation')) return 'animation';
    if (path.includes('gesture')) return 'gestures';
    if (path.includes('layout')) return 'layout-animations';
    if (path.includes('scroll')) return 'scroll-animations';
    if (path.includes('component')) return 'components';
    if (path.includes('api')) return 'api-reference';
    if (path.includes('example')) return 'examples';
    if (path.includes('best-practice') || path.includes('performance')) return 'best-practices';
    
    return 'guides';
  }

  private parseSitemapUrls(sitemapXml: string): string[] {
    try {
      const $ = cheerio.load(sitemapXml, { xmlMode: true });
      const urls: string[] = [];
      
      $('url loc').each((_index, element) => {
        const url = $(element).text().trim();
        if (url.includes('/docs/')) {
          urls.push(url);
        }
      });
      
      logger.info(`Parsed ${urls.length} documentation URLs from sitemap`);
      return urls;
      
    } catch (error) {
      throw createParseError('XML sitemap', sitemapXml, (error as Error).message);
    }
  }

  private analyzeCodeComplexity(code: string): 'basic' | 'intermediate' | 'advanced' {
    // Basic heuristics for complexity analysis
    const lines = code.split('\n').length;
    const hasHooks = /use[A-Z]/.test(code);
    const hasAnimationConfig = /animate|initial|exit|variants/.test(code);
    const hasCustomLogic = /function|const.*=.*=>|class/.test(code);
    
    if (lines > 30 || (hasHooks && hasCustomLogic)) return 'advanced';
    if (lines > 15 || hasAnimationConfig) return 'intermediate';
    return 'basic';
  }

  private extractTagsFromContext(
    _$: cheerio.CheerioAPI, 
    element: cheerio.Cheerio<any>,
    framework: Framework | 'general'
  ): string[] {
    const tags: string[] = [];
    
    // Add framework tag
    if (framework !== 'general') {
      tags.push(framework);
    }
    
    // Extract from surrounding headings and text
    const context = element.parent().text().toLowerCase();
    
    const tagPatterns = [
      /animation/g,
      /gesture/g, 
      /hover/g,
      /scroll/g,
      /layout/g,
      /spring/g,
      /transition/g,
      /keyframe/g
    ];
    
    tagPatterns.forEach(pattern => {
      if (pattern.test(context)) {
        const match = context.match(pattern);
        if (match) tags.push(match[0]);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}