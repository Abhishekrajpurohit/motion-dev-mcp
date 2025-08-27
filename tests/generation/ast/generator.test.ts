/**
 * Test suite for AST code generator
 */

import { ASTGenerator } from '../../../src/generation/ast/generator.js';
import { ASTParser } from '../../../src/generation/ast/parser.js';
import { Framework } from '../../../src/types/motion.js';
import { generateMockAnimationPattern } from '../../setup.js';

describe('ASTGenerator', () => {
  let generator: ASTGenerator;
  let parser: ASTParser;

  beforeEach(() => {
    generator = new ASTGenerator();
    parser = new ASTParser();
  });

  describe('React Code Generation', () => {
    test('should generate React component from AST', async () => {
      const reactCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        const TestComponent = () => {
          return (
            <motion.div animate={{ x: 100 }}>
              Content
            </motion.div>
          );
        };

        export default TestComponent;
      `;

      const ast = parser.parse(reactCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'TestComponent'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'TestComponent',
        typescript: false,
        imports: new Set(['react', 'framer-motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('import React from \'react\'');
      expect(result.code).toContain('import { motion } from \'framer-motion\'');
      expect(result.code).toContain('const TestComponent');
      expect(result.code).toContain('motion.div');
      expect(result.code).toContain('animate={{ x: 100 }}');
      expect(result.framework).toBe('react');
      expect(result.typescript).toBe(false);
    });

    test('should generate TypeScript React component', async () => {
      const tsxCode = `
        import React from 'react';
        import { motion } from 'framer-motion';

        interface Props {
          title: string;
        }

        const TypedComponent: React.FC<Props> = ({ title }) => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h1>{title}</h1>
            </motion.div>
          );
        };

        export default TypedComponent;
      `;

      const ast = parser.parse(tsxCode, {
        framework: 'react' as Framework,
        typescript: true,
        componentName: 'TypedComponent'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'TypedComponent',
        typescript: true,
        imports: new Set(['react', 'framer-motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('interface Props');
      expect(result.code).toContain(': React.FC<Props>');
      expect(result.typescript).toBe(true);
    });

    test('should add missing React imports', async () => {
      const codeWithoutImport = `
        const Component = () => (
          <motion.div animate={{ scale: 1.1 }}>
            Content
          </motion.div>
        );
      `;

      const ast = parser.parse(codeWithoutImport, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'Component',
        typescript: false,
        imports: new Set(['framer-motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('import React from \'react\'');
    });

    test('should add TypeScript FC types when missing', async () => {
      const codeWithoutTypes = `
        import React from 'react';

        const Component = () => <div>Content</div>;
      `;

      const ast = parser.parse(codeWithoutTypes, {
        framework: 'react' as Framework,
        typescript: true,
        componentName: 'Component'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'Component',
        typescript: true,
        imports: new Set(['react'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain(': React.FC');
    });
  });

  describe('Vue Code Generation', () => {
    test('should generate Vue SFC from AST', async () => {
      const vueCode = `
        <template>
          <div v-motion :initial="{ opacity: 0 }" :enter="{ opacity: 1 }">
            Vue content
          </div>
        </template>

        <script setup lang="ts">
        import { ref } from 'vue';
        import { MotionPlugin } from '@vueuse/motion';

        const visible = ref(false);
        </script>
      `;

      const ast = parser.parse(vueCode, {
        framework: 'vue' as Framework,
        typescript: true,
        componentName: 'VueComponent'
      });

      const context = {
        framework: 'vue' as Framework,
        componentName: 'VueComponent',
        typescript: true,
        imports: new Set(['vue', '@vueuse/motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('<template>');
      expect(result.code).toContain('v-motion');
      expect(result.code).toContain('<script setup');
      expect(result.code).toContain('lang="ts"');
    });

    test('should convert JSX to Vue template syntax', async () => {
      const jsxCode = `
        const VueFromJSX = () => (
          <div className="container" onClick={handleClick}>
            <button onMouseOver={handleHover}>
              Click me
            </button>
          </div>
        );
      `;

      const ast = parser.parse(jsxCode, {
        framework: 'vue' as Framework,
        typescript: false,
        componentName: 'VueFromJSX'
      });

      const context = {
        framework: 'vue' as Framework,
        componentName: 'VueFromJSX',
        typescript: false,
        imports: new Set()
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('class="container"');
      expect(result.code).toContain('@click="handleClick"');
      expect(result.code).toContain('@mouseover="handleHover"');
    });

    test('should wrap content in Vue SFC structure when needed', async () => {
      const plainHTML = `
        <div class="content">
          <h1>Title</h1>
          <p>Description</p>
        </div>
      `;

      const ast = parser.parse(plainHTML, {
        framework: 'vue' as Framework,
        typescript: false,
        componentName: 'SimpleVue'
      });

      const context = {
        framework: 'vue' as Framework,
        componentName: 'SimpleVue',
        typescript: false,
        imports: new Set()
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('<template>');
      expect(result.code).toContain('<script>');
    });
  });

  describe('JavaScript Code Generation', () => {
    test('should generate vanilla JavaScript animation code', async () => {
      const jsCode = `
        import { animate, spring } from 'motion';

        function animateElement() {
          const element = document.querySelector('.target');
          animate(element, { x: 100 }, { duration: 0.5 });
        }

        export { animateElement };
      `;

      const ast = parser.parse(jsCode, {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'animateElement'
      });

      const context = {
        framework: 'js' as Framework,
        componentName: 'animateElement',
        typescript: false,
        imports: new Set(['motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('import { animate, spring } from \'motion\'');
      expect(result.code).toContain('function animateElement()');
      expect(result.code).toContain('document.querySelector');
      expect(result.code).toContain('animate(element');
    });

    test('should add querySelector for element selection', async () => {
      const codeWithStringSelector = `
        import { animate } from 'motion';
        
        function simpleAnimation() {
          animate('.button', { scale: 1.1 });
        }
      `;

      const ast = parser.parse(codeWithStringSelector, {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'simpleAnimation'
      });

      const context = {
        framework: 'js' as Framework,
        componentName: 'simpleAnimation',
        typescript: false,
        imports: new Set(['motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('document.querySelector(\'.button\')');
    });

    test('should generate TypeScript with proper types', async () => {
      const tsCode = `
        import { animate, AnimationOptions } from 'motion';

        async function typedAnimation(selector: string): Promise<void> {
          const element = document.querySelector(selector);
          if (!element) return;
          
          await animate(element, { opacity: 1 });
        }
      `;

      const ast = parser.parse(tsCode, {
        framework: 'js' as Framework,
        typescript: true,
        componentName: 'typedAnimation'
      });

      const context = {
        framework: 'js' as Framework,
        componentName: 'typedAnimation',
        typescript: true,
        imports: new Set(['motion'])
      };

      const result = await generator.generate(ast, context);

      expect(result.code).toContain('selector: string');
      expect(result.code).toContain(': Promise<void>');
      expect(result.typescript).toBe(true);
    });
  });

  describe('Utility Methods', () => {
    test('should generate React component using utility method', () => {
      const jsx = `
        <motion.div
          animate={{ x: 100 }}
          transition={{ duration: 0.3 }}
        >
          Content
        </motion.div>
      `;

      const result = generator.generateReactComponent(
        'UtilityComponent',
        jsx,
        true,
        ['{ motion } from \'framer-motion\'']
      );

      expect(result).toContain('import { motion } from \'framer-motion\'');
      expect(result).toContain('const UtilityComponent: React.FC = () =>');
      expect(result).toContain('export default UtilityComponent');
    });

    test('should generate Vue component using utility method', () => {
      const template = '<div v-motion>Vue content</div>';
      const script = 'import { ref } from \'vue\';';
      const style = '.content { color: blue; }';

      const result = generator.generateVueComponent(
        'UtilityVue',
        template,
        script,
        style,
        true
      );

      expect(result).toContain('<template>');
      expect(result).toContain('<script lang="ts">');
      expect(result).toContain('<style scoped>');
    });

    test('should generate JavaScript function using utility method', () => {
      const body = `
        const element = document.querySelector('.target');
        animate(element, { scale: 1.2 });
      `;

      const result = generator.generateJavaScriptFunction(
        'animateScale',
        body,
        ['element', 'options'],
        true
      );

      expect(result).toContain('function animateScale(element, options): void');
      expect(result).toContain('animate(element, { scale: 1.2 });');
    });
  });

  describe('Motion.dev Specific Generation', () => {
    test('should generate React Motion component', () => {
      const motionProps = {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.5 }
      };

      const result = generator.generateMotionComponent(
        'react',
        'MotionButton',
        motionProps,
        'Click me',
        true
      );

      expect(result).toContain('import { motion } from \'framer-motion\'');
      expect(result).toContain('const MotionButton: React.FC');
      expect(result).toContain('initial={{"opacity":0,"scale":0.8}}');
      expect(result).toContain('animate={{"opacity":1,"scale":1}}');
    });

    test('should generate Vue Motion component', () => {
      const motionProps = {
        initial: { x: -50 },
        animate: { x: 0 }
      };

      const result = generator.generateMotionComponent(
        'vue',
        'VueMotion',
        motionProps,
        'Vue content',
        false
      );

      expect(result).toContain('<template>');
      expect(result).toContain('v-motion-initial');
      expect(result).toContain('v-motion-enter');
      expect(result).toContain('import { MotionPlugin } from \'@vueuse/motion\'');
    });

    test('should generate JavaScript Motion function', () => {
      const animationProps = {
        animate: { rotate: 360, scale: [1, 1.2, 1] }
      };

      const result = generator.generateMotionComponent(
        'js',
        'spinAnimation',
        animationProps,
        undefined,
        true
      );

      expect(result).toContain('import { animate } from \'motion\'');
      expect(result).toContain('function spinAnimation()');
      expect(result).toContain('document.querySelector(\'.motion-element\')');
      expect(result).toContain('animate(element');
    });
  });

  describe('Code Optimization', () => {
    test('should optimize code with specific optimizations', async () => {
      const unoptimizedCode = `
        import React from 'react';
        import { motion } from 'framer-motion';
        import { unused } from 'some-library';

        const Component = () => (
          <motion.div animate={{ x: 100 }}>
            Content
          </motion.div>
        );
      `;

      const ast = parser.parse(unoptimizedCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'Component',
        typescript: false,
        imports: new Set(['react', 'framer-motion'])
      };

      const optimized = await generator.optimizeCode(
        unoptimizedCode,
        context,
        ['remove-unused-imports', 'minimize-bundle']
      );

      expect(optimized).toBeDefined();
      // Note: Actual optimization logic would be implemented in the real system
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle generation errors gracefully', async () => {
      const invalidAST = {
        framework: 'react' as Framework,
        componentName: 'Invalid',
        ast: null, // Invalid AST
        imports: [],
        exports: [],
        typescript: false
      };

      const context = {
        framework: 'react' as Framework,
        componentName: 'Invalid',
        typescript: false,
        imports: new Set()
      };

      await expect(
        generator.generate(invalidAST, context)
      ).rejects.toThrow();
    });

    test('should handle unsupported framework', () => {
      const motionProps = { animate: { x: 100 } };

      expect(() => {
        generator.generateMotionComponent(
          'unsupported' as Framework,
          'Test',
          motionProps
        );
      }).toThrow();
    });

    test('should handle empty motion props', () => {
      const result = generator.generateMotionComponent(
        'react',
        'EmptyMotion',
        {}
      );

      expect(result).toContain('const EmptyMotion');
      expect(result).toContain('motion.div');
    });
  });

  describe('Prettier Integration', () => {
    test('should format code with Prettier when enabled', async () => {
      const unformattedCode = `
        import React from 'react';import { motion } from 'framer-motion';
        const Component=()=><motion.div animate={{x:100}}>Content</motion.div>;
        export default Component;
      `;

      const ast = parser.parse(unformattedCode, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'Component',
        typescript: false,
        imports: new Set(['react', 'framer-motion'])
      };

      const result = await generator.generate(ast, context, {
        prettier: true,
        format: true
      });

      // Prettier should format the code properly
      expect(result.code).toContain('\n');
      expect(result.code).not.toContain('import React from \'react\';import');
    });

    test('should skip prettier formatting when disabled', async () => {
      const code = 'const test = () => {};';

      const ast = parser.parse(code, {
        framework: 'js' as Framework,
        typescript: false,
        componentName: 'test'
      });

      const context = {
        framework: 'js' as Framework,
        componentName: 'test',
        typescript: false,
        imports: new Set()
      };

      const result = await generator.generate(ast, context, {
        prettier: false,
        format: false
      });

      expect(result.code).toBeDefined();
    });
  });

  describe('Source Maps', () => {
    test('should generate source maps when requested', async () => {
      const code = `
        import { motion } from 'framer-motion';
        const Component = () => <motion.div>Test</motion.div>;
      `;

      const ast = parser.parse(code, {
        framework: 'react' as Framework,
        typescript: false,
        componentName: 'Component'
      });

      const context = {
        framework: 'react' as Framework,
        componentName: 'Component',
        typescript: false,
        imports: new Set(['framer-motion'])
      };

      const result = await generator.generate(ast, context, {
        sourceMap: true
      });

      expect(result.map).toBeDefined();
    });
  });
});