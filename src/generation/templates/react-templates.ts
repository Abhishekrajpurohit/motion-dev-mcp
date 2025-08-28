/**
 * React-specific Motion.dev templates
 * Pre-built React components with Motion animations
 */

// Framework import removed as unused

export interface ReactTemplate {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'layout' | 'animation' | 'interaction';
  complexity: 'basic' | 'intermediate' | 'advanced';
  code: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  dependencies: string[];
  examples: string[];
}

export class ReactTemplateManager {
  private templates: Map<string, ReactTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  getTemplate(id: string): ReactTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): ReactTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: ReactTemplate['category']): ReactTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  private initializeTemplates(): void {
    // Fade In Card Template
    this.addTemplate({
      id: 'react-fade-card',
      name: 'Fade In Card',
      description: 'Card component with fade-in animation',
      category: 'component',
      complexity: 'basic',
      code: `import React from 'react';
import { motion } from 'framer-motion';

interface FadeCardProps {
  title: string;
  content: string;
  delay?: number;
}

const FadeCard: React.FC<FadeCardProps> = ({ title, content, delay = 0 }) => {
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <h3>{title}</h3>
      <p>{content}</p>
    </motion.div>
  );
};

export default FadeCard;`,
      props: [
        { name: 'title', type: 'string', required: true, description: 'Card title' },
        { name: 'content', type: 'string', required: true, description: 'Card content' },
        { name: 'delay', type: 'number', required: false, description: 'Animation delay in seconds' }
      ],
      dependencies: ['framer-motion'],
      examples: ['<FadeCard title="Hello" content="World" />', '<FadeCard title="Hello" content="World" delay={0.2} />']
    });

    // Hover Button Template
    this.addTemplate({
      id: 'react-hover-button',
      name: 'Hover Button',
      description: 'Interactive button with hover animations',
      category: 'interaction',
      complexity: 'basic',
      code: `import React from 'react';
import { motion } from 'framer-motion';

interface HoverButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const HoverButton: React.FC<HoverButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <motion.button
      className={\`btn btn-\${variant}\`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};

export default HoverButton;`,
      props: [
        { name: 'children', type: 'React.ReactNode', required: true, description: 'Button content' },
        { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
        { name: 'variant', type: "'primary' | 'secondary'", required: false, description: 'Button style variant' }
      ],
      dependencies: ['framer-motion'],
      examples: ['<HoverButton>Click me</HoverButton>', '<HoverButton variant="secondary" onClick={handleClick}>Submit</HoverButton>']
    });
  }

  private addTemplate(template: ReactTemplate): void {
    this.templates.set(template.id, template);
  }
}

export const reactTemplateManager = new ReactTemplateManager();