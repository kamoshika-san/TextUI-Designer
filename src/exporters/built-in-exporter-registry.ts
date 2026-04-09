import { ReactExporter } from './react-exporter';
import { PugExporter } from './pug-exporter';
import { HtmlExporter } from './html-exporter';
import { FlowReactExporter } from './flow-react-exporter';
import { FlowVueExporter } from './flow-vue-exporter';
import { FlowSvelteExporter } from './flow-svelte-exporter';
import { FlowHtmlExporter } from './flow-html-exporter';
import type { Exporter } from './export-types';

/** 組み込みフォーマットを Map に登録する（ctor で 1 回）。 */
export function populateBuiltInExporters(target: Map<string, Exporter>): void {
  target.set('react', new ReactExporter());
  target.set('react-flow', new FlowReactExporter());
  target.set('vue-flow', new FlowVueExporter());
  target.set('svelte-flow', new FlowSvelteExporter());
  target.set('html-flow', new FlowHtmlExporter());
  target.set('pug', new PugExporter());
  target.set('html', new HtmlExporter());
}
