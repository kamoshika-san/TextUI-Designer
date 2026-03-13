import type {
  TextUIDSL, ComponentDef, FormComponent, FormField, FormAction,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, DividerComponent, SpacerComponent, AlertComponent,
  ContainerComponent, AccordionComponent, TabsComponent, TreeViewComponent, TableComponent, SelectOption
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';

export class ReactExporter extends BaseComponentRenderer {
  constructor() {
    super('react');
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl, '\n\n');
    
    return `import React from 'react';

export default function GeneratedUI() {
  return (
    <div className="p-6">
${componentCode}
    </div>
  );
}`;
  }

  getFileExtension(): string {
    return '.tsx';
  }

  protected renderText(props: TextComponent, key: number): string {
    const { value, variant = 'p', token } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const config = styleManager.getTextVariantConfig(variant, this.format);
    
    const tokenStyle = this.getReactTokenStyleInline('Text', token);
    return `      <${config.element} key={${key}} className="${config.className}"${tokenStyle}>${value}</${config.element}>`;
  }

  protected renderInput(props: InputComponent, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Input', token);
    
    const inputAttrs = this.buildAttrs({
      required,
      disabled
    });

    const inputHtml = `        <input
          type="${type}"
          placeholder="${placeholder || ''}"${inputAttrs}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        />`;

    return this.buildLabeledFieldBlock(
      label,
      inputHtml,
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
    );
  }

  protected renderButton(props: ButtonComponent, key: number): string {
    const { label, kind = 'primary', token } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const className = styleManager.getButtonKindClass(kind, this.format);
    
    const tokenStyle = this.getReactTokenStyleInline('Button', token);
    return `      <button
        key={${key}}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        ${tokenStyle}
      >
        ${label}
      </button>`;
  }

  protected renderCheckbox(props: CheckboxComponent, key: number): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Checkbox', token);
    const checkboxAttrs = this.buildAttrs({ disabled });
    const checkboxInput = `        <input
          type="checkbox"
          defaultChecked={${checked}}${checkboxAttrs}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}"
          ${tokenStyle}
        />`;

    return this.buildControlRowWithLabel(
      label,
      checkboxInput,
      `      <div key={${key}} className="flex items-center mb-4">`,
      '      </div>',
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900">${safeLabel}</label>`
    );
  }


  protected renderRadio(props: RadioComponent, key: number): string {
    const { label, value, name, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Radio', token);
    const radioAttrs = this.buildAttrs({ disabled });
    const radioInput = `        <input
          type="radio"
          name="${name || 'radio'}"
          value="${value || ''}"
          defaultChecked={${checked}}${radioAttrs}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}"
          ${tokenStyle}
        />`;

    return this.buildControlRowWithLabel(
      label,
      radioInput,
      `      <div key={${key}} className="flex items-center mb-4">`,
      '      </div>',
      safeLabel => `        <label className="ml-2 block text-sm text-gray-900">${safeLabel}</label>`
    );
  }


  protected renderSelect(props: SelectComponent, key: number): string {
    const { label, options = [], placeholder, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('Select', token);
    const optionsCode = options.map((opt: SelectOption) => 
      `          <option key="${opt.value}" value="${opt.value}">${opt.label}</option>`
    ).join('\n');
    
    const selectAttrs = this.buildAttrs({ disabled });

    const selectHtml = `        <select${selectAttrs}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        >
          ${placeholder ? `<option value="">${placeholder}</option>` : ''}
${optionsCode}
        </select>`;

    return this.buildLabeledFieldBlock(
      label,
      selectHtml,
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
    );
  }

  protected renderDatePicker(props: DatePickerComponent, key: number): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getReactTokenStyleInline('DatePicker', token);

    const dateInputAttrs = this.buildAttrs({
      required,
      disabled,
      min,
      max,
      defaultValue: value
    });

    const dateInputHtml = `        <input
          id="${name}"
          name="${name}"
          type="date"${dateInputAttrs}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"
          ${tokenStyle}
        />`;

    return this.buildLabeledFieldBlock(
      label,
      dateInputHtml,
      `      <div key={${key}} className="mb-4">`,
      '      </div>',
      safeLabel => `        <label htmlFor="${name}" className="block text-sm font-medium text-gray-700 mb-2">${safeLabel}</label>`
    );
  }

  protected renderDivider(props: DividerComponent, key: number): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    const tokenStyle = this.getReactTokenStyleInline('Divider', token);
    
    if (orientation === 'vertical') {
      return `      <div key={${key}} className="inline-block w-px h-6 bg-gray-300 mx-4"${tokenStyle}></div>`;
    }
    
    return `      <hr key={${key}} className="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle} />`;
  }

  protected renderSpacer(props: SpacerComponent, key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);

    return `      <div key={${key}} className="textui-spacer" style={{ width: ${JSON.stringify(resolvedWidth)}, height: ${JSON.stringify(resolvedHeight)}, flexShrink: 0 }} aria-hidden="true" />`;
  }

  protected renderAlert(props: AlertComponent, key: number): string {
    const { message, variant = 'info', token } = props;
    
    // StyleManagerを使用してスタイルを取得
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    const className = variantClasses[variant as keyof typeof variantClasses] || variantClasses.info;
    const tokenStyle = this.getReactTokenStyleInline('Alert', token);
    
    return `      <div key={${key}} className="p-4 border rounded-md ${className}"${tokenStyle}>
        <p className="text-sm">${message}</p>
      </div>`;
  }


  protected renderAccordion(props: AccordionComponent, key: number): string {
    const { allowMultiple = false, items = [], token } = props;
    const tokenStyle = this.getReactTokenStyleInline('Accordion', token);

    const itemsCode = items
      .map((item, index) => {
        const itemChildren = item.components || [];
        const nestedCode = itemChildren
          .map((component: ComponentDef, childIndex: number) =>
            this.adjustIndentation(
              this.renderComponent(component, index * 1000 + childIndex),
              '            '
            )
          )
          .join('\n');
        const contentCode = nestedCode || `            ${item.content ?? ''}`;

        return `        <details key={${index}} className="border-b border-gray-200 last:border-b-0" ${item.open ? 'open' : ''}>
          <summary className="px-4 py-3 text-sm font-medium cursor-pointer">${item.title}</summary>
          <div className="px-4 pb-4 text-sm text-gray-600">
${contentCode}
          </div>
        </details>`;
      })
      .join('\n');

    return `      <div key={${key}} className="border border-gray-300 rounded-md divide-y divide-gray-200" data-allow-multiple={${allowMultiple}}${tokenStyle}>
${itemsCode}
      </div>`;
  }



  protected renderTabs(props: TabsComponent, key: number): string {
    const { defaultTab = 0, items = [], token } = props;
    const activeIndex = this.resolveActiveTabIndex(defaultTab, items.length);
    const tokenStyle = this.getReactTokenStyleInline('Tabs', token);

    const tabsHeader = items
      .map((item, index) => `        <button type="button" className="px-4 py-2 text-sm border-r border-gray-700 last:border-r-0 ${index === activeIndex ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-300'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}" ${item.disabled ? 'disabled' : ''}>${item.label}</button>`)
      .join('\n');

    const panelItems = (items[activeIndex]?.components || [])
      .map((component: ComponentDef, index: number) => this.renderComponent(component, index))
      .join('\n');

    return `      <div key={${key}} className="textui-tabs border border-gray-300 rounded-md overflow-hidden"${tokenStyle}>
        <div className="flex border-b border-gray-300">
${tabsHeader}
        </div>
        <div className="p-4 space-y-3">
${panelItems}
        </div>
      </div>`;
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    const { items = [], showLines = true, expandAll = false, token } = props;
    const tokenStyle = this.getReactTokenStyleInline('TreeView', token);
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
        const label = `${node.icon ? `${node.icon} ` : ''}${node.label ?? ''}`;
        const nodeIndent = `${indent}  `;

        if (!hasChildren) {
          return `${nodeIndent}<li className="textui-treeview-item">
${nodeIndent}  <div className="textui-treeview-label-row">
${nodeIndent}    <span className="textui-treeview-toggle placeholder">•</span>
${nodeIndent}    <span className="textui-treeview-label">${label}</span>
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

        return `${nodeIndent}<li className="textui-treeview-item">
${nodeIndent}  <details${openAttr}>
${nodeIndent}    <summary className="textui-treeview-label-row">
${nodeIndent}      <span className="textui-treeview-toggle">▸</span>
${nodeIndent}      <span className="textui-treeview-label">${label}</span>
${nodeIndent}    </summary>
${nodeIndent}    <div className="textui-treeview-children">
${bodyCode}
${nodeIndent}    </div>
${nodeIndent}  </details>
${nodeIndent}</li>`;
      }).join('\n');

      return `${indent}<ul className="${listClass}">
${nodeCode}
${indent}</ul>`;
    };

    const treeCode = renderNodeList(items, `tree-${key}`, 0, '        ');
    return `      <div key={${key}} className="textui-treeview"${tokenStyle}>
${treeCode}
      </div>`;
  }

  protected renderTable(props: TableComponent, key: number): string {
    const { columns = [], rows = [], striped = false, token } = props;
    const tokenStyle = this.getReactTokenStyleInline('Table', token);

    if (columns.length === 0) {
      return `      <div key={${key}} className="text-sm text-yellow-700 border border-yellow-400 rounded-md px-3 py-2">Table の columns が未定義です</div>`;
    }

    const headerCode = columns
      .map(column => `              <th key="${column.key}" className="px-4 py-2 text-left font-semibold text-gray-900">${column.header}</th>`)
      .join('\n');

    const bodyCode = rows
      .map((row, rowIndex) => {
        const cells = columns
          .map(column => {
            const value = this.toTableCellText(row[column.key]);
            return `              <td key="${rowIndex}-${column.key}" className="px-4 py-2 align-top text-gray-700">${value}</td>`;
          })
          .join('\n');

        return `            <tr key={${rowIndex}} className={${striped} && ${rowIndex} % 2 === 1 ? 'bg-gray-50' : ''}>\n${cells}\n            </tr>`;
      })
      .join('\n');

    return `      <div key={${key}} className="overflow-x-auto border border-gray-300 rounded-md"${tokenStyle}>
        <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-900">
          <thead className="bg-gray-100">
            <tr>
${headerCode}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
${bodyCode}
          </tbody>
        </table>
      </div>`;
  }

  protected renderContainer(props: ContainerComponent, key: number): string {
    const { layout = 'vertical', components = [], token } = props;
    const layoutClasses = {
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'grid': 'grid grid-cols-1 gap-4'
    };
    const tokenStyle = this.getReactTokenStyleInline('Container', token);
    
    const childrenCode = components.map((child: ComponentDef, index: number) => 
      this.renderComponent(child, index)
    ).join('\n');
    
    return `      <div key={${key}} className="${layoutClasses[layout as keyof typeof layoutClasses]}"${tokenStyle}>
${childrenCode}
      </div>`;
  }

  protected renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [], token } = props;
    const tokenStyle = this.getReactTokenStyleInline('Form', token);
    
    const fieldsCode = fields
      .map((field: FormField, index: number) => this.renderFormField(field, index))
      .filter(code => code !== '')
      .join('\n');
    
    const actionsCode = actions
      .map((action: FormAction, index: number) => this.renderFormAction(action, index))
      .filter(code => code !== '')
      .join('\n');
    
    return `      <form key={${key}} id="${id}" className="space-y-4"${tokenStyle}>
${fieldsCode}
        <div className="flex space-x-4">
${actionsCode}
        </div>
      </form>`;
  }
} 