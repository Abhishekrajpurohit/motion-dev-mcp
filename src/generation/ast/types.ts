/**
 * AST types and interfaces for Motion.dev code generation
 */

import { Framework } from '../../types/motion.js';

export interface ASTParseOptions {
  framework: Framework;
  typescript: boolean;
  jsx?: boolean;
  plugins?: string[];
}

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export interface ComponentAST {
  framework: Framework;
  componentName: string;
  ast: ASTNode;
  imports: ImportDeclaration[];
  exports: ExportDeclaration[];
  typescript: boolean;
}

export interface ImportDeclaration {
  source: string;
  specifiers: Array<{
    type: 'default' | 'named' | 'namespace';
    imported?: string;
    local: string;
  }>;
}

export interface ExportDeclaration {
  type: 'default' | 'named';
  declaration?: string;
  specifiers?: Array<{
    exported: string;
    local: string;
  }>;
}

export interface MotionElement {
  tagName: string;
  props: Record<string, any>;
  children?: MotionElement[];
  motionProps: {
    initial?: Record<string, any>;
    animate?: Record<string, any>;
    exit?: Record<string, any>;
    transition?: Record<string, any>;
    variants?: Record<string, any>;
    whileHover?: Record<string, any>;
    whileTap?: Record<string, any>;
    whileDrag?: Record<string, any>;
    whileInView?: Record<string, any>;
    drag?: boolean | 'x' | 'y';
    dragConstraints?: Record<string, any>;
    layout?: boolean | 'position' | 'size';
    layoutId?: string;
    [key: string]: any;
  };
}

export interface AnimationSequence {
  elements: Array<{
    selector: string;
    animations: Record<string, any>;
    delay?: number;
    duration?: number;
  }>;
  stagger?: {
    amount: number;
    from?: 'first' | 'last' | 'center' | number;
  };
  timeline?: boolean;
}

export interface CodeGenerationContext {
  framework: Framework;
  typescript: boolean;
  componentName: string;
  imports: Set<string>;
  dependencies: Set<string>;
  styleSystem?: 'css' | 'styled-components' | 'emotion' | 'tailwind';
  optimization?: {
    performance: boolean;
    accessibility: boolean;
    bundleSize: boolean;
  };
}

export interface TransformationRule {
  name: string;
  description: string;
  framework?: Framework | Framework[];
  condition: (node: ASTNode, context: CodeGenerationContext) => boolean;
  transform: (node: ASTNode, context: CodeGenerationContext) => ASTNode | ASTNode[];
}

export interface OptimizationRule {
  name: string;
  description: string;
  category: 'performance' | 'accessibility' | 'bundle-size' | 'best-practices';
  priority: 'high' | 'medium' | 'low';
  condition: (ast: ComponentAST, context: CodeGenerationContext) => boolean;
  optimize: (ast: ComponentAST, context: CodeGenerationContext) => ComponentAST;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  column?: number;
  rule: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: Array<{
    message: string;
    type: 'performance' | 'accessibility' | 'best-practice';
  }>;
}