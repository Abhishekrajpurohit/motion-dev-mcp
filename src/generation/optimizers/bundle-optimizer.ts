/**
 * Bundle Size Optimizer for Motion.dev code
 * Optimizes imports and reduces bundle size impact
 */

import { Framework } from '../../types/motion.js';

export interface BundleOptimization {
  type: 'bundle-size';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fix?: string;
  originalSize?: number;
  optimizedSize?: number;
}

export class BundleOptimizer {
  analyzeCode(code: string, _framework: Framework): BundleOptimization[] {
    const suggestions: BundleOptimization[] = [];

    // Check for default imports that could be tree-shaken
    if (this.hasDefaultImports(code)) {
      suggestions.push({
        type: 'bundle-size',
        severity: 'medium',
        message: 'Using default imports prevents tree-shaking',
        fix: 'Use named imports instead of default imports'
      });
    }

    // Check for unused imports
    const unusedImports = this.findUnusedImports(code);
    if (unusedImports.length > 0) {
      suggestions.push({
        type: 'bundle-size',
        severity: 'low',
        message: `Unused imports found: ${unusedImports.join(', ')}`,
        fix: 'Remove unused imports to reduce bundle size'
      });
    }

    // Check for heavy animation features
    if (this.hasHeavyFeatures(code)) {
      suggestions.push({
        type: 'bundle-size',
        severity: 'medium',
        message: 'Using heavy animation features that increase bundle size',
        fix: 'Consider using lighter alternatives or lazy loading'
      });
    }

    return suggestions;
  }

  optimizeCode(code: string, framework: Framework): string {
    let optimizedCode = code;

    // Optimize imports
    optimizedCode = this.optimizeImports(optimizedCode, framework);

    // Remove unused imports
    optimizedCode = this.removeUnusedImports(optimizedCode);

    // Replace heavy features with lighter alternatives
    optimizedCode = this.replaceLightweightAlternatives(optimizedCode, framework);

    return optimizedCode;
  }

  private hasDefaultImports(code: string): boolean {
    return /import\s+\w+\s+from\s+['"]framer-motion['"]/.test(code) ||
           /import\s+\w+\s+from\s+['"]motion['"]/.test(code);
  }

  private findUnusedImports(code: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+\{([^}]+)\}\s+from/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(code)) !== null) {
      const importList = match[1].split(',').map(i => i.trim());
      importList.forEach(importName => {
        const cleanName = importName.replace(/\s+as\s+\w+/, '').trim();
        if (!new RegExp(cleanName, 'g').test(code.slice(match!.index! + match![0].length))) {
          imports.push(cleanName);
        }
      });
    }

    return imports;
  }

  private hasHeavyFeatures(code: string): boolean {
    const heavyFeatures = [
      'AnimatePresence',
      'LayoutGroup',
      'Reorder',
      'useMotionValue',
      'useTransform',
      'useSpring'
    ];

    return heavyFeatures.some(feature => code.includes(feature));
  }

  private optimizeImports(code: string, framework: Framework): string {
    switch (framework) {
      case 'react':
        return this.optimizeReactImports(code);
      case 'vue':
        return this.optimizeVueImports(code);
      case 'js':
        return this.optimizeJSImports(code);
      default:
        return code;
    }
  }

  private optimizeReactImports(code: string): string {
    // Convert default imports to named imports for better tree-shaking
    return code
      .replace(/import\s+motion\s+from\s+['"]framer-motion['"];?/g, "import { motion } from 'framer-motion';")
      .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]framer-motion['"];?/g, (_match, imports) => {
        // Remove duplicates and sort alphabetically
        const uniqueImports = [...new Set(imports.split(',').map((i: string) => i.trim()))].sort();
        return `import { ${uniqueImports.join(', ')} } from 'framer-motion';`;
      });
  }

  private optimizeVueImports(code: string): string {
    // Optimize Vue motion imports
    return code.replace(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]@vueuse\/motion['"];?/g,
      (_match, imports) => {
        const uniqueImports = [...new Set(imports.split(',').map((i: string) => i.trim()))].sort();
        return `import { ${uniqueImports.join(', ')} } from '@vueuse/motion';`;
      }
    );
  }

  private optimizeJSImports(code: string): string {
    // Optimize vanilla JavaScript motion imports
    return code.replace(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]motion['"];?/g,
      (_match, imports) => {
        const uniqueImports = [...new Set(imports.split(',').map((i: string) => i.trim()))].sort();
        return `import { ${uniqueImports.join(', ')} } from 'motion';`;
      }
    );
  }

  private removeUnusedImports(code: string): string {
    const lines = code.split('\n');
    const importLines = lines.filter(line => line.trim().startsWith('import'));
    const codeWithoutImports = lines.filter(line => !line.trim().startsWith('import')).join('\n');

    const usedImports: string[] = [];

    importLines.forEach(importLine => {
      const match = importLine.match(/import\s+\{([^}]+)\}/);
      if (match) {
        const imports = match[1].split(',').map(i => i.trim());
        const usedInThisLine = imports.filter(imp => {
          const cleanName = imp.replace(/\s+as\s+\w+/, '').trim();
          return new RegExp(`\\b${cleanName}\\b`).test(codeWithoutImports);
        });

        if (usedInThisLine.length > 0) {
          const newImportLine = importLine.replace(
            /\{([^}]+)\}/,
            `{${usedInThisLine.join(', ')}}`
          );
          usedImports.push(newImportLine);
        }
      } else {
        // Handle default imports
        usedImports.push(importLine);
      }
    });

    return [...usedImports, '', ...codeWithoutImports.split('\n')].join('\n');
  }

  private replaceLightweightAlternatives(code: string, framework: Framework): string {
    // Replace heavy features with lighter alternatives where possible
    let optimizedCode = code;

    // Replace AnimatePresence with simple conditional rendering for simple cases
    if (framework === 'react' && code.includes('AnimatePresence')) {
      const simpleAnimatePresence = /AnimatePresence[^>]*>\s*\{[^}]*\?\s*<motion\.[^>]*>[^<]*<\/motion\.\w+>\s*:\s*null\s*\}\s*<\/AnimatePresence>/g;
      optimizedCode = optimizedCode.replace(simpleAnimatePresence, (match) => {
        return match.replace('AnimatePresence', 'React.Fragment');
      });
    }

    return optimizedCode;
  }

  estimateBundleSize(code: string, framework: Framework): { 
    estimated: number; 
    breakdown: Record<string, number> 
  } {
    const breakdown: Record<string, number> = {};
    let total = 0;

    // Base framework costs (estimated)
    const baseSizes: Record<Framework, Record<string, number>> = {
      react: { motion: 15000, AnimatePresence: 5000, useMotionValue: 3000 },
      vue: { motion: 12000, MotionPlugin: 8000 },
      js: { animate: 8000, scroll: 4000, stagger: 2000 }
    };

    const currentFrameworkSizes = baseSizes[framework] || {};

    Object.keys(currentFrameworkSizes).forEach(feature => {
      if (code.includes(feature)) {
        breakdown[feature] = currentFrameworkSizes[feature] as number;
        total += currentFrameworkSizes[feature] as number;
      }
    });

    return { estimated: total, breakdown };
  }
}