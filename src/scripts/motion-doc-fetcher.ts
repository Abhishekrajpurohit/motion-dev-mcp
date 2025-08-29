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
    // Motion.dev specific content selectors - try these first
    const motionSelectors = [
      '[data-framer-name="Content"]',
      '.framer-content',
      '.documentation-content',
      '.docs-main',
      'div[class*="content"]',
      'div[class*="docs"]'
    ];

    // Try Motion.dev specific selectors first
    for (const selector of motionSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 100) {
        this.logger.debug(`Found content with selector: ${selector}`);
        return element.html() || '';
      }
    }

    // Standard content selectors
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
      if (element.length && element.text().trim().length > 100) {
        this.logger.debug(`Found content with selector: ${selector}`);
        return element.html() || '';
      }
    }

    // If no good content found, try finding the largest text block
    let bestElement = '';
    let maxTextLength = 0;
    
    $('div, section, article').each((_, element) => {
      const textContent = $(element).text().trim();
      if (textContent.length > maxTextLength && textContent.length > 200) {
        maxTextLength = textContent.length;
        bestElement = $(element).html() || '';
      }
    });

    if (bestElement) {
      this.logger.debug(`Found best content block with ${maxTextLength} characters`);
      return bestElement;
    }

    // Final fallback to body content
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

    // Look for components in code examples and all text content
    const allTextContent = $('body').text();
    const motionComponents = this.findComponentNames(allTextContent);
    motionComponents.forEach(name => componentNames.add(name));

    // Look for components in code examples specifically
    $('code, pre code').each((_, element) => {
      const code = $(element).text();
      const codeComponents = this.findComponentNames(code);
      codeComponents.forEach(name => componentNames.add(name));
    });

    // Create component entries with enhanced descriptions
    componentNames.forEach(name => {
      if (name && name.length > 2) {
        const componentType = this.getComponentType(name, framework);
        const description = this.getComponentDescription(name, framework);
        
        components.push({
          name,
          framework,
          type: componentType,
          description
        });
      }
    });

    return components;
  }

  private getComponentType(name: string, _framework: string): 'component' | 'function' | 'hook' | 'utility' {
    if (name.startsWith('motion.')) return 'component';
    if (name.startsWith('use')) return 'hook';
    if (['animate', 'spring', 'scroll', 'timeline', 'stagger', 'glide', 'hover', 'inView', 'press', 'resize', 'transform'].includes(name)) {
      return 'function';
    }
    if (['Motion', 'AnimatePresence', 'Transition'].includes(name)) return 'component';
    return 'utility';
  }

  private getComponentDescription(name: string, framework: string): string {
    const descriptions: Record<string, string> = {
      'motion.div': 'Animated div element with Motion.dev capabilities',
      'motion.button': 'Animated button element with gesture support',
      'motion.span': 'Animated span element for inline animations',
      'motion.img': 'Animated image element with loading animations',
      'motion.svg': 'Animated SVG element for vector animations',
      'animate': 'Core animation function for element animations',
      'spring': 'Spring-based animation generator',
      'scroll': 'Scroll-linked animation functions',
      'timeline': 'Animation timeline and sequencing',
      'stagger': 'Staggered animation utilities',
      'hover': 'Hover gesture animation functions',
      'inView': 'Viewport-based animation triggers',
      'press': 'Press gesture animation handlers',
      'useScroll': 'React hook for scroll-based animations',
      'useTransform': 'React hook for value transformations',
      'useSpring': 'React hook for spring animations',
      'motionValue': 'Reactive value for animations',
      'AnimatePresence': 'React component for exit animations',
      'Motion': 'Vue Motion component wrapper'
    };

    return descriptions[name] || `Motion.dev ${name} ${this.getComponentType(name, framework)}`;
  }

  private extractExamples($: cheerio.CheerioAPI, framework: 'react' | 'js' | 'vue'): any[] {
    const examples: any[] = [];
    const seenCodes = new Set<string>();

    // More comprehensive code block selectors
    const codeSelectors = [
      'pre code',
      'code[class*="language"]',
      '.code-block code',
      '.highlight code',
      'pre',
      'div[class*="code"] code',
      'div[class*="example"] code',
      '.example pre',
      '.code-example code'
    ];

    codeSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        let code = $(element).text().trim();
        
        // Skip if no code or too short or already seen
        if (!code || code.length < 10 || seenCodes.has(code)) {
          return;
        }
        
        seenCodes.add(code);
        
        // Filter for Motion.dev relevant code
        const isMotionCode = this.isMotionRelevantCode(code, framework);
        if (!isMotionCode) {
          return;
        }
        
        const language = this.detectCodeLanguage($(element), framework);
        
        // Try to find a title from nearby heading or text
        let title = this.findNearbyTitle($, element, i + 1);
        let description = this.findNearbyDescription($, element);
        
        // Determine difficulty based on code complexity
        const difficulty = this.determineDifficulty(code);
        
        this.logger.debug(`Found example: ${title} (${code.length} chars)`);
        
        examples.push({
          title,
          description,
          code,
          language,
          difficulty,
          tags: this.extractCodeTags(code, framework)
        });
      });
    });

    this.logger.debug(`Extracted ${examples.length} examples for ${framework}`);
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
      /\b(animate|animateView|spring|scroll|timeline|stagger|glide|hover|inView|press|resize|transform)\b/g,  // JS functions
      /\b(Motion|Transition|AnimatePresence|useMotion|useScroll|useTransform|useSpring|motionValue)\b/g,             // Vue/React components and hooks
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

    // Also look for common Motion.dev HTML elements used with motion.*
    const motionElementPatterns = [
      /motion\.(div|span|button|a|img|svg|path|circle|rect|line|g|text|tspan)/g
    ];

    motionElementPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          names.push(match.trim());
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

  private isMotionRelevantCode(code: string, framework: string): boolean {
    const motionKeywords = [
      'motion', 'animate', 'spring', 'scroll', 'transition',
      'gesture', 'drag', 'layout', 'keyframes', 'stagger',
      'hover', 'inView', 'press', 'resize', 'transform'
    ];

    const codeLower = code.toLowerCase();
    
    // Must contain at least one Motion.dev keyword
    const hasMotionKeyword = motionKeywords.some(keyword => 
      codeLower.includes(keyword)
    );
    
    // Additional framework-specific checks
    if (framework === 'react' && codeLower.includes('motion.')) return true;
    if (framework === 'js' && codeLower.includes('animate(')) return true;
    if (framework === 'vue' && codeLower.includes('motion')) return true;
    
    return hasMotionKeyword;
  }

  private detectCodeLanguage(element: cheerio.Cheerio<any>, framework: string): string {
    const classList = element.attr('class') || '';
    
    // Check for language- prefixed classes
    const langMatch = classList.match(/language-(\w+)/);
    if (langMatch) {
      return langMatch[1];
    }
    
    // Check parent elements for language hints
    const pre = element.closest('pre');
    if (pre.length) {
      const preClass = pre.attr('class') || '';
      const preLangMatch = preClass.match(/language-(\w+)/);
      if (preLangMatch) {
        return preLangMatch[1];
      }
    }
    
    // Fallback to framework
    return framework === 'js' ? 'javascript' : framework;
  }

  private findNearbyTitle($: cheerio.CheerioAPI, element: any, fallbackNum: number): string {
    const el = $(element);
    
    // Look for headings before this code block
    const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    for (const selector of headingSelectors) {
      // Check siblings before
      const prevHeading = el.closest('div, section, article').prevAll(selector).first();
      if (prevHeading.length) {
        const title = prevHeading.text().trim();
        if (title && title.length < 100) {
          return title;
        }
      }
      
      // Check within same container
      const nearbyHeading = el.closest('div, section, article').find(selector).first();
      if (nearbyHeading.length) {
        const title = nearbyHeading.text().trim();
        if (title && title.length < 100) {
          return title;
        }
      }
    }
    
    // Look for strong/bold text near the code
    const strongText = el.closest('div').prev().find('strong, b').first();
    if (strongText.length) {
      const title = strongText.text().trim();
      if (title && title.length < 50) {
        return title;
      }
    }
    
    return `Code Example ${fallbackNum}`;
  }

  private findNearbyDescription($: cheerio.CheerioAPI, element: any): string {
    const el = $(element);
    
    // Look for paragraph before the code block
    const prevP = el.closest('pre, div').prev('p');
    if (prevP.length) {
      const desc = prevP.text().trim();
      if (desc && desc.length > 10 && desc.length < 300) {
        return desc;
      }
    }
    
    // Look for paragraph after the code block
    const nextP = el.closest('pre, div').next('p');
    if (nextP.length) {
      const desc = nextP.text().trim();
      if (desc && desc.length > 10 && desc.length < 300) {
        return desc;
      }
    }
    
    return '';
  }
}