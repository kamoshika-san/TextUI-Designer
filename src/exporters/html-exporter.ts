import type {
  TextUIDSL, ComponentDef, FormComponent, FormField, FormAction,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, RadioOption, SelectComponent, SelectOption,
  DividerComponent, AlertComponent, ContainerComponent, AccordionComponent,
  TabsComponent
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';

export class HtmlExporter extends BaseComponentRenderer {
  constructor() {
    super('html');
  }

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* VS Codeテーマの影響を排除 */
    :root {
      all: unset;
    }
    
    /* 基本的なスタイルリセット（Tailwind CSSを妨げない程度） */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }
    
    /* HTML要素の基本設定 */
    html {
      font-size: 16px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #cccccc;
      background-color: #1e1e1e;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* フォーム要素の基本リセット */
    input,
    button,
    textarea,
    select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }
    
    /* multipleセレクトの選択項目ハイライト保持 */
    select[multiple] option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
    
    select[multiple] option:checked:not(:focus) {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
    
    /* フォーカス時のスタイル（選択項目のハイライトを妨げない） */
    select[multiple]:focus option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="container mx-auto p-6">
${componentCode}
  </div>
</body>
</html>`;
  }

  getFileExtension(): string {
    return '.html';
  }

  protected renderText(props: TextComponent, key: number): string {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300' } = props;
    const safeValue = this.escapeHtml(value ?? '');
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getVariantClasses(this.format);
    const sizeClasses = styleManager.getSizeClasses(this.format);
    const weightClasses = styleManager.getWeightClasses(this.format);
    
    // variantが指定されている場合はそれを使用、そうでなければsizeとweightを使用
    let className: string;
    let tag: string;
    
    if (variant && variantClasses[variant]) {
      className = variantClasses[variant];
      tag = variant.startsWith('h') ? variant : 'p';
    } else {
      className = `${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}`;
      tag = 'p';
    }
    
    return `    <${tag} class="${className}">${safeValue}</${tag}>`;
  }

  protected renderInput(props: InputComponent, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false } = props;
    const safeLabel = label ? this.escapeHtml(label) : '';
    const safePlaceholder = this.escapeAttribute(placeholder || '');
    const safeType = this.escapeAttribute(type);
    const disabledClass = this.getDisabledClass(disabled);
    const requiredAttr = required ? ' required' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`;
    }
    code += `\n      <input type="${safeType}" placeholder="${safePlaceholder}" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${requiredAttr}${disabledAttr}>`;
    code += `\n    </div>`;
    
    return code;
  }

  protected renderButton(props: ButtonComponent, key: number): string {
    const { label, kind = 'primary', disabled = false, submit = false } = props;
    const safeLabel = this.escapeHtml(label ?? '');
    const styleManager = this.getStyleManager();
    const kindClasses = styleManager.getKindClasses(this.format);
    const disabledClass = this.getDisabledClass(disabled);
    const disabledAttr = disabled ? ' disabled' : '';
    const typeAttr = submit ? ' type="submit"' : '';
    
    return `    <button${typeAttr} class="${kindClasses[kind as keyof typeof kindClasses]} ${disabledClass}"${disabledAttr}>${safeLabel}</button>`;
  }

  protected renderCheckbox(props: CheckboxComponent, key: number): string {
    const { label, checked = false, disabled = false } = props;
    const safeLabel = this.escapeHtml(label ?? '');
    const disabledClass = this.getDisabledClass(disabled);
    const checkedAttr = checked ? ' checked' : '';
    const disabledAttr = disabled ? ' disabled' : '';
    
    return `    <div class="flex items-center mb-4">
      <input type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
      <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>
    </div>`;
  }

  protected renderRadio(props: RadioComponent, key: number): string {
    const { label, name, options = [], disabled = false } = props;
    const safeLabel = label ? this.escapeHtml(label) : '';
    const safeGroupName = this.escapeAttribute(name || 'radio');
    const disabledClass = this.getDisabledClass(disabled);
    const disabledAttr = disabled ? ' disabled' : '';
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`;
    }
    
    // options配列がある場合は、各オプションをラジオボタンとしてレンダリング
    if (options && options.length > 0) {
      options.forEach((opt: RadioOption, index: number) => {
        const checkedAttr = opt.checked ? ' checked' : '';
        code += `\n      <div class="flex items-center mb-2">
        <input type="radio" name="${safeGroupName}" value="${this.escapeAttribute(opt.value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
        <label class="ml-2 block text-sm text-gray-400">${this.escapeHtml(opt.label ?? '')}</label>
      </div>`;
      });
    } else {
      // 単一のラジオボタン（後方互換性のため）
      const { value, checked = false } = props;
      const checkedAttr = checked ? ' checked' : '';
      code += `\n      <div class="flex items-center mb-2">
        <input type="radio" name="${safeGroupName}" value="${this.escapeAttribute(value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${checkedAttr}${disabledAttr}>
        <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>
      </div>`;
    }
    
    code += `\n    </div>`;
    return code;
  }

  protected renderSelect(props: SelectComponent, key: number): string {
    const { label, options = [], placeholder, disabled = false, multiple = false } = props;
    const safeLabel = label ? this.escapeHtml(label) : '';
    const disabledClass = this.getDisabledClass(disabled);
    const disabledAttr = disabled ? ' disabled' : '';
    const multipleAttr = multiple ? ' multiple' : '';
    
    // multipleの場合は高さを調整
    const selectClass = multiple 
      ? `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32 ${disabledClass}`
      : `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}`;
    
    let code = `    <div class="mb-4">`;
    if (label) {
      code += `\n      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`;
    }
    code += `\n      <select class="${selectClass}"${disabledAttr}${multipleAttr}>`;
    
    if (placeholder && !multiple) {
      code += `\n        <option value="" class="bg-gray-800 text-gray-400">${this.escapeHtml(placeholder)}</option>`;
    }
    
    options.forEach((opt: SelectOption) => {
      const selectedAttr = opt.selected ? ' selected' : '';
      code += `\n        <option value="${this.escapeAttribute(opt.value)}" class="bg-gray-800 text-gray-400"${selectedAttr}>${this.escapeHtml(opt.label)}</option>`;
    });
    
    code += `\n      </select>`;
    code += `\n    </div>`;
    
    return code;
  }

  protected renderDivider(props: DividerComponent, key: number): string {
    const { orientation = 'horizontal', spacing = 'md' } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    
    if (orientation === 'vertical') {
      return `    <div class="inline-block w-px h-6 bg-gray-700 mx-4"></div>`;
    }
    
    return `    <hr class="border-gray-700 ${spacingClasses[spacing as keyof typeof spacingClasses]}">`;
  }

  protected renderAlert(props: AlertComponent, key: number): string {
    const { message, variant = 'info', title } = props;
    const safeTitle = title ? this.escapeHtml(title) : '';
    const safeMessage = this.escapeHtml(message ?? '');
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    
    let code = `    <div class="p-4 border rounded-md ${variantClasses[variant as keyof typeof variantClasses]}">`;
    if (title) {
      code += `\n      <h3 class="text-sm font-medium mb-1">${safeTitle}</h3>`;
    }
    code += `\n      <p class="text-sm">${safeMessage}</p>`;
    code += `\n    </div>`;
    
    return code;
  }


  protected renderAccordion(props: AccordionComponent, key: number): string {
    const { allowMultiple = false, items = [] } = props;

    let code = `    <div class="textui-accordion border border-gray-700 rounded-md divide-y divide-gray-700" data-allow-multiple="${allowMultiple ? 'true' : 'false'}">`;
    items.forEach((item, index) => {
      const safeTitle = this.escapeHtml(item.title ?? '');
      const safeContent = this.escapeHtml(item.content ?? '');
      const isOpen = item.open ? 'true' : 'false';
      code += `
      <details class="textui-accordion-item" ${item.open ? 'open' : ''} data-open="${isOpen}">`;
      code += `
        <summary class="px-4 py-3 text-sm font-medium text-gray-200 cursor-pointer">${safeTitle}</summary>`;
      code += `
        <div class="px-4 pb-4 text-sm text-gray-300">${safeContent}</div>`;
      code += `
      </details>`;
    });
    code += `
    </div>`;

    return code;
  }



  protected renderTabs(props: TabsComponent, key: number): string {
    const { defaultTab = 0, items = [] } = props;
    const activeIndex = Math.min(Math.max(defaultTab, 0), Math.max(items.length - 1, 0));

    const tabsHeader = items
      .map((item, index) => `          <button type="button" class="px-4 py-2 text-sm border-r border-gray-300 last:border-r-0 ${index === activeIndex ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}" ${item.disabled ? 'disabled' : ''}>${item.label}</button>`)
      .join('\n');

    const panelItems = (items[activeIndex]?.components || [])
      .map((component: ComponentDef, index: number) => this.renderComponent(component, index))
      .join('\n');

    return `      <div class="textui-tabs border border-gray-300 rounded-md overflow-hidden" data-key="${key}">
        <div class="flex border-b border-gray-300">
${tabsHeader}
        </div>
        <div class="p-4 space-y-3">
${panelItems}
        </div>
      </div>`;
  }

  protected renderContainer(props: ContainerComponent, key: number): string {
    const { layout = 'vertical', components = [] } = props;
    const layoutClasses = {
      'vertical': 'textui-container flex flex-col space-y-4',
      'horizontal': 'textui-container flex flex-row space-x-4',
      'flex': 'textui-container flex flex-wrap gap-4',
      'grid': 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    };
    
    let code = `    <div class="${layoutClasses[layout as keyof typeof layoutClasses]}">`;
    components.forEach((child: ComponentDef, index: number) => {
      const childCode = this.renderComponent(child, index);
      // インデントを調整
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    code += `\n    </div>`;
    
    return code;
  }

  protected renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [] } = props;
    const safeId = this.escapeAttribute(id);
    
    let code = `    <form id="${safeId}" class="textui-container space-y-4">`;
    
    fields.forEach((field: FormField, index: number) => {
      const fieldCode = this.renderFormField(field, index);
      if (fieldCode) {
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    
    code += `\n      <div class="flex space-x-4">`;
    actions.forEach((action: FormAction, index: number) => {
      const actionCode = this.renderFormAction(action, index);
      if (actionCode) {
        const indentedCode = actionCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    code += `\n      </div>`;
    code += `\n    </form>`;
    
    return code;
  }
} 