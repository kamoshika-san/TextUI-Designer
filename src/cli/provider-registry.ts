import type { TextUIDSL } from '../renderer/types';

export interface CliProviderDefinition {
  name: string;
  extension: string;
  version: string;
  render: (dsl: TextUIDSL) => Promise<string>;
}

const BUILTIN_PROVIDERS: CliProviderDefinition[] = [
  {
    name: 'html',
    extension: '.html',
    version: '1.0.0',
    render: async (dsl: TextUIDSL) => {
      const { HtmlExporter } = await import('../exporters/html-exporter');
      return new HtmlExporter().export(dsl, { format: 'html' });
    }
  },
  {
    name: 'react',
    extension: '.tsx',
    version: '1.0.0',
    render: async (dsl: TextUIDSL) => {
      const { ReactExporter } = await import('../exporters/react-exporter');
      return new ReactExporter().export(dsl, { format: 'react' });
    }
  },
  {
    name: 'pug',
    extension: '.pug',
    version: '1.0.0',
    render: async (dsl: TextUIDSL) => {
      const { PugExporter } = await import('../exporters/pug-exporter');
      return new PugExporter().export(dsl, { format: 'pug' });
    }
  },
  {
    name: 'svelte',
    extension: '.svelte',
    version: '1.0.0',
    render: async (dsl: TextUIDSL) => {
      const { SvelteExporter } = await import('../exporters/svelte-exporter');
      return new SvelteExporter().export(dsl, { format: 'svelte' });
    }
  },
  {
    name: 'vue',
    extension: '.vue',
    version: '1.0.0',
    render: async (dsl: TextUIDSL) => {
      const { VueExporter } = await import('../exporters/vue-exporter');
      return new VueExporter().export(dsl, { format: 'vue' });
    }
  }
];

const providerRegistry = new Map(BUILTIN_PROVIDERS.map(provider => [provider.name, provider]));

export function listProviders(): CliProviderDefinition[] {
  return Array.from(providerRegistry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProvider(name: string): CliProviderDefinition | null {
  return providerRegistry.get(name) ?? null;
}
