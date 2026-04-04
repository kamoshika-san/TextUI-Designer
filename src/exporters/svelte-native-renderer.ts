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

  // Fallbacks for PoC
  protected renderText(props: import('../domain/dsl-types').TextComponent): string {
    return `<p class="textui-text p">${this.escapeHtml(props.value)}</p>`;
  }
  protected renderInput(): string { return ''; }
  protected renderCheckbox(): string { return ''; }
  protected renderRadio(): string { return ''; }
  protected renderSelect(): string { return ''; }
  protected renderDatePicker(): string { return ''; }
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
