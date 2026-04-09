import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';

export interface CliRenderOptions {
  providerModulePath?: string;
  themePath?: string;
}

export interface CliProviderDefinition {
  name: string;
  extension: string;
  version: string;
  render: (dsl: TextUIDSL | NavigationFlowDSL, options?: CliRenderOptions) => Promise<string>;
}

const BUILTIN_PROVIDERS: CliProviderDefinition[] = [
  {
    name: 'html',
    extension: '.html',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL, options?: CliRenderOptions) => {
      const { HtmlExporter } = await import('../exporters/html-exporter');
      return new HtmlExporter().export(dsl as TextUIDSL, {
        format: 'html',
        themePath: options?.themePath,
        // Default CLI HTML export stays on the Primary path.
        useReactRender: true
      });
    }
  },
  {
    name: 'react',
    extension: '.tsx',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL) => {
      const { ReactExporter } = await import('../exporters/react-exporter');
      return new ReactExporter().export(dsl as TextUIDSL, { format: 'react' });
    }
  },
  {
    name: 'react-flow',
    extension: '.tsx',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL) => {
      const { FlowReactExporter } = await import('../exporters/flow-react-exporter');
      return new FlowReactExporter().export(dsl as NavigationFlowDSL, { format: 'react-flow' });
    }
  },
  {
    name: 'pug',
    extension: '.pug',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL) => {
      const { PugExporter } = await import('../exporters/pug-exporter');
      return new PugExporter().export(dsl as TextUIDSL, { format: 'pug' });
    }
  },
  {
    name: 'svelte',
    extension: '.svelte',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL) => {
      const { SvelteExporter } = await import('../exporters/svelte-exporter');
      return new SvelteExporter().export(dsl as TextUIDSL, { format: 'svelte' });
    }
  },
  {
    name: 'vue',
    extension: '.vue',
    version: '1.0.0',
    render: async (dsl: TextUIDSL | NavigationFlowDSL) => {
      const { VueExporter } = await import('../exporters/vue-exporter');
      return new VueExporter().export(dsl as TextUIDSL, { format: 'vue' });
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
