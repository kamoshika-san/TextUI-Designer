import { AttributeSerializer } from '../exporter-ast';

export type ExporterAttributeValue = string | boolean | undefined;

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttribute(value: unknown): string {
  return escapeHtml(value);
}

export function buildAttrs(attrs: Record<string, ExporterAttributeValue>): string {
  return new AttributeSerializer(value => escapeAttribute(value)).serialize(attrs);
}

