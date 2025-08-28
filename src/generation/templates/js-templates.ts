/**
 * JavaScript-specific Motion.dev templates
 * Pre-built vanilla JavaScript functions with Motion animations
 */

// Framework import removed as unused

export interface JSTemplate {
  id: string;
  name: string;
  description: string;
  category: 'animation' | 'interaction' | 'layout' | 'utility';
  complexity: 'basic' | 'intermediate' | 'advanced';
  code: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  dependencies: string[];
  examples: string[];
}

export class JSTemplateManager {
  private templates: Map<string, JSTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  getTemplate(id: string): JSTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): JSTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: JSTemplate['category']): JSTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  private initializeTemplates(): void {
    // Fade In Animation Function
    this.addTemplate({
      id: 'js-fade-in',
      name: 'JavaScript Fade In',
      description: 'Fade in animation for DOM elements',
      category: 'animation',
      complexity: 'basic',
      code: `import { animate } from 'motion';

/**
 * Fade in animation for DOM elements
 * @param selector - CSS selector or DOM element
 * @param options - Animation options
 */
export function fadeIn(selector, options = {}) {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  
  if (!element) {
    console.warn('Element not found:', selector);
    return;
  }

  const {
    duration = 0.3,
    delay = 0,
    easing = 'ease-out'
  } = options;

  // Set initial state
  element.style.opacity = '0';
  
  return animate(
    element,
    { opacity: 1 },
    { duration, delay, easing }
  );
}`,
      parameters: [
        { name: 'selector', type: 'string | Element', required: true, description: 'CSS selector or DOM element' },
        { name: 'options', type: 'object', required: false, description: 'Animation options (duration, delay, easing)' }
      ],
      dependencies: ['motion'],
      examples: [
        "fadeIn('.card')",
        "fadeIn(document.getElementById('myElement'), { duration: 0.5, delay: 0.2 })"
      ]
    });

    // Stagger Animation Function
    this.addTemplate({
      id: 'js-stagger',
      name: 'JavaScript Stagger',
      description: 'Staggered animations for multiple elements',
      category: 'animation',
      complexity: 'intermediate',
      code: `import { animate, stagger } from 'motion';

/**
 * Apply staggered animations to multiple elements
 * @param selector - CSS selector for elements
 * @param animations - Animation properties
 * @param options - Stagger options
 */
export function animateStagger(selector, animations, options = {}) {
  const elements = document.querySelectorAll(selector);
  
  if (elements.length === 0) {
    console.warn('No elements found:', selector);
    return;
  }

  const {
    staggerDelay = 0.1,
    duration = 0.3,
    easing = 'ease-out'
  } = options;

  return animate(
    elements,
    animations,
    {
      duration,
      delay: stagger(staggerDelay),
      easing
    }
  );
}`,
      parameters: [
        { name: 'selector', type: 'string', required: true, description: 'CSS selector for elements' },
        { name: 'animations', type: 'object', required: true, description: 'Animation properties to apply' },
        { name: 'options', type: 'object', required: false, description: 'Stagger options (staggerDelay, duration, easing)' }
      ],
      dependencies: ['motion'],
      examples: [
        "animateStagger('.list-item', { opacity: [0, 1], y: [20, 0] })",
        "animateStagger('.card', { scale: [0.8, 1] }, { staggerDelay: 0.05 })"
      ]
    });

    // Scroll Trigger Animation
    this.addTemplate({
      id: 'js-scroll-trigger',
      name: 'JavaScript Scroll Trigger',
      description: 'Trigger animations on scroll into view',
      category: 'interaction',
      complexity: 'intermediate',
      code: `import { animate, scroll } from 'motion';

/**
 * Trigger animation when element scrolls into view
 * @param selector - CSS selector or DOM element
 * @param animations - Animation properties
 * @param options - Scroll trigger options
 */
export function animateOnScroll(selector, animations, options = {}) {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  
  if (!element) {
    console.warn('Element not found:', selector);
    return;
  }

  const {
    threshold = 0.1,
    duration = 0.6,
    easing = 'ease-out',
    once = true
  } = options;

  return scroll(
    animate(element, animations, { duration, easing }),
    {
      target: element,
      offset: [0, threshold]
    }
  );
}`,
      parameters: [
        { name: 'selector', type: 'string | Element', required: true, description: 'CSS selector or DOM element' },
        { name: 'animations', type: 'object', required: true, description: 'Animation properties to apply' },
        { name: 'options', type: 'object', required: false, description: 'Scroll options (threshold, duration, easing, once)' }
      ],
      dependencies: ['motion'],
      examples: [
        "animateOnScroll('.hero', { opacity: [0, 1], y: [100, 0] })",
        "animateOnScroll('#banner', { scale: [0.5, 1] }, { threshold: 0.5 })"
      ]
    });
  }

  private addTemplate(template: JSTemplate): void {
    this.templates.set(template.id, template);
  }
}

export const jsTemplateManager = new JSTemplateManager();