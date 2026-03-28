import { isComponentDefValue, type ComponentDef, type AccordionComponent, type TabsComponent, type TreeViewComponent, type TableComponent, type ContainerComponent, type FormComponent, type FormField, type FormAction } from '../domain/dsl-types';

interface RenderContext {
  renderComponent: (component: ComponentDef, key: number) => string;
  adjustIndentation: (source: string, indent: string) => string;
  toTableCellText: (value: unknown) => string;
}

export function renderAccordionTemplate(props: AccordionComponent, key: number, tokenStyle: string, context: RenderContext): string {
  const { allowMultiple = false, items = [] } = props;

  const itemsCode = items
    .map((item, index) => {
      const itemChildren = item.components || [];
      const nestedCode = itemChildren
        .map((component: ComponentDef, childIndex: number) =>
          context.adjustIndentation(context.renderComponent(component, index * 1000 + childIndex), '            ')
        )
        .join('\n');
      const contentCode = nestedCode || `            ${item.content ?? ''}`;
      const isOpen = Boolean(item.open);

      return `        <div key={${index}} className="textui-accordion-item" data-open={${isOpen}}>
          <h3>
            <button type="button" className={['textui-accordion-trigger', 'px-4', 'py-3', 'text-sm', 'font-medium', 'cursor-pointer', ${isOpen} ? 'is-open' : ''].filter(Boolean).join(' ')} aria-expanded={${isOpen}}>
              <span className="textui-accordion-title">${item.title}</span>
              <span className="textui-accordion-indicator" aria-hidden="true">${isOpen ? '−' : '+'}</span>
            </button>
          </h3>
          <div className={['textui-accordion-panel', 'px-4', 'pb-4', 'text-sm', 'text-gray-600', ${isOpen} ? 'open' : 'hidden'].filter(Boolean).join(' ')}>
            <div className="textui-accordion-body">
${contentCode}
            </div>
          </div>
        </div>`;
    })
    .join('\n');

  return `      <div key={${key}} className="textui-accordion border border-gray-300 rounded-md divide-y divide-gray-200" data-allow-multiple={${allowMultiple}}${tokenStyle}>
${itemsCode}
      </div>`;
}

export function renderTabsTemplate(props: TabsComponent, key: number, tokenStyle: string, resolveActiveTabIndex: (defaultTab: number | undefined, length: number) => number, context: RenderContext): string {
  const { defaultTab = 0, items = [] } = props;
  const activeIndex = resolveActiveTabIndex(defaultTab, items.length);

  const tabsHeader = items
    .map((item, index) => `        <button type="button" className={['textui-tab', 'px-4', 'py-2', 'text-sm', 'border-r', 'border-gray-300', 'last:border-r-0', ${index} === ${activeIndex} ? 'bg-gray-200 text-gray-900 textui-tab-active is-active' : 'bg-gray-100 text-gray-700', ${item.disabled ? 'true' : 'false'} ? 'opacity-50 cursor-not-allowed is-disabled' : ''].filter(Boolean).join(' ')} ${item.disabled ? 'disabled' : ''}>${item.label}</button>`)
    .join('\n');

  const panelItems = (items[activeIndex]?.components || [])
    .map((component: ComponentDef, index: number) => context.renderComponent(component, index))
    .join('\n');

  return `      <div key={${key}} className="textui-tabs border border-gray-300 rounded-md overflow-hidden"${tokenStyle}>
        <div className="textui-tabs-list flex border-b border-gray-300">
${tabsHeader}
        </div>
        <div className="textui-tab-panel p-4">
          <div className="textui-tab-panel-body space-y-3">
${panelItems}
          </div>
        </div>
      </div>`;
}

export function renderTreeViewTemplate(props: TreeViewComponent, key: number, tokenStyle: string, context: RenderContext): string {
  const { items = [], showLines = true, expandAll = false } = props;
  const listClass = showLines ? 'textui-treeview-list with-lines' : 'textui-treeview-list without-lines';
  const hasExpandableNodes = items.some(node => (node.children?.length || 0) > 0 || (node.components?.length || 0) > 0);

  const renderNodeList = (nodes: TreeViewComponent['items'], path: string, depth: number, indent: string): string => {
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
          context.renderComponent(component, key * 100000 + depth * 1000 + index * 100 + componentIndex)
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
        ${hasExpandableNodes ? `<div className="textui-treeview-actions">
          <button type="button" className="textui-treeview-action-link">${expandAll ? 'Collapse all' : 'Expand all'}</button>
        </div>` : ''}
${treeCode}
      </div>`;
}

export function renderTableTemplate(props: TableComponent, key: number, tokenStyle: string, context: RenderContext): string {
  const { columns = [], rows = [], striped = false, rowHover = false } = props;

  if (columns.length === 0) {
    return `      <div key={${key}} className="text-sm text-yellow-700 border border-yellow-400 rounded-md px-3 py-2">Table の columns が未定義です</div>`;
  }

  const headerCode = columns
    .map(column => `              <th key="${column.key}" className="textui-table-header px-4 py-2 text-left font-semibold text-gray-900"${column.width ? ` style={{ width: '${column.width}' }}` : ''}>${column.header}</th>`)
    .join('\n');

  const bodyCode = rows
    .map((row, rowIndex) => {
      const cells = columns
        .map((column, columnIndex) => {
          const cellValue = row[column.key];
          const cellContent = isComponentDefValue(cellValue)
            ? context.adjustIndentation(context.renderComponent(cellValue, rowIndex * 1000 + columnIndex), '                ')
            : context.toTableCellText(cellValue);
          return `              <td key="${rowIndex}-${column.key}" className="textui-table-cell px-4 py-2 align-top text-gray-700"${column.width ? ` style={{ width: '${column.width}' }}` : ''}>${cellContent}</td>`;
        })
        .join('\n');

      return `            <tr key={${rowIndex}} className={['textui-table-row', ${striped} && ${rowIndex} % 2 === 1 ? 'bg-gray-50 is-striped' : '', ${rowHover} ? 'hover:bg-gray-100 transition-colors has-hover' : ''].filter(Boolean).join(' ')}>\n${cells}\n            </tr>`;
    })
    .join('\n');

  return `      <div key={${key}} className="textui-table-container overflow-x-auto border border-gray-300 rounded-md"${tokenStyle}>
        <table className="textui-table min-w-full divide-y divide-gray-200 text-sm text-gray-900">
          <thead className="textui-table-head bg-gray-100">
            <tr>
${headerCode}
            </tr>
          </thead>
          <tbody className="textui-table-body divide-y divide-gray-200 bg-white">
${bodyCode}
          </tbody>
        </table>
      </div>`;
}

export function renderContainerTemplate(props: ContainerComponent, key: number, tokenStyle: string, context: RenderContext): string {
  const { layout = 'vertical', components = [], width, flexGrow, minWidth } = props;
  const layoutClasses = {
    vertical: 'flex flex-col space-y-4',
    horizontal: 'flex space-x-4',
    flex: 'flex flex-wrap gap-4',
    grid: 'grid grid-cols-1 gap-4'
  };

  const childrenCode = components.map((child: ComponentDef, index: number) => context.renderComponent(child, index)).join('\n');

  const styleParts: string[] = [];
  if (typeof flexGrow === 'number') {
    styleParts.push(`flexGrow: ${flexGrow}`, 'flexShrink: 0', `flexBasis: ${width ? `'${width}'` : 0}`);
  }
  if (width) {
    styleParts.push(`width: '${width}'`);
  }
  if (minWidth) {
    styleParts.push(`minWidth: '${minWidth}'`);
  }
  const styleAttr = styleParts.length > 0 ? ` style={{ ${styleParts.join(', ')} }}` : '';

  return `      <div key={${key}} className="${layoutClasses[layout as keyof typeof layoutClasses]}"${styleAttr}${tokenStyle}>
${childrenCode}
      </div>`;
}

export function renderFormTemplate(props: FormComponent, key: number, tokenStyle: string, renderFormField: (field: FormField, index: number) => string, renderFormAction: (action: FormAction, index: number) => string): string {
  const { id, fields = [], actions = [] } = props;

  const fieldsCode = fields.map((field: FormField, index: number) => renderFormField(field, index)).filter(code => code !== '').join('\n');
  const actionsCode = actions.map((action: FormAction, index: number) => renderFormAction(action, index)).filter(code => code !== '').join('\n');

  return `      <form key={${key}} id="${id}" className="space-y-4"${tokenStyle}>
${fieldsCode}
        <div className="flex space-x-4">
${actionsCode}
        </div>
      </form>`;
}
