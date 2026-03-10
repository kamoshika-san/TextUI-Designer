import * as YAML from 'yaml';
import type { TextUIDSL } from '../../renderer/types';
import { buildFieldDescriptors } from './field-mapper';
import type { FieldDescriptor, OpenApiDocument, OpenApiImportResult, ResolvedOperation } from './types';
import { sanitizeId } from './utils';

function buildFormFieldComponent(field: FieldDescriptor): Record<string, unknown> {
  if (field.kind === 'Checkbox') {
    return {
      Checkbox: {
        label: field.label,
        name: field.name,
        required: field.required
      }
    };
  }

  if (field.kind === 'Select') {
    return {
      Select: {
        label: field.label,
        name: field.name,
        options: field.options ?? [],
        multiple: Boolean(field.multiple)
      }
    };
  }

  if (field.kind === 'DatePicker') {
    return {
      DatePicker: {
        label: field.label,
        name: field.name,
        required: field.required
      }
    };
  }

  return {
    Input: {
      label: field.label,
      name: field.name,
      type: field.inputType ?? 'text',
      required: field.required
    }
  };
}

function buildDsl(operation: ResolvedOperation, fields: FieldDescriptor[]): TextUIDSL {
  if (fields.length === 0) {
    throw new Error(`operation has no importable fields: ${operation.operationId}`);
  }

  const pageId = sanitizeId(operation.operationId);
  const title = operation.operation.summary ?? operation.operationId;

  return {
    page: {
      id: pageId,
      title,
      layout: 'vertical',
      components: [
        {
          Text: {
            variant: 'h1',
            value: title
          }
        },
        {
          Form: {
            id: `${pageId}-form`,
            fields: fields.map(buildFormFieldComponent),
            actions: [
              {
                Button: {
                  kind: 'submit',
                  label: '送信',
                  submit: true
                }
              }
            ]
          }
        }
      ]
    }
  };
}

function toSourceOperation(operation: ResolvedOperation): string {
  return `${operation.method.toUpperCase()} ${operation.path}`;
}

export function createImportResult(operation: ResolvedOperation, document: OpenApiDocument): OpenApiImportResult | null {
  const fields = buildFieldDescriptors(operation, document);
  if (fields.length === 0) {
    return null;
  }

  const dsl = buildDsl(operation, fields);
  const yaml = YAML.stringify(dsl, { lineWidth: 0 });

  return {
    dsl,
    yaml,
    operationId: operation.operationId,
    sourceOperation: toSourceOperation(operation),
    fields: fields.length
  };
}
