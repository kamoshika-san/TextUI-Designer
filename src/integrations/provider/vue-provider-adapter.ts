/**
 * VueProviderAdapter — 既存 VueExporter を TextUIProvider でラップするアダプター
 */

import { VueExporter } from '../../exporters/vue-exporter';
import type { TextUIProvider, ProviderCapability, ProviderInput, ExportArtifact } from './text-ui-provider';

export class VueProviderAdapter implements TextUIProvider {
  readonly name = 'vue';
  readonly capabilities: ProviderCapability[] = ['vue-component'];

  private readonly exporter = new VueExporter();

  async export(input: ProviderInput): Promise<ExportArtifact> {
    const content = await this.exporter.export(input.dsl, {
      format: 'vue',
      themePath: input.options.themePath,
      outputPath: input.options.outputPath,
      sourcePath: input.options.sourcePath,
      extensionPath: input.options.extensionPath,
    });

    return {
      content,
      mimeType: 'text/javascript',
      fileName: 'index.vue',
    };
  }
}
