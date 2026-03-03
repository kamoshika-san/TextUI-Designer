import type { TextUIDSL } from '../renderer/types';
import { HtmlExporter } from '../exporters/html-exporter';
import { ReactExporter } from '../exporters/react-exporter';
import { PugExporter } from '../exporters/pug-exporter';

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
    render: (dsl: TextUIDSL) => new HtmlExporter().export(dsl, { format: 'html' })
  },
  {
    name: 'react',
    extension: '.tsx',
    version: '1.0.0',
    render: (dsl: TextUIDSL) => new ReactExporter().export(dsl, { format: 'react' })
  },
  {
    name: 'pug',
    extension: '.pug',
    version: '1.0.0',
    render: (dsl: TextUIDSL) => new PugExporter().export(dsl, { format: 'pug' })
  }
];

const providerRegistry = new Map(BUILTIN_PROVIDERS.map(provider => [provider.name, provider]));

export function listProviders(): CliProviderDefinition[] {
  return Array.from(providerRegistry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProvider(name: string): CliProviderDefinition | null {
  return providerRegistry.get(name) ?? null;
}
