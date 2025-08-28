/**
 * Framework-specific documentation resources
 * Provides structured access to React, JavaScript, and Vue Motion.dev documentation
 */

import { DocumentationEndpoint, CategorizedEndpoints, Framework } from '../types/motion.js';
import { logger } from '../utils/logger.js';

export interface FrameworkDocsResource {
  framework: Framework;
  totalEndpoints: number;
  categories: {
    [key: string]: DocumentationEndpoint[];
  };
  featuredEndpoints: DocumentationEndpoint[];
  gettingStarted: DocumentationEndpoint[];
  apiReference: DocumentationEndpoint[];
}

export class FrameworkDocsManager {
  private categorizedEndpoints: CategorizedEndpoints = {
    react: [],
    js: [],
    vue: [],
    general: []
  };

  updateEndpoints(categorized: CategorizedEndpoints): void {
    this.categorizedEndpoints = categorized;
    logger.debug('Framework docs updated with categorized endpoints');
  }

  getReactDocs(): FrameworkDocsResource {
    const reactEndpoints = this.categorizedEndpoints.react;
    
    return {
      framework: 'react',
      totalEndpoints: reactEndpoints.length,
      categories: this.groupByCategory(reactEndpoints),
      featuredEndpoints: this.getFeaturedEndpoints(reactEndpoints, 'react'),
      gettingStarted: this.getGettingStartedEndpoints(reactEndpoints),
      apiReference: reactEndpoints.filter(e => e.category === 'api-reference')
    };
  }

  getJavaScriptDocs(): FrameworkDocsResource {
    const jsEndpoints = this.categorizedEndpoints.js;
    
    return {
      framework: 'js',
      totalEndpoints: jsEndpoints.length,
      categories: this.groupByCategory(jsEndpoints),
      featuredEndpoints: this.getFeaturedEndpoints(jsEndpoints, 'js'),
      gettingStarted: this.getGettingStartedEndpoints(jsEndpoints),
      apiReference: jsEndpoints.filter(e => e.category === 'api-reference')
    };
  }

  getVueDocs(): FrameworkDocsResource {
    const vueEndpoints = this.categorizedEndpoints.vue;
    
    return {
      framework: 'vue',
      totalEndpoints: vueEndpoints.length,
      categories: this.groupByCategory(vueEndpoints),
      featuredEndpoints: this.getFeaturedEndpoints(vueEndpoints, 'vue'),
      gettingStarted: this.getGettingStartedEndpoints(vueEndpoints),
      apiReference: vueEndpoints.filter(e => e.category === 'api-reference')
    };
  }

  getGeneralDocs(): FrameworkDocsResource {
    const generalEndpoints = this.categorizedEndpoints.general;
    
    return {
      framework: 'general' as Framework,
      totalEndpoints: generalEndpoints.length,
      categories: this.groupByCategory(generalEndpoints),
      featuredEndpoints: this.getFeaturedEndpoints(generalEndpoints, 'general'),
      gettingStarted: this.getGettingStartedEndpoints(generalEndpoints),
      apiReference: generalEndpoints.filter(e => e.category === 'api-reference')
    };
  }

  private groupByCategory(endpoints: DocumentationEndpoint[]): { [key: string]: DocumentationEndpoint[] } {
    const grouped: { [key: string]: DocumentationEndpoint[] } = {};
    
    for (const endpoint of endpoints) {
      if (!grouped[endpoint.category]) {
        grouped[endpoint.category] = [];
      }
      grouped[endpoint.category].push(endpoint);
    }

    // Sort each category by title
    for (const category in grouped) {
      grouped[category].sort((a, b) => a.title.localeCompare(b.title));
    }

    return grouped;
  }

  private getFeaturedEndpoints(endpoints: DocumentationEndpoint[], framework: string): DocumentationEndpoint[] {
    const featuredPatterns: Record<string, string[]> = {
      react: [
        'motion.div',
        'AnimatePresence',
        'useAnimation',
        'variants',
        'gestures'
      ],
      js: [
        'animate',
        'spring',
        'timeline',
        'scroll',
        'stagger'
      ],
      vue: [
        'v-motion',
        'TransitionGroup',
        'composables',
        'directives'
      ],
      general: [
        'getting started',
        'installation',
        'quick start',
        'examples'
      ]
    };

    const patterns = featuredPatterns[framework] || featuredPatterns.general;
    const featured: DocumentationEndpoint[] = [];

    for (const pattern of patterns) {
      const match = endpoints.find(endpoint =>
        endpoint.title.toLowerCase().includes(pattern.toLowerCase()) ||
        endpoint.url.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (match) {
        featured.push(match);
      }
    }

    return featured;
  }

  private getGettingStartedEndpoints(endpoints: DocumentationEndpoint[]): DocumentationEndpoint[] {
    const gettingStartedPatterns = [
      'getting started',
      'installation',
      'quick start',
      'introduction',
      'setup',
      'basics'
    ];

    return endpoints.filter(endpoint =>
      gettingStartedPatterns.some(pattern =>
        endpoint.title.toLowerCase().includes(pattern) ||
        endpoint.url.toLowerCase().includes(pattern)
      ) || endpoint.category === 'guides'
    ).slice(0, 5);
  }

  getFrameworkComparison(): {
    frameworks: Framework[];
    endpointCounts: Record<Framework | 'general', number>;
    categoryBreakdown: Record<Framework | 'general', Record<string, number>>;
    recommendations: Array<{
      framework: Framework;
      useCase: string;
      reason: string;
    }>;
  } {
    const endpointCounts = {
      react: this.categorizedEndpoints.react.length,
      js: this.categorizedEndpoints.js.length,
      vue: this.categorizedEndpoints.vue.length,
      general: this.categorizedEndpoints.general.length
    };

    const categoryBreakdown: Record<Framework | 'general', Record<string, number>> = {
      react: {},
      js: {},
      vue: {},
      general: {}
    };
    
    for (const [framework, endpoints] of Object.entries(this.categorizedEndpoints)) {
      categoryBreakdown[framework as Framework | 'general'] = {};
      for (const endpoint of endpoints) {
        const category = endpoint.category;
        categoryBreakdown[framework as Framework | 'general'][category] = 
          (categoryBreakdown[framework as Framework | 'general'][category] || 0) + 1;
      }
    }

    const recommendations = [
      {
        framework: 'react' as Framework,
        useCase: 'Component-based applications with rich interactions',
        reason: 'Extensive component library, hooks integration, and ecosystem support'
      },
      {
        framework: 'js' as Framework,
        useCase: 'Performance-critical animations and vanilla JavaScript projects',
        reason: 'Lightweight, no framework dependencies, optimized for performance'
      },
      {
        framework: 'vue' as Framework,
        useCase: 'Vue.js applications with declarative animations',
        reason: 'Vue-specific directives, composition API integration, and template syntax'
      }
    ];

    return {
      frameworks: ['react', 'js', 'vue'],
      endpointCounts,
      categoryBreakdown,
      recommendations
    };
  }

  getFrameworkMigrationGuides(): Array<{
    from: Framework;
    to: Framework;
    guide: {
      conceptMappings: Array<{ from: string; to: string; notes: string }>;
      codeExamples: Array<{ description: string; before: string; after: string }>;
      considerations: string[];
    };
  }> {
    return [
      {
        from: 'react',
        to: 'js',
        guide: {
          conceptMappings: [
            {
              from: 'motion.div',
              to: 'animate(element, { ... })',
              notes: 'Direct DOM element animation instead of component'
            },
            {
              from: 'useAnimation hook',
              to: 'Animation controls',
              notes: 'Imperative control using animation instances'
            },
            {
              from: 'variants',
              to: 'keyframes object',
              notes: 'Similar concept but different syntax'
            }
          ],
          codeExamples: [
            {
              description: 'Basic animation',
              before: '<motion.div animate={{ x: 100 }} />',
              after: 'animate(element, { x: 100 })'
            }
          ],
          considerations: [
            'No automatic cleanup - manage animation lifecycle manually',
            'Direct DOM manipulation instead of virtual DOM',
            'Performance benefits but less React integration'
          ]
        }
      },
      {
        from: 'js',
        to: 'react',
        guide: {
          conceptMappings: [
            {
              from: 'animate(element, { ... })',
              to: 'motion.div animate prop',
              notes: 'Declarative component-based approach'
            },
            {
              from: 'Animation controls',
              to: 'useAnimation hook',
              notes: 'React hooks for animation control'
            }
          ],
          codeExamples: [
            {
              description: 'Basic animation',
              before: 'animate(element, { x: 100 })',
              after: '<motion.div animate={{ x: 100 }} />'
            }
          ],
          considerations: [
            'Automatic cleanup in React lifecycle',
            'Component re-renders may affect animations',
            'Better integration with React state management'
          ]
        }
      },
      {
        from: 'vue',
        to: 'react',
        guide: {
          conceptMappings: [
            {
              from: 'v-motion directive',
              to: 'motion.div component',
              notes: 'Component vs directive approach'
            },
            {
              from: 'Vue composables',
              to: 'React hooks',
              notes: 'Similar reactive patterns, different syntax'
            }
          ],
          codeExamples: [
            {
              description: 'Basic animation',
              before: '<div v-motion="{ initial: { x: 0 }, enter: { x: 100 } }"></div>',
              after: '<motion.div initial={{ x: 0 }} animate={{ x: 100 }} />'
            }
          ],
          considerations: [
            'Template syntax vs JSX',
            'Different reactivity systems',
            'Component lifecycle differences'
          ]
        }
      }
    ];
  }

  getAllEndpointsByFramework(): CategorizedEndpoints {
    return { ...this.categorizedEndpoints };
  }

  getFrameworkStats(): {
    totalEndpoints: number;
    frameworkDistribution: Array<{
      framework: Framework | 'general';
      count: number;
      percentage: number;
    }>;
    categoryDistribution: Record<string, number>;
  } {
    const total = Object.values(this.categorizedEndpoints)
      .reduce((sum, endpoints) => sum + endpoints.length, 0);

    const frameworkDistribution = Object.entries(this.categorizedEndpoints)
      .map(([framework, endpoints]) => ({
        framework: framework as Framework | 'general',
        count: endpoints.length,
        percentage: total > 0 ? Math.round((endpoints.length / total) * 100) : 0
      }));

    const categoryDistribution: Record<string, number> = {};
    for (const endpoints of Object.values(this.categorizedEndpoints)) {
      for (const endpoint of endpoints) {
        categoryDistribution[endpoint.category] = 
          (categoryDistribution[endpoint.category] || 0) + 1;
      }
    }

    return {
      totalEndpoints: total,
      frameworkDistribution,
      categoryDistribution
    };
  }
}