import React, { useEffect, useState } from 'react';
import type { ComponentDef, TreeViewComponent, TreeViewItem } from '../../domain/dsl-types';

interface RenderContext {
  dslPath: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

interface TreeViewProps extends TreeViewComponent {
  renderComponent?: (comp: ComponentDef, key: React.Key, context?: RenderContext) => React.ReactNode;
  dslPath?: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
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

export function collectExpandableNodePaths(
  items: TreeViewItem[],
  prefix: string = 'node'
): string[] {
  const paths: string[] = [];

  items.forEach((item, index) => {
    const path = `${prefix}-${index}`;
    const children = item.children || [];
    const components = item.components || [];
    if (children.length > 0 || components.length > 0) {
      paths.push(path);
    }
    if (children.length > 0) {
      paths.push(...collectExpandableNodePaths(children, path));
    }
  });

  return paths;
}

export function buildBulkOpenState(paths: string[], isOpen: boolean): Record<string, boolean> {
  return paths.reduce<Record<string, boolean>>((state, path) => {
    state[path] = isOpen;
    return state;
  }, {});
}

export const TreeView: React.FC<TreeViewProps> = ({
  items,
  showLines = true,
  expandAll = false,
  renderComponent,
  dslPath,
  onJumpToDsl
}) => {
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>(
    collectInitialOpenState(items, expandAll)
  );
  const expandableNodePaths = collectExpandableNodePaths(items);
  const hasExpandableNodes = expandableNodePaths.length > 0;
  const isAllExpanded = hasExpandableNodes && expandableNodePaths.every(path => openNodes[path]);

  useEffect(() => {
    setOpenNodes(collectInitialOpenState(items, expandAll));
  }, [items, expandAll]);

  const toggleNode = (path: string) => {
    setOpenNodes(previous => ({
      ...previous,
      [path]: !previous[path]
    }));
  };

  const setAllNodesOpenState = (isOpen: boolean) => {
    if (!hasExpandableNodes) {
      return;
    }
    setOpenNodes(previous => ({
      ...previous,
      ...buildBulkOpenState(expandableNodePaths, isOpen)
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
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
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
                      renderComponent(component, `${path}-component-${componentIndex}`, {
                        dslPath: `${dslPath ?? ''}/TreeView/items/${toPointerPath(path)}/components/${componentIndex}`,
                        onJumpToDsl
                      })
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

  return (
    <div className="textui-treeview">
      {hasExpandableNodes ? (
        <div className="textui-treeview-actions">
          <button
            type="button"
            className="textui-treeview-action-link"
            onClick={() => setAllNodesOpenState(!isAllExpanded)}
          >
            {isAllExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      ) : null}
      {renderNodes(items, 'node')}
    </div>
  );
};

function toPointerPath(nodePath: string): string {
  const tokens = nodePath.split('-');
  const indices = tokens
    .slice(1)
    .filter(token => token.length > 0 && Number.isInteger(Number(token)))
    .map(token => Number(token));
  if (indices.length === 0) {
    return '';
  }
  let pointer = String(indices[0]);
  for (let i = 1; i < indices.length; i += 1) {
    pointer += `/children/${indices[i]}`;
  }
  return pointer;
}
