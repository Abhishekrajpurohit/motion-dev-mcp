/**
 * Test suite for AST parser system
 */

import { ASTParser } from '../../../src/generation/ast/parser.js';
import { Framework } from '../../../src/types/motion.js';

describe('ASTParser', () => {
  let parser: ASTParser;

  beforeEach(() => {
    parser = new ASTParser();
  });

  describe('React Component Parsing', () => {
    test('should parse React functional component', () => {
      const reactCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const AnimatedButton: React.FC = () => {
          return (
            <motion.button
              animate={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              Click me
            </motion.button>
          );
        };

        export default AnimatedButton;
      `;

      const result = parser.parse(reactCode, {
        framework: 'react' as Framework,
        typescript: true,
        componentName: 'AnimatedButton'
      });

      expect(result.framework).toBe('react');
      expect(result.componentName).toBe('AnimatedButton');
      expect(result.typescript).toBe(true);
      expect(result.imports).toHaveLength(2);
      expect(result.imports.some(imp => imp.source === 'react')).toBe(true);
      expect(result.imports.some(imp => imp.source === 'framer-motion')).toBe(true);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].declaration).toBe('AnimatedButton');
    });

    test('should parse React class component', () => {
      const reactCode = `
        import React, { Component } from 'react';
        import { motion } from 'framer-motion';

        class AnimatedCard extends Component {
          render() {
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Card content
              </motion.div>
            );
          }
        }

        export { AnimatedCard };
      `;

      const result = parser.parse(reactCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'AnimatedCard'
      });

      expect(result.componentName).toBe('AnimatedCard');
      expect(result.typescript).toBe(false);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].declaration).toBe('AnimatedCard');
    });

    test('should extract motion properties from JSX', () => {
      const reactCode = `
        import { motion } from 'framer-motion';

        const Component = () => (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Content
          </motion.div>
        );
      `;

      const result = parser.parse(reactCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const motionElements = parser.extractMotionElements(result.ast);
      
      expect(motionElements).toHaveLength(1);
      expect(motionElements[0].type).toBe('motion.div');
      expect(motionElements[0].props).toHaveProperty('initial');
      expect(motionElements[0].props).toHaveProperty('animate');
      expect(motionElements[0].props).toHaveProperty('exit');
      expect(motionElements[0].props).toHaveProperty('transition');
      expect(motionElements[0].props).toHaveProperty('whileHover');
      expect(motionElements[0].props).toHaveProperty('whileTap');
    });
  });

  describe('Vue Component Parsing', () => {
    test('should parse Vue SFC with Composition API', () => {
      const vueCode = `
        <template>
          <div
            v-motion
            :initial="{ opacity: 0, y: 50 }"
            :enter="{ opacity: 1, y: 0 }"
            :transition="{ duration: 600 }"
          >
            Vue Motion Content
          </div>
        </template>

        <script setup lang="ts">
        import { ref } from 'vue';
        import { MotionPlugin } from '@vueuse/motion';

        const isVisible = ref(false);
        </script>
      `;

      const result = parser.parse(vueCode, {
        framework: 'vue' as Framework,
        typescript: true,
        componentName: 'VueMotionComponent'
      });

      expect(result.framework).toBe('vue');
      expect(result.typescript).toBe(true);
      expect(result.imports.some(imp => imp.source === 'vue')).toBe(true);
      expect(result.imports.some(imp => imp.source === '@vueuse/motion')).toBe(true);
    });

    test('should parse Vue Options API component', () => {
      const vueCode = `
        <template>
          <transition name="fade">
            <div v-if="show" class="content">
              Animated content
            </div>
          </transition>
        </template>

        <script>
        import { defineComponent } from 'vue';

        export default defineComponent({
          name: 'FadeComponent',
          data() {
            return {
              show: false
            };
          },
          mounted() {
            this.show = true;
          }
        });
        </script>
      `;

      const result = parser.parse(vueCode, {
        framework: 'vue' as Framework,
        typescript: false,
        componentName: 'FadeComponent'
      });

      expect(result.componentName).toBe('FadeComponent');
      expect(result.exports).toHaveLength(1);
    });

    test('should extract Vue motion directives', () => {
      const vueCode = `
        <template>
          <div
            v-motion-initial="{ scale: 0 }"
            v-motion-enter="{ scale: 1 }"
            v-motion-leave="{ scale: 0 }"
          >
            Content
          </div>
        </template>
      `;

      const result = parser.parse(vueCode, {
        framework: 'vue' as Framework,
        typescript: false,
        componentName: 'VueMotion'
      });

      const motionElements = parser.extractMotionElements(result.ast);
      
      expect(motionElements).toHaveLength(1);
      expect(motionElements[0].type).toBe('div');
      expect(motionElements[0].directives).toContain('v-motion-initial');
      expect(motionElements[0].directives).toContain('v-motion-enter');
      expect(motionElements[0].directives).toContain('v-motion-leave');
    });
  });

  describe('JavaScript Parsing', () => {
    test('should parse vanilla JavaScript animation code', () => {
      const jsCode = `
        import { animate, spring } from 'motion';

        function createAnimation() {
          const element = document.querySelector('.target');
          
          animate(element, 
            { x: [0, 100], opacity: [0, 1] },
            { 
              duration: 0.5,
              easing: spring({ stiffness: 300, damping: 30 })
            }
          );
        }

        export { createAnimation };
      `;

      const result = parser.parse(jsCode, {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'createAnimation'
      });

      expect(result.framework).toBe('js');
      expect(result.imports.some(imp => imp.source === 'motion')).toBe(true);
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].declaration).toBe('createAnimation');
    });

    test('should parse TypeScript animation functions', () => {
      const tsCode = `
        import { animate, AnimationOptions } from 'motion';

        interface AnimationConfig {
          target: string;
          duration: number;
          easing?: string;
        }

        async function animateElement(config: AnimationConfig): Promise<void> {
          const element = document.querySelector(config.target);
          if (!element) throw new Error('Element not found');
          
          await animate(element, 
            { scale: [1, 1.2, 1] },
            { 
              duration: config.duration,
              easing: config.easing || 'ease'
            }
          );
        }

        export type { AnimationConfig };
        export { animateElement };
      `;

      const result = parser.parse(tsCode, {
        framework: 'js' as Framework,
        typescript: true,
        componentName: 'animateElement'
      });

      expect(result.typescript).toBe(true);
      expect(result.exports).toHaveLength(2);
      expect(result.exports.some(exp => exp.declaration === 'AnimationConfig')).toBe(true);
      expect(result.exports.some(exp => exp.declaration === 'animateElement')).toBe(true);
    });

    test('should extract animation sequences', () => {
      const jsCode = `
        import { timeline, animate } from 'motion';

        function createSequence() {
          timeline([
            ['.box', { x: 100 }, { duration: 0.3 }],
            ['.circle', { scale: 1.5 }, { duration: 0.2, at: 0.1 }],
            ['.text', { opacity: 1 }, { duration: 0.4, at: 0.2 }]
          ]);
        }
      `;

      const result = parser.parse(jsCode, {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'createSequence'
      });

      const sequences = parser.extractAnimationSequences(result.ast);
      
      expect(sequences).toHaveLength(1);
      expect(sequences[0].steps).toHaveLength(3);
      expect(sequences[0].steps[0].selector).toBe('.box');
      expect(sequences[0].steps[1].selector).toBe('.circle');
      expect(sequences[0].steps[2].selector).toBe('.text');
    });
  });

  describe('Error Handling', () => {
    test('should handle syntax errors gracefully', () => {
      const invalidCode = `
        import { motion } from 'framer-motion'
        
        const Component = () => {
          return (
            <motion.div animate={{ x: 100 }
          );
        }; // Missing closing brace
      `;

      expect(() => {
        parser.parse(invalidCode, {
          framework: 'react' as Framework,
          typescript: false,
          componentName: 'Component'
        });
      }).toThrow('Failed to parse code');
    });

    test('should handle empty code', () => {
      const result = parser.parse('', {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'Empty'
      });

      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
    });

    test('should handle code without motion imports', () => {
      const regularCode = `
        import React from 'react';

        const Component = () => <div>Regular component</div>;
        
        export default Component;
      `;

      const result = parser.parse(regularCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const motionElements = parser.extractMotionElements(result.ast);
      expect(motionElements).toHaveLength(0);
    });
  });

  describe('Complex Parsing Scenarios', () => {
    test('should parse component with multiple motion elements', () => {
      const complexCode = `
        import React from 'react';
        import { motion, AnimatePresence } from 'framer-motion';

        const ComplexComponent = ({ items }) => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.h1
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Title
              </motion.h1>
              
              <AnimatePresence>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    layout
                  >
                    {item.content}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          );
        };
      `;

      const result = parser.parse(complexCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'ComplexComponent'
      });

      const motionElements = parser.extractMotionElements(result.ast);
      expect(motionElements).toHaveLength(3); // motion.div, motion.h1, motion.div in map
    });

    test('should parse component with custom hooks and motion', () => {
      const hookCode = `
        import { motion, useAnimation } from 'framer-motion';
        import { useEffect } from 'react';

        const useSequentialAnimation = () => {
          const controls = useAnimation();
          
          useEffect(() => {
            const sequence = async () => {
              await controls.start({ scale: 1.1 });
              await controls.start({ scale: 1 });
            };
            sequence();
          }, [controls]);
          
          return controls;
        };

        const AnimatedComponent = () => {
          const controls = useSequentialAnimation();
          
          return (
            <motion.div animate={controls}>
              Content
            </motion.div>
          );
        };
      `;

      const result = parser.parse(hookCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'AnimatedComponent'
      });

      expect(result.imports.some(imp => 
        imp.source === 'framer-motion' && 
        imp.specifiers?.includes('useAnimation')
      )).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should parse large files efficiently', () => {
      // Generate large component with many motion elements
      const motionElements = Array.from({ length: 100 }, (_, i) => 
        `<motion.div key={${i}} animate={{ x: ${i * 10} }}>Element ${i}</motion.div>`
      ).join('\n        ');

      const largeCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const LargeComponent = () => {
          return (
            <div>
              ${motionElements}
            </div>
          );
        };

        export default LargeComponent;
      `;

      const startTime = Date.now();
      const result = parser.parse(largeCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'LargeComponent'
      });
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should parse within 1 second

      const motionElements = parser.extractMotionElements(result.ast);
      expect(motionElements).toHaveLength(100);
    });
  });
});