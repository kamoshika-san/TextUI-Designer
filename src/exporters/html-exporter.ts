import type {
  TextUIDSL, ComponentDef, FormComponent, FormField, FormAction,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, RadioOption, SelectComponent, SelectOption, DatePickerComponent,
  DividerComponent, SpacerComponent, AlertComponent, ContainerComponent, AccordionComponent,
  TabsComponent, TreeViewComponent,
  TableComponent
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';
import { buildHtmlDocument } from './html-template-builder';
import { buildThemeStyleBlock } from './theme-style-builder';
import { buildThemeVariables } from './theme-definition-resolver';

export class HtmlExporter extends BaseComponentRenderer {
  constructor() {
    super('html');
  }

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl);
    const themeStyles = this.buildThemeStyles(options.themePath);
    
    return buildHtmlDocument(componentCode, themeStyles);
  }

  private buildThemeStyles(themePath?: string): string {
    if (!themePath) {
      return '';
    }

    try {
      const allVars = buildThemeVariables(themePath);
      return buildThemeStyleBlock(allVars);
    } catch (error) {
      console.warn(`[HtmlExporter] テーマ読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  getFileExtension(): string {
    return '.html';
  }

  protected renderText(props: TextComponent, key: number): string {
    const { value, variant = 'p', size = 'base', weight = 'normal', color = 'text-gray-300', token } = props;
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
    
    const tokenStyle = this.getHtmlTokenStyleAttr('Text', token);
    return `    <${tag} class="${className}"${tokenStyle}>${safeValue}</${tag}>`;
  }

  protected renderInput(props: InputComponent, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const safePlaceholder = this.escapeAttribute(placeholder || '');
    const safeType = this.escapeAttribute(type);
    const disabledClass = this.getDisabledClass(disabled);
    
    const tokenStyle = this.getHtmlTokenStyleAttr('Input', token);
    const inputAttrs = this.buildAttrs({
      required,
      disabled
    });
    const inputHtml = `      <input type="${safeType}" placeholder="${safePlaceholder}" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${inputAttrs}${tokenStyle}>`;

    return this.buildLabeledFieldBlock(
      label,
      inputHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  protected renderButton(props: ButtonComponent, key: number): string {
    const { label, kind = 'primary', disabled = false, submit = false, token } = props;
    const safeLabel = this.escapeHtml(label ?? '');
    const styleManager = this.getStyleManager();
    const kindClasses = styleManager.getKindClasses(this.format);
    const disabledClass = this.getDisabledClass(disabled);
    const typeAttr = submit ? ' type="submit"' : '';
    const buttonAttrs = this.buildAttrs({ disabled });
    
    const tokenStyle = this.getHtmlTokenStyleAttr('Button', token);
    const safeKind = this.escapeAttribute(kind);
    return `    <button${typeAttr} data-kind="${safeKind}" class="${kindClasses[kind as keyof typeof kindClasses]} ${disabledClass}"${buttonAttrs}${tokenStyle}>${safeLabel}</button>`;
  }

  protected renderCheckbox(props: CheckboxComponent, key: number): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const checkboxAttrs = this.buildAttrs({ checked, disabled });
    const tokenStyle = this.getHtmlTokenStyleAttr('Checkbox', token);
    const checkboxInput = `      <input type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800 ${disabledClass}"${checkboxAttrs}${tokenStyle}>`;

    return this.buildControlRowWithLabel(
      label,
      checkboxInput,
      '    <div class="flex items-center mb-4">',
      '    </div>',
      safeLabel => `      <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
    );
  }


  protected renderRadio(props: RadioComponent, key: number): string {
    const { label, name, options = [], disabled = false, token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('Radio', token);
    const safeGroupName = this.escapeAttribute(name || 'radio');
    const disabledClass = this.getDisabledClass(disabled);

    const optionRows = options && options.length > 0
      ? options.map((opt: RadioOption) => {
        const radioAttrs = this.buildAttrs({ checked: Boolean(opt.checked), disabled });
        const radioInput = `      <input type="radio" name="${safeGroupName}" value="${this.escapeAttribute(opt.value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${radioAttrs}${tokenStyle}>`;
        return this.buildControlRowWithLabel(
          opt.label,
          radioInput,
          '      <div class="flex items-center mb-2">',
          '      </div>',
          safeLabel => `        <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
        );
      }).join('\n')
      : (() => {
        const { value, checked = false } = props;
        const radioAttrs = this.buildAttrs({ checked, disabled });
        const radioInput = `      <input type="radio" name="${safeGroupName}" value="${this.escapeAttribute(value || '')}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800 ${disabledClass}"${radioAttrs}${tokenStyle}>`;
        return this.buildControlRowWithLabel(
          label,
          radioInput,
          '      <div class="flex items-center mb-2">',
          '      </div>',
          safeLabel => `        <label class="ml-2 block text-sm text-gray-400">${safeLabel}</label>`
        );
      })();

    return this.buildLabeledFieldBlock(
      label,
      optionRows,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }


  protected renderSelect(props: SelectComponent, key: number): string {
    const { label, options = [], placeholder, disabled = false, multiple = false, token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('Select', token);
    const disabledClass = this.getDisabledClass(disabled);
    
    // multipleの場合は高さを調整
    const selectClass = multiple 
      ? `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32 ${disabledClass}`
      : `w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}`;
    
    const selectAttrs = this.buildAttrs({
      disabled,
      multiple
    });
    let selectHtml = `      <select class="${selectClass}"${selectAttrs}${tokenStyle}>`;
    
    if (placeholder && !multiple) {
      selectHtml += `\n        <option value="" class="bg-gray-800 text-gray-400">${this.escapeHtml(placeholder)}</option>`;
    }
    
    options.forEach((opt: SelectOption) => {
      const optionAttrs = this.buildAttrs({ selected: Boolean(opt.selected) });
      selectHtml += `\n        <option value="${this.escapeAttribute(opt.value)}" class="bg-gray-800 text-gray-400"${optionAttrs}>${this.escapeHtml(opt.label)}</option>`;
    });
    
    selectHtml += `\n      </select>`;

    return this.buildLabeledFieldBlock(
      label,
      selectHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  protected renderDatePicker(props: DatePickerComponent, key: number): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const safeName = this.escapeAttribute(name);
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getHtmlTokenStyleAttr('DatePicker', token);

    const dateInputAttrs = this.buildAttrs({
      required,
      disabled,
      min,
      max,
      value
    });
    const inputHtml = `      <input id="${safeName}" name="${safeName}" type="date" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${dateInputAttrs}${tokenStyle}>`;

    return this.buildLabeledFieldBlock(
      label,
      inputHtml,
      '    <div class="mb-4">',
      '    </div>',
      safeLabel => `      <label for="${safeName}" class="block text-sm font-medium text-gray-400 mb-2">${safeLabel}</label>`
    );
  }

  protected renderDivider(props: DividerComponent, key: number): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    
    const tokenStyle = this.getHtmlTokenStyleAttr('Divider', token);
    if (orientation === 'vertical') {
      return `    <div class="inline-block w-px h-6 bg-gray-700 mx-4"${tokenStyle}></div>`;
    }
    
    return `    <hr class="border-gray-700 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle}>`;
  }

  protected renderSpacer(props: SpacerComponent, key: number): string {
    const { token } = props;
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);

    return `    <div class="textui-spacer" style="width: ${this.escapeAttribute(resolvedWidth)}; height: ${this.escapeAttribute(resolvedHeight)}; flex-shrink: 0;" aria-hidden="true"></div>`;
  }

  protected renderAlert(props: AlertComponent, key: number): string {
    const { message, variant = 'info', title, token } = props;
    const safeTitle = title ? this.escapeHtml(title) : '';
    const safeMessage = this.escapeHtml(message ?? '');
    const safeVariant = this.escapeAttribute(variant);
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    
    const tokenStyle = this.getHtmlTokenStyleAttr('Alert', token);
    let code = `    <div data-alert-variant="${safeVariant}" class="p-4 border rounded-md ${variantClasses[variant as keyof typeof variantClasses]}"${tokenStyle}>`;
    if (title) {
      code += `\n      <h3 class="text-sm font-medium mb-1">${safeTitle}</h3>`;
    }
    code += `\n      <p class="text-sm">${safeMessage}</p>`;
    code += `\n    </div>`;
    
    return code;
  }


  protected renderAccordion(props: AccordionComponent, key: number): string {
    const { allowMultiple = false, items = [], token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('Accordion', token);

    let code = `    <div class="textui-accordion border border-gray-700 rounded-md divide-y divide-gray-700" data-allow-multiple="${allowMultiple ? 'true' : 'false'}"${tokenStyle}>`;
    items.forEach((item, index) => {
      const safeTitle = this.escapeHtml(item.title ?? '');
      const safeContent = this.escapeHtml(item.content ?? '');
      const isOpen = item.open ? 'true' : 'false';
      const itemComponents = item.components || [];
      const nestedCode = itemComponents
        .map((component: ComponentDef, childIndex: number) => this.renderComponent(component, index * 1000 + childIndex))
        .map(childCode => childCode.split('\n').map(line => `          ${line}`).join('\n'))
        .join('\n');
      const contentCode = nestedCode || `          ${safeContent}`;
      code += `
      <details class="textui-accordion-item" ${item.open ? 'open' : ''} data-open="${isOpen}">`;
      code += `
        <summary class="px-4 py-3 text-sm font-medium text-gray-200 cursor-pointer">${safeTitle}</summary>`;
      code += `
        <div class="px-4 pb-4 text-sm text-gray-300">
${contentCode}
        </div>`;
      code += `
      </details>`;
    });
    code += `
    </div>`;

    return code;
  }



  protected renderTabs(props: TabsComponent, key: number): string {
    const { defaultTab = 0, items = [], token } = props;
    const activeIndex = this.resolveActiveTabIndex(defaultTab, items.length);
    const tokenStyle = this.getHtmlTokenStyleAttr('Tabs', token);

    const tabsHeader = items
      .map((item, index) => `          <button type="button" class="px-4 py-2 text-sm border-r border-gray-300 last:border-r-0 ${index === activeIndex ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}" ${item.disabled ? 'disabled' : ''}>${item.label}</button>`)
      .join('\n');

    const panelItems = (items[activeIndex]?.components || [])
      .map((component: ComponentDef, index: number) => this.renderComponent(component, index))
      .join('\n');

    return `      <div class="textui-tabs border border-gray-300 rounded-md overflow-hidden" data-key="${key}"${tokenStyle}>
        <div class="flex border-b border-gray-300">
${tabsHeader}
        </div>
        <div class="p-4 space-y-3">
${panelItems}
        </div>
      </div>`;
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    const { items = [], showLines = true, expandAll = false, token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('TreeView', token);
    const listClass = showLines ? 'textui-treeview-list with-lines' : 'textui-treeview-list without-lines';

    const renderNodeList = (
      nodes: TreeViewComponent['items'],
      path: string,
      depth: number,
      indent: string
    ): string => {
      const nodeCode = nodes.map((node, index) => {
        const children = node.children || [];
        const components = node.components || [];
        const hasChildren = children.length > 0 || components.length > 0;
        const label = `${node.icon ? `${this.escapeHtml(node.icon)} ` : ''}${this.escapeHtml(node.label ?? '')}`;
        const nodeIndent = `${indent}  `;

        if (!hasChildren) {
          return `${nodeIndent}<li class="textui-treeview-item">
${nodeIndent}  <div class="textui-treeview-label-row">
${nodeIndent}    <span class="textui-treeview-toggle placeholder">•</span>
${nodeIndent}    <span class="textui-treeview-label">${label}</span>
${nodeIndent}  </div>
${nodeIndent}</li>`;
        }

        const openAttr = expandAll || node.expanded ? ' open' : '';
        const componentCode = components
          .map((component: ComponentDef, componentIndex: number) =>
            this.renderComponent(component, key * 100000 + depth * 1000 + index * 100 + componentIndex)
          )
          .map(code => code.split('\n').map(line => `${nodeIndent}      ${line}`).join('\n'))
          .join('\n');

        const childrenCode = children.length > 0
          ? renderNodeList(children, `${path}-${index}`, depth + 1, `${nodeIndent}      `)
          : '';

        const bodyCode = [componentCode, childrenCode].filter(Boolean).join('\n');

        return `${nodeIndent}<li class="textui-treeview-item">
${nodeIndent}  <details${openAttr}>
${nodeIndent}    <summary class="textui-treeview-label-row">
${nodeIndent}      <span class="textui-treeview-toggle">▸</span>
${nodeIndent}      <span class="textui-treeview-label">${label}</span>
${nodeIndent}    </summary>
${nodeIndent}    <div class="textui-treeview-children">
${bodyCode}
${nodeIndent}    </div>
${nodeIndent}  </details>
${nodeIndent}</li>`;
      }).join('\n');

      return `${indent}<ul class="${listClass}">
${nodeCode}
${indent}</ul>`;
    };

    const treeCode = renderNodeList(items, `tree-${key}`, 0, '      ');
    return `    <div class="textui-treeview"${tokenStyle}>
${treeCode}
    </div>`;
  }

  protected renderTable(props: TableComponent, key: number): string {
    const { columns = [], rows = [], striped = false, token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('Table', token);

    if (columns.length === 0) {
      return `    <div class="text-sm text-yellow-300 border border-yellow-700 rounded-md px-3 py-2">Table の columns が未定義です</div>`;
    }

    const headerCode = columns
      .map(column => `          <th class="px-4 py-2 text-left font-semibold text-gray-100">${this.escapeHtml(column.header)}</th>`)
      .join('\n');

    const bodyCode = rows
      .map((row, rowIndex) => {
        const rowClass = striped && rowIndex % 2 === 1 ? ' class="bg-gray-800/70"' : '';
        const cells = columns
          .map(column => {
            const value = this.toTableCellText(row[column.key]);
            return `          <td class="px-4 py-2 align-top text-gray-300">${this.escapeHtml(value)}</td>`;
          })
          .join('\n');

        return `        <tr${rowClass}>\n${cells}\n        </tr>`;
      })
      .join('\n');

    return `    <div class="overflow-x-auto border border-gray-700 rounded-md"${tokenStyle}>
      <table class="min-w-full divide-y divide-gray-700 text-sm text-gray-200">
        <thead class="bg-gray-800">
          <tr>
${headerCode}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700 bg-gray-900">
${bodyCode}
        </tbody>
      </table>
    </div>`;
  }

  protected renderContainer(props: ContainerComponent, key: number): string {
    const { layout = 'vertical', components = [], token } = props;
    const tokenStyle = this.getHtmlTokenStyleAttr('Container', token);
    const layoutClasses = {
      'vertical': 'textui-container flex flex-col space-y-4',
      'horizontal': 'textui-container flex flex-row space-x-4',
      'flex': 'textui-container flex flex-wrap gap-4',
      'grid': 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    };
    
    let code = `    <div class="${layoutClasses[layout as keyof typeof layoutClasses]}"${tokenStyle}>`;
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
    const { id, fields = [], actions = [], token } = props;
    const safeId = this.escapeAttribute(id);
    const tokenStyle = this.getHtmlTokenStyleAttr('Form', token);
    
    let code = `    <form id="${safeId}" class="textui-container space-y-4"${tokenStyle}>`;
    
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
