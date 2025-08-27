/**
 * Examples library resource implementation
 * Provides curated Motion.dev code examples organized by framework and category
 */

import { CodeExample, Framework, DocumentationCategory } from '../types/motion.js';
import { logger } from '../utils/logger.js';

export interface ExamplesLibraryResource {
  totalExamples: number;
  byFramework: Record<Framework, CodeExample[]>;
  byCategory: Record<DocumentationCategory, CodeExample[]>;
  byComplexity: Record<'basic' | 'intermediate' | 'advanced', CodeExample[]>;
  featured: CodeExample[];
  trending: CodeExample[];
  recentlyAdded: CodeExample[];
}

export interface ExampleCollection {
  name: string;
  description: string;
  examples: CodeExample[];
  tags: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export class ExamplesLibraryManager {
  private allExamples: CodeExample[] = [];
  private collections: Map<string, ExampleCollection> = new Map();

  updateExamples(examples: CodeExample[]): void {
    this.allExamples = examples;
    this.buildCollections();
    logger.debug(`Examples library updated with ${examples.length} examples`);
  }

  getExamplesLibrary(): ExamplesLibraryResource {
    const byFramework = this.groupByFramework();
    const byCategory = this.groupByCategory();
    const byComplexity = this.groupByComplexity();

    return {
      totalExamples: this.allExamples.length,
      byFramework,
      byCategory,
      byComplexity,
      featured: this.getFeaturedExamples(),
      trending: this.getTrendingExamples(),
      recentlyAdded: this.getRecentlyAddedExamples()
    };
  }

  private groupByFramework(): Record<Framework, CodeExample[]> {
    const grouped: Record<Framework, CodeExample[]> = {
      react: [],
      js: [],
      vue: []
    };

    for (const example of this.allExamples) {
      if (example.framework in grouped) {
        grouped[example.framework].push(example);
      }
    }

    // Sort by complexity and title
    for (const framework in grouped) {
      grouped[framework as Framework].sort(this.sortExamples);
    }

    return grouped;
  }

  private groupByCategory(): Record<DocumentationCategory, CodeExample[]> {
    const grouped: Record<DocumentationCategory, CodeExample[]> = {} as Record<DocumentationCategory, CodeExample[]>;

    for (const example of this.allExamples) {
      // Infer category from tags if not directly available
      const category = this.inferCategoryFromExample(example);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(example);
    }

    // Sort each category
    for (const category in grouped) {
      grouped[category as DocumentationCategory].sort(this.sortExamples);
    }

    return grouped;
  }

  private groupByComplexity(): Record<'basic' | 'intermediate' | 'advanced', CodeExample[]> {
    const grouped = {
      basic: [] as CodeExample[],
      intermediate: [] as CodeExample[],
      advanced: [] as CodeExample[]
    };

    for (const example of this.allExamples) {
      grouped[example.complexity].push(example);
    }

    // Sort each complexity level
    for (const complexity in grouped) {
      grouped[complexity as keyof typeof grouped].sort(this.sortExamples);
    }

    return grouped;
  }

  private sortExamples = (a: CodeExample, b: CodeExample): number => {
    // First by complexity
    const complexityOrder = { basic: 1, intermediate: 2, advanced: 3 };
    const aComplexity = complexityOrder[a.complexity];
    const bComplexity = complexityOrder[b.complexity];
    
    if (aComplexity !== bComplexity) {
      return aComplexity - bComplexity;
    }
    
    // Then by title
    return a.title.localeCompare(b.title);
  };

  private inferCategoryFromExample(example: CodeExample): DocumentationCategory {
    const code = example.code.toLowerCase();
    const title = example.title.toLowerCase();
    const tags = example.tags.map(tag => tag.toLowerCase());

    // Animation patterns
    if (this.matchesPatterns(code, title, tags, ['animate', 'spring', 'keyframes', 'transition'])) {
      return 'animation';
    }

    // Gesture patterns
    if (this.matchesPatterns(code, title, tags, ['drag', 'hover', 'tap', 'gesture', 'whiledrag', 'whilehover'])) {
      return 'gestures';
    }

    // Layout animation patterns
    if (this.matchesPatterns(code, title, tags, ['layout', 'shared', 'reorder', 'layoutid'])) {
      return 'layout-animations';
    }

    // Scroll animation patterns
    if (this.matchesPatterns(code, title, tags, ['scroll', 'parallax', 'inview', 'progress'])) {
      return 'scroll-animations';
    }

    // Component patterns
    if (this.matchesPatterns(code, title, tags, ['component', 'motion.', 'animatepresence'])) {
      return 'components';
    }

    // API reference patterns
    if (this.matchesPatterns(code, title, tags, ['api', 'reference', 'props', 'method'])) {
      return 'api-reference';
    }

    // Best practices patterns
    if (this.matchesPatterns(code, title, tags, ['performance', 'optimization', 'accessibility', 'best'])) {
      return 'best-practices';
    }

    // Default to examples
    return 'examples';
  }

  private matchesPatterns(code: string, title: string, tags: string[], patterns: string[]): boolean {
    return patterns.some(pattern => 
      code.includes(pattern) || 
      title.includes(pattern) || 
      tags.some(tag => tag.includes(pattern))
    );
  }

  private getFeaturedExamples(): CodeExample[] {
    // Featured examples showcase key Motion.dev capabilities
    const featuredCriteria = [
      'spring animation',
      'drag gesture',
      'layout animation',
      'scroll progress',
      'stagger animation',
      'animate presence',
      'variants',
      'keyframes'
    ];

    const featured: CodeExample[] = [];

    for (const criteria of featuredCriteria) {
      const match = this.allExamples.find(example =>
        example.title.toLowerCase().includes(criteria) ||
        example.tags.some(tag => tag.toLowerCase().includes(criteria))
      );
      
      if (match && !featured.includes(match)) {
        featured.push(match);
      }
    }

    return featured.slice(0, 8);
  }

  private getTrendingExamples(): CodeExample[] {
    // Simulate trending based on common patterns and complexity
    const trendingTags = ['spring', 'gesture', 'scroll', 'layout', 'performance'];
    
    const trending = this.allExamples
      .filter(example => 
        example.complexity === 'intermediate' &&
        example.tags.some(tag => 
          trendingTags.some(trending => tag.toLowerCase().includes(trending))
        )
      )
      .slice(0, 6);

    return trending;
  }

  private getRecentlyAddedExamples(): CodeExample[] {
    // In a real implementation, this would sort by creation/update date
    // For now, return a mix of examples from different categories
    const recentCategories = ['animation', 'gestures', 'scroll-animations'];
    const recent: CodeExample[] = [];

    for (const category of recentCategories) {
      const categoryExamples = this.allExamples.filter(example =>
        this.inferCategoryFromExample(example) === category
      );
      
      if (categoryExamples.length > 0) {
        recent.push(categoryExamples[0]);
      }
    }

    return recent.slice(0, 5);
  }

  private buildCollections(): void {
    this.collections.clear();

    // Animation fundamentals collection
    const animationExamples = this.allExamples.filter(example =>
      this.inferCategoryFromExample(example) === 'animation'
    );
    
    this.collections.set('animation-fundamentals', {
      name: 'Animation Fundamentals',
      description: 'Essential animation patterns and techniques',
      examples: animationExamples.filter(e => e.complexity === 'basic').slice(0, 10),
      tags: ['animation', 'spring', 'keyframes', 'transition'],
      difficulty: 'basic'
    });

    // Interactive gestures collection
    const gestureExamples = this.allExamples.filter(example =>
      this.inferCategoryFromExample(example) === 'gestures'
    );

    this.collections.set('interactive-gestures', {
      name: 'Interactive Gestures',
      description: 'User interaction patterns and gesture handling',
      examples: gestureExamples.slice(0, 8),
      tags: ['gesture', 'drag', 'hover', 'tap'],
      difficulty: 'intermediate'
    });

    // Advanced techniques collection
    const advancedExamples = this.allExamples.filter(example =>
      example.complexity === 'advanced'
    );

    this.collections.set('advanced-techniques', {
      name: 'Advanced Techniques',
      description: 'Complex animations and optimization patterns',
      examples: advancedExamples.slice(0, 6),
      tags: ['advanced', 'performance', 'complex', 'optimization'],
      difficulty: 'advanced'
    });

    // Framework-specific collections
    for (const framework of ['react', 'js', 'vue'] as Framework[]) {
      const frameworkExamples = this.allExamples.filter(example =>
        example.framework === framework
      );

      if (frameworkExamples.length > 0) {
        this.collections.set(`${framework}-essentials`, {
          name: `${framework.charAt(0).toUpperCase() + framework.slice(1)} Essentials`,
          description: `Essential patterns for ${framework} development`,
          examples: frameworkExamples.slice(0, 8),
          tags: [framework, 'essentials'],
          difficulty: 'intermediate'
        });
      }
    }

    logger.debug(`Built ${this.collections.size} example collections`);
  }

  getExampleCollections(): ExampleCollection[] {
    return Array.from(this.collections.values());
  }

  getCollection(name: string): ExampleCollection | undefined {
    return this.collections.get(name);
  }

  searchExamples(
    query: string,
    filters?: {
      framework?: Framework;
      complexity?: 'basic' | 'intermediate' | 'advanced';
      category?: DocumentationCategory;
    }
  ): CodeExample[] {
    let results = this.allExamples;

    // Apply filters
    if (filters?.framework) {
      results = results.filter(example => example.framework === filters.framework);
    }

    if (filters?.complexity) {
      results = results.filter(example => example.complexity === filters.complexity);
    }

    if (filters?.category) {
      results = results.filter(example => 
        this.inferCategoryFromExample(example) === filters.category
      );
    }

    // Apply search query
    const queryLower = query.toLowerCase();
    results = results.filter(example =>
      example.title.toLowerCase().includes(queryLower) ||
      example.code.toLowerCase().includes(queryLower) ||
      example.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );

    return results.slice(0, 20);
  }

  getExamplesByTags(tags: string[]): CodeExample[] {
    const tagsLower = tags.map(tag => tag.toLowerCase());
    
    return this.allExamples.filter(example =>
      tagsLower.some(tag =>
        example.tags.some(exampleTag => 
          exampleTag.toLowerCase().includes(tag)
        )
      )
    ).slice(0, 15);
  }

  getRandomExamples(count: number = 5): CodeExample[] {
    const shuffled = [...this.allExamples].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getExampleStats(): {
    totalExamples: number;
    byFramework: Record<Framework, number>;
    byComplexity: Record<string, number>;
    averageCodeLength: number;
    topTags: Array<{ tag: string; count: number }>;
    collectionsCount: number;
  } {
    const byFramework: Record<Framework, number> = { react: 0, js: 0, vue: 0 };
    const byComplexity: Record<string, number> = { basic: 0, intermediate: 0, advanced: 0 };
    const tagCounts: Record<string, number> = {};
    let totalCodeLength = 0;

    for (const example of this.allExamples) {
      byFramework[example.framework]++;
      byComplexity[example.complexity]++;
      totalCodeLength += example.code.length;

      for (const tag of example.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      totalExamples: this.allExamples.length,
      byFramework,
      byComplexity,
      averageCodeLength: this.allExamples.length > 0 ? 
        Math.round(totalCodeLength / this.allExamples.length) : 0,
      topTags,
      collectionsCount: this.collections.size
    };
  }
}