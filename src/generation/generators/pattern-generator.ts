/**
 * Pattern Generator for Motion.dev
 * Generates animation patterns that can be applied to components
 */

import { Framework } from '../../types/motion.js';

export interface PatternConfig {
  id: string;
  name: string;
  properties: Record<string, any>;
  framework: Framework;
  duration?: number;
  easing?: string;
}

export class PatternGenerator {
  generatePattern(config: PatternConfig): string {
    switch (config.framework) {
      case 'react':
        return this.generateReactPattern(config);
      case 'vue':
        return this.generateVuePattern(config);
      case 'js':
        return this.generateJSPattern(config);
      default:
        throw new Error(`Unsupported framework: ${config.framework}`);
    }
  }

  private generateReactPattern(config: PatternConfig): string {
    return `// ${config.name} pattern for React
const ${config.id}Variants = {
  initial: ${JSON.stringify(config.properties.initial || {}, null, 2)},
  animate: ${JSON.stringify(config.properties.animate || {}, null, 2)},
  exit: ${JSON.stringify(config.properties.exit || {}, null, 2)},
  transition: {
    duration: ${config.duration || 0.3},
    ease: "${config.easing || 'easeOut'}"
  }
};`;
  }

  private generateVuePattern(config: PatternConfig): string {
    return `<!-- ${config.name} pattern for Vue -->
v-motion
:initial="${JSON.stringify(config.properties.initial || {})}"
:enter="${JSON.stringify(config.properties.animate || {})}"
:leave="${JSON.stringify(config.properties.exit || {})}"`;
  }

  private generateJSPattern(config: PatternConfig): string {
    return `// ${config.name} pattern for JavaScript
export const ${config.id}Pattern = {
  animate: ${JSON.stringify(config.properties.animate || {}, null, 2)},
  options: {
    duration: ${config.duration || 0.3},
    easing: "${config.easing || 'ease-out'}"
  }
};`;
  }
}