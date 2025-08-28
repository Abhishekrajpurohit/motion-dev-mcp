/**
 * Accessibility Optimizer for Motion.dev code
 * Ensures animations are accessible and respect user preferences
 */

import { Framework } from '../../types/motion.js';

export interface AccessibilitySuggestion {
  type: 'accessibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fix?: string;
  line?: number;
}

export class AccessibilityOptimizer {
  analyzeCode(code: string, framework: Framework): AccessibilitySuggestion[] {
    const suggestions: AccessibilitySuggestion[] = [];

    // Check for reduced motion support
    if (!this.hasReducedMotionSupport(code)) {
      suggestions.push({
        type: 'accessibility',
        severity: 'high',
        message: 'Missing prefers-reduced-motion support',
        fix: 'Add respect for user motion preferences'
      });
    }

    // Check for ARIA labels on interactive elements
    if (this.needsAriaLabels(code)) {
      suggestions.push({
        type: 'accessibility',
        severity: 'medium',
        message: 'Interactive animated elements should have ARIA labels',
        fix: 'Add aria-label or aria-describedby attributes'
      });
    }

    // Check for focus indicators
    if (this.needsFocusIndicators(code)) {
      suggestions.push({
        type: 'accessibility',
        severity: 'medium',
        message: 'Animated interactive elements need visible focus indicators',
        fix: 'Add focus styles that work with animations'
      });
    }

    return suggestions;
  }

  optimizeCode(code: string, framework: Framework): string {
    let optimizedCode = code;

    // Add reduced motion support
    optimizedCode = this.addReducedMotionSupport(optimizedCode, framework);

    // Add ARIA labels where needed
    optimizedCode = this.addAriaLabels(optimizedCode, framework);

    // Add focus indicators
    optimizedCode = this.addFocusIndicators(optimizedCode, framework);

    return optimizedCode;
  }

  private hasReducedMotionSupport(code: string): boolean {
    return code.includes('prefers-reduced-motion') || code.includes('prefersReducedMotion');
  }

  private needsAriaLabels(code: string): boolean {
    return (code.includes('whileHover') || code.includes('whileTap')) && 
           !code.includes('aria-label') && !code.includes('aria-describedby');
  }

  private needsFocusIndicators(code: string): boolean {
    return (code.includes('whileHover') || code.includes('whileTap')) && 
           !code.includes('focus') && !code.includes('Focus');
  }

  private addReducedMotionSupport(code: string, framework: Framework): string {
    switch (framework) {
      case 'react':
        return this.addReactReducedMotion(code);
      case 'vue':
        return this.addVueReducedMotion(code);
      case 'js':
        return this.addJSReducedMotion(code);
      default:
        return code;
    }
  }

  private addReactReducedMotion(code: string): string {
    if (code.includes('motion.') && !code.includes('prefersReducedMotion')) {
      const reducedMotionCheck = `
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animationVariants = prefersReducedMotion ? {
  initial: {},
  animate: {},
  exit: {}
} : {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};`;

      return reducedMotionCheck + '\n\n' + code.replace(
        /initial=\{[^}]*\}/g, 'variants={animationVariants} initial="initial"'
      ).replace(
        /animate=\{[^}]*\}/g, 'animate="animate"'
      );
    }
    return code;
  }

  private addVueReducedMotion(code: string): string {
    if (code.includes('v-motion') && !code.includes('prefers-reduced-motion')) {
      const reducedMotionSupport = `
<script setup>
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionProps = prefersReducedMotion ? {} : {
  initial: { opacity: 0 },
  enter: { opacity: 1 }
};
</script>`;
      
      return code.replace('<script setup>', reducedMotionSupport);
    }
    return code;
  }

  private addJSReducedMotion(code: string): string {
    if (code.includes('animate(') && !code.includes('prefers-reduced-motion')) {
      const reducedMotionCheck = `
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // Animation code here
}`;
      
      return reducedMotionCheck + '\n\n' + code;
    }
    return code;
  }

  private addAriaLabels(code: string, framework: Framework): string {
    // Add basic aria-label to interactive elements
    if (framework === 'react') {
      return code.replace(
        /<motion\.(\w+)([^>]*whileHover[^>]*>)/g,
        '<motion.$1$2 aria-label="Interactive element">'
      );
    }
    return code;
  }

  private addFocusIndicators(code: string, framework: Framework): string {
    if (framework === 'react' && code.includes('whileHover')) {
      return code.replace(
        /whileHover=\{([^}]*)\}/g,
        'whileHover={$1} whileFocus={$1}'
      );
    }
    return code;
  }
}