/**
 * SvelteProviderAdapter — 既存 SvelteExporter を TextUIProvider でラップするアダプター
 */

import { SvelteExporter } from '../../exporters/svelte-exporter';
import type { TextUIProvider, ProviderCapability, ProviderInput, ExportArtifact } from './text-ui-provider';

export class SvelteProviderAdapter implements TextUIProvider {
  readonly name = 'svelte';
  readonly capabilities: ProviderCapability[] = ['svelte-component'];

  private readonly exporter = new SvelteExporter();

  async export(input: ProviderInput): Promise<ExportArtifact> {
    const content = await this.exporter.export(input.dsl, {
      format: 'svelte',
      themePath: input.options.themePath,
      outputPath: input.options.outputPath,
      sourcePath: input.options.sourcePath,
      extensionPath: input.options.extensionPath,
    });

    return {
      content,
      mimeType: 'text/javascript',
      fileName: 'index.svelte',
    };
  }
}
