/**
 * Performance Optimizer for Motion.dev code
 * Analyzes and optimizes animation performance
 */

import { Framework } from '../../types/motion.js';

export interface OptimizationSuggestion {
  type: 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fix?: string;
  line?: number;
}

export class PerformanceOptimizer {
  analyzeCode(code: string, _framework: Framework): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for layout-triggering properties
    if (this.hasLayoutTriggeringProps(code)) {
      suggestions.push({
        type: 'performance',
        severity: 'high',
        message: 'Animating width/height can cause layout thrashing',
        fix: 'Use transform properties (scale, translate) instead'
      });
    }

    // Check for missing will-change
    if (this.needsWillChange(code)) {
      suggestions.push({
        type: 'performance',
        severity: 'medium',
        message: 'Consider adding will-change for complex animations',
        fix: 'Add will-change: transform to animated elements'
      });
    }

    // Check for excessive animations
    if (this.hasExcessiveAnimations(code)) {
      suggestions.push({
        type: 'performance',
        severity: 'medium',
        message: 'Too many simultaneous animations may impact performance',
        fix: 'Consider staggering animations or reducing complexity'
      });
    }

    return suggestions;
  }

  optimizeCode(code: string, _framework: Framework): string {
    let optimizedCode = code;

    // Replace layout-triggering properties
    optimizedCode = this.replaceLayoutProps(optimizedCode);

    // Add will-change where needed
    optimizedCode = this.addWillChange(optimizedCode);

    // Optimize animation timing
    optimizedCode = this.optimizeTimings(optimizedCode);

    return optimizedCode;
  }

  private hasLayoutTriggeringProps(code: string): boolean {
    return /(?:width|height|top|left|right|bottom|padding|margin):\s*['"]/g.test(code);
  }

  private needsWillChange(code: string): boolean {
    return code.includes('transform') && !code.includes('will-change');
  }

  private hasExcessiveAnimations(code: string): boolean {
    const animationCount = (code.match(/animate|motion\./g) || []).length;
    return animationCount > 5;
  }

  private replaceLayoutProps(code: string): string {
    return code
      .replace(/width:\s*(['"`])[^'"`]*\1/g, 'scaleX: 1')
      .replace(/height:\s*(['"`])[^'"`]*\1/g, 'scaleY: 1');
  }

  private addWillChange(code: string): string {
    if (code.includes('transform') && !code.includes('will-change')) {
      return code.replace(/transform:/g, 'willChange: "transform", transform:');
    }
    return code;
  }

  private optimizeTimings(code: string): string {
    // Optimize duration values for better performance
    return code.replace(/duration:\s*([0-9.]+)/g, (match, duration) => {
      const d = parseFloat(duration);
      if (d > 1) {
        return `duration: ${Math.min(d, 1)}`;
      }
      return match;
    });
  }
}