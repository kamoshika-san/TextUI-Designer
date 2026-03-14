import type {
  AccordionComponent,
  ComponentDef,
  ContainerComponent,
  TableComponent,
  TabsComponent,
  TreeViewComponent
} from '../../renderer/types';
import type { HtmlRendererUtils } from './html-renderer-utils';

export class HtmlLayoutRenderer {
  constructor(private readonly utils: HtmlRendererUtils) {}

  renderAccordion(props: AccordionComponent): string {
    const { allowMultiple = false, items = [], token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Accordion', token);

    let code = `    <div class="textui-accordion border border-gray-700 rounded-md divide-y divide-gray-700" data-allow-multiple="${allowMultiple ? 'true' : 'false'}"${tokenStyle}>`;
    items.forEach((item, index) => {
      const safeTitle = this.utils.escapeHtml(item.title ?? '');
      const safeContent = this.utils.escapeHtml(item.content ?? '');
      const isOpen = item.open ? 'true' : 'false';
      const nestedCode = (item.components || [])
        .map((component: ComponentDef, childIndex: number) => this.utils.renderComponent(component, index * 1000 + childIndex))
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
    code += '\n    </div>';

    return code;
  }

  renderTabs(props: TabsComponent, key: number): string {
    const { defaultTab = 0, items = [], token } = props;
    const activeIndex = this.utils.resolveActiveTabIndex(defaultTab, items.length);
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Tabs', token);

    const tabsHeader = items
      .map((item, index) => `          <button type="button" class="px-4 py-2 text-sm border-r border-gray-300 last:border-r-0 ${index === activeIndex ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-700'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}" ${item.disabled ? 'disabled' : ''}>${this.utils.escapeHtml(item.label ?? '')}</button>`)
      .join('\n');

    const panelItems = (items[activeIndex]?.components || [])
      .map((component: ComponentDef, index: number) => this.utils.renderComponent(component, index))
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

  renderTreeView(props: TreeViewComponent, key: number): string {
    const { items = [], showLines = true, expandAll = false, token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('TreeView', token);
    const listClass = showLines ? 'textui-treeview-list with-lines' : 'textui-treeview-list without-lines';

    const renderNodeList = (nodes: TreeViewComponent['items'], depth: number, indent: string): string => {
      const nodeCode = nodes.map((node, index) => {
        const children = node.children || [];
        const components = node.components || [];
        const hasChildren = children.length > 0 || components.length > 0;
        const label = `${node.icon ? `${this.utils.escapeHtml(node.icon)} ` : ''}${this.utils.escapeHtml(node.label ?? '')}`;
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
            this.utils.renderComponent(component, key * 100000 + depth * 1000 + index * 100 + componentIndex)
          )
          .map(code => code.split('\n').map(line => `${nodeIndent}      ${line}`).join('\n'))
          .join('\n');

        const childrenCode = children.length > 0
          ? renderNodeList(children, depth + 1, `${nodeIndent}      `)
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

    const treeCode = renderNodeList(items, 0, '      ');
    return `    <div class="textui-treeview"${tokenStyle}>
${treeCode}
    </div>`;
  }

  renderTable(props: TableComponent): string {
    const { columns = [], rows = [], striped = false, token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Table', token);

    if (columns.length === 0) {
      return '    <div class="text-sm text-yellow-300 border border-yellow-700 rounded-md px-3 py-2">Table の columns が未定義です</div>';
    }

    const headerCode = columns
      .map(column => {
        const widthStyle = column.width ? ` style="width: ${this.utils.escapeAttribute(column.width)}"` : '';
        return `          <th class="px-4 py-2 text-left font-semibold text-gray-100"${widthStyle}>${this.utils.escapeHtml(column.header)}</th>`;
      })
      .join('\n');

    const bodyCode = rows
      .map((row, rowIndex) => {
        const rowClass = striped && rowIndex % 2 === 1 ? ' class="bg-gray-800/70"' : '';
        const cells = columns
          .map(column => {
            const widthStyle = column.width ? ` style="width: ${this.utils.escapeAttribute(column.width)}"` : '';
            return `          <td class="px-4 py-2 align-top text-gray-300"${widthStyle}>${this.utils.escapeHtml(this.utils.toTableCellText(row[column.key]))}</td>`;
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

  renderContainer(props: ContainerComponent): string {
    const { layout = 'vertical', components = [], width, flexGrow, minWidth, token } = props;
    const tokenStyle = this.utils.getHtmlTokenStyleAttr('Container', token);
    const layoutClasses = {
      vertical: 'textui-container flex flex-col space-y-4',
      horizontal: 'textui-container flex flex-row space-x-4',
      flex: 'textui-container flex flex-wrap gap-4',
      grid: 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    };

    const styleChunks: string[] = [];
    if (typeof flexGrow === 'number') {
      styleChunks.push(`flex-grow: ${this.utils.escapeAttribute(String(flexGrow))};`, 'flex-shrink: 0;', `flex-basis: ${this.utils.escapeAttribute(width ?? '0')};`);
    }
    if (width) {
      styleChunks.push(`width: ${this.utils.escapeAttribute(width)};`);
    }
    if (minWidth) {
      styleChunks.push(`min-width: ${this.utils.escapeAttribute(minWidth)};`);
    }
    const styleAttr = styleChunks.length > 0 ? ` style="${styleChunks.join(' ')}"` : '';

    let code = `    <div class="${layoutClasses[layout as keyof typeof layoutClasses]}"${styleAttr}${tokenStyle}>`;
    components.forEach((child: ComponentDef, index: number) => {
      const childCode = this.utils.renderComponent(child, index);
      const indentedCode = childCode.split('\n').map(line => `  ${line}`).join('\n');
      code += `\n${indentedCode}`;
    });
    code += '\n    </div>';

    return code;
  }
}
