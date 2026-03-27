import React, { useMemo, useState } from 'react';
import type { ComponentDef, TabsComponent } from '../../domain/dsl-types';

interface RenderContext {
  dslPath: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

interface TabsProps extends TabsComponent {
  renderComponent: (component: ComponentDef, key: React.Key, context?: RenderContext) => React.ReactNode;
  dslPath?: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultTab = 0,
  items = [],
  renderComponent,
  dslPath,
  onJumpToDsl
}) => {
  const firstEnabledTab = useMemo(() => items.findIndex(item => !item.disabled), [items]);
  const initialTab = useMemo(() => {
    if (items.length === 0) {
      return -1;
    }
    const safeDefault = Math.min(Math.max(defaultTab, 0), items.length - 1);
    if (!items[safeDefault]?.disabled) {
      return safeDefault;
    }
    return firstEnabledTab;
  }, [defaultTab, firstEnabledTab, items]);

  const [activeTab, setActiveTab] = useState<number>(initialTab);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="textui-tabs">
      <div className="textui-tabs-list" role="tablist" aria-label="Tabs">
        {items.map((item, index) => {
          const isSelected = index === activeTab;
          const className = ['textui-tab', isSelected ? 'is-active' : '', item.disabled ? 'is-disabled' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={`${item.label}-${index}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`tab-panel-${index}`}
              id={`tab-${index}`}
              disabled={item.disabled}
              onClick={() => {
                setActiveTab(index);
              }}
              className={className}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => {
        if (index !== activeTab) {
          return null;
        }
        return (
          <div
            key={`panel-${item.label}-${index}`}
            id={`tab-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`tab-${index}`}
            className="textui-tab-panel"
          >
            <div className="textui-tab-panel-body">
              {(item.components || []).map((component: ComponentDef, componentIndex: number) =>
                renderComponent(component, index * 1000 + componentIndex, {
                  dslPath: `${dslPath ?? ''}/Tabs/items/${index}/components/${componentIndex}`,
                  onJumpToDsl
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
