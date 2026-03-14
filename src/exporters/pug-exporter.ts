import type {
  TextUIDSL, ComponentDef, FormComponent, FormField, FormAction,
  TextComponent, InputComponent, ButtonComponent, CheckboxComponent,
  RadioComponent, SelectComponent, DatePickerComponent, SelectOption, DividerComponent, SpacerComponent,
  AlertComponent, ContainerComponent, AccordionComponent,
  TabsComponent, TreeViewComponent, TableComponent, LinkComponent, BadgeComponent, ProgressComponent, ImageComponent
} from '../renderer/types';
import type { ExportOptions } from './index';
import { BaseComponentRenderer } from './base-component-renderer';
import { StyleManager } from '../utils/style-manager';
import type { ExporterAstNode } from './exporter-ast';

export class PugExporter extends BaseComponentRenderer {
  constructor() {
    super('pug');
  }

  async export(dsl: TextUIDSL, _options: ExportOptions): Promise<string> {
    const componentCode = this.renderPageComponents(dsl);
    
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

  protected renderText(props: TextComponent, _key: number): string {
    const { value, size = 'base', weight = 'normal', color = 'text-gray-900', token } = props;
    const styleManager = this.getStyleManager();
    const sizeClasses = styleManager.getSizeClasses(this.format);
    const weightClasses = styleManager.getWeightClasses(this.format);
    const tokenStyle = this.getPugTokenStyleSuffix('Text', token);
    
    return `      p(class="${sizeClasses[size as keyof typeof sizeClasses]} ${weightClasses[weight as keyof typeof weightClasses]} ${color}"${tokenStyle}) ${value}`;
  }

  protected renderInput(props: InputComponent, _key: number): string {
    const { label, placeholder, type = 'text', required = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getPugTokenStyleSuffix('Input', token);
    const inputAttrs = this.buildAttrs({ required, disabled });

    const inputCode = `        input(type="${type}" placeholder="${placeholder || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${inputAttrs}${tokenStyle})`;

    return this.buildLabeledFieldBlock(
      label,
      inputCode,
      '      .mb-4',
      '',
      safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2 ${safeLabel}`
    );
  }

  protected renderButton(props: ButtonComponent, _key: number): string {
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
    const tokenStyle = this.getPugTokenStyleSuffix('Button', token);
    
    return `      button(class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${variantClasses[kind as keyof typeof variantClasses]} ${sizeClasses[size as keyof typeof sizeClasses]} ${disabledClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" ${disabledAttr}${tokenStyle}) ${label}`;
  }

  protected renderCheckbox(props: CheckboxComponent, _key: number): string {
    const { label, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getPugTokenStyleSuffix('Checkbox', token);
    const checkboxAttrs = this.buildAttrs({ checked, disabled });
    const checkboxInput = `        input(type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${disabledClass}"${checkboxAttrs}${tokenStyle})`;

    return this.buildControlRowWithLabel(
      label,
      checkboxInput,
      '      .flex.items-center.mb-4',
      '',
      safeLabel => `        label.ml-2.block.text-sm.text-gray-900 ${safeLabel}`
    );
  }


  protected renderRadio(props: RadioComponent, _key: number): string {
    const { label, value, name, checked = false, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getPugTokenStyleSuffix('Radio', token);
    const radioAttrs = this.buildAttrs({ checked, disabled });
    const radioInput = `        input(type="radio" name="${name || 'radio'}" value="${value || ''}" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${disabledClass}"${radioAttrs}${tokenStyle})`;

    return this.buildControlRowWithLabel(
      label,
      radioInput,
      '      .flex.items-center.mb-4',
      '',
      safeLabel => `        label.ml-2.block.text-sm.text-gray-900 ${safeLabel}`
    );
  }


  protected renderSelect(props: SelectComponent, _key: number): string {
    const { label, options = [], placeholder, disabled = false, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getPugTokenStyleSuffix('Select', token);
    const selectAttrs = this.buildAttrs({ disabled });

    let selectCode = `        select(class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${selectAttrs}${tokenStyle})`;

    if (placeholder) {
      selectCode += `
          option(value="") ${placeholder}`;
    }

    options.forEach((opt: SelectOption) => {
      selectCode += `
          option(value="${opt.value}") ${opt.label}`;
    });

    return this.buildLabeledFieldBlock(
      label,
      selectCode,
      '      .mb-4',
      '',
      safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2 ${safeLabel}`
    );
  }

  protected renderDatePicker(props: DatePickerComponent, _key: number): string {
    const { label, name = 'date', required = false, disabled = false, min, max, value, token } = props;
    const disabledClass = this.getDisabledClass(disabled);
    const tokenStyle = this.getPugTokenStyleSuffix('DatePicker', token);
    const dateInputAttrs = this.buildAttrs({ required, disabled, min, max, value });

    const dateInputCode = `        input(type="date" id="${name}" name="${name}" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${disabledClass}"${dateInputAttrs}${tokenStyle})`;

    return this.buildLabeledFieldBlock(
      label,
      dateInputCode,
      '      .mb-4',
      '',
      safeLabel => `        label.block.text-sm.font-medium.text-gray-700.mb-2(for="${name}") ${safeLabel}`
    );
  }

  protected renderDivider(props: DividerComponent, _key: number): string {
    const { orientation = 'horizontal', spacing = 'md', token } = props;
    const styleManager = this.getStyleManager();
    const spacingClasses = styleManager.getSpacingClasses(this.format);
    const tokenStyle = this.getPugTokenStyleSuffix('Divider', token);
    const tokenStyleModifier = this.getPugTokenStyleModifier('Divider', token);
    
    if (orientation === 'vertical') {
      return `      .inline-block.w-px.h-6.bg-gray-300.mx-4${tokenStyleModifier}`;
    }
    
    return `      hr(class="border-gray-300 ${spacingClasses[spacing as keyof typeof spacingClasses]}"${tokenStyle})`;
  }

  protected renderSpacer(props: SpacerComponent, _key: number): string {
    const { width: resolvedWidth, height: resolvedHeight } = this.resolveSpacerDimensions(props);

    return `      .textui-spacer(style="width: ${resolvedWidth}; height: ${resolvedHeight}; flex-shrink: 0;" aria-hidden="true")`;
  }

  protected renderAlert(props: AlertComponent, _key: number): string {
    const { message, variant = 'info', title, token } = props;
    const styleManager = this.getStyleManager();
    const variantClasses = styleManager.getAlertVariantClasses(this.format);
    const tokenStyle = this.getPugTokenStyleSuffix('Alert', token);
    
    let code = `      .p-4.border.rounded-md(class="${variantClasses[variant as keyof typeof variantClasses]}"${tokenStyle})`;
    if (title) {
      code += `\n        h3.text-sm.font-medium.mb-1 ${title}`;
    }
    code += `\n        p.text-sm ${message}`;
    
    return code;
  }



  protected renderBadge(props: BadgeComponent, _key: number): string {
    const { label, variant = 'default', size = 'md', token } = props;
    const tokenStyle = this.getPugTokenStyleSuffix('Badge', token);
    return `      span(class="textui-badge textui-badge-${this.escapeAttribute(variant)} textui-badge-${this.escapeAttribute(size)}"${tokenStyle}) ${this.escapeHtml(label)}`;
  }


  protected renderProgress(props: ProgressComponent, _key: number): string {
    const { value, label, showValue = true, variant = 'default', token } = props;
    const normalizedValue = Math.min(100, Math.max(0, value));
    let code = '      .textui-progress';

    if (label || showValue) {
      code += '\n        .textui-progress-header';
      code += `\n          span.textui-progress-label ${this.escapeHtml(label ?? '')}`;
      if (showValue) {
        code += `\n          span.textui-progress-value ${this.escapeHtml(`${normalizedValue}%`)}`;
      }
    }

    code += `\n        .textui-progress-track`;
    code += `\n          .textui-progress-fill.textui-progress-${this.escapeAttribute(variant)}(style="width: ${this.escapeAttribute(`${normalizedValue}%`)};${token ? ` background-color: ${this.escapeAttribute(token)};` : ''}")`;
    return code;
  }

  protected renderImage(props: ImageComponent, _key: number): string {
    const { src, alt = '', width, height, variant = 'default', token } = props;
    const tokenStyle = this.getPugTokenStyleSuffix('Image', token);
    const styleChunks: string[] = [];
    if (width) {
      styleChunks.push(`width: ${this.escapeAttribute(width)};`);
    }
    if (height) {
      styleChunks.push(`height: ${this.escapeAttribute(height)};`);
    }
    const styleAttr = styleChunks.length > 0 ? ` style="${styleChunks.join(' ')}"` : '';
    const variantClass = variant === 'avatar' ? ' rounded-full' : '';
    return `      img(src="${this.escapeAttribute(src)}" alt="${this.escapeAttribute(alt)}" class="textui-image${variantClass}"${styleAttr}${tokenStyle})`;
  }

  protected renderLink(props: LinkComponent, _key: number): string {
    const { href, label, target, token } = props;
    const tokenStyle = this.getPugTokenStyleSuffix('Link', token);
    const targetAttr = target ? ` target=\"${this.escapeAttribute(target)}\"` : '';
    const relAttr = target === '_blank' ? ' rel=\"noopener noreferrer\"' : '';

    return `      a(href=\"${this.escapeAttribute(href)}\"${targetAttr}${relAttr} class=\"textui-link\"${tokenStyle}) ${this.escapeHtml(label)}`;
  }

  protected renderAccordion(props: AccordionComponent, _key: number): string {
    const { allowMultiple = false, items = [], token } = props;
    const tokenStyle = this.getPugTokenStyleSuffix('Accordion', token);

    let code = `      .textui-accordion.border.border-gray-300.rounded-md.divide-y.divide-gray-200(data-allow-multiple="${allowMultiple ? 'true' : 'false'}"${tokenStyle})`;
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
          const indentedCode = this.adjustIndentation(childCode, '  ');
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



  protected renderTabs(props: TabsComponent, _key: number): string {
    const { defaultTab = 0, items = [], token } = props;
    const activeIndex = this.resolveActiveTabIndex(defaultTab, items.length);
    const tokenStyleModifier = this.getPugTokenStyleModifier('Tabs', token);

    let code = `      .textui-tabs.border.border-gray-300.rounded-md.overflow-hidden${tokenStyleModifier}`;
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
      const indentedCode = this.adjustIndentation(itemCode, '  ');
      code += `\n${indentedCode}`;
    });

    return code;
  }

  protected renderTreeView(props: TreeViewComponent, _key: number): string {
    const { items = [], showLines = true, expandAll = false, token } = props;
    const tokenStyleModifier = this.getPugTokenStyleModifier('TreeView', token);
    const listClass = showLines ? 'with-lines' : 'without-lines';

    const buildNodeListAst = (nodes: TreeViewComponent['items'], depth: number): ExporterAstNode => ({
      line: `ul.textui-treeview-list.${listClass}`,
      children: nodes.map((node, index) => {
        const children = node.children || [];
        const components = node.components || [];
        const hasChildren = children.length > 0 || components.length > 0;
        const label = `${node.icon ? `${node.icon} ` : ''}${node.label ?? ''}`;

        if (!hasChildren) {
          return {
            line: 'li.textui-treeview-item',
            children: [
              {
                line: '.textui-treeview-label-row',
                children: [
                  { line: 'span.textui-treeview-toggle.placeholder •' },
                  { line: `span.textui-treeview-label ${label}` }
                ]
              }
            ]
          };
        }

        const shouldOpen = expandAll || node.expanded;
        const componentChildren: ExporterAstNode[] = components.map((component: ComponentDef, componentIndex: number) => ({
          line: this.renderComponent(component, _key * 100000 + depth * 1000 + index * 100 + componentIndex)
        }));
        const nestedChildren = children.length > 0 ? [buildNodeListAst(children, depth + 1)] : [];

        return {
          line: 'li.textui-treeview-item',
          children: [
            {
              line: `details${shouldOpen ? '(open)' : ''}`,
              children: [
                {
                  line: 'summary.textui-treeview-label-row',
                  children: [
                    { line: 'span.textui-treeview-toggle ▸' },
                    { line: `span.textui-treeview-label ${label}` }
                  ]
                },
                {
                  line: '.textui-treeview-children',
                  children: [...componentChildren, ...nestedChildren]
                }
              ]
            }
          ]
        };
      })
    });

    const ast: ExporterAstNode = {
      line: `.textui-treeview${tokenStyleModifier}`,
      children: [buildNodeListAst(items, 0)]
    };

    return this.renderAst(ast, '  ', 3);
  }

  protected renderTable(props: TableComponent, _key: number): string {
    const { columns = [], rows = [], striped = false, token } = props;
    const tokenStyleModifier = this.getPugTokenStyleModifier('Table', token);

    if (columns.length === 0) {
      return `      .text-sm.text-yellow-700.border.border-yellow-400.rounded-md.px-3.py-2 Table の columns が未定義です`;
    }

    let code = `      .overflow-x-auto.border.border-gray-300.rounded-md${tokenStyleModifier}`;
    code += `\n        table.min-w-full.divide-y.divide-gray-200.text-sm.text-gray-900`;
    code += `\n          thead.bg-gray-100`;
    code += `\n            tr`;

    columns.forEach(column => {
      const widthStyle = column.width ? `(style=\"width: ${this.escapeAttribute(column.width)}\")` : '';
      code += `\n              th.px-4.py-2.text-left.font-semibold.text-gray-900${widthStyle} ${column.header}`;
    });

    code += `\n          tbody.divide-y.divide-gray-200.bg-white`;

    rows.forEach((row, rowIndex) => {
      const stripedClass = striped && rowIndex % 2 === 1 ? '.bg-gray-50' : '';
      code += `\n            tr${stripedClass}`;
      columns.forEach(column => {
        const value = this.toTableCellText(row[column.key]);
        const widthStyle = column.width ? `(style=\"width: ${this.escapeAttribute(column.width)}\")` : '';
        code += `\n              td.px-4.py-2.align-top.text-gray-700${widthStyle} ${value}`;
      });
    });

    return code;
  }

  protected renderContainer(props: ContainerComponent, _key: number): string {
    const { layout = 'vertical', components = [], width, flexGrow, minWidth, token } = props;
    const layoutClasses = {
      'vertical': 'flex flex-col space-y-4',
      'horizontal': 'flex space-x-4',
      'flex': 'flex flex-wrap gap-4',
      'grid': 'grid grid-cols-1 gap-4'
    };
    
    const tokenStyleModifier = this.getPugTokenStyleModifier('Container', token);
    const styleChunks: string[] = [];
    if (typeof flexGrow === 'number') {
      styleChunks.push(`flex-grow: ${this.escapeAttribute(String(flexGrow))};`, 'flex-shrink: 0;', `flex-basis: ${this.escapeAttribute(width ?? '0')};`);
    }
    if (width) {
      styleChunks.push(`width: ${this.escapeAttribute(width)};`);
    }
    if (minWidth) {
      styleChunks.push(`min-width: ${this.escapeAttribute(minWidth)};`);
    }
    const styleAttr = styleChunks.length > 0 ? `(style=\"${styleChunks.join(' ')}\")` : '';
    let code = `      .${layoutClasses[layout as keyof typeof layoutClasses]}${styleAttr}${tokenStyleModifier}`;
    (components || []).forEach((child: ComponentDef, index: number) => {
      const childCode = this.renderComponent(child, index);
      const indentedCode = this.adjustIndentation(childCode, '  ');
      code += `\n${indentedCode}`;
    });
    
    return code;
  }

  protected renderForm(props: FormComponent, _key: number): string {
    const { id, fields = [], actions = [], token } = props;
    const tokenStyle = this.getPugTokenStyleSuffix('Form', token);
    
    let code = `      form(id="${id}" class="space-y-4"${tokenStyle})`;
    
    fields.forEach((field: FormField, index: number) => {
      const fieldCode = this.renderFormField(field, index);
      if (fieldCode) {
        const indentedCode = this.adjustIndentation(fieldCode, '  ');
        code += `\n${indentedCode}`;
      }
    });
    
    code += `\n        .flex.space-x-4`;
    actions.forEach((action: FormAction, index: number) => {
      const actionCode = this.renderFormAction(action, index);
      if (actionCode) {
        const indentedCode = this.adjustIndentation(actionCode, '  ');
        code += `\n${indentedCode}`;
      }
    });
    
    return code;
  }
}
