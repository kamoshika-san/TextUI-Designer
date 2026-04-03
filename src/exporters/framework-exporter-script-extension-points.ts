type FrameworkScriptKind = 'svelte' | 'vue';

type FrameworkScriptMetadata = {
  header: string;
  props: string;
  derived: string;
  events: string;
};

const FRAMEWORK_SCRIPT_METADATA: Record<FrameworkScriptKind, FrameworkScriptMetadata> = {
  svelte: {
    header: 'Svelte extension points reserve space for future component API wiring.',
    props: 'Future props should land here as `export let` declarations.',
    derived: 'Future derived state should stay in the script block as reactive declarations/helpers.',
    events: 'Future events should stay dispatcher-based so the static markup contract remains intact.'
  },
  vue: {
    header: 'Vue extension points reserve space for future component API wiring.',
    props: 'Future props should land here through `defineProps`.',
    derived: 'Future derived state should stay in the script setup block via refs/computed helpers.',
    events: 'Future events should land here through `defineEmits` without changing template structure by default.'
  }
};

export function buildScriptExtensionPointComments(kind: FrameworkScriptKind): string {
  const metadata = FRAMEWORK_SCRIPT_METADATA[kind];

  return [
    '// Reserved extension points for future framework-aware generation.',
    `// ${metadata.header}`,
    `// Props: ${metadata.props}`,
    `// Derived state: ${metadata.derived}`,
    `// Events: ${metadata.events}`
  ].join('\n');
}
