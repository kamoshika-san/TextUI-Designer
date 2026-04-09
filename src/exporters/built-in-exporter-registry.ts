import { ReactExporter } from './react-exporter';
import { PugExporter } from './pug-exporter';
import { HtmlExporter } from './html-exporter';
import { FlowReactExporter } from './flow-react-exporter';
import type { Exporter } from './export-types';

/** 組み込みフォーマットを Map に登録する（ctor で 1 回）。 */
export function populateBuiltInExporters(target: Map<string, Exporter>): void {
  target.set('react', new ReactExporter());
  target.set('react-flow', new FlowReactExporter());
  target.set('pug', new PugExporter());
  target.set('html', new HtmlExporter());
}
