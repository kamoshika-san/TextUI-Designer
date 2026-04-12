/**
 * ReactProviderAdapter — 既存 ReactExporter を TextUIProvider でラップするアダプター
 */

import { ReactExporter } from '../../exporters/react-exporter';
import type { TextUIProvider, ProviderCapability, ProviderInput, ExportArtifact } from './text-ui-provider';

export class ReactProviderAdapter implements TextUIProvider {
  readonly name = 'react';
  readonly capabilities: ProviderCapability[] = ['react-component'];

  private readonly exporter = new ReactExporter();

  async export(input: ProviderInput): Promise<ExportArtifact> {
    const content = await this.exporter.export(input.dsl, {
      format: 'react',
      themePath: input.options.themePath,
      outputPath: input.options.outputPath,
      sourcePath: input.options.sourcePath,
      extensionPath: input.options.extensionPath,
    });

    return {
      content,
      mimeType: 'text/javascript',
      fileName: 'index.jsx',
    };
  }
}
