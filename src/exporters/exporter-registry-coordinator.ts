import { populateBuiltInExporters } from './built-in-exporter-registry';
import type { Exporter } from './export-types';

/**
 * Exporter registry の登録・解決を調停する。
 */
export class ExporterRegistryCoordinator {
  private readonly exporters = new Map<string, Exporter>();

  constructor() {
    populateBuiltInExporters(this.exporters);
  }

  register(format: string, exporter: Exporter): void {
    this.exporters.set(format, exporter);
  }

  unregister(format: string): boolean {
    return this.exporters.delete(format);
  }

  resolve(format: string): Exporter | undefined {
    return this.exporters.get(format);
  }

  resolveOrThrow(format: string): Exporter {
    const exporter = this.resolve(format);
    if (!exporter) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    return exporter;
  }

  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  getFileExtension(format: string): string {
    const exporter = this.resolve(format);
    return exporter ? exporter.getFileExtension() : '';
  }

  getPipelineExporters(): Map<string, Exporter> {
    return this.exporters;
  }
}
