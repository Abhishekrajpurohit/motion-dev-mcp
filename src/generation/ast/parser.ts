/**
 * AST Parser for Motion.dev code generation
 * Handles parsing JavaScript/TypeScript code for React, Vue, and vanilla JS
 */

import * as babel from '@babel/core';
import { parse } from '@babel/parser';
import * as t from '@babel/types';
import { Framework } from '../../types/motion.js';
import { logger } from '../../utils/logger.js';
import { createParseError } from '../../utils/errors.js';
import { 
  ASTParseOptions, 
  ComponentAST, 
  ImportDeclaration, 
  ExportDeclaration,
  ASTNode
} from './types.js';

export class ASTParser {
  parse(code: string, options: ASTParseOptions): ComponentAST {
    try {
      logger.debug(`Parsing ${options.framework} code`, { 
        typescript: options.typescript, 
        codeLength: code.length 
      });

      const parserOptions = this.getParserOptions(options);
      const ast = parse(code, parserOptions);

      const componentAST: ComponentAST = {
        framework: options.framework,
        componentName: this.extractComponentName(ast, options.framework),
        ast: ast as ASTNode,
        imports: this.extractImports(ast),
        exports: this.extractExports(ast),
        typescript: options.typescript
      };

      logger.debug(`Successfully parsed ${options.framework} component: ${componentAST.componentName}`);
      return componentAST;

    } catch (error) {
      logger.error('AST parsing failed', error as Error);
      throw createParseError('JavaScript/TypeScript', code, (error as Error).message);
    }
  }

  private getParserOptions(options: ASTParseOptions) {
    const plugins: any[] = ['decorators-legacy'];

    // Framework-specific plugins
    if (options.framework === 'react' || options.jsx) {
      plugins.push('jsx');
    }

    if (options.framework === 'vue') {
      // Vue SFC parsing is handled differently
      plugins.push('jsx'); // Vue 3 supports JSX
    }

    // TypeScript support
    if (options.typescript) {
      plugins.push('typescript');
    }

    // Additional plugins
    plugins.push(
      'asyncGenerators',
      'bigInt',
      'classProperties',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'functionBind',
      'importMeta',
      'nullishCoalescingOperator',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      'throwExpressions',
      'topLevelAwait'
    );

    // Add custom plugins if provided
    if (options.plugins) {
      plugins.push(...options.plugins);
    }

    return {
      sourceType: 'module' as const,
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: false,
      plugins,
      strictMode: false
    };
  }

  private extractComponentName(ast: t.File, framework: Framework): string {
    let componentName = 'UnnamedComponent';

    babel.traverse(ast, {
      // Function declarations
      FunctionDeclaration: (path) => {
        if (this.isReactComponent(path.node, framework)) {
          componentName = path.node.id?.name || componentName;
        }
      },
      
      // Arrow functions assigned to variables
      VariableDeclarator: (path) => {
        if (t.isArrowFunctionExpression(path.node.init) || 
            t.isFunctionExpression(path.node.init)) {
          if (t.isIdentifier(path.node.id) && 
              this.isReactComponent(path.node.init, framework)) {
            componentName = path.node.id.name;
          }
        }
      },

      // Class components
      ClassDeclaration: (path) => {
        if (this.isReactComponent(path.node, framework)) {
          componentName = path.node.id?.name || componentName;
        }
      },

      // Export default
      ExportDefaultDeclaration: (path) => {
        if (t.isIdentifier(path.node.declaration)) {
          componentName = path.node.declaration.name;
        } else if (t.isFunctionDeclaration(path.node.declaration)) {
          componentName = path.node.declaration.id?.name || componentName;
        }
      }
    });

    return componentName;
  }

  private isReactComponent(node: t.Node, framework: Framework): boolean {
    if (framework !== 'react') return false;

    // Function components
    if (t.isFunctionDeclaration(node) || t.isArrowFunctionExpression(node) || t.isFunctionExpression(node)) {
      // Check if function name starts with uppercase (React convention)
      if (t.isFunctionDeclaration(node) && node.id) {
        return /^[A-Z]/.test(node.id.name);
      }
      
      // Check if it returns JSX
      // This is a simplified check - would need more sophisticated analysis
      return true;
    }

    // Class components
    if (t.isClassDeclaration(node)) {
      return node.id ? /^[A-Z]/.test(node.id.name) : false;
    }

    return false;
  }

  private extractImports(ast: t.File): ImportDeclaration[] {
    const imports: ImportDeclaration[] = [];

    babel.traverse(ast, {
      ImportDeclaration: (path) => {
        const importDecl: ImportDeclaration = {
          source: path.node.source.value,
          specifiers: []
        };

        for (const specifier of path.node.specifiers) {
          if (t.isImportDefaultSpecifier(specifier)) {
            importDecl.specifiers.push({
              type: 'default',
              local: specifier.local.name
            });
          } else if (t.isImportNamespaceSpecifier(specifier)) {
            importDecl.specifiers.push({
              type: 'namespace',
              local: specifier.local.name
            });
          } else if (t.isImportSpecifier(specifier)) {
            importDecl.specifiers.push({
              type: 'named',
              imported: t.isIdentifier(specifier.imported) 
                ? specifier.imported.name 
                : specifier.imported.value,
              local: specifier.local.name
            });
          }
        }

        imports.push(importDecl);
      }
    });

    return imports;
  }

  private extractExports(ast: t.File): ExportDeclaration[] {
    const exports: ExportDeclaration[] = [];

    babel.traverse(ast, {
      ExportDefaultDeclaration: (path) => {
        exports.push({
          type: 'default',
          declaration: this.getExportDeclarationName(path.node.declaration)
        });
      },

      ExportNamedDeclaration: (path) => {
        if (path.node.specifiers.length > 0) {
          exports.push({
            type: 'named',
            specifiers: path.node.specifiers.map(spec => {
              if (t.isExportSpecifier(spec)) {
                return {
                  exported: t.isIdentifier(spec.exported) 
                    ? spec.exported.name 
                    : spec.exported.value,
                  local: spec.local.name
                };
              }
              return { exported: 'unknown', local: 'unknown' };
            })
          });
        } else if (path.node.declaration) {
          exports.push({
            type: 'named',
            declaration: this.getExportDeclarationName(path.node.declaration)
          });
        }
      }
    });

    return exports;
  }

  private getExportDeclarationName(declaration: t.Node): string {
    if (t.isFunctionDeclaration(declaration)) {
      return declaration.id?.name || 'anonymous';
    } else if (t.isClassDeclaration(declaration)) {
      return declaration.id?.name || 'anonymous';
    } else if (t.isVariableDeclaration(declaration)) {
      const declarator = declaration.declarations[0];
      if (t.isVariableDeclarator(declarator) && t.isIdentifier(declarator.id)) {
        return declarator.id.name;
      }
    } else if (t.isIdentifier(declaration)) {
      return declaration.name;
    }
    return 'unknown';
  }

  // Utility methods for framework-specific parsing
  parseReactComponent(code: string, typescript: boolean = true): ComponentAST {
    return this.parse(code, {
      framework: 'react',
      typescript,
      jsx: true
    });
  }

  parseVueComponent(code: string, typescript: boolean = true): ComponentAST {
    return this.parse(code, {
      framework: 'vue',
      typescript,
      jsx: true // Vue 3 supports JSX
    });
  }

  parseJavaScript(code: string, typescript: boolean = false): ComponentAST {
    return this.parse(code, {
      framework: 'js',
      typescript
    });
  }

  // Parse Motion.dev specific patterns
  extractMotionElements(ast: t.File): Array<{
    type: string;
    props: Record<string, any>;
    line?: number;
  }> {
    const motionElements: Array<{
      type: string;
      props: Record<string, any>;
      line?: number;
    }> = [];

    babel.traverse(ast, {
      JSXElement: (path) => {
        const openingElement = path.node.openingElement;
        if (t.isJSXMemberExpression(openingElement.name)) {
          // motion.div, motion.span, etc.
          if (t.isIdentifier(openingElement.name.object) && 
              (openingElement.name.object as any).name === 'motion') {
            const elementType = t.isIdentifier(openingElement.name.property) 
              ? (openingElement.name.property as any).name 
              : 'div';
            
            const props: Record<string, any> = {};
            
            for (const attr of openingElement.attributes) {
              if (t.isJSXAttribute(attr) && t.isIdentifier(attr.name)) {
                const value = this.extractJSXAttributeValue(attr.value);
                props[(attr.name as any).name] = value;
              }
            }

            motionElements.push({
              type: `motion.${elementType}`,
              props,
              line: path.node.loc?.start.line
            });
          }
        }
      },

      // For Vue: v-motion directive
      // For JS: animate() function calls
      CallExpression: (path) => {
        if (t.isIdentifier(path.node.callee) && path.node.callee.name === 'animate') {
          // JavaScript animate() calls
          motionElements.push({
            type: 'animate',
            props: {
              arguments: path.node.arguments.map(arg => this.extractArgumentValue(arg))
            },
            line: path.node.loc?.start.line
          });
        }
      }
    });

    return motionElements;
  }

  private extractJSXAttributeValue(value: t.JSXAttribute['value']): any {
    if (!value) return true;
    
    if (t.isStringLiteral(value)) {
      return value.value;
    } else if (t.isJSXExpressionContainer(value)) {
      return this.extractExpressionValue(value.expression);
    }
    
    return null;
  }

  private extractExpressionValue(expression: t.Expression | t.JSXEmptyExpression): any {
    if (t.isStringLiteral(expression)) {
      return expression.value;
    } else if (t.isNumericLiteral(expression)) {
      return expression.value;
    } else if (t.isBooleanLiteral(expression)) {
      return expression.value;
    } else if (t.isObjectExpression(expression)) {
      const obj: Record<string, any> = {};
      for (const prop of expression.properties) {
        if (t.isObjectProperty(prop) && 
            (t.isIdentifier(prop.key) || t.isStringLiteral(prop.key))) {
          const key = t.isIdentifier(prop.key) ? prop.key.name : prop.key.value;
          obj[key] = this.extractExpressionValue(prop.value as t.Expression);
        }
      }
      return obj;
    } else if (t.isArrayExpression(expression)) {
      return expression.elements.map(el => 
        el ? this.extractExpressionValue(el as t.Expression) : null
      );
    }
    
    return '[Complex Expression]';
  }

  private extractArgumentValue(arg: t.Node): any {
    if (t.isExpression(arg)) {
      return this.extractExpressionValue(arg);
    }
    return '[Complex Argument]';
  }
}