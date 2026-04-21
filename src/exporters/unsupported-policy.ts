import type { ComponentDef } from '../domain/dsl-types';
import { decodeDslComponent } from '../registry/dsl-component-codec';
import type { ExportFormat } from '../utils/style-manager';

export const EXPORTER_CAPABILITY_SUPPORT_STATES = ['native', 'static', 'unsupported'] as const;

export type ExporterCapabilitySupportState = typeof EXPORTER_CAPABILITY_SUPPORT_STATES[number];

export type UnsupportedExporterPolicy = {
  readonly support: 'unsupported';
  readonly format: ExportFormat;
  readonly componentName: string;
  readonly emission: 'placeholder-comment';
  readonly reason: 'missing-renderer-capability';
};

export function getUnsupportedComponentName(component: ComponentDef): string {
  return decodeDslComponent(component).value?.name || 'unknown';
}

export function createUnsupportedExporterPolicy(
  format: ExportFormat,
  componentName: string
): UnsupportedExporterPolicy {
  return {
    support: 'unsupported',
    format,
    componentName,
    emission: 'placeholder-comment',
    reason: 'missing-renderer-capability'
  };
}

export function renderUnsupportedExporterPolicy(policy: UnsupportedExporterPolicy): string {
  const componentName = escapeUnsupportedLabel(policy.componentName);
  const marker = `未対応コンポーネント: ${componentName} (capability: ${policy.support})`;

  switch (policy.format) {
    case 'react':
      return `      {/* ${marker} */}`;
    case 'pug':
      return `      //- ${marker}`;
    case 'html':
    default:
      return `    <!-- ${marker} -->`;
  }
}

export function renderUnsupportedComponent(
  format: ExportFormat,
  component: ComponentDef
): string {
  const componentName = getUnsupportedComponentName(component);
  return renderUnsupportedExporterPolicy(createUnsupportedExporterPolicy(format, componentName));
}

function escapeUnsupportedLabel(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/--/g, '- -')
    .replace(/\*\//g, '* /');
}
