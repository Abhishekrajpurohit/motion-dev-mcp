/**
 * Component Generator for Motion.dev
 * Generates complete Motion components for different frameworks
 */

import { Framework } from '../../types/motion.js';

export interface ComponentConfig {
  name: string;
  framework: Framework;
  animations: string[];
  props?: Array<{ name: string; type: string; required: boolean }>;
  typescript: boolean;
  styleSystem?: 'css' | 'styled-components' | 'emotion' | 'tailwind';
}

export class ComponentGenerator {
  generateComponent(config: ComponentConfig): string {
    switch (config.framework) {
      case 'react':
        return this.generateReactComponent(config);
      case 'vue':
        return this.generateVueComponent(config);
      case 'js':
        return this.generateJSComponent(config);
      default:
        throw new Error(`Unsupported framework: ${config.framework}`);
    }
  }

  private generateReactComponent(config: ComponentConfig): string {
    // Framework-specific imports would be determined dynamically
    // const imports = ['React'];
    // const motionImports = ['motion'];
    
    if (config.typescript) {
      return `import React from 'react';
import { motion } from 'framer-motion';

interface ${config.name}Props {
  ${config.props?.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n  ') || ''}
}

const ${config.name}: React.FC<${config.name}Props> = ({ ${config.props?.map(p => p.name).join(', ') || ''} }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>${config.name} Component</h1>
    </motion.div>
  );
};

export default ${config.name};`;
    } else {
      return `import React from 'react';
import { motion } from 'framer-motion';

const ${config.name} = ({ ${config.props?.map(p => p.name).join(', ') || ''} }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>${config.name} Component</h1>
    </motion.div>
  );
};

export default ${config.name};`;
    }
  }

  private generateVueComponent(config: ComponentConfig): string {
    return `<template>
  <div
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1 }"
    :leave="{ opacity: 0 }"
  >
    <h1>${config.name} Component</h1>
  </div>
</template>

<script${config.typescript ? ' setup lang="ts"' : ' setup'}>
${config.props?.length ? `
interface Props {
  ${config.props.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n  ')}
}

defineProps<Props>();
` : ''}
</script>

<style scoped>
/* Component styles */
</style>`;
  }

  private generateJSComponent(config: ComponentConfig): string {
    return `import { animate } from 'motion';

/**
 * ${config.name} - Motion.dev JavaScript component
 */
export class ${config.name} {
  constructor(element${config.props?.length ? ', options = {}' : ''}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    ${config.props?.length ? 'this.options = { ...this.defaultOptions, ...options };' : ''}
    this.init();
  }

  ${config.props?.length ? `
  defaultOptions = {
    ${config.props.map(p => `${p.name}: ${p.type === 'string' ? "''" : p.type === 'number' ? '0' : 'null'}`).join(',\n    ')}
  };
  ` : ''}

  init() {
    if (!this.element) {
      console.warn('${config.name}: Element not found');
      return;
    }

    this.animateIn();
  }

  animateIn() {
    return animate(
      this.element,
      { opacity: [0, 1] },
      { duration: 0.3 }
    );
  }

  animateOut() {
    return animate(
      this.element,
      { opacity: [1, 0] },
      { duration: 0.3 }
    );
  }
}`;
  }
}