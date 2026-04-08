import type {
  CheckboxComponent,
  ComponentDef,
  ContainerComponent,
  DatePickerComponent,
  FormAction,
  FormComponent,
  FormField,
  InputComponent,
  RadioComponent,
  SelectComponent,
  TextUIDSL
} from '../domain/dsl-types';
import { extractPrimaryMarkup, indentBlock } from './framework-exporter-markup';
import { renderPageComponentsToStaticHtml } from './react-static-export';

type FrameworkKind = 'svelte' | 'vue';
type BindingKind = 'string' | 'boolean' | 'string-array';

type BindingRecord = {
  variable: string;
  kind: BindingKind;
  initialValue: string | boolean | string[];
};

type BindingContext = {
  readonly framework: FrameworkKind;
  readonly records: BindingRecord[];
  readonly usedVariables: Set<string>;
};

const CONTAINER_LAYOUT_CLASS: Record<string, string> = {
  vertical: 'flex flex-col space-y-4',
  horizontal: 'flex space-x-4',
  flex: 'flex flex-wrap gap-4',
  grid: 'grid grid-cols-1 gap-4'
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: unknown): string {
  return escapeHtml(value);
}

function buildBooleanAttrs(attrs: Record<string, boolean | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function buildStringAttrs(attrs: Record<string, string | undefined>): string {
  const parts = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function sanitizeIdentifier(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  if (!normalized) {
    return 'field';
  }

  const [first, ...rest] = normalized.split(/\s+/);
  const head = first.replace(/^[^A-Za-z_]+/, '') || 'field';
  const tail = rest.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join('');
  return `${head}${tail}`;
}

function ensureBinding(
  context: BindingContext,
  preferredName: string,
  kind: BindingKind,
  initialValue: string | boolean | string[]
): string {
  const baseName = sanitizeIdentifier(preferredName);
  let candidate = baseName;
  let suffix = 2;

  while (context.usedVariables.has(candidate)) {
    candidate = `${baseName}${suffix}`;
    suffix += 1;
  }

  context.usedVariables.add(candidate);
  context.records.push({
    variable: candidate,
    kind,
    initialValue
  });
  return candidate;
}

function renderStaticComponentFragment(component: ComponentDef): string {
  return extractPrimaryMarkup(renderPageComponentsToStaticHtml([component]));
}

function renderButtonFragment(action: FormAction): string {
  return renderStaticComponentFragment(action as unknown as ComponentDef);
}

function renderComponent(component: ComponentDef, context: BindingContext): string {
  if ('Input' in component) {
    return renderInput(component.Input, context);
  }
  if ('Checkbox' in component) {
    return renderCheckbox(component.Checkbox, context);
  }
  if ('Radio' in component) {
    return renderRadio(component.Radio, context);
  }
  if ('Select' in component) {
    return renderSelect(component.Select, context);
  }
  if ('DatePicker' in component) {
    return renderDatePicker(component.DatePicker, context);
  }
  if ('Container' in component) {
    return renderContainer(component.Container, context);
  }
  if ('Form' in component) {
    return renderForm(component.Form, context);
  }

  return renderStaticComponentFragment(component);
}

function renderField(field: FormField, context: BindingContext): string {
  if ('Input' in field) {
    return renderInput(field.Input!, context);
  }
  if ('Checkbox' in field) {
    return renderCheckbox(field.Checkbox!, context);
  }
  if ('Radio' in field) {
    return renderRadio(field.Radio!, context);
  }
  if ('Select' in field) {
    return renderSelect(field.Select!, context);
  }
  if ('DatePicker' in field) {
    return renderDatePicker(field.DatePicker!, context);
  }

  return renderStaticComponentFragment(field as unknown as ComponentDef);
}

function renderBindingAttribute(context: BindingContext, bindingTarget: 'value' | 'checked' | 'group', variable: string): string {
  if (context.framework === 'svelte') {
    if (bindingTarget === 'group') {
      return ` bind:group={${variable}}`;
    }
    return ` bind:${bindingTarget}={${variable}}`;
  }

  return ` v-model="${variable}"`;
}

function renderInput(props: InputComponent, context: BindingContext): string {
  const { label, name, type = 'text', placeholder, required = false, disabled = false, multiline = false } = props;
  const variable = ensureBinding(context, name || label || 'input', 'string', '');
  const sharedAttrs = `${buildStringAttrs({ name, placeholder: multiline ? undefined : placeholder })}${buildBooleanAttrs({ required, disabled })}`;
  const bindingAttr = renderBindingAttribute(context, 'value', variable);
  const inputClass = `textui-input w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim();
  const fieldContent = multiline
    ? `      <textarea class="${escapeAttribute(inputClass)}"${buildStringAttrs({ name, placeholder })}${buildBooleanAttrs({ required, disabled })}${bindingAttr}></textarea>`
    : `      <input type="${escapeAttribute(type)}" class="${escapeAttribute(inputClass)}"${sharedAttrs}${bindingAttr}>`;

  return buildLabeledBlock(
    label,
    fieldContent,
    '    <div class="mb-4">',
    '    </div>',
    safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2 textui-text">${safeLabel}</label>`
  );
}

function renderCheckbox(props: CheckboxComponent, context: BindingContext): string {
  const { label, name, disabled = false } = props;
  const variable = ensureBinding(context, name || label || 'checkbox', 'boolean', Boolean(props.checked));
  const bindingAttr = renderBindingAttribute(context, 'checked', variable);
  return [
    '    <div class="flex items-center mb-4">',
    `      <input type="checkbox" class="textui-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}"${buildStringAttrs({ name })}${buildBooleanAttrs({ disabled })}${bindingAttr}>`,
    label ? `      <label class="ml-2 block text-sm text-gray-400 textui-text">${escapeHtml(label)}</label>` : '',
    '    </div>'
  ].filter(Boolean).join('\n');
}

function renderRadio(props: RadioComponent, context: BindingContext): string {
  const { label, name, options = [], value, checked = false, disabled = false } = props;
  const selectedValue = options.find(option => option.checked)?.value ?? (checked ? value || '' : '');
  const variable = ensureBinding(context, name || label || 'radio', 'string', selectedValue);
  const safeGroupName = name || 'radio';
  const optionEntries = options.length > 0
    ? options
    : [{ label: label || safeGroupName, value: value || '' }];
  const optionRows = optionEntries.map(option => [
    '      <div class="textui-radio-option flex items-center mb-2">',
    `        <input type="radio" name="${escapeAttribute(safeGroupName)}" value="${escapeAttribute(option.value)}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}"${buildBooleanAttrs({ disabled })}${renderBindingAttribute(context, 'group', variable)}>`,
    `        <label class="ml-2 block text-sm text-gray-400 textui-text">${escapeHtml(option.label)}</label>`,
    '      </div>'
  ].join('\n')).join('\n');

  return buildLabeledBlock(
    label,
    optionRows,
    '    <div class="textui-radio-group mb-4">',
    '    </div>',
    safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2 textui-text">${safeLabel}</label>`
  );
}

function renderSelect(props: SelectComponent, context: BindingContext): string {
  const { label, name, options = [], placeholder, disabled = false, multiple = false } = props;
  const initialValue = multiple
    ? options.filter(option => option.selected).map(option => option.value)
    : options.find(option => option.selected)?.value ?? '';
  const variable = ensureBinding(context, name || label || 'select', multiple ? 'string-array' : 'string', initialValue);
  const optionLines: string[] = [];

  if (placeholder && !multiple) {
    optionLines.push(`        <option value="">${escapeHtml(placeholder)}</option>`);
  }

  options.forEach(option => {
    optionLines.push(`        <option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`);
  });

  const selectClass = multiple ? `min-h-32 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`.trim() : (disabled ? 'opacity-50 cursor-not-allowed' : '');
  const selectHtml = [
    `      <select class="${escapeAttribute(selectClass)}"${buildStringAttrs({ name })}${buildBooleanAttrs({ disabled, multiple })}${renderBindingAttribute(context, 'value', variable)}>`,
    optionLines.join('\n'),
    '      </select>'
  ].filter(Boolean).join('\n');

  return buildLabeledBlock(
    label,
    selectHtml,
    '    <div class="textui-select">',
    '    </div>',
    safeLabel => `      <label class="textui-text block text-sm font-medium mb-2">${safeLabel}</label>`
  );
}

function renderDatePicker(props: DatePickerComponent, context: BindingContext): string {
  const { label, name = 'date', required = false, disabled = false, min, max, value } = props;
  const variable = ensureBinding(context, name || label || 'date', 'string', value || '');
  const bindingAttr = renderBindingAttribute(context, 'value', variable);
  const inputHtml = `      <input id="${escapeAttribute(name)}" name="${escapeAttribute(name)}" type="date" class="textui-input w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}"${buildStringAttrs({ min, max })}${buildBooleanAttrs({ required, disabled })}${bindingAttr}>`;

  return buildLabeledBlock(
    label,
    inputHtml,
    '    <div class="textui-datepicker mb-4">',
    '    </div>',
    safeLabel => `      <label for="${escapeAttribute(name)}" class="block text-sm font-medium text-gray-400 mb-2 textui-text">${safeLabel}</label>`
  );
}

function renderContainer(props: ContainerComponent, context: BindingContext): string {
  const layoutClass = CONTAINER_LAYOUT_CLASS[props.layout || 'vertical'] || CONTAINER_LAYOUT_CLASS.vertical;
  const children = (props.components || []).map(component => renderComponent(component, context)).join('\n');
  return `    <div class="${layoutClass}">\n${children}\n    </div>`;
}

function renderForm(props: FormComponent, context: BindingContext): string {
  const fields = (props.fields || []).map(field => renderField(field, context)).filter(Boolean).join('\n');
  const actions = (props.actions || []).map(action => renderButtonFragment(action)).filter(Boolean).join('\n');
  return [
    `    <form id="${escapeAttribute(props.id || 'textui-form')}" class="space-y-4">`,
    fields,
    '      <div class="flex space-x-4">',
    actions ? indentBlock(actions, 8) : '',
    '      </div>',
    '    </form>'
  ].filter(Boolean).join('\n');
}

function buildLabeledBlock(
  label: string | undefined,
  content: string,
  wrapperStart: string,
  wrapperEnd: string,
  buildLabel: (safeLabel: string) => string
): string {
  const lines = [wrapperStart];
  if (label) {
    lines.push(buildLabel(escapeHtml(label)));
  }
  lines.push(content);
  lines.push(wrapperEnd);
  return lines.join('\n');
}

function renderInitialValue(value: string | boolean | string[]): string {
  return JSON.stringify(value);
}

export function buildFrameworkReactiveMarkup(dsl: TextUIDSL, framework: FrameworkKind): { markup: string; bindings: BindingRecord[] } {
  const context: BindingContext = {
    framework,
    records: [],
    usedVariables: new Set<string>()
  };
  const body = (dsl.page?.components || []).map(component => renderComponent(component, context)).join('\n');
  return {
    markup: `<main class="textui-generated">\n${body ? `${body}\n` : ''}</main>`,
    bindings: context.records
  };
}

export function buildSvelteBindingDeclarations(bindings: BindingRecord[]): string {
  if (bindings.length === 0) {
    return '';
  }

  return bindings.map(binding => `  let ${binding.variable} = ${renderInitialValue(binding.initialValue)};`).join('\n');
}

export function buildVueBindingDeclarations(bindings: BindingRecord[]): string {
  if (bindings.length === 0) {
    return '';
  }

  const lines = [`import { ref } from 'vue';`, ''];
  bindings.forEach(binding => {
    lines.push(`const ${binding.variable} = ref(${renderInitialValue(binding.initialValue)});`);
  });
  return lines.join('\n');
}
