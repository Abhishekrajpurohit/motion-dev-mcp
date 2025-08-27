/**
 * Test suite for animation patterns library
 */

import { AnimationPatterns } from '../../../src/generation/templates/patterns.js';
import { Framework } from '../../../src/types/motion.js';

describe('AnimationPatterns', () => {
  let patterns: AnimationPatterns;

  beforeEach(() => {
    patterns = new AnimationPatterns();
  });

  describe('Pattern Management', () => {
    test('should load default patterns on initialization', () => {
      const allPatterns = patterns.getAllPatterns();
      
      expect(allPatterns.size).toBeGreaterThan(0);
      expect(allPatterns.has('fade-in')).toBe(true);
      expect(allPatterns.has('slide-up')).toBe(true);
      expect(allPatterns.has('scale-in')).toBe(true);
      expect(allPatterns.has('bounce-in')).toBe(true);
    });

    test('should get pattern by ID', () => {
      const fadePattern = patterns.getPattern('fade-in');
      
      expect(fadePattern).toBeDefined();
      expect(fadePattern?.id).toBe('fade-in');
      expect(fadePattern?.category).toBe('entrance');
      expect(fadePattern?.frameworks).toHaveProperty('react');
      expect(fadePattern?.frameworks).toHaveProperty('vue');
      expect(fadePattern?.frameworks).toHaveProperty('js');
    });

    test('should return undefined for non-existent pattern', () => {
      const nonExistent = patterns.getPattern('non-existent-pattern');
      expect(nonExistent).toBeUndefined();
    });

    test('should get patterns by category', () => {
      const entrancePatterns = patterns.getPatternsByCategory('entrance');
      const exitPatterns = patterns.getPatternsByCategory('exit');
      const gesturePatterns = patterns.getPatternsByCategory('gesture');
      
      expect(entrancePatterns.length).toBeGreaterThan(0);
      expect(exitPatterns.length).toBeGreaterThan(0);
      expect(gesturePatterns.length).toBeGreaterThan(0);
      
      expect(entrancePatterns.every(p => p.category === 'entrance')).toBe(true);
      expect(exitPatterns.every(p => p.category === 'exit')).toBe(true);
      expect(gesturePatterns.every(p => p.category === 'gesture')).toBe(true);
    });

    test('should get patterns by framework', () => {
      const reactPatterns = patterns.getPatternsByFramework('react');
      const vuePatterns = patterns.getPatternsByFramework('vue');
      const jsPatterns = patterns.getPatternsByFramework('js');
      
      expect(reactPatterns.length).toBeGreaterThan(0);
      expect(vuePatterns.length).toBeGreaterThan(0);
      expect(jsPatterns.length).toBeGreaterThan(0);
      
      // All patterns should support all frameworks
      expect(reactPatterns.length).toBe(vuePatterns.length);
      expect(vuePatterns.length).toBe(jsPatterns.length);
    });
  });

  describe('Code Generation', () => {
    test('should generate React component code from pattern', () => {
      const code = patterns.getPatternCode('fade-in', 'react', 'FadeComponent');
      
      expect(code).toContain('import React from \'react\'');
      expect(code).toContain('import { motion } from \'framer-motion\'');
      expect(code).toContain('const FadeComponent');
      expect(code).toContain('motion.div');
      expect(code).toContain('initial');
      expect(code).toContain('animate');
      expect(code).toContain('export default FadeComponent');
    });

    test('should generate Vue component code from pattern', () => {
      const code = patterns.getPatternCode('slide-up', 'vue', 'SlideComponent');
      
      expect(code).toContain('<template>');
      expect(code).toContain('<script>');
      expect(code).toContain('v-motion');
      expect(code).toContain('SlideComponent');
    });

    test('should generate JavaScript function from pattern', () => {
      const code = patterns.getPatternCode('scale-in', 'js', 'scaleAnimation');
      
      expect(code).toContain('import { animate } from \'motion\'');
      expect(code).toContain('function scaleAnimation');
      expect(code).toContain('document.querySelector');
      expect(code).toContain('animate(');
    });

    test('should use default component name when not provided', () => {
      const reactCode = patterns.getPatternCode('fade-in', 'react');
      const vueCode = patterns.getPatternCode('fade-in', 'vue');
      const jsCode = patterns.getPatternCode('fade-in', 'js');
      
      expect(reactCode).toContain('AnimatedComponent');
      expect(vueCode).toContain('AnimatedComponent');
      expect(jsCode).toContain('animateElement');
    });

    test('should throw error for invalid pattern ID', () => {
      expect(() => {
        patterns.getPatternCode('invalid-pattern', 'react');
      }).toThrow('Pattern not found: invalid-pattern');
    });
  });

  describe('Pattern Categories', () => {
    test('should have entrance patterns', () => {
      const entrancePatterns = patterns.getPatternsByCategory('entrance');
      const expectedEntrance = ['fade-in', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale-in', 'bounce-in'];
      
      expectedEntrance.forEach(patternId => {
        expect(entrancePatterns.some(p => p.id === patternId)).toBe(true);
      });
    });

    test('should have exit patterns', () => {
      const exitPatterns = patterns.getPatternsByCategory('exit');
      const expectedExit = ['fade-out', 'slide-out-up', 'slide-out-down', 'scale-out'];
      
      expectedExit.forEach(patternId => {
        expect(exitPatterns.some(p => p.id === patternId)).toBe(true);
      });
    });

    test('should have gesture patterns', () => {
      const gesturePatterns = patterns.getPatternsByCategory('gesture');
      const expectedGesture = ['hover-lift', 'tap-scale', 'drag-rotation'];
      
      expectedGesture.forEach(patternId => {
        expect(gesturePatterns.some(p => p.id === patternId)).toBe(true);
      });
    });

    test('should have layout patterns', () => {
      const layoutPatterns = patterns.getPatternsByCategory('layout');
      expect(layoutPatterns.some(p => p.id === 'layout-shift')).toBe(true);
    });

    test('should have scroll patterns', () => {
      const scrollPatterns = patterns.getPatternsByCategory('scroll');
      expect(scrollPatterns.some(p => p.id === 'scroll-reveal')).toBe(true);
    });

    test('should have stagger patterns', () => {
      const staggerPatterns = patterns.getPatternsByCategory('stagger');
      expect(staggerPatterns.some(p => p.id === 'stagger-children')).toBe(true);
    });

    test('should have complex patterns', () => {
      const complexPatterns = patterns.getPatternsByCategory('complex');
      expect(complexPatterns.some(p => p.id === 'morphing-shapes')).toBe(true);
    });
  });

  describe('Performance Analysis', () => {
    test('should provide performance metrics for patterns', () => {
      const pattern = patterns.getPattern('fade-in');
      
      expect(pattern?.performance).toBeDefined();
      expect(pattern?.performance.score).toBeGreaterThanOrEqual(0);
      expect(pattern?.performance.score).toBeLessThanOrEqual(100);
      expect(pattern?.performance.bundleSize).toBeGreaterThan(0);
      expect(pattern?.performance.renderComplexity).toMatch(/low|medium|high/);
    });

    test('should analyze pattern performance', () => {
      const analysis = patterns.analyzePatternPerformance('bounce-in');
      
      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    test('should compare pattern performance', () => {
      const comparison = patterns.comparePatterns(['fade-in', 'bounce-in']);
      
      expect(comparison).toBeDefined();
      expect(comparison.fastest).toBeDefined();
      expect(comparison.smallest).toBeDefined();
      expect(comparison.details).toHaveLength(2);
    });
  });

  describe('Accessibility Features', () => {
    test('should provide accessibility information for patterns', () => {
      const pattern = patterns.getPattern('fade-in');
      
      expect(pattern?.accessibility).toBeDefined();
      expect(pattern?.accessibility.respectsReducedMotion).toBeDefined();
      expect(pattern?.accessibility.hasAltText).toBeDefined();
      expect(pattern?.accessibility.score).toBeGreaterThanOrEqual(0);
      expect(pattern?.accessibility.score).toBeLessThanOrEqual(100);
    });

    test('should validate pattern accessibility', () => {
      const validation = patterns.validateAccessibility('slide-up');
      
      expect(validation).toBeDefined();
      expect(validation.isAccessible).toBeDefined();
      expect(validation.issues).toBeDefined();
      expect(validation.suggestions).toBeDefined();
    });

    test('should get accessibility-compliant patterns', () => {
      const accessiblePatterns = patterns.getAccessiblePatterns();
      
      expect(accessiblePatterns.length).toBeGreaterThan(0);
      expect(accessiblePatterns.every(p => p.accessibility.score >= 80)).toBe(true);
    });
  });

  describe('Custom Patterns', () => {
    test('should allow adding custom patterns', () => {
      const customPattern = {
        id: 'custom-spin',
        name: 'Custom Spin',
        category: 'entrance' as const,
        description: 'A custom spinning animation',
        performance: {
          score: 85,
          bundleSize: 512,
          renderComplexity: 'medium' as const
        },
        accessibility: {
          respectsReducedMotion: true,
          hasAltText: true,
          score: 90
        },
        frameworks: {
          react: {
            code: 'const CustomSpin = () => <motion.div animate={{ rotate: 360 }}>Content</motion.div>;',
            imports: ['framer-motion'],
            dependencies: []
          },
          vue: {
            code: '<div v-motion :animate="{ rotate: 360 }">Content</div>',
            imports: ['@vueuse/motion'],
            dependencies: []
          },
          js: {
            code: 'animate(element, { rotate: 360 });',
            imports: ['motion'],
            dependencies: []
          }
        }
      };

      patterns.addPattern(customPattern);
      
      const added = patterns.getPattern('custom-spin');
      expect(added).toBeDefined();
      expect(added?.name).toBe('Custom Spin');
    });

    test('should validate custom pattern structure', () => {
      const invalidPattern = {
        id: 'invalid',
        // Missing required fields
      };

      expect(() => {
        patterns.addPattern(invalidPattern as any);
      }).toThrow();
    });

    test('should update existing patterns', () => {
      const updatedPattern = {
        id: 'fade-in',
        name: 'Updated Fade In',
        category: 'entrance' as const,
        description: 'Updated fade animation',
        performance: {
          score: 95,
          bundleSize: 256,
          renderComplexity: 'low' as const
        },
        accessibility: {
          respectsReducedMotion: true,
          hasAltText: true,
          score: 100
        },
        frameworks: {
          react: {
            code: 'const UpdatedFade = () => <motion.div>Updated</motion.div>;',
            imports: ['framer-motion'],
            dependencies: []
          },
          vue: {
            code: '<div>Updated Vue</div>',
            imports: [],
            dependencies: []
          },
          js: {
            code: '// Updated JS',
            imports: [],
            dependencies: []
          }
        }
      };

      patterns.updatePattern('fade-in', updatedPattern);
      
      const updated = patterns.getPattern('fade-in');
      expect(updated?.name).toBe('Updated Fade In');
      expect(updated?.performance.score).toBe(95);
    });

    test('should remove patterns', () => {
      patterns.removePattern('fade-in');
      
      const removed = patterns.getPattern('fade-in');
      expect(removed).toBeUndefined();
    });
  });

  describe('Framework-Specific Features', () => {
    test('should handle React-specific optimizations', () => {
      const reactCode = patterns.getPatternCode('stagger-children', 'react');
      
      expect(reactCode).toContain('AnimatePresence');
      expect(reactCode).toContain('staggerChildren');
      expect(reactCode).toContain('delayChildren');
    });

    test('should handle Vue-specific directives', () => {
      const vueCode = patterns.getPatternCode('scroll-reveal', 'vue');
      
      expect(vueCode).toContain('v-motion');
      expect(vueCode).toContain('v-intersection');
    });

    test('should handle JavaScript-specific DOM operations', () => {
      const jsCode = patterns.getPatternCode('drag-rotation', 'js');
      
      expect(jsCode).toContain('addEventListener');
      expect(jsCode).toContain('getBoundingClientRect');
    });
  });

  describe('Pattern Search and Filtering', () => {
    test('should search patterns by name or description', () => {
      const fadeResults = patterns.searchPatterns('fade');
      const slideResults = patterns.searchPatterns('slide');
      
      expect(fadeResults.length).toBeGreaterThan(0);
      expect(slideResults.length).toBeGreaterThan(0);
      
      expect(fadeResults.some(p => p.id.includes('fade'))).toBe(true);
      expect(slideResults.some(p => p.id.includes('slide'))).toBe(true);
    });

    test('should filter patterns by performance score', () => {
      const highPerformance = patterns.filterByPerformance(90);
      
      expect(highPerformance.length).toBeGreaterThan(0);
      expect(highPerformance.every(p => p.performance.score >= 90)).toBe(true);
    });

    test('should get recommended patterns for use case', () => {
      const entranceRecommendations = patterns.getRecommendedPatterns('entrance', {
        performance: 'high',
        accessibility: 'required',
        framework: 'react'
      });
      
      expect(entranceRecommendations.length).toBeGreaterThan(0);
      expect(entranceRecommendations.every(p => p.category === 'entrance')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid framework gracefully', () => {
      expect(() => {
        patterns.getPatternCode('fade-in', 'invalid' as Framework);
      }).toThrow('Unsupported framework: invalid');
    });

    test('should handle empty pattern database', () => {
      const emptyPatterns = new AnimationPatterns();
      emptyPatterns.clearAll();
      
      expect(emptyPatterns.getAllPatterns().size).toBe(0);
      expect(emptyPatterns.getPatternsByCategory('entrance')).toHaveLength(0);
    });

    test('should validate pattern dependencies', () => {
      const pattern = patterns.getPattern('bounce-in');
      const validation = patterns.validatePatternDependencies(pattern!);
      
      expect(validation.isValid).toBe(true);
      expect(validation.missingDependencies).toHaveLength(0);
    });
  });
});