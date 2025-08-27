/**
 * Test suite for code generation MCP tools
 */

import { CodeGenerationTool } from '../../src/tools/generation.js';
import { Framework } from '../../src/types/motion.js';

describe('CodeGenerationTool', () => {
  let tool: CodeGenerationTool;

  beforeEach(() => {
    tool = new CodeGenerationTool();
  });

  describe('generateMotionComponent', () => {
    test('should generate React component from pattern', async () => {
      const params = {
        pattern: 'fade-in',
        framework: 'react' as Framework,
        componentName: 'FadeButton',
        typescript: true
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('import React from \'react\'');
      expect(response.code).toContain('import { motion } from \'framer-motion\'');
      expect(response.code).toContain('const FadeButton');
      expect(response.code).toContain('motion.div');
      expect(response.framework).toBe('react');
      expect(response.typescript).toBe(true);
      expect(response.componentName).toBe('FadeButton');
    });

    test('should generate Vue component from pattern', async () => {
      const params = {
        pattern: 'slide-up',
        framework: 'vue' as Framework,
        componentName: 'SlideCard',
        typescript: false
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('<template>');
      expect(response.code).toContain('<script>');
      expect(response.code).toContain('v-motion');
      expect(response.framework).toBe('vue');
      expect(response.typescript).toBe(false);
      expect(response.componentName).toBe('SlideCard');
    });

    test('should generate JavaScript function from pattern', async () => {
      const params = {
        pattern: 'bounce-in',
        framework: 'js' as Framework,
        componentName: 'bounceAnimation',
        typescript: true
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('import { animate } from \'motion\'');
      expect(response.code).toContain('function bounceAnimation');
      expect(response.framework).toBe('js');
      expect(response.componentName).toBe('bounceAnimation');
    });

    test('should handle custom animation properties', async () => {
      const params = {
        pattern: 'custom',
        framework: 'react' as Framework,
        customAnimation: {
          initial: { opacity: 0, rotate: -45 },
          animate: { opacity: 1, rotate: 0 },
          transition: { duration: 0.8, ease: 'backOut' }
        },
        componentName: 'CustomComponent'
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('opacity: 0');
      expect(response.code).toContain('rotate: -45');
      expect(response.code).toContain('duration: 0.8');
      expect(response.code).toContain('ease: "backOut"');
    });

    test('should handle invalid pattern gracefully', async () => {
      const params = {
        pattern: 'non-existent-pattern',
        framework: 'react' as Framework
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Pattern not found');
    });

    test('should include performance analysis', async () => {
      const params = {
        pattern: 'fade-in',
        framework: 'react' as Framework,
        includeAnalysis: true
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(true);
      expect(response.analysis).toBeDefined();
      expect(response.analysis?.performance).toBeDefined();
      expect(response.analysis?.accessibility).toBeDefined();
      expect(response.analysis?.bundleSize).toBeDefined();
    });
  });

  describe('createAnimationSequence', () => {
    test('should create React animation sequence', async () => {
      const params = {
        framework: 'react' as Framework,
        steps: [
          {
            selector: '.header',
            animation: { y: [-50, 0], opacity: [0, 1] },
            timing: { duration: 0.6, delay: 0 }
          },
          {
            selector: '.content',
            animation: { x: [-100, 0], opacity: [0, 1] },
            timing: { duration: 0.8, delay: 0.3 }
          },
          {
            selector: '.footer',
            animation: { y: [50, 0], opacity: [0, 1] },
            timing: { duration: 0.5, delay: 0.6 }
          }
        ],
        stagger: { each: 0.1, from: 'first' },
        componentName: 'SequenceComponent'
      };

      const response = await tool.createAnimationSequence(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('AnimatePresence');
      expect(response.code).toContain('staggerChildren');
      expect(response.code).toContain('delayChildren');
      expect(response.totalDuration).toBeGreaterThan(0);
      expect(response.stepCount).toBe(3);
    });

    test('should create Vue animation sequence', async () => {
      const params = {
        framework: 'vue' as Framework,
        steps: [
          {
            selector: '.item',
            animation: { scale: [0.8, 1] },
            timing: { duration: 0.4 }
          }
        ],
        componentName: 'VueSequence'
      };

      const response = await tool.createAnimationSequence(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('<transition-group');
      expect(response.code).toContain('v-motion');
    });

    test('should create JavaScript animation sequence', async () => {
      const params = {
        framework: 'js' as Framework,
        steps: [
          {
            selector: '.box',
            animation: { rotate: 360 },
            timing: { duration: 1 }
          }
        ],
        componentName: 'jsSequence'
      };

      const response = await tool.createAnimationSequence(params);

      expect(response.success).toBe(true);
      expect(response.code).toContain('timeline([');
      expect(response.code).toContain('document.querySelector');
    });

    test('should handle empty steps', async () => {
      const params = {
        framework: 'react' as Framework,
        steps: [],
        componentName: 'EmptySequence'
      };

      const response = await tool.createAnimationSequence(params);

      expect(response.success).toBe(false);
      expect(response.error).toContain('At least one animation step is required');
    });

    test('should calculate total duration correctly', async () => {
      const params = {
        framework: 'js' as Framework,
        steps: [
          {
            selector: '.a',
            animation: { x: 100 },
            timing: { duration: 0.5, delay: 0 }
          },
          {
            selector: '.b',
            animation: { y: 100 },
            timing: { duration: 0.8, delay: 0.3 }
          }
        ]
      };

      const response = await tool.createAnimationSequence(params);
      
      expect(response.success).toBe(true);
      expect(response.totalDuration).toBe(1.1); // 0.3 (delay) + 0.8 (duration)
    });
  });

  describe('optimizeMotionCode', () => {
    test('should optimize React component code', async () => {
      const unoptimizedCode = `
        import React from 'react';
        import { motion, AnimatePresence } from 'framer-motion';
        import { unused } from 'some-library';

        const SlowComponent = () => {
          return (
            <motion.div
              animate={{ x: [0, 100, 0, 100, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              <motion.div animate={{ rotate: 360 }}>
                <motion.div animate={{ scale: [1, 2, 1] }}>
                  Nested animations
                </motion.div>
              </motion.div>
            </motion.div>
          );
        };
      `;

      const params = {
        code: unoptimizedCode,
        framework: 'react' as Framework,
        optimizations: ['performance', 'bundle-size', 'accessibility']
      };

      const response = await tool.optimizeMotionCode(params);

      expect(response.success).toBe(true);
      expect(response.optimizedCode).toBeDefined();
      expect(response.optimizations).toBeDefined();
      expect(response.optimizations.length).toBeGreaterThan(0);
      expect(response.performanceGain).toBeGreaterThan(0);
      expect(response.bundleSizeReduction).toBeGreaterThan(0);
    });

    test('should provide accessibility optimizations', async () => {
      const codeWithAccessibilityIssues = `
        import { motion } from 'framer-motion';

        const FlashyComponent = () => (
          <motion.div
            animate={{ 
              backgroundColor: ['red', 'green', 'blue'],
              scale: [1, 5, 1]
            }}
            transition={{ duration: 0.1, repeat: Infinity }}
          >
            Flashing content
          </motion.div>
        );
      `;

      const params = {
        code: codeWithAccessibilityIssues,
        framework: 'react' as Framework,
        optimizations: ['accessibility']
      };

      const response = await tool.optimizeMotionCode(params);

      expect(response.success).toBe(true);
      expect(response.optimizedCode).toContain('prefers-reduced-motion');
      expect(response.accessibilityImprovements).toBeDefined();
      expect(response.accessibilityScore).toBeGreaterThan(0);
    });

    test('should optimize bundle size', async () => {
      const heavyCode = `
        import { motion, AnimatePresence, useAnimation, useMotionValue } from 'framer-motion';
        // Only using motion.div but importing everything
        
        const SimpleComponent = () => (
          <motion.div animate={{ x: 100 }}>
            Simple animation
          </motion.div>
        );
      `;

      const params = {
        code: heavyCode,
        framework: 'react' as Framework,
        optimizations: ['bundle-size']
      };

      const response = await tool.optimizeMotionCode(params);

      expect(response.success).toBe(true);
      expect(response.bundleSizeReduction).toBeGreaterThan(0);
      expect(response.optimizations.some(opt => opt.includes('import'))).toBe(true);
    });

    test('should handle invalid code gracefully', async () => {
      const invalidCode = 'This is not valid code {{{';

      const params = {
        code: invalidCode,
        framework: 'react' as Framework
      };

      const response = await tool.optimizeMotionCode(params);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Failed to parse code');
    });
  });

  describe('convertBetweenFrameworks', () => {
    test('should convert React to Vue', async () => {
      const reactCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const ReactComponent = () => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.1 }}
            >
              React content
            </motion.div>
          );
        };

        export default ReactComponent;
      `;

      const params = {
        code: reactCode,
        sourceFramework: 'react' as Framework,
        targetFramework: 'vue' as Framework,
        componentName: 'VueComponent'
      };

      const response = await tool.convertBetweenFrameworks(params);

      expect(response.success).toBe(true);
      expect(response.convertedCode).toContain('<template>');
      expect(response.convertedCode).toContain('<script>');
      expect(response.convertedCode).toContain('v-motion');
      expect(response.conversionNotes).toBeDefined();
      expect(response.conversionNotes.length).toBeGreaterThan(0);
    });

    test('should convert Vue to React', async () => {
      const vueCode = `
        <template>
          <div 
            v-motion
            :initial="{ scale: 0 }"
            :enter="{ scale: 1 }"
            class="vue-component"
          >
            Vue content
          </div>
        </template>

        <script setup>
        import { ref } from 'vue';
        </script>
      `;

      const params = {
        code: vueCode,
        sourceFramework: 'vue' as Framework,
        targetFramework: 'react' as Framework,
        componentName: 'ReactComponent'
      };

      const response = await tool.convertBetweenFrameworks(params);

      expect(response.success).toBe(true);
      expect(response.convertedCode).toContain('import React from \'react\'');
      expect(response.convertedCode).toContain('import { motion } from \'framer-motion\'');
      expect(response.convertedCode).toContain('motion.div');
      expect(response.convertedCode).toContain('className="vue-component"');
    });

    test('should convert JavaScript to React', async () => {
      const jsCode = `
        import { animate, spring } from 'motion';

        function animateButton() {
          const button = document.querySelector('.button');
          
          animate(button, 
            { scale: [1, 1.2, 1] },
            { 
              duration: 0.3,
              easing: spring({ stiffness: 400 })
            }
          );
        }

        export { animateButton };
      `;

      const params = {
        code: jsCode,
        sourceFramework: 'js' as Framework,
        targetFramework: 'react' as Framework,
        componentName: 'AnimatedButton'
      };

      const response = await tool.convertBetweenFrameworks(params);

      expect(response.success).toBe(true);
      expect(response.convertedCode).toContain('const AnimatedButton');
      expect(response.convertedCode).toContain('motion.button');
      expect(response.convertedCode).toContain('whileTap');
    });

    test('should handle unsupported conversion', async () => {
      const params = {
        code: 'const test = () => {};',
        sourceFramework: 'react' as Framework,
        targetFramework: 'angular' as any, // Unsupported
        componentName: 'Test'
      };

      const response = await tool.convertBetweenFrameworks(params);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unsupported target framework');
    });

    test('should provide conversion limitations', async () => {
      const complexCode = `
        import React, { useCallback, useMemo } from 'react';
        import { motion, useAnimation } from 'framer-motion';

        const ComplexComponent = () => {
          const controls = useAnimation();
          const complexLogic = useMemo(() => ({ x: 100 }), []);
          
          return <motion.div animate={controls}>Complex</motion.div>;
        };
      `;

      const params = {
        code: complexCode,
        sourceFramework: 'react' as Framework,
        targetFramework: 'vue' as Framework
      };

      const response = await tool.convertBetweenFrameworks(params);

      expect(response.success).toBe(true);
      expect(response.limitations).toBeDefined();
      expect(response.limitations.length).toBeGreaterThan(0);
      expect(response.conversionNotes.some(note => 
        note.includes('useAnimation') || note.includes('useMemo')
      )).toBe(true);
    });
  });

  describe('validateMotionSyntax', () => {
    test('should validate correct React Motion code', async () => {
      const validCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const ValidComponent = () => (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            Valid content
          </motion.div>
        );
      `;

      const params = {
        code: validCode,
        framework: 'react' as Framework
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.isValid).toBe(true);
      expect(response.errors).toHaveLength(0);
      expect(response.warnings).toBeDefined();
      expect(response.suggestions).toBeDefined();
      expect(response.score).toBeGreaterThan(80);
    });

    test('should detect syntax errors', async () => {
      const invalidCode = `
        import { motion } from 'framer-motion';

        const InvalidComponent = () => (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, invalidProperty: true }}
            transition={{ duration: "not-a-number" }}
          >
            Invalid content
          </motion.div>
        );
      `;

      const params = {
        code: invalidCode,
        framework: 'react' as Framework
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.isValid).toBe(false);
      expect(response.errors.length).toBeGreaterThan(0);
      expect(response.errors.some(error => 
        error.includes('invalidProperty') || error.includes('duration')
      )).toBe(true);
    });

    test('should provide best practice suggestions', async () => {
      const suboptimalCode = `
        import { motion } from 'framer-motion';

        const SuboptimalComponent = () => (
          <motion.div
            animate={{ x: [0, 100, 200, 300, 400] }}
            transition={{ duration: 10, repeat: Infinity }}
          >
            Long animation
          </motion.div>
        );
      `;

      const params = {
        code: suboptimalCode,
        framework: 'react' as Framework,
        includePerformanceCheck: true
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.isValid).toBe(true);
      expect(response.warnings.length).toBeGreaterThan(0);
      expect(response.suggestions.length).toBeGreaterThan(0);
      expect(response.performanceScore).toBeLessThan(80);
    });

    test('should validate Vue Motion syntax', async () => {
      const vueCode = `
        <template>
          <div
            v-motion
            :initial="{ opacity: 0 }"
            :enter="{ opacity: 1 }"
            :leave="{ opacity: 0 }"
          >
            Vue motion content
          </div>
        </template>
      `;

      const params = {
        code: vueCode,
        framework: 'vue' as Framework
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.isValid).toBe(true);
      expect(response.errors).toHaveLength(0);
    });

    test('should validate JavaScript Motion syntax', async () => {
      const jsCode = `
        import { animate, spring } from 'motion';

        function validAnimation() {
          const element = document.querySelector('.target');
          
          animate(element, 
            { x: 100, opacity: 1 },
            { 
              duration: 0.5,
              easing: spring({ stiffness: 300, damping: 30 })
            }
          );
        }
      `;

      const params = {
        code: jsCode,
        framework: 'js' as Framework
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.isValid).toBe(true);
      expect(response.score).toBeGreaterThan(70);
    });

    test('should detect accessibility issues', async () => {
      const accessibilityProblematicCode = `
        import { motion } from 'framer-motion';

        const ProblematicComponent = () => (
          <motion.div
            animate={{ 
              backgroundColor: ['red', 'yellow', 'red'],
              scale: [1, 3, 1]
            }}
            transition={{ duration: 0.1, repeat: Infinity }}
          >
            Flashing content
          </motion.div>
        );
      `;

      const params = {
        code: accessibilityProblematicCode,
        framework: 'react' as Framework,
        includeAccessibilityCheck: true
      };

      const response = await tool.validateMotionSyntax(params);

      expect(response.accessibilityIssues).toBeDefined();
      expect(response.accessibilityIssues.length).toBeGreaterThan(0);
      expect(response.accessibilityScore).toBeLessThan(50);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing parameters gracefully', async () => {
      const response = await tool.generateMotionComponent({} as any);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameter');
    });

    test('should handle invalid frameworks', async () => {
      const params = {
        pattern: 'fade-in',
        framework: 'invalid' as Framework
      };

      const response = await tool.generateMotionComponent(params);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unsupported framework');
    });

    test('should handle empty code input', async () => {
      const response = await tool.validateMotionSyntax({
        code: '',
        framework: 'react' as Framework
      });

      expect(response.isValid).toBe(false);
      expect(response.errors).toContain('Empty code provided');
    });
  });

  describe('Integration and Performance', () => {
    test('should handle large code inputs efficiently', async () => {
      // Generate large component code
      const largeCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const LargeComponent = () => (
          <div>
            ${Array.from({ length: 100 }, (_, i) => 
              `<motion.div key={${i}} animate={{ x: ${i * 10} }}>Item ${i}</motion.div>`
            ).join('\n            ')}
          </div>
        );
      `;

      const startTime = Date.now();
      
      const response = await tool.validateMotionSyntax({
        code: largeCode,
        framework: 'react' as Framework
      });

      const endTime = Date.now();

      expect(response).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cache pattern results for performance', async () => {
      const params = {
        pattern: 'fade-in',
        framework: 'react' as Framework,
        componentName: 'CachedComponent'
      };

      // First call
      const start1 = Date.now();
      const response1 = await tool.generateMotionComponent(params);
      const end1 = Date.now();

      // Second call (should be faster due to caching)
      const start2 = Date.now();
      const response2 = await tool.generateMotionComponent(params);
      const end2 = Date.now();

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response1.code).toBe(response2.code);
      
      // Second call should be faster (cached)
      expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
    });
  });
});