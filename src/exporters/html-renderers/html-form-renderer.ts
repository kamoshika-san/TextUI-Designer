import type {
  ButtonComponent,
  CheckboxComponent,
  DatePickerComponent,
  FormAction,
  FormComponent,
  FormField,
  InputComponent,
  RadioComponent,
  RadioOption,
  SelectComponent,
  SelectOption
} from '../../renderer/types';
import type { HtmlRendererUtils } from './html-renderer-utils';

export class HtmlFormRenderer {
  constructor(private readonly utils: HtmlRendererUtils) {}

  renderInput(props: InputComponent): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const safePlaceholder = this.utils.escapeAttribute(placeholder || '');
    const safeType = this.utils.escapeAttribute(type);
    const disabledClass = this.utils.getDisabledClass(disabled);

    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Input', token);
    const inputAttrs = this.utils.buildAttrs({ required, disabled });
    const inputHtml = `      <input type="${safeType}" placeholder="${safePlaceholder}" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${inputAttrs}${tokenStyle}>`;

    return this.utils.buildLabeledFieldBlock(
      label,
      inputHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  renderButton(props: ButtonComponent): string {
    const { label, icon, iconPosition = 'left', kind = 'primary', disabled = false, submit = false, token } = props;
    const safeLabel = this.utils.escapeHtml(label ?? '');
    const safeIcon = this.utils.escapeHtml(icon ?? '');
    const content = [
      icon && iconPosition === 'left' ? `<span class="textui-button-icon" aria-hidden="true">${safeIcon}</span>` : '',
      label ? `<span class="textui-button-label">${safeLabel}</span>` : '',
      icon && iconPosition === 'right' ? `<span class="textui-button-icon" aria-hidden="true">${safeIcon}</span>` : ''
    ].filter(Boolean).join('');
    const kindClasses = this.utils.getStyleManager().getKindClasses('html');
    const disabledClass = this.utils.getDisabledClass(disabled);
    const typeAttr = submit ? ' type="submit"' : '';
    const buttonAttrs = this.utils.buildAttrs({ disabled });

    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Button', token);
    const safeKind = this.utils.escapeAttribute(kind);
    return `    <button${typeAttr} data-kind="${safeKind}" class="${kindClasses[kind as keyof typeof kindClasses]} ${disabledClass}"${buttonAttrs}${tokenStyle}>${content}</button>`;
  }

  renderCheckbox(props: CheckboxComponent): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.utils.getDisabledClass(disabled);
    const checkboxAttrs = this.utils.buildAttrs({ checked, disabled });
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Checkbox', token);
    const checkboxInput = `      <input type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabledClass}"${checkboxAttrs}${tokenStyle}>`;

    return this.utils.buildControlRowWithLabel(
      label,
      checkboxInput,
      '    <div class="flex items-center mb-4">',
      '    </div>',
      safeLabel => `      <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
    );
  }

  renderRadio(props: RadioComponent): string {
    const { label, name, options = [], disabled = false, token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Radio', token);
    const safeGroupName = this.utils.escapeAttribute(name || 'radio');
    const disabledClass = this.utils.getDisabledClass(disabled);

    const optionRows = options && options.length > 0
      ? options.map((opt: RadioOption) => {
        const radioAttrs = this.utils.buildAttrs({ checked: Boolean(opt.checked), disabled });
        const radioInput = `      <input type="radio" name="${safeGroupName}" value="${this.utils.escapeAttribute(opt.value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${radioAttrs}${tokenStyle}>`;
        return this.utils.buildControlRowWithLabel(
          opt.label,
          radioInput,
          '      <div class="flex items-center mb-2">',
          '      </div>',
          safeLabel => `        <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
        );
      }).join('\n')
      : (() => {
        const { value, checked = false } = props;
        const radioAttrs = this.utils.buildAttrs({ checked, disabled });
        const radioInput = `      <input type="radio" name="${safeGroupName}" value="${this.utils.escapeAttribute(value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${radioAttrs}${tokenStyle}>`;
        return this.utils.buildControlRowWithLabel(
          label,
          radioInput,
          '      <div class="flex items-center mb-2">',
          '      </div>',
          safeLabel => `        <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
        );
      })();

    return this.utils.buildLabeledFieldBlock(
      label,
      optionRows,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  renderSelect(props: SelectComponent): string {
    const { label, options = [], placeholder, disabled = false, multiple = false, token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Select', token);
    const disabledClass = this.utils.getDisabledClass(disabled);

    const selectClass = multiple
      ? `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32 ${disabledClass}`
      : `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}`;

    const selectAttrs = this.utils.buildAttrs({ disabled, multiple });
    let selectHtml = `      <select class="${selectClass}"${selectAttrs}${tokenStyle}>`;

    if (placeholder && !multiple) {
      selectHtml += `\n        <option value="" class="bg-gray-800 text-gray-400">${this.utils.escapeHtml(placeholder)}</option>`;
    }

    options.forEach((opt: SelectOption) => {
      const optionAttrs = this.utils.buildAttrs({ selected: Boolean(opt.selected) });
      selectHtml += `\n        <option value="${this.utils.escapeAttribute(opt.value)}" class="bg-gray-800 text-gray-400"${optionAttrs}>${this.utils.escapeHtml(opt.label)}</option>`;
    });

    selectHtml += '\n      </select>';

    return this.utils.buildLabeledFieldBlock(
      label,
      selectHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  renderDatePicker(props: DatePickerComponent): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const safeName = this.utils.escapeAttribute(name);
    const disabledClass = this.utils.getDisabledClass(disabled);
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('DatePicker', token);

    const dateInputAttrs = this.utils.buildAttrs({ required, disabled, min, max, value });
    const inputHtml = `      <input id="${safeName}" name="${safeName}" type="date" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${dateInputAttrs}${tokenStyle}>`;

    return this.utils.buildLabeledFieldBlock(
      label,
      inputHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label for="${safeName}" class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  renderForm(props: FormComponent): string {
    const { id, fields = [], actions = [], token } = props;
    const safeId = this.utils.escapeAttribute(id);
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Form', token);

    let code = `    <form id="${safeId}" class="textui-container space-y-4"${tokenStyle}>`;

    fields.forEach((field: FormField, index: number) => {
      const fieldCode = this.utils.renderFormField(field, index);
      if (fieldCode) {
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });

    code += '\n      <div class="flex space-x-4">';
    actions.forEach((action: FormAction, index: number) => {
      const actionCode = this.utils.renderFormAction(action, index);
      if (actionCode) {
        const indentedCode = actionCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    code += '\n      </div>';
    code += '\n    </form>';

    return code;
  }
}
