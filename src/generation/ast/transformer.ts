/**
 * AST Transformer for Motion.dev code generation
 * Handles transformation and manipulation of AST nodes for different frameworks
 */

import * as babel from '@babel/core';
import * as t from '@babel/types';
import { Framework } from '../../types/motion.js';
import { logger } from '../../utils/logger.js';
import { 
  ComponentAST, 
  TransformationRule, 
  CodeGenerationContext,
  MotionElement,
  AnimationSequence
} from './types.js';

export class ASTTransformer {
  private transformationRules: TransformationRule[] = [];

  constructor() {
    this.initializeTransformationRules();
  }

  transform(componentAST: ComponentAST, context: CodeGenerationContext): ComponentAST {
    logger.debug(`Transforming ${context.framework} component: ${context.componentName}`);

    try {
      let transformedAST = { ...componentAST };
      
      // Apply transformation rules
      for (const rule of this.transformationRules) {
        if (this.shouldApplyRule(rule, context)) {
          transformedAST = this.applyTransformationRule(transformedAST, rule, context);
        }
      }

      // Framework-specific transformations
      transformedAST = this.applyFrameworkSpecificTransforms(transformedAST, context);

      logger.debug(`Successfully transformed ${context.framework} component`);
      return transformedAST;

    } catch (error) {
      logger.error('AST transformation failed', error as Error);
      throw error;
    }
  }

  private initializeTransformationRules(): void {
    this.transformationRules = [
      // React-specific transformations
      {
        name: 'react-motion-imports',
        description: 'Add framer-motion imports for React components',
        framework: 'react',
        condition: (node, context) => 
          context.framework === 'react' && this.hasMotionElements(node),
        transform: (node, context) => this.addFramerMotionImports(node, context)
      },

      // JavaScript-specific transformations
      {
        name: 'js-motion-imports',
        description: 'Add Motion One imports for vanilla JavaScript',
        framework: 'js',
        condition: (node, context) => 
          context.framework === 'js' && this.hasAnimationCalls(node),
        transform: (node, context) => this.addMotionOneImports(node, context)
      },

      // Vue-specific transformations
      {
        name: 'vue-motion-imports',
        description: 'Add @vueuse/motion imports for Vue components',
        framework: 'vue',
        condition: (node, context) => 
          context.framework === 'vue' && this.hasVueMotionDirectives(node),
        transform: (node, context) => this.addVueMotionImports(node, context)
      },

      // Accessibility transformations
      {
        name: 'accessibility-enhancements',
        description: 'Add accessibility attributes and reduced motion support',
        condition: (_node, context) => 
          context.optimization?.accessibility === true,
        transform: (_node, context) => this.addAccessibilityEnhancements(_node, context)
      },

      // Performance optimizations
      {
        name: 'performance-optimizations',
        description: 'Apply performance optimizations to motion components',
        condition: (_node, context) => 
          context.optimization?.performance === true,
        transform: (_node, context) => this.applyPerformanceOptimizations(_node, context)
      }
    ];
  }

  private shouldApplyRule(rule: TransformationRule, context: CodeGenerationContext): boolean {
    // Check framework compatibility
    if (rule.framework) {
      const frameworks = Array.isArray(rule.framework) ? rule.framework : [rule.framework];
      if (!frameworks.includes(context.framework)) {
        return false;
      }
    }

    return true;
  }

  private applyTransformationRule(
    componentAST: ComponentAST, 
    rule: TransformationRule, 
    context: CodeGenerationContext
  ): ComponentAST {
    const result = babel.transformSync('', {
      ast: true,
      plugins: [
        () => ({
          visitor: {
            Program: (path: any) => {
              if (rule.condition(path.node, context)) {
                const transformed = rule.transform(path.node, context);
                if (Array.isArray(transformed)) {
                  // Replace with multiple nodes
                  path.replaceWithMultiple(transformed as any[]);
                } else if (transformed !== path.node) {
                  // Replace with single node
                  path.replaceWith(transformed as any);
                }
              }
            }
          }
        })
      ]
    });

    return {
      ...componentAST,
      ast: result?.ast as any
    };
  }

  private applyFrameworkSpecificTransforms(
    componentAST: ComponentAST, 
    context: CodeGenerationContext
  ): ComponentAST {
    switch (context.framework) {
      case 'react':
        return this.applyReactTransforms(componentAST, context);
      case 'vue':
        return this.applyVueTransforms(componentAST, context);
      case 'js':
        return this.applyJavaScriptTransforms(componentAST, context);
      default:
        return componentAST;
    }
  }

  private applyReactTransforms(
    componentAST: ComponentAST, 
    context: CodeGenerationContext
  ): ComponentAST {
    // Add React-specific optimizations
    if (context.optimization?.performance) {
      // Add React.memo, useCallback, useMemo where appropriate
      componentAST = this.addReactPerformanceOptimizations(componentAST, context);
    }

    return componentAST;
  }

  private applyVueTransforms(
    componentAST: ComponentAST, 
    _context: CodeGenerationContext
  ): ComponentAST {
    // Add Vue-specific optimizations
    return componentAST;
  }

  private applyJavaScriptTransforms(
    componentAST: ComponentAST, 
    _context: CodeGenerationContext
  ): ComponentAST {
    // Add JavaScript-specific optimizations
    return componentAST;
  }

  // Motion detection methods
  private hasMotionElements(node: any): boolean {
    let hasMotion = false;
    
    babel.traverse(node, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        if (t.isJSXMemberExpression(openingElement.name) &&
            t.isIdentifier(openingElement.name.object) &&
            (openingElement.name.object as any).name === 'motion') {
          hasMotion = true;
          path.stop();
        }
      }
    });

    return hasMotion;
  }

  private hasAnimationCalls(node: any): boolean {
    let hasAnimation = false;
    
    babel.traverse(node, {
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee) && 
            ['animate', 'spring', 'timeline', 'scroll'].includes(path.node.callee.name)) {
          hasAnimation = true;
          path.stop();
        }
      }
    });

    return hasAnimation;
  }

  private hasVueMotionDirectives(node: any): boolean {
    // Vue motion detection would require Vue SFC parsing
    // For now, return true if context suggests Vue motion usage
    return true;
  }

  // Import transformation methods
  private addFramerMotionImports(node: any, context: CodeGenerationContext): any {
    const imports = new Set<string>();
    
    // Detect which framer-motion features are used
    babel.traverse(node, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        if (t.isJSXMemberExpression(openingElement.name) &&
            t.isIdentifier(openingElement.name.object) &&
            (openingElement.name.object as any).name === 'motion') {
          imports.add('motion');
        }
      },
      
      JSXAttribute(path) {
        if (t.isIdentifier(path.node.name)) {
          const attrName = (path.node.name as any).name;
          if (attrName === 'initial' || attrName === 'animate' || attrName === 'exit') {
            imports.add('motion');
          }
          if (attrName === 'variants') {
            imports.add('Variants');
          }
        }
      },

      Identifier(path) {
        const name = path.node.name;
        if (['AnimatePresence', 'useAnimation', 'useSpring', 'useTransform'].includes(name)) {
          imports.add(name);
        }
      }
    });

    // Add import statement at the top
    const importSpecifiers = Array.from(imports).map(name => 
      name === 'motion' 
        ? t.importSpecifier(t.identifier('motion'), t.identifier('motion'))
        : t.importSpecifier(t.identifier(name), t.identifier(name))
    );

    const importDeclaration = t.importDeclaration(
      importSpecifiers,
      t.stringLiteral('framer-motion')
    );

    // Insert at the beginning of the program
    if (t.isProgram(node)) {
      node.body.unshift(importDeclaration);
    }

    context.imports.add('framer-motion');
    return node;
  }

  private addMotionOneImports(node: any, context: CodeGenerationContext): any {
    const imports = new Set<string>();
    
    babel.traverse(node, {
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          const name = path.node.callee.name;
          if (['animate', 'spring', 'timeline', 'scroll', 'stagger'].includes(name)) {
            imports.add(name);
          }
        }
      }
    });

    const importSpecifiers = Array.from(imports).map(name => 
      t.importSpecifier(t.identifier(name), t.identifier(name))
    );

    const importDeclaration = t.importDeclaration(
      importSpecifiers,
      t.stringLiteral('motion')
    );

    if (t.isProgram(node)) {
      node.body.unshift(importDeclaration);
    }

    context.imports.add('motion');
    return node;
  }

  private addVueMotionImports(node: any, context: CodeGenerationContext): any {
    // Vue-specific motion imports
    const importDeclaration = t.importDeclaration(
      [t.importSpecifier(t.identifier('MotionPlugin'), t.identifier('MotionPlugin'))],
      t.stringLiteral('@vueuse/motion')
    );

    if (t.isProgram(node)) {
      node.body.unshift(importDeclaration);
    }

    context.imports.add('@vueuse/motion');
    return node;
  }

  // Optimization methods
  private addAccessibilityEnhancements(node: any, _context: CodeGenerationContext): any {
    const self = this;
    babel.traverse(node, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        
        // Add reduced motion check for motion elements
        if (t.isJSXMemberExpression(openingElement.name) &&
            t.isIdentifier(openingElement.name.object) &&
            (openingElement.name.object as any).name === 'motion') {
          
          // Add aria-label if not present and element is interactive
          const hasAriaLabel = openingElement.attributes.some(attr =>
            t.isJSXAttribute(attr) && 
            t.isIdentifier(attr.name) && 
            (attr.name as any).name === 'aria-label'
          );

          if (!hasAriaLabel && self.isInteractiveElement(openingElement)) {
            openingElement.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier('aria-label'),
                t.stringLiteral('Interactive element')
              )
            );
          }
        }
      }
    });

    return node;
  }

  private isInteractiveElement(openingElement: any): boolean {
    const elementName = openingElement.name;
    if (t.isJSXIdentifier(elementName)) {
      const tagName = elementName.name.toLowerCase();
      return ['button', 'a', 'input', 'select', 'textarea'].includes(tagName);
    }
    return false;
  }

  private applyPerformanceOptimizations(node: any, _context: CodeGenerationContext): any {
    // Add will-change optimization
    const self = this;
    babel.traverse(node, {
      JSXElement(path) {
        const openingElement = path.node.openingElement;
        
        if (t.isJSXMemberExpression(openingElement.name) &&
            t.isIdentifier(openingElement.name.object) &&
            (openingElement.name.object as any).name === 'motion') {
          
          // Check if element has transform animations
          const hasTransformAnimation = openingElement.attributes.some(attr =>
            t.isJSXAttribute(attr) && 
            t.isIdentifier(attr.name) && 
            ['animate', 'initial', 'whileHover'].includes((attr.name as any).name)
          );

          if (hasTransformAnimation) {
            // Add layoutRoot if appropriate
            const hasLayoutRoot = openingElement.attributes.some(attr =>
              t.isJSXAttribute(attr) && 
              t.isIdentifier(attr.name) && 
              (attr.name as any).name === 'layoutRoot'
            );

            if (!hasLayoutRoot && self.shouldAddLayoutRoot(openingElement)) {
              openingElement.attributes.push(
                t.jsxAttribute(
                  t.jsxIdentifier('layoutRoot'),
                  t.jsxExpressionContainer(t.booleanLiteral(true))
                )
              );
            }
          }
        }
      }
    });

    return node;
  }

  private shouldAddLayoutRoot(openingElement: any): boolean {
    // Add layoutRoot for elements that may trigger layout changes
    return t.isJSXMemberExpression(openingElement.name) &&
           t.isIdentifier(openingElement.name.object) &&
           (openingElement.name.object as any).name === 'motion';
  }

  private addReactPerformanceOptimizations(
    componentAST: ComponentAST, 
    _context: CodeGenerationContext
  ): ComponentAST {
    // This would add React.memo, useCallback, etc.
    // Simplified implementation
    return componentAST;
  }

  // Helper methods removed - already defined above

  // Public utility methods for motion transformations
  addMotionElement(
    componentAST: ComponentAST, 
    _motionElement: MotionElement,
    _context: CodeGenerationContext
  ): ComponentAST {
    // Add a motion element to the component
    return componentAST;
  }

  createAnimationSequence(
    _sequence: AnimationSequence,
    _context: CodeGenerationContext
  ): any {
    // Create AST nodes for animation sequence
    return null;
  }

  optimizeForFramework(
    componentAST: ComponentAST,
    targetFramework: Framework,
    context: CodeGenerationContext
  ): ComponentAST {
    // Convert between frameworks
    return componentAST;
  }
}