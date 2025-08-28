/**
 * Template Manager for Motion.dev code generation
 * Central manager for all framework templates
 */

import { Framework } from '../../types/motion.js';
import { ReactTemplateManager, ReactTemplate } from './react-templates.js';
import { VueTemplateManager, VueTemplate } from './vue-templates.js';
import { JSTemplateManager, JSTemplate } from './js-templates.js';

export type TemplateType = ReactTemplate | VueTemplate | JSTemplate;

export interface TemplateSearchOptions {
  framework?: Framework;
  category?: string;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  tags?: string[];
}

export class TemplateManager {
  private reactManager: ReactTemplateManager;
  private vueManager: VueTemplateManager;
  private jsManager: JSTemplateManager;

  constructor() {
    this.reactManager = new ReactTemplateManager();
    this.vueManager = new VueTemplateManager();
    this.jsManager = new JSTemplateManager();
  }

  /**
   * Get template by ID across all frameworks
   */
  getTemplate(id: string, framework?: Framework): TemplateType | undefined {
    if (framework) {
      return this.getTemplateForFramework(id, framework);
    }

    // Search across all frameworks
    return this.reactManager.getTemplate(id) ||
           this.vueManager.getTemplate(id) ||
           this.jsManager.getTemplate(id);
  }

  /**
   * Get template for specific framework
   */
  getTemplateForFramework(id: string, framework: Framework): TemplateType | undefined {
    switch (framework) {
      case 'react':
        return this.reactManager.getTemplate(id);
      case 'vue':
        return this.vueManager.getTemplate(id);
      case 'js':
        return this.jsManager.getTemplate(id);
      default:
        return undefined;
    }
  }

  /**
   * Get all templates for a framework
   */
  getTemplatesForFramework(framework: Framework): TemplateType[] {
    switch (framework) {
      case 'react':
        return this.reactManager.getAllTemplates();
      case 'vue':
        return this.vueManager.getAllTemplates();
      case 'js':
        return this.jsManager.getAllTemplates();
      default:
        return [];
    }
  }

  /**
   * Search templates with filters
   */
  searchTemplates(options: TemplateSearchOptions): TemplateType[] {
    let results: TemplateType[] = [];

    // Get templates for specific framework or all frameworks
    if (options.framework) {
      results = this.getTemplatesForFramework(options.framework);
    } else {
      results = [
        ...this.reactManager.getAllTemplates(),
        ...this.vueManager.getAllTemplates(),
        ...this.jsManager.getAllTemplates()
      ];
    }

    // Apply filters
    if (options.category) {
      results = results.filter(t => t.category === options.category);
    }

    if (options.complexity) {
      results = results.filter(t => t.complexity === options.complexity);
    }

    return results;
  }

  /**
   * Get templates by category across all frameworks
   */
  getTemplatesByCategory(category: string): Record<Framework, TemplateType[]> {
    return {
      react: this.reactManager.getTemplatesByCategory(category as any),
      vue: this.vueManager.getTemplatesByCategory(category as any),
      js: this.jsManager.getTemplatesByCategory(category as any)
    };
  }

  /**
   * Get all available template IDs
   */
  getAllTemplateIds(): string[] {
    const reactIds = this.reactManager.getAllTemplates().map(t => t.id);
    const vueIds = this.vueManager.getAllTemplates().map(t => t.id);
    const jsIds = this.jsManager.getAllTemplates().map(t => t.id);
    
    return [...reactIds, ...vueIds, ...jsIds];
  }

  /**
   * Check if template exists
   */
  hasTemplate(id: string, framework?: Framework): boolean {
    return this.getTemplate(id, framework) !== undefined;
  }

  /**
   * Get template statistics
   */
  getTemplateStats(): {
    total: number;
    byFramework: Record<Framework, number>;
    byCategory: Record<string, number>;
    byComplexity: Record<'basic' | 'intermediate' | 'advanced', number>;
  } {
    const allTemplates = [
      ...this.reactManager.getAllTemplates(),
      ...this.vueManager.getAllTemplates(),
      ...this.jsManager.getAllTemplates()
    ];

    const byFramework = {
      react: this.reactManager.getAllTemplates().length,
      vue: this.vueManager.getAllTemplates().length,
      js: this.jsManager.getAllTemplates().length
    } as Record<Framework, number>;

    const byCategory: Record<string, number> = {};
    const byComplexity: Record<'basic' | 'intermediate' | 'advanced', number> = {
      basic: 0,
      intermediate: 0,
      advanced: 0
    };

    allTemplates.forEach(template => {
      // Count by category
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      
      // Count by complexity
      byComplexity[template.complexity]++;
    });

    return {
      total: allTemplates.length,
      byFramework,
      byCategory,
      byComplexity
    };
  }
}

export const templateManager = new TemplateManager();