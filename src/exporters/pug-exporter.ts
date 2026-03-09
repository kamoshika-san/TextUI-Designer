import type {
  TextUIDSL, ComponentDef, FormComponent, FormField, FormAction,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, SelectOption, DividerComponent, SpacerComponent,
  AlertComponent, ContainerComponent, AccordionComponent,
  TabsComponent, TreeViewComponent, TableComponent
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';

export class PugExporter extends BaseComponentRenderer {
  constructor() {
    super('pug');
  }

  async export(dsl: TextUIDSL, options: ExportOptions): Promise<string> {
    const components = dsl.page?.components || [];
    const componentCode = components.map((comp, index) => this.renderComponent(comp, index)).join('\n');
    
    return `doctype html
html(lang="ja")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title Generated UI
    script(src="https://cdn.tailwindcss.com")
  
  body.bg-gray-50
    .container.mx-auto.p-6
${componentCode}`;
  }

  getFileExtension(): string {
    return '.pug';
  }

  protected renderText(props: TextComponent, key: number): string {
    const { value, size = 'base', weight = 'normal', color = 'text-gray-900', token } = props;
    const styleManager = this.getStyleManager();
    const sizeClasses = styleManager.getSizeClasses(this.format);
    const weightClasses = styleManager.getWeightClasses(this.format);
    const tokenStyle = this.getPugTokenStyleAttr('Text', token).trim();
    
    return `      p(class="${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}"${tokenStyle ? ` ${tokenStyle}` : ''}) ${value}`;
  }

  protected renderInput(props: InputComponent, key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const requiredAttr = required ? 'required' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const tokenStyle = this.getPugTokenStyleAttr('Input', token).trim();
    
    let code = `      .mb-4`;
    if (label) {
      code += `\n        label.block.text-sm.font-medium.text-gray-700.mb-2 ${label}`;
    }
    code += `\n        input(type="${type}" placeholder="${placeholder || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}" ${requiredAttr} ${disabledAttr}${tokenStyle ? ` ${tokenStyle}` : ''})`;
    
    return code;
  }

  protected renderButton(props: ButtonComponent, key: number): string {
    const { label, kind = 'primary', size = 'md', disabled = false, token } = props;
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getKindClasses(this.format);
    const sizeClasses = {
      'sm': 'px-3 py-1.5 text-sm',
      'md': 'px-4 py-2 text-base',
      'lg': 'px-6 py-3 text-lg'
    };
    const disabledClass = this.getDisabledClass(disabled);
    const disabledAttr = disabled ? 'disabled' : '';
    const tokenStyle = this.getPugTokenStyleAttr('Button', token).trim();
    
    return `      button(class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[kind as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" ${disabledAttr}${tokenStyle ? ` ${tokenStyle}` : ''}) ${label}`;
  }

  protected renderCheckbox(props: CheckboxComponent, key: number): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const checkedAttr = checked ? 'checked' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const tokenStyle = this.getPugTokenStyleAttr('Checkbox', token).trim();
    
    return `      .flex.items-center.mb-4
        input(type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}" ${checkedAttr} ${disabledAttr}${tokenStyle ? ` ${tokenStyle}` : ''})
        label.ml-2.block.text-sm.text-gray-900 ${label}`;
  }

  protected renderRadio(props: RadioComponent, key: number): string {
    const { label, value, name, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const checkedAttr = checked ? 'checked' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const tokenStyle = this.getPugTokenStyleAttr('Radio', token).trim();
    
    return `      .flex.items-center.mb-4
        input(type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}" ${checkedAttr} ${disabledAttr}${tokenStyle ? ` ${tokenStyle}` : ''})
        label.ml-2.block.text-sm.text-gray-900 ${label}`;
  }

  protected renderSelect(props: SelectComponent, key: number): string {
    const { label, options = [], placeholder, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const disabledAttr = disabled ? 'disabled' : '';
    const tokenStyle = this.getPugTokenStyleAttr('Select', token).trim();
    
    let code = `      .mb-4`;
    if (label) {
      code += `\n        label.block.text-sm.font-medium.text-gray-700.mb-2 ${label}`;
    }
    code += `\n        select(class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}" ${disabledAttr}${tokenStyle ? ` ${tokenStyle}` : ''})`;
    
    if (placeholder) {
      code += `\n          option(value="") ${placeholder}`;
    }
    
    options.forEach((opt: SelectOption) => {
      code += `\n          option(value="${opt.value}") ${opt.label}`;
    });
    
    return code;
  }

  protected renderDatePicker(props: DatePickerComponent, key: number): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const requiredAttr = required ? 'required' : '';
    const disabledAttr = disabled ? 'disabled' : '';
    const minAttr = min ? `min="${min}"` : '';
    const maxAttr = max ? `max="${max}"` : '';
    const valueAttr = value ? `value="${value}"` : '';
    const tokenStyle = this.getPugTokenStyleAttr('DatePicker', token).trim();

    let code = `      .mb-4`;
    if (label) {
      code += `\n        label.block.text-sm.font-medium.text-gray-700.mb-2(for="${name}") ${label}`;
    }
    code += `\n        input(type="date" id="${name}" name="${name}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}" ${requiredAttr} ${disabledAttr} ${minAttr} ${maxAttr} ${valueAttr}${tokenStyle ? ` ${tokenStyle}` : ''})`;

    return code;
  }

  protected renderDivider(props: DividerComponent, key: number): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    const tokenStyle = this.getPugTokenStyleAttr('Divider', token).trim();
    
    if (orientation === 'vertical') {
      return `      .inline-block.w-px.h-6.bg-gray-300.mx-4${tokenStyle ? `(${tokenStyle})` : ''}`;
    }
    
    return `      hr(class="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle ? ` ${tokenStyle}` : ''})`;
  }

  protected renderSpacer(props: SpacerComponent, key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);

    return `      .textui-spacer(style="width: ${resolvedWidth}; height: ${resolvedHeight}; flex-shrink: 0;" aria-hidden="true")`;
  }

  protected renderAlert(props: AlertComponent, key: number): string {
    const { message, variant = 'info', title, token } = props;
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    const tokenStyle = this.getPugTokenStyleAttr('Alert', token).trim();
    
    let code = `      .p-4.border.rounded-md(class="${variantClasses[variant as keyof typeof variantClasses]}"${tokenStyle ? ` ${tokenStyle}` : ''})`;
    if (title) {
      code += `\n        h3.text-sm.font-medium.mb-1 ${title}`;
    }
    code += `\n        p.text-sm ${message}`;
    
    return code;
  }


  protected renderAccordion(props: AccordionComponent, key: number): string {
    const { allowMultiple = false, items = [], token } = props;
    const tokenStyle = this.getPugTokenStyleAttr('Accordion', token).trim();

    let code = `      .textui-accordion.border.border-gray-300.rounded-md.divide-y.divide-gray-200(data-allow-multiple="${allowMultiple ? 'true' : 'false'}"${tokenStyle ? ` ${tokenStyle}` : ''})`;
    items.forEach((item, index) => {
      const itemComponents = item.components || [];
      code += `
        details.border-b.border-gray-200`;
      if (item.open) {
        code += `(open)`;
      }
      code += `
          summary.px-4.py-3.text-sm.font-medium.cursor-pointer ${item.title}`;
      if (itemComponents.length > 0) {
        code += `
          .px-4.pb-4.text-sm.text-gray-600`;
        itemComponents.forEach((component: ComponentDef, childIndex: number) => {
          const childCode = this.renderComponent(component, index * 1000 + childIndex);
          const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
          code += `
${indentedCode}`;
        });
      } else {
        code += `
          .px-4.pb-4.text-sm.text-gray-600 ${item.content ?? ''}`;
      }
    });

    return code;
  }



  protected renderTabs(props: TabsComponent, key: number): string {
    const { defaultTab = 0, items = [], token } = props;
    const activeIndex = this.resolveActiveTabIndex(defaultTab, items.length);
    const tokenStyle = this.getPugTokenStyleAttr('Tabs', token).trim();

    let code = `      .textui-tabs.border.border-gray-300.rounded-md.overflow-hidden${tokenStyle ? `(${tokenStyle})` : ''}`;
    code += `\n        .flex.border-b.border-gray-300`;
    items.forEach((item, index) => {
      const activeClass = index === activeIndex ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700';
      const disabledAttr = item.disabled ? 'disabled' : '';
      const disabledClass = item.disabled ? 'opacity-50 cursor-not-allowed' : '';
      code += `\n          button(type="button" class="px-4 py-2 text-sm border-r border-gray-300 last:border-r-0 ${activeClass} ${disabledClass}" ${disabledAttr}) ${item.label}`;
    });

    code += `\n        .p-4.space-y-3`;
    (items[activeIndex]?.components || []).forEach((component: ComponentDef, index: number) => {
      const itemCode = this.renderComponent(component, index);
      const indentedCode = itemCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });

    return code;
  }

  protected renderTreeView(props: TreeViewComponent, key: number): string {
    const { items = [], showLines = true, expandAll = false, token } = props;
    const tokenStyle = this.getPugTokenStyleAttr('TreeView', token).trim();
    const listClass = showLines ? 'with-lines' : 'without-lines';

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
          return `${nodeIndent}li.textui-treeview-item
${nodeIndent}  .textui-treeview-label-row
${nodeIndent}    span.textui-treeview-toggle.placeholder •
${nodeIndent}    span.textui-treeview-label ${label}`;
        }

        const shouldOpen = expandAll || node.expanded;
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

        return `${nodeIndent}li.textui-treeview-item
${nodeIndent}  details${shouldOpen ? '(open)' : ''}
${nodeIndent}    summary.textui-treeview-label-row
${nodeIndent}      span.textui-treeview-toggle ▸
${nodeIndent}      span.textui-treeview-label ${label}
${nodeIndent}    .textui-treeview-children
${bodyCode}`;
      }).join('\n');

      return `${indent}ul.textui-treeview-list.${listClass}
${nodeCode}`;
    };

    const treeCode = renderNodeList(items, `tree-${key}`, 0, '        ');
    return `      .textui-treeview${tokenStyle ? `(${tokenStyle})` : ''}
${treeCode}`;
  }

  protected renderTable(props: TableComponent, key: number): string {
    const { columns = [], rows = [], striped = false, token } = props;
    const tokenStyle = this.getPugTokenStyleAttr('Table', token).trim();

    if (columns.length === 0) {
      return `      .text-sm.text-yellow-700.border.border-yellow-400.rounded-md.px-3.py-2 Table の columns が未定義です`;
    }

    let code = `      .overflow-x-auto.border.border-gray-300.rounded-md${tokenStyle ? `(${tokenStyle})` : ''}`;
    code += `\n        table.min-w-full.divide-y.divide-gray-200.text-sm.text-gray-900`;
    code += `\n          thead.bg-gray-100`;
    code += `\n            tr`;

    columns.forEach(column => {
      code += `\n              th.px-4.py-2.text-left.font-semibold.text-gray-900 ${column.header}`;
    });

    code += `\n          tbody.divide-y.divide-gray-200.bg-white`;

    rows.forEach((row, rowIndex) => {
      const stripedClass = striped && rowIndex % 2 === 1 ? '.bg-gray-50' : '';
      code += `\n            tr${stripedClass}`;
      columns.forEach(column => {
        const value = this.toTableCellText(row[column.key]);
        code += `\n              td.px-4.py-2.align-top.text-gray-700 ${value}`;
      });
    });

    return code;
  }

  protected renderContainer(props: ContainerComponent, key: number): string {
    const { layout = 'vertical', components = [], token } = props;
    const layoutClasses = {
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'grid': 'grid grid-cols-1 gap-4'
    };
    
    const tokenStyle = this.getPugTokenStyleAttr('Container', token).trim();
    let code = `      .${layoutClasses[layout as keyof typeof layoutClasses]}${tokenStyle ? `(${tokenStyle})` : ''}`;
    (components || []).forEach((child: ComponentDef, index: number) => {
      const childCode = this.renderComponent(child, index);
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    
    return code;
  }

  protected renderForm(props: FormComponent, key: number): string {
    const { id, fields = [], actions = [], token } = props;
    const tokenStyle = this.getPugTokenStyleAttr('Form', token).trim();
    
    let code = `      form(id="${id}" class="space-y-4"${tokenStyle ? ` ${tokenStyle}` : ''})`;
    
    fields.forEach((field: FormField, index: number) => {
      const fieldCode = this.renderFormField(field, index);
      if (fieldCode) {
        const indentedCode = fieldCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    
    code += `\n        .flex.space-x-4`;
    actions.forEach((action: FormAction, index: number) => {
      const actionCode = this.renderFormAction(action, index);
      if (actionCode) {
        const indentedCode = actionCode.split('\n').map(line => `  ${line}`).join('\n');
        code += `\n${indentedCode}`;
      }
    });
    
    return code;
  }
}
