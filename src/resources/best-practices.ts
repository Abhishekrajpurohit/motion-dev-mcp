/**
 * Best practices resource implementation
 * Provides Motion.dev performance, accessibility, and development guidelines
 */

import { DocumentationEndpoint, Framework } from '../types/motion.js';
import { logger } from '../utils/logger.js';

export interface BestPractice {
  id: string;
  title: string;
  category: 'performance' | 'accessibility' | 'development' | 'debugging' | 'testing';
  priority: 'high' | 'medium' | 'low';
  framework?: Framework | 'all';
  description: string;
  guidelines: string[];
  examples: {
    good: string;
    bad?: string;
    explanation: string;
  }[];
  resources: Array<{
    title: string;
    url: string;
    type: 'documentation' | 'article' | 'example';
  }>;
}

export interface BestPracticesResource {
  totalPractices: number;
  byCategory: Record<string, BestPractice[]>;
  byPriority: Record<string, BestPractice[]>;
  byFramework: Record<Framework | 'all', BestPractice[]>;
  quickReference: Array<{
    category: string;
    keyPoints: string[];
  }>;
  checklist: Array<{
    item: string;
    category: string;
    mandatory: boolean;
  }>;
}

export class BestPracticesManager {
  private practices: BestPractice[] = [];
  private endpoints: DocumentationEndpoint[] = [];

  constructor() {
    this.initializeBestPractices();
  }

  updateEndpoints(endpoints: DocumentationEndpoint[]): void {
    this.endpoints = endpoints;
    logger.debug(`Best practices updated with ${endpoints.length} endpoints`);
  }

  getBestPractices(): BestPracticesResource {
    return {
      totalPractices: this.practices.length,
      byCategory: this.groupByCategory(),
      byPriority: this.groupByPriority(),
      byFramework: this.groupByFramework(),
      quickReference: this.getQuickReference(),
      checklist: this.getDevelopmentChecklist()
    };
  }

  private initializeBestPractices(): void {
    this.practices = [
      // Performance Best Practices
      {
        id: 'perf-001',
        title: 'Use transform properties for smooth animations',
        category: 'performance',
        priority: 'high',
        framework: 'all',
        description: 'Animate transform properties (x, y, scale, rotate) instead of layout properties for better performance.',
        guidelines: [
          'Use transform properties (x, y, scale, rotate, skew) for position and size changes',
          'Avoid animating width, height, top, left directly',
          'Use transform-origin to control transformation center point',
          'Combine multiple transforms in a single animation when possible'
        ],
        examples: [
          {
            good: `// Good: Using transform properties
<motion.div
  animate={{ x: 100, scale: 1.2 }}
  transition={{ duration: 0.3 }}
/>`,
            bad: `// Bad: Animating layout properties
<motion.div
  animate={{ left: 100, width: 200 }}
  transition={{ duration: 0.3 }}
/>`,
            explanation: 'Transform properties are hardware-accelerated and don\'t trigger layout recalculation'
          }
        ],
        resources: [
          {
            title: 'Motion Performance Guide',
            url: '/docs/performance',
            type: 'documentation'
          }
        ]
      },
      {
        id: 'perf-002',
        title: 'Use will-change sparingly',
        category: 'performance',
        priority: 'medium',
        framework: 'all',
        description: 'Only use will-change CSS property for elements that will definitely animate.',
        guidelines: [
          'Add will-change before animation starts',
          'Remove will-change after animation completes',
          'Don\'t apply will-change to too many elements',
          'Use Motion\'s built-in optimization instead when possible'
        ],
        examples: [
          {
            good: `// Good: Motion handles optimization automatically
<motion.div animate={{ x: 100 }} />

// Or manual will-change management
const controls = useAnimation();
const handleClick = () => {
  element.style.willChange = 'transform';
  controls.start({ x: 100 });
  controls.finished.then(() => {
    element.style.willChange = 'auto';
  });
};`,
            bad: `// Bad: Permanent will-change
.animated-element {
  will-change: transform;
}`,
            explanation: 'Permanent will-change creates unnecessary compositing layers and wastes memory'
          }
        ],
        resources: [
          {
            title: 'CSS will-change MDN',
            url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/will-change',
            type: 'article'
          }
        ]
      },

      // Accessibility Best Practices
      {
        id: 'a11y-001',
        title: 'Respect reduced motion preferences',
        category: 'accessibility',
        priority: 'high',
        framework: 'all',
        description: 'Provide alternatives for users who prefer reduced motion.',
        guidelines: [
          'Check prefers-reduced-motion media query',
          'Provide instant transitions or no animations for reduced motion users',
          'Keep essential motion while reducing decorative animations',
          'Test with reduced motion settings enabled'
        ],
        examples: [
          {
            good: `// Good: Respecting reduced motion
const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={{ x: 100 }}
  transition={{ 
    duration: shouldReduceMotion ? 0 : 0.3,
    type: shouldReduceMotion ? false : 'spring'
  }}
/>

// CSS media query approach
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`,
            explanation: 'Users with vestibular disorders or motion sensitivity need reduced motion options'
          }
        ],
        resources: [
          {
            title: 'Motion Accessibility Guide',
            url: '/docs/accessibility',
            type: 'documentation'
          }
        ]
      },
      {
        id: 'a11y-002',
        title: 'Maintain focus management during animations',
        category: 'accessibility',
        priority: 'high',
        framework: 'react',
        description: 'Ensure keyboard navigation works correctly during and after animations.',
        guidelines: [
          'Don\'t animate elements out of tab order',
          'Use aria-live regions for dynamic content',
          'Provide focus indicators for animated interactive elements',
          'Test keyboard navigation with animations enabled'
        ],
        examples: [
          {
            good: `// Good: Maintaining focus management
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-live="polite"
    >
      <button autoFocus>Accessible Button</button>
    </motion.div>
  )}
</AnimatePresence>`,
            explanation: 'Focus is properly managed and screen readers are informed of changes'
          }
        ],
        resources: []
      },

      // Development Best Practices
      {
        id: 'dev-001',
        title: 'Use variants for complex animations',
        category: 'development',
        priority: 'medium',
        framework: 'react',
        description: 'Organize complex animations using variants for better maintainability.',
        guidelines: [
          'Define variants for different animation states',
          'Use descriptive names for variant states',
          'Share variants between related components',
          'Combine variants with dynamic values when needed'
        ],
        examples: [
          {
            good: `// Good: Using variants
const buttonVariants = {
  idle: { scale: 1, backgroundColor: '#3B82F6' },
  hover: { scale: 1.05, backgroundColor: '#1D4ED8' },
  tap: { scale: 0.95 },
  disabled: { scale: 1, backgroundColor: '#9CA3AF' }
};

<motion.button
  variants={buttonVariants}
  initial="idle"
  whileHover="hover"
  whileTap="tap"
  animate={disabled ? "disabled" : "idle"}
/>`,
            bad: `// Bad: Inline animation objects everywhere
<motion.button
  initial={{ scale: 1, backgroundColor: '#3B82F6' }}
  whileHover={{ scale: 1.05, backgroundColor: '#1D4ED8' }}
  whileTap={{ scale: 0.95 }}
  animate={disabled ? 
    { scale: 1, backgroundColor: '#9CA3AF' } : 
    { scale: 1, backgroundColor: '#3B82F6' }
  }
/>`,
            explanation: 'Variants make animations more readable and reusable'
          }
        ],
        resources: []
      },

      // Testing Best Practices
      {
        id: 'test-001',
        title: 'Mock animations in unit tests',
        category: 'testing',
        priority: 'medium',
        framework: 'react',
        description: 'Disable animations in tests for faster and more reliable testing.',
        guidelines: [
          'Mock framer-motion in Jest configuration',
          'Use reduced motion mode in test environments',
          'Test animation triggers, not animation frames',
          'Focus on interaction outcomes rather than animation details'
        ],
        examples: [
          {
            good: `// Good: Jest setup for mocking motion
// jest.setup.js
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    // Add other elements as needed
  },
  AnimatePresence: ({ children }) => children,
}));

// Test focuses on functionality
test('button triggers action when clicked', () => {
  const handleClick = jest.fn();
  render(<AnimatedButton onClick={handleClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});`,
            explanation: 'Tests run faster and more consistently without real animations'
          }
        ],
        resources: []
      },

      // Debugging Best Practices
      {
        id: 'debug-001',
        title: 'Use Motion DevTools for debugging',
        category: 'debugging',
        priority: 'low',
        framework: 'react',
        description: 'Leverage Motion DevTools and debugging utilities for development.',
        guidelines: [
          'Install Motion DevTools browser extension',
          'Use layoutId debugging for layout animations',
          'Add debug props to motion components during development',
          'Monitor performance using browser dev tools'
        ],
        examples: [
          {
            good: `// Good: Using debug utilities
<motion.div
  layoutId="shared-element"
  debug // Shows layout animation boxes
  animate={{ x: 100 }}
  transition={{ 
    type: "spring",
    visualDebug: true // Shows spring curve visualization
  }}
/>

// Performance debugging
const DebugComponent = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Animation performance metrics:', performance.now());
    }
  });
};`,
            explanation: 'Debug utilities help identify animation issues during development'
          }
        ],
        resources: [
          {
            title: 'Motion DevTools',
            url: 'https://chrome.google.com/webstore/detail/framer-motion-developer-tools',
            type: 'article'
          }
        ]
      }
    ];

    logger.debug(`Initialized ${this.practices.length} best practices`);
  }

  private groupByCategory(): Record<string, BestPractice[]> {
    const grouped: Record<string, BestPractice[]> = {};
    
    for (const practice of this.practices) {
      if (!grouped[practice.category]) {
        grouped[practice.category] = [];
      }
      grouped[practice.category].push(practice);
    }

    return grouped;
  }

  private groupByPriority(): Record<string, BestPractice[]> {
    const grouped: Record<string, BestPractice[]> = {};
    
    for (const practice of this.practices) {
      if (!grouped[practice.priority]) {
        grouped[practice.priority] = [];
      }
      grouped[practice.priority].push(practice);
    }

    return grouped;
  }

  private groupByFramework(): Record<Framework | 'all', BestPractice[]> {
    const grouped: Record<Framework | 'all', BestPractice[]> = {
      react: [],
      js: [],
      vue: [],
      all: []
    };
    
    for (const practice of this.practices) {
      const framework = practice.framework || 'all';
      grouped[framework].push(practice);
    }

    return grouped;
  }

  private getQuickReference(): Array<{ category: string; keyPoints: string[] }> {
    return [
      {
        category: 'Performance',
        keyPoints: [
          'Use transform properties instead of layout properties',
          'Avoid animating too many elements simultaneously',
          'Use will-change sparingly and remove after animation',
          'Prefer spring animations over ease-in-out for natural feel',
          'Batch multiple property changes in single animation'
        ]
      },
      {
        category: 'Accessibility',
        keyPoints: [
          'Always respect prefers-reduced-motion setting',
          'Maintain focus management during transitions',
          'Provide meaningful alt text for animated visuals',
          'Test with keyboard navigation only',
          'Use appropriate ARIA labels for dynamic content'
        ]
      },
      {
        category: 'Development',
        keyPoints: [
          'Use variants for complex animation states',
          'Keep animations consistent across similar components',
          'Comment complex animation timing and easing choices',
          'Abstract reusable animations into custom hooks',
          'Profile animation performance on low-end devices'
        ]
      },
      {
        category: 'User Experience',
        keyPoints: [
          'Keep animations purposeful and enhance usability',
          'Use appropriate duration (usually 200-500ms)',
          'Provide visual feedback for user interactions',
          'Don\'t let animations block critical user actions',
          'Test animations on various screen sizes'
        ]
      }
    ];
  }

  private getDevelopmentChecklist(): Array<{ item: string; category: string; mandatory: boolean }> {
    return [
      { item: 'Animations respect prefers-reduced-motion', category: 'accessibility', mandatory: true },
      { item: 'Interactive elements maintain focus indicators', category: 'accessibility', mandatory: true },
      { item: 'Animations use transform properties when possible', category: 'performance', mandatory: true },
      { item: 'Complex animations use variants for organization', category: 'development', mandatory: false },
      { item: 'Animation durations are appropriate for context', category: 'development', mandatory: true },
      { item: 'Animations are tested on low-end devices', category: 'performance', mandatory: false },
      { item: 'Motion components have proper TypeScript types', category: 'development', mandatory: false },
      { item: 'Animations gracefully handle component unmounting', category: 'development', mandatory: true },
      { item: 'Critical user flows work without animations', category: 'accessibility', mandatory: true },
      { item: 'Animation performance is profiled', category: 'performance', mandatory: false }
    ];
  }

  getPracticesByCategory(category: string): BestPractice[] {
    return this.practices.filter(practice => practice.category === category);
  }

  getPracticesByFramework(framework: Framework | 'all'): BestPractice[] {
    return this.practices.filter(practice => 
      practice.framework === framework || practice.framework === 'all'
    );
  }

  getHighPriorityPractices(): BestPractice[] {
    return this.practices.filter(practice => practice.priority === 'high');
  }

  getPracticeById(id: string): BestPractice | undefined {
    return this.practices.find(practice => practice.id === id);
  }

  getPerformanceTips(): string[] {
    const performancePractices = this.getPracticesByCategory('performance');
    return performancePractices.flatMap(practice => practice.guidelines);
  }

  getAccessibilityGuidelines(): string[] {
    const accessibilityPractices = this.getPracticesByCategory('accessibility');
    return accessibilityPractices.flatMap(practice => practice.guidelines);
  }

  getDevelopmentTips(): string[] {
    const developmentPractices = this.getPracticesByCategory('development');
    return developmentPractices.flatMap(practice => practice.guidelines);
  }
}