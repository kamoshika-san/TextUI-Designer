import type { TextUIDSL } from '../renderer/types';
import { HtmlExporter } from '../exporters/html-exporter';
import { ReactExporter } from '../exporters/react-exporter';
import { PugExporter } from '../exporters/pug-exporter';

export type CliProvider = 'html' | 'react' | 'pug';

export function getProviderExtension(provider: CliProvider): string {
  switch (provider) {
    case 'html':
      return '.html';
    case 'react':
      return '.tsx';
    case 'pug':
      return '.pug';
    default:
      return '.txt';
  }
}

export async function runExport(dsl: TextUIDSL, provider: CliProvider): Promise<string> {
  switch (provider) {
    case 'html':
      return new HtmlExporter().export(dsl, { format: 'html' });
    case 'react':
      return new ReactExporter().export(dsl, { format: 'react' });
    case 'pug':
      return new PugExporter().export(dsl, { format: 'pug' });
  }
}
