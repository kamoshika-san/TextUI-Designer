import type {
  InputComponent,
  ButtonComponent,
  CheckboxComponent,
  RadioComponent,
  SelectComponent,
  DatePickerComponent,
  SelectOption
} from '../../domain/dsl-types';
import { StyleManager } from '../../utils/style-manager';
import type { ExportFormat } from '../../utils/style-manager';

export type LabeledFieldBlockFn = (
  label: string | undefined,
  fieldContent: string,
  wrapperStart: string,
  wrapperEnd: string,
  buildLabelLine: (safeLabel: string) => string
) => string;

export type ControlRowWithLabelFn = (
  label: string | undefined,
  controlContent: string,
  rowStart: string,
  rowEnd: string,
  buildLabelLine: (safeLabel: string) => string
) => string;

export function renderPugInput(
  props: InputComponent,
  ctx: {
    disabledClass: string;
    tokenStyle: string;
    inputAttrs: string;
    buildLabeledFieldBlock: LabeledFieldBlockFn;
  }
): string {
  const { label, placeholder, type = 'text' } = props;
  const { disabledClass, tokenStyle, inputAttrs, buildLabeledFieldBlock } = ctx;

  const inputCode = `        input(type="${type}" placeholder="${placeholder || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${inputAttrs}${tokenStyle})`;

  return buildLabeledFieldBlock(
    label,
    inputCode,
    '      .mb-4',
    '',
    safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2 ${safeLabel}`
  );
}

export function renderPugButton(
  props: ButtonComponent,
  styleManager: typeof StyleManager,
  format: ExportFormat,
  ctx: {
    disabledClass: string;
    disabledAttr: string;
    tokenStyle: string;
    escapeHtml: (v: unknown) => string;
  }
): string {
  const { label, icon, iconPosition = 'left', kind = 'primary', size = 'md' } = props;
  const { disabledClass, disabledAttr, tokenStyle, escapeHtml } = ctx;
  const variantClasses = styleManager.getKindClasses(format);
  const sizeClasses = {
    'sm': 'px-3 py-1.5 text-sm',
    'md': 'px-4 py-2 text-base',
    'lg': 'px-6 py-3 text-lg'
  };

  const content = [
    icon && iconPosition === 'left' ? escapeHtml(icon) : '',
    label ? escapeHtml(label) : '',
    icon && iconPosition === 'right' ? escapeHtml(icon) : ''
  ].filter(Boolean).join(' ');
  return `      button(class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[kind as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" ${disabledAttr}${tokenStyle}) ${content}`;
}

export function renderPugCheckbox(
  props: CheckboxComponent,
  ctx: {
    disabledClass: string;
    tokenStyle: string;
    checkboxAttrs: string;
    buildControlRowWithLabel: ControlRowWithLabelFn;
  }
): string {
  const { label } = props;
  const { disabledClass, tokenStyle, checkboxAttrs, buildControlRowWithLabel } = ctx;
  const checkboxInput = `        input(type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}"${checkboxAttrs}${tokenStyle})`;

  return buildControlRowWithLabel(
    label,
    checkboxInput,
    '      .flex.items-center.mb-4',
    '',
    safeLabel => `        label.ml-2.block.text-sm.text-gray-900 ${safeLabel}`
  );
}

export function renderPugRadio(
  props: RadioComponent,
  ctx: {
    disabledClass: string;
    tokenStyle: string;
    radioAttrs: string;
    buildControlRowWithLabel: ControlRowWithLabelFn;
  }
): string {
  const { label, value, name } = props;
  const { disabledClass, tokenStyle, radioAttrs, buildControlRowWithLabel } = ctx;
  const radioInput = `        input(type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}"${radioAttrs}${tokenStyle})`;

  return buildControlRowWithLabel(
    label,
    radioInput,
    '      .flex.items-center.mb-4',
    '',
    safeLabel => `        label.ml-2.block.text-sm.text-gray-900 ${safeLabel}`
  );
}

export function renderPugSelect(
  props: SelectComponent,
  ctx: {
    disabledClass: string;
    tokenStyle: string;
    selectAttrs: string;
    buildLabeledFieldBlock: LabeledFieldBlockFn;
  }
): string {
  const { label, options = [], placeholder } = props;
  const { disabledClass, tokenStyle, selectAttrs, buildLabeledFieldBlock } = ctx;

  let selectCode = `        select(class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${selectAttrs}${tokenStyle})`;

  if (placeholder) {
    selectCode += `
          option(value="") ${placeholder}`;
  }

  options.forEach((opt: SelectOption) => {
    selectCode += `
          option(value="${opt.value}") ${opt.label}`;
  });

  return buildLabeledFieldBlock(
    label,
    selectCode,
    '      .mb-4',
    '',
    safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2 ${safeLabel}`
  );
}

export function renderPugDatePicker(
  props: DatePickerComponent,
  ctx: {
    disabledClass: string;
    tokenStyle: string;
    dateInputAttrs: string;
    buildLabeledFieldBlock: LabeledFieldBlockFn;
  }
): string {
  const { label, name = 'date' } = props;
  const { disabledClass, tokenStyle, dateInputAttrs, buildLabeledFieldBlock } = ctx;

  const dateInputCode = `        input(type="date" id="${name}" name="${name}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${dateInputAttrs}${tokenStyle})`;

  return buildLabeledFieldBlock(
    label,
    dateInputCode,
    '      .mb-4',
    '',
    safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2(for="${name}") ${safeLabel}`
  );
}
