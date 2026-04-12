/**
 * HtmlProviderAdapter — 既存 HtmlExporter を TextUIProvider でラップするアダプター
 *
 * 既存コードへの変更なし。アダプターパターンで TextUIProvider 契約に適合させる。
 */

import { HtmlExporter } from '../../exporters/html-exporter';
import type { TextUIProvider, ProviderCapability, ProviderInput, ExportArtifact } from './text-ui-provider';

export class HtmlProviderAdapter implements TextUIProvider {
  readonly name = 'html';
  readonly capabilities: ProviderCapability[] = ['html-static'];

  private readonly exporter = new HtmlExporter();

  async export(input: ProviderInput): Promise<ExportArtifact> {
    const content = await this.exporter.export(input.dsl, {
      format: 'html',
      themePath: input.options.themePath,
      outputPath: input.options.outputPath,
      sourcePath: input.options.sourcePath,
      extensionPath: input.options.extensionPath,
    });

    return {
      content,
      mimeType: 'text/html',
      fileName: 'index.html',
    };
  }
}
