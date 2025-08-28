/**
 * Vue-specific Motion.dev templates
 * Pre-built Vue components with Motion animations
 */

// Framework import removed as unused

export interface VueTemplate {
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

export class VueTemplateManager {
  private templates: Map<string, VueTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  getTemplate(id: string): VueTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): VueTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: VueTemplate['category']): VueTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  private initializeTemplates(): void {
    // Fade In Card Template
    this.addTemplate({
      id: 'vue-fade-card',
      name: 'Vue Fade In Card',
      description: 'Vue card component with fade-in animation',
      category: 'component',
      complexity: 'basic',
      code: `<template>
  <div 
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: delay, duration: 300 } }"
    class="card"
  >
    <h3>{{ title }}</h3>
    <p>{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  content: string;
  delay?: number;
}

withDefaults(defineProps<Props>(), {
  delay: 0
});
</script>

<style scoped>
.card {
  padding: 1rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>`,
      props: [
        { name: 'title', type: 'string', required: true, description: 'Card title' },
        { name: 'content', type: 'string', required: true, description: 'Card content' },
        { name: 'delay', type: 'number', required: false, description: 'Animation delay in milliseconds' }
      ],
      dependencies: ['@vueuse/motion'],
      examples: ['<FadeCard title="Hello" content="World" />', '<FadeCard title="Hello" content="World" :delay="200" />']
    });

    // Hover Button Template
    this.addTemplate({
      id: 'vue-hover-button',
      name: 'Vue Hover Button',
      description: 'Interactive Vue button with hover animations',
      category: 'interaction',
      complexity: 'basic',
      code: `<template>
  <button
    v-motion
    :initial="{ scale: 1 }"
    :hovered="{ scale: 1.05, y: -2 }"
    :tapped="{ scale: 0.95 }"
    :class="[\`btn btn-\${variant}\`]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary';
}

withDefaults(defineProps<Props>(), {
  variant: 'primary'
});

defineEmits<{
  click: [];
}>();
</script>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}
</style>`,
      props: [
        { name: 'variant', type: "'primary' | 'secondary'", required: false, description: 'Button style variant' }
      ],
      dependencies: ['@vueuse/motion'],
      examples: ['<HoverButton>Click me</HoverButton>', '<HoverButton variant="secondary" @click="handleClick">Submit</HoverButton>']
    });
  }

  private addTemplate(template: VueTemplate): void {
    this.templates.set(template.id, template);
  }
}

export const vueTemplateManager = new VueTemplateManager();