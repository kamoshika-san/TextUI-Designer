import type { ButtonComponent, TextUIDSL } from '../domain/dsl-types';
import { BaseComponentRenderer } from './base-component-renderer';
import { ExportOptions } from './export-types';

/**
 * PoC: Native Vue component renderer.
 * Generates Vue-specific syntax like @click and script setup bindings.
 */
export class VueComponentRenderer extends BaseComponentRenderer {
  constructor() {
    super('vue' as any);
  }

  async export(_dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    throw new Error('Use renderPageComponents instead');
  }

  getFileExtension(): string {
    return '.vue';
  }

  protected renderButton(props: ButtonComponent, _key: number): string {
    const { label, kind = 'primary', disabled = false, submit = false, token } = props;
    const type = submit ? 'submit' : 'button';
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Button', token);

    // Generate Vue-native event handler
    const onClick = ' @click="$emit(\'click\', $event)"';

    return `<button type="${type}" class="textui-button ${kind}"${disabledAttr}${onClick}${styleAttr}>
  <span class="textui-button-label">${this.escapeHtml(label || '')}</span>
</button>`;
  }

  protected renderText(props: import('../domain/dsl-types').TextComponent): string {
    return `<p class="textui-text p">${this.escapeHtml(props.value)}</p>`;
  }

  protected renderInput(props: import('../domain/dsl-types/form').InputComponent): string {
    const { label, type = 'text', placeholder = '', disabled = false, required = false, token, name } = props;
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const requiredAttr = required ? ' :required="true"' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Input', token);
    const modelAttr = name ? ` v-model="${name}"` : '';

    let inputHtml = '';
    if (type === 'multiline') {
      inputHtml = `<textarea class="textui-input textarea"${modelAttr}${disabledAttr}${requiredAttr}${styleAttr} placeholder="${this.escapeHtml(placeholder)}"></textarea>`;
    } else {
      inputHtml = `<input type="${type}" class="textui-input input"${modelAttr}${disabledAttr}${requiredAttr}${styleAttr} placeholder="${this.escapeHtml(placeholder)}" />`;
    }

    if (label) {
      return `<div class="textui-field">
  <label class="textui-label">${this.escapeHtml(label)}</label>
  ${inputHtml}
</div>`;
    }
    return inputHtml;
  }

  protected renderCheckbox(props: import('../domain/dsl-types/form').CheckboxComponent): string {
    const { label, checked = false, disabled = false, token, name } = props;
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const modelAttr = name ? ` v-model="${name}"` : ` :checked="${checked}"`;
    const styleAttr = this.getHtmlTokenStyleAttr('Checkbox', token);

    return `<label class="textui-checkbox-container"${styleAttr}>
  <input type="checkbox" class="textui-checkbox"${modelAttr}${disabledAttr} />
  <span class="textui-checkbox-label">${this.escapeHtml(label)}</span>
</label>`;
  }

  protected renderRadio(props: import('../domain/dsl-types/form').RadioComponent): string {
    const { label, options = [], disabled = false, token, name } = props;
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Radio', token);
    const modelAttr = name ? ` v-model="${name}"` : '';

    const optionsHtml = options.map(opt => `
  <label class="textui-radio-option">
    <input type="radio" class="textui-radio" value="${this.escapeHtml(opt.value)}"${modelAttr}${disabledAttr}${opt.checked && !name ? ' checked' : ''} />
    <span class="textui-radio-label">${this.escapeHtml(opt.label)}</span>
  </label>`).join('');

    if (label) {
      return `<div class="textui-radio-group"${styleAttr}>
  <span class="textui-radio-group-label">${this.escapeHtml(label)}</span>
  ${optionsHtml}
</div>`;
    }
    return `<div class="textui-radio-group"${styleAttr}>${optionsHtml}</div>`;
  }

  protected renderSelect(props: import('../domain/dsl-types/form').SelectComponent): string {
    const { label, options = [], placeholder = '', disabled = false, multiple = false, token, name } = props;
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const multipleAttr = multiple ? ' multiple' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Select', token);
    const modelAttr = name ? ` v-model="${name}"` : '';

    const optionsHtml = options.map(opt =>
      `<option value="${this.escapeHtml(opt.value)}"${opt.selected && !name ? ' selected' : ''}>${this.escapeHtml(opt.label)}</option>`
    ).join('\n    ');

    const placeholderHtml = placeholder ? `<option value="" disabled${!name ? ' selected' : ''}>${this.escapeHtml(placeholder)}</option>\n    ` : '';

    const selectHtml = `<select class="textui-select"${modelAttr}${disabledAttr}${multipleAttr}${styleAttr}>
    ${placeholderHtml}${optionsHtml}
  </select>`;

    if (label) {
      return `<div class="textui-field">
  <label class="textui-label">${this.escapeHtml(label)}</label>
  ${selectHtml}
</div>`;
    }
    return selectHtml;
  }

  protected renderDatePicker(props: import('../domain/dsl-types/form').DatePickerComponent): string {
    const { label, disabled = false, required = false, token, name, min, max } = props;
    const disabledAttr = disabled ? ' :disabled="true"' : '';
    const requiredAttr = required ? ' :required="true"' : '';
    const minAttr = min ? ` min="${min}"` : '';
    const maxAttr = max ? ` max="${max}"` : '';
    const styleAttr = this.getHtmlTokenStyleAttr('DatePicker', token);
    const modelAttr = name ? ` v-model="${name}"` : '';

    const inputHtml = `<input type="date" class="textui-datepicker"${modelAttr}${disabledAttr}${requiredAttr}${minAttr}${maxAttr}${styleAttr} />`;

    if (label) {
      return `<div class="textui-field">
  <label class="textui-label">${this.escapeHtml(label)}</label>
  ${inputHtml}
</div>`;
    }
    return inputHtml;
  }
  protected renderDivider(): string { return ''; }
  protected renderSpacer(): string { return ''; }
  protected renderAlert(): string { return ''; }
  protected renderContainer(): string { return ''; }
  protected renderForm(): string { return ''; }
  protected renderAccordion(): string { return ''; }
  protected renderTabs(): string { return ''; }
  protected renderTreeView(): string { return ''; }
  protected renderTable(): string { return ''; }
  protected renderLink(): string { return ''; }
  protected renderBreadcrumb(): string { return ''; }
  protected renderBadge(): string { return ''; }
  protected renderProgress(): string { return ''; }
  protected renderImage(): string { return ''; }
  protected renderIcon(): string { return ''; }
  protected renderModal(): string { return ''; }

  public renderVueComponents(dsl: TextUIDSL): string {
    return this.renderPageComponents(dsl);
  }
}
