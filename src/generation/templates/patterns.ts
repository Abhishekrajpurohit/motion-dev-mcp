/**
 * Motion.dev Animation Patterns and Templates
 * Common animation patterns that can be applied across frameworks
 */

import { Framework } from '../../types/motion.js';

export interface AnimationPattern {
  id: string;
  name: string;
  description: string;
  category: 'entrance' | 'exit' | 'gesture' | 'layout' | 'scroll' | 'stagger' | 'complex';
  complexity: 'basic' | 'intermediate' | 'advanced';
  frameworks: Framework[];
  tags: string[];
  config: {
    initial?: Record<string, any>;
    animate?: Record<string, any>;
    exit?: Record<string, any>;
    transition?: Record<string, any>;
    variants?: Record<string, Record<string, any>>;
    gestures?: Record<string, Record<string, any>>;
  };
  usage: {
    props: string[];
    dependencies: string[];
    notes?: string[];
  };
}

export class AnimationPatterns {
  private patterns: Map<string, AnimationPattern> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Entrance Animations
    this.addPattern({
      id: 'fade-in',
      name: 'Fade In',
      description: 'Smooth opacity transition from invisible to visible',
      category: 'entrance',
      complexity: 'basic',
      frameworks: ['react', 'js', 'vue'],
      tags: ['fade', 'opacity', 'entrance'],
      config: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 }
      },
      usage: {
        props: ['initial', 'animate', 'transition'],
        dependencies: []
      }
    });

    this.addPattern({
      id: 'slide-up',
      name: 'Slide Up',
      description: 'Element slides up from below while fading in',
      category: 'entrance',
      complexity: 'basic',
      frameworks: ['react', 'js', 'vue'],
      tags: ['slide', 'translate', 'entrance'],
      config: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' }
      },
      usage: {
        props: ['initial', 'animate', 'transition'],
        dependencies: []
      }
    });

    this.addPattern({
      id: 'scale-bounce',
      name: 'Scale Bounce',
      description: 'Element scales in with a bouncy spring animation',
      category: 'entrance',
      complexity: 'intermediate',
      frameworks: ['react', 'js', 'vue'],
      tags: ['scale', 'spring', 'bounce'],
      config: {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { 
          type: 'spring', 
          stiffness: 260, 
          damping: 20 
        }
      },
      usage: {
        props: ['initial', 'animate', 'transition'],
        dependencies: []
      }
    });

    // Exit Animations
    this.addPattern({
      id: 'fade-out',
      name: 'Fade Out',
      description: 'Smooth opacity transition from visible to invisible',
      category: 'exit',
      complexity: 'basic',
      frameworks: ['react', 'js', 'vue'],
      tags: ['fade', 'opacity', 'exit'],
      config: {
        exit: { opacity: 0 },
        transition: { duration: 0.2 }
      },
      usage: {
        props: ['exit', 'transition'],
        dependencies: ['AnimatePresence']
      }
    });

    this.addPattern({
      id: 'slide-down-exit',
      name: 'Slide Down Exit',
      description: 'Element slides down while fading out',
      category: 'exit',
      complexity: 'basic',
      frameworks: ['react', 'js', 'vue'],
      tags: ['slide', 'translate', 'exit'],
      config: {
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.3, ease: 'easeIn' }
      },
      usage: {
        props: ['exit', 'transition'],
        dependencies: ['AnimatePresence']
      }
    });

    // Gesture Animations
    this.addPattern({
      id: 'hover-scale',
      name: 'Hover Scale',
      description: 'Scale element on hover with smooth transition',
      category: 'gesture',
      complexity: 'basic',
      frameworks: ['react', 'js', 'vue'],
      tags: ['hover', 'scale', 'interaction'],
      config: {
        gestures: {
          whileHover: { scale: 1.05 },
          whileTap: { scale: 0.95 }
        },
        transition: { type: 'spring', stiffness: 400, damping: 17 }
      },
      usage: {
        props: ['whileHover', 'whileTap', 'transition'],
        dependencies: []
      }
    });

    this.addPattern({
      id: 'drag-elastic',
      name: 'Elastic Drag',
      description: 'Draggable element with elastic constraints',
      category: 'gesture',
      complexity: 'advanced',
      frameworks: ['react', 'js', 'vue'],
      tags: ['drag', 'elastic', 'constraints'],
      config: {
        gestures: {
          drag: {
            enabled: true,
            constraints: { left: -100, right: 100, top: -100, bottom: 100 },
            elastic: 0.2
          }
        },
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      },
      usage: {
        props: ['drag', 'dragConstraints', 'dragElastic', 'transition'],
        dependencies: []
      }
    });

    // Layout Animations
    this.addPattern({
      id: 'shared-layout',
      name: 'Shared Layout',
      description: 'Smooth layout transitions between different states',
      category: 'layout',
      complexity: 'advanced',
      frameworks: ['react'],
      tags: ['layout', 'transition', 'morph'],
      config: {
        variants: {
          collapsed: { width: 200, height: 100 },
          expanded: { width: 400, height: 300 }
        },
        transition: { layout: { duration: 0.3 } }
      },
      usage: {
        props: ['layout', 'layoutId', 'variants', 'transition'],
        dependencies: [],
        notes: ['Requires layoutId for shared layout animations']
      }
    });

    // Scroll Animations
    this.addPattern({
      id: 'scroll-reveal',
      name: 'Scroll Reveal',
      description: 'Element animates in when it enters the viewport',
      category: 'scroll',
      complexity: 'intermediate',
      frameworks: ['react', 'js', 'vue'],
      tags: ['scroll', 'viewport', 'reveal'],
      config: {
        initial: { opacity: 0, y: 50 },
        gestures: {
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '-100px' }
        },
        transition: { duration: 0.6, ease: 'easeOut' }
      },
      usage: {
        props: ['initial', 'whileInView', 'viewport', 'transition'],
        dependencies: []
      }
    });

    this.addPattern({
      id: 'parallax-scroll',
      name: 'Parallax Scroll',
      description: 'Element moves at different speed than scroll for depth effect',
      category: 'scroll',
      complexity: 'advanced',
      frameworks: ['react', 'js'],
      tags: ['parallax', 'scroll', 'depth'],
      config: {
        variants: {
          offscreen: { y: 100 },
          onscreen: { y: -100, transition: { type: 'spring', bounce: 0.4 } }
        }
      },
      usage: {
        props: ['variants', 'initial', 'whileInView'],
        dependencies: ['useScroll', 'useTransform'],
        notes: ['Requires scroll progress tracking']
      }
    });

    // Stagger Animations
    this.addPattern({
      id: 'stagger-children',
      name: 'Stagger Children',
      description: 'Children elements animate in sequence with delay',
      category: 'stagger',
      complexity: 'intermediate',
      frameworks: ['react', 'js', 'vue'],
      tags: ['stagger', 'children', 'sequence'],
      config: {
        variants: {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              delayChildren: 0.1,
              staggerChildren: 0.1
            }
          }
        }
      },
      usage: {
        props: ['variants', 'initial', 'animate'],
        dependencies: [],
        notes: ['Parent container needs staggerChildren, children need individual variants']
      }
    });

    // Complex Animations
    this.addPattern({
      id: 'morphing-button',
      name: 'Morphing Button',
      description: 'Button that morphs between different states',
      category: 'complex',
      complexity: 'advanced',
      frameworks: ['react'],
      tags: ['button', 'morph', 'state', 'loading'],
      config: {
        variants: {
          idle: { 
            width: 120, 
            borderRadius: 8,
            backgroundColor: '#3B82F6'
          },
          loading: { 
            width: 40, 
            borderRadius: 20,
            backgroundColor: '#10B981'
          },
          success: { 
            width: 140, 
            borderRadius: 8,
            backgroundColor: '#059669'
          }
        },
        transition: { type: 'spring', stiffness: 300, damping: 30 }
      },
      usage: {
        props: ['variants', 'animate', 'transition', 'layout'],
        dependencies: [],
        notes: ['Requires state management for different button states']
      }
    });

    this.addPattern({
      id: 'card-flip',
      name: 'Card Flip',
      description: '3D card flip animation with front and back sides',
      category: 'complex',
      complexity: 'advanced',
      frameworks: ['react', 'js'],
      tags: ['3d', 'flip', 'card', 'perspective'],
      config: {
        variants: {
          front: { rotateY: 0 },
          back: { rotateY: 180 }
        },
        transition: { duration: 0.6, ease: 'easeInOut' },
        initial: { transformPerspective: 1000 }
      },
      usage: {
        props: ['variants', 'animate', 'transition', 'style'],
        dependencies: [],
        notes: ['Requires CSS perspective and backface-visibility settings']
      }
    });
  }

  private addPattern(pattern: AnimationPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  // Public API methods

  getPattern(id: string): AnimationPattern | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): AnimationPattern[] {
    return Array.from(this.patterns.values());
  }

  getPatternsByCategory(category: AnimationPattern['category']): AnimationPattern[] {
    return this.getAllPatterns().filter(pattern => pattern.category === category);
  }

  getPatternsByFramework(framework: Framework): AnimationPattern[] {
    return this.getAllPatterns().filter(pattern => 
      pattern.frameworks.includes(framework)
    );
  }

  getPatternsByComplexity(complexity: AnimationPattern['complexity']): AnimationPattern[] {
    return this.getAllPatterns().filter(pattern => pattern.complexity === complexity);
  }

  searchPatterns(query: string): AnimationPattern[] {
    const searchTerm = query.toLowerCase();
    
    return this.getAllPatterns().filter(pattern =>
      pattern.name.toLowerCase().includes(searchTerm) ||
      pattern.description.toLowerCase().includes(searchTerm) ||
      pattern.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  getPatternCode(
    patternId: string, 
    framework: Framework,
    componentName: string = 'AnimatedComponent'
  ): string {
    const pattern = this.getPattern(patternId);
    if (!pattern) {
      throw new Error(`Pattern '${patternId}' not found`);
    }

    if (!pattern.frameworks.includes(framework)) {
      throw new Error(`Pattern '${patternId}' not supported for ${framework}`);
    }

    switch (framework) {
      case 'react':
        return this.generateReactCode(pattern, componentName);
      case 'vue':
        return this.generateVueCode(pattern, componentName);
      case 'js':
        return this.generateJavaScriptCode(pattern, componentName);
      default:
        throw new Error(`Framework '${framework}' not supported`);
    }
  }

  private generateReactCode(pattern: AnimationPattern, componentName: string): string {
    const imports = this.getRequiredImports(pattern, 'react');
    const props = this.generateReactProps(pattern);
    
    return `import React from 'react';
${imports}

const ${componentName}: React.FC = () => {
  return (
    <motion.div
${props}
    >
      {/* Your content here */}
    </motion.div>
  );
};

export default ${componentName};`;
  }

  private generateVueCode(pattern: AnimationPattern, _componentName: string): string {
    const directives = this.generateVueDirectives(pattern);
    
    return `<template>
  <div ${directives}>
    <!-- Your content here -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MotionPlugin } from '@vueuse/motion';

// Component logic here
</script>`;
  }

  private generateJavaScriptCode(pattern: AnimationPattern, functionName: string): string {
    const animationCode = this.generateJavaScriptAnimation(pattern);
    
    return `import { animate } from 'motion';

function ${functionName}() {
  const element = document.querySelector('.animated-element');
  
  if (element) {
${animationCode}
  }
}

// Call the function
${functionName}();`;
  }

  private getRequiredImports(pattern: AnimationPattern, _framework: Framework): string {
    const imports = new Set(['motion']);
    
    if (pattern.usage.dependencies.includes('AnimatePresence')) {
      imports.add('AnimatePresence');
    }
    
    if (pattern.usage.dependencies.includes('useScroll')) {
      imports.add('useScroll');
    }
    
    if (pattern.usage.dependencies.includes('useTransform')) {
      imports.add('useTransform');
    }

    return `import { ${Array.from(imports).join(', ')} } from 'framer-motion';`;
  }

  private generateReactProps(pattern: AnimationPattern): string {
    const props: string[] = [];
    
    if (pattern.config.initial) {
      props.push(`      initial={${JSON.stringify(pattern.config.initial, null, 6)}}`);
    }
    
    if (pattern.config.animate) {
      props.push(`      animate={${JSON.stringify(pattern.config.animate, null, 6)}}`);
    }
    
    if (pattern.config.exit) {
      props.push(`      exit={${JSON.stringify(pattern.config.exit, null, 6)}}`);
    }
    
    if (pattern.config.variants) {
      props.push(`      variants={${JSON.stringify(pattern.config.variants, null, 6)}}`);
    }
    
    if (pattern.config.transition) {
      props.push(`      transition={${JSON.stringify(pattern.config.transition, null, 6)}}`);
    }
    
    if (pattern.config.gestures) {
      Object.entries(pattern.config.gestures).forEach(([key, value]) => {
        props.push(`      ${key}={${JSON.stringify(value, null, 6)}}`);
      });
    }
    
    return props.join('\n');
  }

  private generateVueDirectives(pattern: AnimationPattern): string {
    const directives: string[] = [];
    
    if (pattern.config.initial) {
      directives.push(`v-motion-initial="${JSON.stringify(pattern.config.initial)}"`);
    }
    
    if (pattern.config.animate) {
      directives.push(`v-motion-enter="${JSON.stringify(pattern.config.animate)}"`);
    }
    
    return directives.join(' ');
  }

  private generateJavaScriptAnimation(pattern: AnimationPattern): string {
    if (pattern.config.animate) {
      return `    animate(element, ${JSON.stringify(pattern.config.animate, null, 4)}, {
      duration: ${pattern.config.transition?.duration || 0.3}
    });`;
    }
    
    return '    // Animation code here';
  }

  // Pattern analysis and suggestions

  getSimilarPatterns(patternId: string, limit: number = 3): AnimationPattern[] {
    const pattern = this.getPattern(patternId);
    if (!pattern) return [];
    
    return this.getAllPatterns()
      .filter(p => p.id !== patternId)
      .filter(p => 
        p.category === pattern.category || 
        p.tags.some(tag => pattern.tags.includes(tag))
      )
      .slice(0, limit);
  }

  getPatternCombinations(patternIds: string[]): {
    compatible: boolean;
    conflicts: string[];
    suggestions: string[];
  } {
    const _patterns = patternIds.map(id => this.getPattern(id)).filter(Boolean) as AnimationPattern[];
    
    return {
      compatible: true,
      conflicts: [],
      suggestions: []
    };
  }

  getPatternPerformanceScore(patternId: string): {
    score: number;
    factors: {
      transforms: number;
      layout: number;
      complexity: number;
    };
    recommendations: string[];
  } {
    const pattern = this.getPattern(patternId);
    if (!pattern) {
      return {
        score: 0,
        factors: { transforms: 0, layout: 0, complexity: 0 },
        recommendations: []
      };
    }

    // Simplified performance scoring
    let score = 100;
    const factors = { transforms: 0, layout: 0, complexity: 0 };
    const recommendations: string[] = [];

    // Check for transform properties (good for performance)
    const config = JSON.stringify(pattern.config);
    if (config.includes('"x":') || config.includes('"y":') || config.includes('"scale":')) {
      factors.transforms = 20;
    }

    // Check for layout properties (bad for performance)
    if (config.includes('"width":') || config.includes('"height":')) {
      factors.layout = -30;
      score -= 30;
      recommendations.push('Consider using transform properties instead of width/height');
    }

    // Complexity penalty
    if (pattern.complexity === 'advanced') {
      factors.complexity = -10;
      score -= 10;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      recommendations
    };
  }
}