import * as fs from 'fs';
import * as YAML from 'yaml';
import { ReactExporter } from './react-exporter';
import { PugExporter } from './pug-exporter';
import { HtmlExporter } from './html-exporter';
import type { TextUIDSL } from '../renderer/types';

export interface ExportOptions {
  format: 'react' | 'pug' | 'html';
  outputPath?: string;
  fileName?: string;
}

export interface Exporter {
  export(dsl: TextUIDSL, options: ExportOptions): Promise<string>;
  getFileExtension(): string;
}

export class ExportManager {
  private exporters: Map<string, Exporter> = new Map();

  constructor() {
    this.exporters.set('react', new ReactExporter());
    this.exporters.set('pug', new PugExporter());
    this.exporters.set('html', new HtmlExporter());
  }

  async exportFromFile(filePath: string, options: ExportOptions): Promise<string> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dsl = YAML.parse(content) as TextUIDSL;
      
      const exporter = this.exporters.get(options.format);
      if (!exporter) {
        throw new Error(`Unsupported export format: ${options.format}`);
      }

      return await exporter.export(dsl, options);
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getSupportedFormats(): string[] {
    return Array.from(this.exporters.keys());
  }

  getFileExtension(format: string): string {
    const exporter = this.exporters.get(format);
    return exporter ? exporter.getFileExtension() : '';
  }
} 