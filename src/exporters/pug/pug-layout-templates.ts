import {
  isComponentDefValue,
  type ComponentDef,
  type FormComponent,
  type FormField,
  type FormAction,
  type BreadcrumbComponent,
  type AccordionComponent,
  type TabsComponent,
  type TreeViewComponent,
  type TableComponent,
  type ContainerComponent
} from '../../renderer/types';
import type { ExporterAstNode } from '../exporter-ast';

export function renderPugBreadcrumb(
  props: BreadcrumbComponent,
  ctx: {
    tokenStyleModifier: string;
    escapeHtml: (v: unknown) => string;
    escapeAttribute: (v: unknown) => string;
  }
): string {
  const { items = [], separator = '/' } = props;
  const { tokenStyleModifier, escapeHtml, escapeAttribute } = ctx;

  let code = `      nav.textui-breadcrumb(aria-label="Breadcrumb"${tokenStyleModifier})`;
  code += '\n        ol.textui-breadcrumb-list';

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    code += '\n          li.textui-breadcrumb-item';
    if (item.href && !isLast) {
      const targetAttr = item.target ? ` target="${escapeAttribute(item.target)}"` : '';
      const relAttr = item.target === '_blank' ? ' rel="noopener noreferrer"' : '';
      code += `
            a.textui-breadcrumb-link(href="${escapeAttribute(item.href)}"${targetAttr}${relAttr}) ${escapeHtml(item.label)}`;
    } else {
      code += `
            span(class="${isLast ? 'textui-breadcrumb-current' : 'textui-breadcrumb-label'}") ${escapeHtml(item.label)}`;
    }

    if (!isLast) {
      code += `
            span.textui-breadcrumb-separator(aria-hidden="true") ${escapeHtml(separator)}`;
    }
  });

  return code;
}

export function renderPugAccordion(
  props: AccordionComponent,
  ctx: {
    tokenStyle: string;
    renderComponent: (component: ComponentDef, key: number) => string;
    adjustIndentation: (code: string, baseIndent: string) => string;
  }
): string {
  const { allowMultiple = false, items = [] } = props;
  const { tokenStyle, renderComponent, adjustIndentation } = ctx;

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
        const childCode = renderComponent(component, index * 1000 + childIndex);
        const indentedCode = adjustIndentation(childCode, '  ');
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

export function renderPugTabs(
  props: TabsComponent,
  ctx: {
    tokenStyleModifier: string;
    resolveActiveTabIndex: (defaultTab: number, itemCount: number) => number;
    renderComponent: (component: ComponentDef, key: number) => string;
    adjustIndentation: (code: string, baseIndent: string) => string;
  }
): string {
  const { defaultTab = 0, items = [] } = props;
  const { tokenStyleModifier, resolveActiveTabIndex, renderComponent, adjustIndentation } = ctx;
  const activeIndex = resolveActiveTabIndex(defaultTab, items.length);

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
    const itemCode = renderComponent(component, index);
    const indentedCode = adjustIndentation(itemCode, '  ');
    code += `\n${indentedCode}`;
  });

  return code;
}

export function renderPugTreeView(
  props: TreeViewComponent,
  key: number,
  ctx: {
    tokenStyleModifier: string;
    renderComponent: (component: ComponentDef, key: number) => string;
    renderAst: (node: ExporterAstNode, indentUnit?: string, baseDepth?: number) => string;
  }
): string {
  const { items = [], showLines = true, expandAll = false } = props;
  const { tokenStyleModifier, renderComponent, renderAst } = ctx;
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
        line: renderComponent(component, key * 100000 + depth * 1000 + index * 100 + componentIndex)
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

  return renderAst(ast, '  ', 3);
}

export function renderPugTable(
  props: TableComponent,
  ctx: {
    tokenStyleModifier: string;
    escapeAttribute: (v: unknown) => string;
    toTableCellText: (value: unknown) => string;
    renderComponent: (component: ComponentDef, key: number) => string;
    adjustIndentation: (code: string, baseIndent: string) => string;
  }
): string {
  const { columns = [], rows = [], striped = false, rowHover = false } = props;
  const { tokenStyleModifier, escapeAttribute, toTableCellText, renderComponent, adjustIndentation } = ctx;

  if (columns.length === 0) {
    return `      .text-sm.text-yellow-700.border.border-yellow-400.rounded-md.px-3.py-2 Table の columns が未定義です`;
  }

  let code = `      .overflow-x-auto.border.border-gray-300.rounded-md${tokenStyleModifier}`;
  code += `\n        table.min-w-full.divide-y.divide-gray-200.text-sm.text-gray-900`;
  code += `\n          thead.bg-gray-100`;
  code += `\n            tr`;

  columns.forEach(column => {
    const widthStyle = column.width ? `(style=\"width: ${escapeAttribute(column.width)}\")` : '';
    code += `\n              th.px-4.py-2.text-left.font-semibold.text-gray-900${widthStyle} ${column.header}`;
  });

  code += `\n          tbody.divide-y.divide-gray-200.bg-white`;

  rows.forEach((row, rowIndex) => {
    const rowModifiers = [
      striped && rowIndex % 2 === 1 ? '.bg-gray-50' : '',
      rowHover ? '.hover\:bg-gray-100.transition-colors' : ''
    ].join('');
    code += `\n            tr${rowModifiers}`;
    columns.forEach((column, columnIndex) => {
      const cellValue = row[column.key];
      const widthStyle = column.width ? `(style="width: ${escapeAttribute(column.width)}")` : '';
      if (isComponentDefValue(cellValue)) {
        code += `
              td.px-4.py-2.align-top.text-gray-700${widthStyle}`;
        const cellCode = adjustIndentation(renderComponent(cellValue, rowIndex * 1000 + columnIndex), '                ');
        code += `
${cellCode}`;
        return;
      }
      const value = toTableCellText(cellValue);
      code += `
              td.px-4.py-2.align-top.text-gray-700${widthStyle} ${value}`;
    });
  });

  return code;
}

export function renderPugContainer(
  props: ContainerComponent,
  ctx: {
    tokenStyleModifier: string;
    escapeAttribute: (v: unknown) => string;
    renderComponent: (component: ComponentDef, key: number) => string;
    adjustIndentation: (code: string, baseIndent: string) => string;
  }
): string {
  const { layout = 'vertical', components = [], width, flexGrow, minWidth } = props;
  const { tokenStyleModifier, escapeAttribute, renderComponent, adjustIndentation } = ctx;
  const layoutClasses = {
    'vertical': 'flex flex-col space-y-4',
    'horizontal': 'flex space-x-4',
    'flex': 'flex flex-wrap gap-4',
    'grid': 'grid grid-cols-1 gap-4'
  };

  const styleChunks: string[] = [];
  if (typeof flexGrow === 'number') {
    styleChunks.push(`flex-grow: ${escapeAttribute(String(flexGrow))};`, 'flex-shrink: 0;', `flex-basis: ${escapeAttribute(width ?? '0')};`);
  }
  if (width) {
    styleChunks.push(`width: ${escapeAttribute(width)};`);
  }
  if (minWidth) {
    styleChunks.push(`min-width: ${escapeAttribute(minWidth)};`);
  }
  const styleAttr = styleChunks.length > 0 ? `(style=\"${styleChunks.join(' ')}\")` : '';
  let code = `      .${layoutClasses[layout as keyof typeof layoutClasses]}${styleAttr}${tokenStyleModifier}`;
  (components || []).forEach((child: ComponentDef, index: number) => {
    const childCode = renderComponent(child, index);
    const indentedCode = adjustIndentation(childCode, '  ');
    code += `\n${indentedCode}`;
  });

  return code;
}

export function renderPugForm(
  props: FormComponent,
  ctx: {
    tokenStyle: string;
    renderFormField: (field: FormField, index: number) => string;
    renderFormAction: (action: FormAction, index: number) => string;
    adjustIndentation: (code: string, baseIndent: string) => string;
  }
): string {
  const { id, fields = [], actions = [] } = props;
  const { tokenStyle, renderFormField, renderFormAction, adjustIndentation } = ctx;

  let code = `      form(id="${id}" class="space-y-4"${tokenStyle})`;

  fields.forEach((field: FormField, index: number) => {
    const fieldCode = renderFormField(field, index);
    if (fieldCode) {
      const indentedCode = adjustIndentation(fieldCode, '  ');
      code += `\n${indentedCode}`;
    }
  });

  code += `\n        .flex.space-x-4`;
  actions.forEach((action: FormAction, index: number) => {
    const actionCode = renderFormAction(action, index);
    if (actionCode) {
      const indentedCode = adjustIndentation(actionCode, '  ');
      code += `\n${indentedCode}`;
    }
  });

  return code;
}
