/**
 * Motion.dev type definitions and interfaces
 */

export type Framework = 'react' | 'js' | 'vue';

export interface DocumentationEndpoint {
  url: string;
  framework: Framework | 'general';
  category: DocumentationCategory;
  title: string;
  lastModified?: string;
}

export type DocumentationCategory = 
  | 'animation'
  | 'gestures'
  | 'layout-animations'
  | 'scroll-animations'
  | 'components'
  | 'api-reference'
  | 'guides'
  | 'examples'
  | 'best-practices';

export interface ParsedDocument {
  title: string;
  content: string;
  examples: CodeExample[];
  apiReference?: ApiReference;
  lastUpdated?: string;
  framework: Framework | 'general';
  category: DocumentationCategory;
}

export interface CodeExample {
  id: string;
  title: string;
  description?: string;
  code: string;
  framework: Framework;
  complexity: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  language: 'typescript' | 'javascript';
}

export interface ApiReference {
  component: string;
  description: string;
  props: PropDefinition[];
  methods?: MethodDefinition[];
  events?: EventDefinition[];
  examples: CodeExample[];
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

export interface MethodDefinition {
  name: string;
  parameters: PropDefinition[];
  returnType: string;
  description: string;
}

export interface EventDefinition {
  name: string;
  payload: string;
  description: string;
}

export interface ComponentConfig {
  framework: Framework;
  componentName: string;
  animations: Animation[];
  props: PropDefinition[];
  typescript: boolean;
  styling?: 'css' | 'styled-components' | 'emotion' | 'tailwind';
}

export interface Animation {
  type: AnimationType;
  properties: AnimationProperties;
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: AnimationTrigger;
}

export type AnimationType = 
  | 'fadeIn' | 'fadeOut'
  | 'slideIn' | 'slideOut'
  | 'scaleIn' | 'scaleOut'
  | 'rotate' | 'spin'
  | 'bounce' | 'pulse'
  | 'shake' | 'wobble'
  | 'flip' | 'zoom'
  | 'custom';

export interface AnimationProperties {
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit?: Record<string, any>;
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
  whileInView?: Record<string, any>;
}

export type AnimationTrigger = 
  | 'mount'
  | 'hover' 
  | 'click'
  | 'scroll'
  | 'inView'
  | 'custom';

export interface AnimationStep {
  element: string;
  animate: Record<string, any>;
  delay?: number;
  duration?: number;
  easing?: string;
}

export interface SequenceOptions {
  stagger?: number;
  repeat?: number | boolean;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeatDelay?: number;
}

export interface GeneratedComponent {
  code: string;
  imports: string[];
  dependencies: string[];
  framework: Framework;
  typescript: boolean;
  metadata: ComponentMetadata;
}

export interface ComponentMetadata {
  componentName: string;
  props: PropDefinition[];
  animations: Animation[];
  complexity: 'basic' | 'intermediate' | 'advanced';
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  bundleSize?: number;
  renderTime?: number;
  memoryUsage?: number;
  optimizations: string[];
  warnings: string[];
}

export interface CategorizedEndpoints {
  react: DocumentationEndpoint[];
  js: DocumentationEndpoint[];
  vue: DocumentationEndpoint[];
  general: DocumentationEndpoint[];
}

export interface SearchResult {
  endpoint: DocumentationEndpoint;
  document: ParsedDocument;
  relevanceScore: number;
  matchedContent: string;
}

export interface OptimizationSuggestion {
  type: 'performance' | 'accessibility' | 'bundle-size' | 'best-practice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  codeExample?: string;
  documentation?: string;
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  fix?: string;
}

export interface DocumentResponse {
  url: string;
  title: string;
  content: string;
  framework: Framework;
  category: DocumentationCategory;
  lastModified: string;
  cacheControl?: string;
  etag?: string;
}