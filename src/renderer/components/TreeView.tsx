import React, { useEffect, useState } from 'react';
import type { ComponentDef, TreeViewComponent, TreeViewItem } from '../types';

interface TreeViewProps extends TreeViewComponent {
  renderComponent?: (comp: ComponentDef, key: React.Key) => React.ReactNode;
}

function collectInitialOpenState(
  items: TreeViewItem[],
  expandAll: boolean,
  prefix: string = 'node'
): Record<string, boolean> {
  const state: Record<string, boolean> = {};

  items.forEach((item, index) => {
    const path = `${prefix}-${index}`;
    state[path] = expandAll || Boolean(item.expanded);
    if (item.children && item.children.length > 0) {
      Object.assign(state, collectInitialOpenState(item.children, expandAll, path));
    }
  });

  return state;
}

export const TreeView: React.FC<TreeViewProps> = ({
  items,
  showLines = true,
  expandAll = false,
  renderComponent
}) => {
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(
    collectInitialOpenState(items, expandAll)
  );

  useEffect(() => {
    setOpenNodes(collectInitialOpenState(items, expandAll));
  }, [items, expandAll]);

  const toggleNode = (path: string) => {
    setOpenNodes(previous => ({
      ...previous,
      [path]: !previous[path]
    }));
  };

  const renderNodes = (nodes: TreeViewItem[], prefix: string): React.ReactNode => (
    <ul className={`textui-treeview-list ${showLines ? 'with-lines' : 'without-lines'}`}>
      {nodes.map((node, index) => {
        const path = `${prefix}-${index}`;
        const children = node.children || [];
        const components = node.components || [];
        const hasChildren = children.length > 0 || components.length > 0;
        const isOpen = openNodes[path] ?? false;

        return (
          <li key={path} className="textui-treeview-item">
            <div className="textui-treeview-label-row">
              {hasChildren ? (
                <button
                  type="button"
                  className="textui-treeview-toggle"
                  onClick={() => toggleNode(path)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? '折りたたむ' : '展開する'}
                >
                  {isOpen ? '▾' : '▸'}
                </button>
              ) : (
                <span className="textui-treeview-toggle placeholder">•</span>
              )}
              <span className="textui-treeview-label">
                {node.icon ? `${node.icon} ` : ''}
                {node.label}
              </span>
            </div>

            {hasChildren && isOpen ? (
              <div className="textui-treeview-children">
                {components.length > 0 && renderComponent
                  ? components.map((component, componentIndex) =>
                      renderComponent(component, `${path}-component-${componentIndex}`)
                    )
                  : null}
                {children.length > 0 ? renderNodes(children, path) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return <div className="textui-treeview">{renderNodes(items, 'node')}</div>;
};
