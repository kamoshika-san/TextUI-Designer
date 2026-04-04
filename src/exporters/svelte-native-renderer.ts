import type { ButtonComponent, TextUIDSL } from '../domain/dsl-types';
import { BaseComponentRenderer } from './base-component-renderer';
import { ExportOptions } from './export-types';

/**
 * PoC: Native Svelte component renderer.
 * Instead of extracting static HTML, this generates Svelte-specific syntax.
 */
export class SvelteComponentRenderer extends BaseComponentRenderer {
  constructor() {
    super('svelte' as any); // Using 'svelte' as a placeholder format
  }

  async export(_dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    throw new Error('Use renderPageComponents instead');
  }

  getFileExtension(): string {
    return '.svelte';
  }

  protected renderButton(props: ButtonComponent, _key: number): string {
    const { label, kind = 'primary', disabled = false, submit = false, token } = props;
    const type = submit ? 'submit' : 'button';
    const disabledAttr = disabled ? ' disabled' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Button', token);

    // Generate Svelte-native event handler
    const onClick = ' on:click';

    return `<button type="${type}" class="textui-button ${kind}"${disabledAttr}${onClick}${styleAttr}>
  <span class="textui-button-label">${this.escapeHtml(label || '')}</span>
</button>`;
  }

  protected renderText(props: import('../domain/dsl-types').TextComponent): string {
    return `<p class="textui-text p">${this.escapeHtml(props.value)}</p>`;
  }

  protected renderInput(props: import('../domain/dsl-types/form').InputComponent): string {
    const { label, type = 'text', placeholder = '', disabled = false, required = false, token, name } = props;
    const disabledAttr = disabled ? ' disabled' : '';
    const requiredAttr = required ? ' required' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Input', token);
    const bindValue = name ? ` bind:value={${name}}` : '';

    let inputHtml = '';
    if (type === 'multiline') {
      inputHtml = `<textarea class="textui-input textarea"${bindValue}${disabledAttr}${requiredAttr}${styleAttr} placeholder="${this.escapeHtml(placeholder)}"></textarea>`;
    } else {
      inputHtml = `<input type="${type}" class="textui-input input"${bindValue}${disabledAttr}${requiredAttr}${styleAttr} placeholder="${this.escapeHtml(placeholder)}" />`;
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
    const disabledAttr = disabled ? ' disabled' : '';
    const bindChecked = name ? ` bind:checked={${name}}` : ` checked={${checked}}`;
    const styleAttr = this.getHtmlTokenStyleAttr('Checkbox', token);

    return `<label class="textui-checkbox-container"${styleAttr}>
  <input type="checkbox" class="textui-checkbox"${bindChecked}${disabledAttr} />
  <span class="textui-checkbox-label">${this.escapeHtml(label)}</span>
</label>`;
  }

  protected renderRadio(props: import('../domain/dsl-types/form').RadioComponent): string {
    const { label, options = [], disabled = false, token, name } = props;
    const disabledAttr = disabled ? ' disabled' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Radio', token);
    const bindGroup = name ? ` bind:group={${name}}` : '';

    const optionsHtml = options.map(opt => `
  <label class="textui-radio-option">
    <input type="radio" class="textui-radio" value="${this.escapeHtml(opt.value)}"${bindGroup}${disabledAttr}${opt.checked && !name ? ' checked' : ''} />
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
    const disabledAttr = disabled ? ' disabled' : '';
    const multipleAttr = multiple ? ' multiple' : '';
    const styleAttr = this.getHtmlTokenStyleAttr('Select', token);
    const bindValue = name ? ` bind:value={${name}}` : '';

    const optionsHtml = options.map(opt =>
      `<option value="${this.escapeHtml(opt.value)}"${opt.selected && !name ? ' selected' : ''}>${this.escapeHtml(opt.label)}</option>`
    ).join('\n    ');

    const placeholderHtml = placeholder ? `<option value="" disabled${!name ? ' selected' : ''}>${this.escapeHtml(placeholder)}</option>\n    ` : '';

    const selectHtml = `<select class="textui-select"${bindValue}${disabledAttr}${multipleAttr}${styleAttr}>
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
    const disabledAttr = disabled ? ' disabled' : '';
    const requiredAttr = required ? ' required' : '';
    const minAttr = min ? ` min="${min}"` : '';
    const maxAttr = max ? ` max="${max}"` : '';
    const styleAttr = this.getHtmlTokenStyleAttr('DatePicker', token);
    const bindValue = name ? ` bind:value={${name}}` : '';

    const inputHtml = `<input type="date" class="textui-datepicker"${bindValue}${disabledAttr}${requiredAttr}${minAttr}${maxAttr}${styleAttr} />`;

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

  public renderSvelteComponents(dsl: TextUIDSL): string {
    return this.renderPageComponents(dsl);
  }
}
