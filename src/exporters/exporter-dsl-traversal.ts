import type {
  ButtonComponent,
  ComponentDef,
  FormAction,
  FormField,
  TextComponent,
  TextUIDSL
} from '../domain/dsl-types';
import type { ExporterRendererMethod } from '../components/definitions/types';
import { componentDescriptorRegistry } from '../registry/component-descriptor-registry';
import { decodeDslComponentUnion } from '../registry/dsl-component-codec';

export type ComponentHandler = (props: unknown, key: number) => string;

export interface ComponentTraversalRenderer {
  renderText(props: TextComponent, key: number): string;
  renderButton(props: ButtonComponent, key: number): string;
  renderUnsupportedComponent(component: ComponentDef, key: number): string;
}

export function createExporterComponentHandlers(
  dispatchExporterRenderer: (method: ExporterRendererMethod, props: unknown, key: number) => string
): Map<string, ComponentHandler> {
  const handlers = new Map<string, ComponentHandler>();
  for (const def of componentDescriptorRegistry.list()) {
    const method = componentDescriptorRegistry.getExporterHandlerKey(def.name);
    if (!method) {
      continue;
    }
    handlers.set(def.name, (props, key) => dispatchExporterRenderer(method, props, key));
  }
  return handlers;
}

export function renderTraversedComponent(
  component: ComponentDef,
  key: number,
  renderer: ComponentTraversalRenderer,
  componentHandlers: ReadonlyMap<string, ComponentHandler>
): string {
  const union = decodeDslComponentUnion(component);
  if (!union.value) {
    return renderer.renderUnsupportedComponent(component, key);
  }
  const { kind, props } = union.value;
  if (kind === 'Text') {
    return renderer.renderText((props as TextComponent), key);
  }
  if (kind === 'Button') {
    return renderer.renderButton((props as ButtonComponent), key);
  }
  const handler = componentHandlers.get(kind);
  if (handler) {
    return handler(props, key);
  }
  return renderer.renderUnsupportedComponent(component, key);
}

export function renderTraversedFormField(
  field: FormField,
  index: number,
  renderer: ComponentTraversalRenderer,
  componentHandlers: ReadonlyMap<string, ComponentHandler>
): string {
  const union = decodeDslComponentUnion(field);
  if (!union.value) {
    return '';
  }
  const { kind, props } = union.value;
  if (kind === 'Text') {
    return renderer.renderText((props as TextComponent), index);
  }
  if (kind === 'Button') {
    return renderer.renderButton((props as ButtonComponent), index);
  }
  const handler = componentHandlers.get(kind);
  return handler ? handler(props, index) : '';
}

export function renderTraversedFormAction(
  action: FormAction,
  index: number,
  renderer: ComponentTraversalRenderer,
  componentHandlers: ReadonlyMap<string, ComponentHandler>
): string {
  return renderTraversedFormField(action as unknown as FormField, index, renderer, componentHandlers);
}

export function renderTraversedPageComponents(
  dsl: TextUIDSL,
  renderComponent: (component: ComponentDef, key: number) => string,
  separator: string = '\n'
): string {
  const components = dsl.page?.components || [];
  return components.map((component, index) => renderComponent(component, index)).join(separator);
}

export function renderTraversedChildren(
  children: ComponentDef[],
  renderComponent: (component: ComponentDef, key: number) => string,
  adjustIndentation: (source: string, baseIndent: string) => string,
  baseIndent: string = '  '
): string {
  return children.map((child, index) => {
    const childCode = renderComponent(child, index);
    return adjustIndentation(childCode, baseIndent);
  }).join('\n');
}
