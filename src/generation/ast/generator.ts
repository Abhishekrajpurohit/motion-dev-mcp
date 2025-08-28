/**
 * AST Code Generator for Motion.dev components
 * Converts AST back to formatted code for different frameworks
 */

import { generate } from '@babel/generator';
import * as prettier from 'prettier';
import { Framework } from '../../types/motion.js';
import { logger } from '../../utils/logger.js';
import { 
  ComponentAST, 
  CodeGenerationContext
} from './types.js';

export interface CodeGenerationOptions {
  format: boolean;
  prettier: boolean;
  comments: boolean;
  sourceMap: boolean;
  minify: boolean;
}

export interface GeneratedCode {
  code: string;
  map?: string;
  imports: string[];
  exports: string[];
  framework: Framework;
  typescript: boolean;
}

export class ASTGenerator {
  private defaultOptions: CodeGenerationOptions = {
    format: true,
    prettier: true,
    comments: true,
    sourceMap: false,
    minify: false
  };

  async generate(
    componentAST: ComponentAST, 
    context: CodeGenerationContext,
    options: Partial<CodeGenerationOptions> = {}
  ): Promise<GeneratedCode> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      logger.debug(`Generating ${context.framework} code for: ${context.componentName}`);

      // Generate code from AST
      const generated = generate(componentAST.ast as any, {
        comments: opts.comments,
        minified: opts.minify,
        sourceMaps: opts.sourceMap,
        retainLines: false,
        compact: opts.minify ? true : 'auto'
      });

      let code = generated.code;

      // Apply framework-specific formatting
      code = this.applyFrameworkFormatting(code, context.framework, context.typescript);

      // Apply prettier formatting if requested
      if (opts.prettier && opts.format) {
        code = await this.formatWithPrettier(code, context);
      }

      const result: GeneratedCode = {
        code,
        map: generated.map ? JSON.stringify(generated.map) : undefined,
        imports: Array.from(context.imports),
        exports: componentAST.exports.map(exp => exp.declaration || 'default'),
        framework: context.framework,
        typescript: context.typescript
      };

      logger.debug(`Successfully generated ${context.framework} code (${code.length} chars)`);
      return result;

    } catch (error) {
      logger.error('Code generation failed', error as Error);
      throw createGenerationError(
        `${context.framework} component`, 
        (error as Error).message
      );
    }
  }

  private applyFrameworkFormatting(code: string, framework: Framework, typescript: boolean): string {
    switch (framework) {
      case 'react':
        return this.formatReactCode(code, typescript);
      case 'vue':
        return this.formatVueCode(code, typescript);
      case 'js':
        return this.formatJavaScriptCode(code, typescript);
      default:
        return code;
    }
  }

  private formatReactCode(code: string, typescript: boolean): string {
    // React-specific formatting
    let formatted = code;

    // Ensure proper React imports are at the top
    if (!formatted.includes("import React") && formatted.includes('React.')) {
      formatted = `import React from 'react';\n${formatted}`;
    }

    // Add TypeScript FC type if needed
    if (typescript && !formatted.includes(': React.FC') && !formatted.includes(': FC')) {
      // Find function component declarations and add FC type
      formatted = formatted.replace(
        /const (\w+)\s*=\s*\(/g,
        'const $1: React.FC = ('
      );
    }

    return formatted;
  }

  private formatVueCode(code: string, _typescript: boolean): string {
    // Vue-specific formatting
    let formatted = code;

    // Wrap in Vue SFC template if needed
    if (!formatted.includes('<template>')) {
      const hasJSX = formatted.includes('<') && formatted.includes('>');
      if (hasJSX) {
        // Convert JSX to Vue template syntax
        formatted = this.convertJSXToVueTemplate(formatted);
      }
    }

    return formatted;
  }

  private formatJavaScriptCode(code: string, _typescript: boolean): string {
    // JavaScript-specific formatting
    let formatted = code;

    // Ensure proper DOM selection patterns
    if (formatted.includes('animate(')) {
      // Add querySelector if element selection is present
      formatted = formatted.replace(
        /animate\(\s*['"`]([^'"`]+)['"`]/g,
        "animate(document.querySelector('$1')"
      );
    }

    return formatted;
  }

  private convertJSXToVueTemplate(jsxCode: string): string {
    // Simplified JSX to Vue template conversion
    let vueTemplate = jsxCode;
    
    // Convert className to class
    vueTemplate = vueTemplate.replace(/className=/g, 'class=');
    
    // Convert onClick to @click
    vueTemplate = vueTemplate.replace(/onClick=/g, '@click=');
    
    // Convert other event handlers
    vueTemplate = vueTemplate.replace(/on([A-Z]\w+)=/g, '@$1=');
    
    return vueTemplate;
  }

  private async formatWithPrettier(code: string, context: CodeGenerationContext): Promise<string> {
    try {
      const parser = this.getPrettierParser(context);
      const prettierOptions = this.getPrettierOptions(context);

      const formatted = await prettier.format(code, {
        parser,
        ...prettierOptions
      });

      return formatted;

    } catch (error) {
      logger.warn('Prettier formatting failed, returning unformatted code', { 
        error: (error as Error).message 
      });
      return code;
    }
  }

  private getPrettierParser(context: CodeGenerationContext): string {
    if (context.framework === 'vue') {
      return 'vue';
    }
    
    return context.typescript ? 'typescript' : 'babel';
  }

  private getPrettierOptions(_context: CodeGenerationContext) {
    return {
      semi: true,
      singleQuote: true,
      trailingComma: 'es5' as const,
      tabWidth: 2,
      printWidth: 100,
      bracketSpacing: true,
      arrowParens: 'avoid' as const,
      endOfLine: 'lf' as const,
      jsxSingleQuote: true,
      bracketSameLine: false
    };
  }

  // Utility methods for generating specific code patterns

  generateReactComponent(
    componentName: string,
    jsx: string,
    typescript: boolean = true,
    imports: string[] = []
  ): string {
    const importStatements = imports.length > 0 
      ? imports.map(imp => `import ${imp};`).join('\n') + '\n\n'
      : '';

    const typeAnnotation = typescript ? ': React.FC' : '';

    return `${importStatements}const ${componentName}${typeAnnotation} = () => {
  return (
    ${jsx}
  );
};

export default ${componentName};`;
  }

  generateVueComponent(
    _componentName: string,
    template: string,
    script: string,
    style: string = '',
    typescript: boolean = true
  ): string {
    const lang = typescript ? ' lang="ts"' : '';
    
    return `<template>
  ${template}
</template>

<script${lang}>
${script}
</script>

${style ? `<style scoped>\n${style}\n</style>` : ''}`;
  }

  generateJavaScriptFunction(
    functionName: string,
    body: string,
    parameters: string[] = [],
    typescript: boolean = false
  ): string {
    const params = parameters.join(', ');
    const returnType = typescript ? ': void' : '';

    return `function ${functionName}(${params})${returnType} {
  ${body}
}`;
  }

  // Motion.dev specific code generation

  generateMotionComponent(
    framework: Framework,
    componentName: string,
    motionProps: Record<string, any>,
    children?: string,
    typescript: boolean = true
  ): string {
    switch (framework) {
      case 'react':
        return this.generateReactMotionComponent(componentName, motionProps, children, typescript);
      case 'vue':
        return this.generateVueMotionComponent(componentName, motionProps, children, typescript);
      case 'js':
        return this.generateJSMotionFunction(componentName, motionProps, typescript);
      default:
        throw createGenerationError(framework, 'Unsupported framework');
    }
  }

  private generateReactMotionComponent(
    componentName: string,
    motionProps: Record<string, any>,
    children?: string,
    typescript: boolean = true
  ): string {
    const propsString = Object.entries(motionProps)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}={${JSON.stringify(value, null, 2)}}`;
        }
        return `${key}="${value}"`;
      })
      .join('\n      ');

    const jsx = `<motion.div
      ${propsString}
    >
      ${children || 'Content goes here'}
    </motion.div>`;

    return this.generateReactComponent(
      componentName,
      jsx,
      typescript,
      ["{ motion } from 'framer-motion'"]
    );
  }

  private generateVueMotionComponent(
    componentName: string,
    motionProps: Record<string, any>,
    children?: string,
    typescript: boolean = true
  ): string {
    const vueDirectives = Object.entries(motionProps)
      .map(([key, value]) => {
        if (key === 'initial') return `v-motion-initial="${JSON.stringify(value)}"`;
        if (key === 'animate') return `v-motion-enter="${JSON.stringify(value)}"`;
        return `${key}="${typeof value === 'object' ? JSON.stringify(value) : value}"`;
      })
      .join(' ');

    const template = `<div ${vueDirectives}>
    ${children || 'Content goes here'}
  </div>`;

    const script = `import { defineComponent } from 'vue';
import { MotionPlugin } from '@vueuse/motion';

export default defineComponent({
  name: '${componentName}',
  setup() {
    return {};
  }
});`;

    return this.generateVueComponent(componentName, template, script, '', typescript);
  }

  private generateJSMotionFunction(
    functionName: string,
    animationProps: Record<string, any>,
    typescript: boolean = true
  ): string {
    const animationCode = Object.entries(animationProps)
      .map(([key, value]) => {
        if (key === 'animate') {
          return `animate(element, ${JSON.stringify(value, null, 2)});`;
        }
        return `// ${key}: ${JSON.stringify(value)}`;
      })
      .join('\n  ');

    const body = `const element = document.querySelector('.motion-element');
  if (element) {
    ${animationCode}
  }`;

    const imports = "import { animate } from 'motion';";

    return `${imports}

${this.generateJavaScriptFunction(functionName, body, [], typescript)}`;
  }

  // Code optimization utilities

  async optimizeCode(
    code: string,
    context: CodeGenerationContext,
    optimizations: string[] = []
  ): Promise<string> {
    let optimized = code;

    for (const optimization of optimizations) {
      switch (optimization) {
        case 'remove-unused-imports':
          optimized = this.removeUnusedImports(optimized);
          break;
        case 'minimize-bundle':
          optimized = this.minimizeBundle(optimized, context);
          break;
        case 'add-tree-shaking':
          optimized = this.addTreeShaking(optimized, context);
          break;
      }
    }

    return optimized;
  }

  private removeUnusedImports(code: string): string {
    // Simplified unused import removal
    return code;
  }

  private minimizeBundle(code: string, _context: CodeGenerationContext): string {
    // Bundle size optimizations
    return code;
  }

  private addTreeShaking(code: string, _context: CodeGenerationContext): string {
    // Tree shaking optimizations
    return code;
  }
}

// Helper function to create generation error
function createGenerationError(component: string, message: string): Error {
  return new Error(`Code generation failed for ${component}: ${message}`);
}