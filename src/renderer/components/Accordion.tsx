import React, { useId, useMemo, useState } from 'react';
import type { AccordionComponent, ComponentDef } from '../domain/dsl-types';

interface RenderContext {
  dslPath: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

interface AccordionProps extends AccordionComponent {
  renderComponent?: (component: ComponentDef, key: React.Key, context?: RenderContext) => React.ReactNode;
  dslPath?: string;
  onJumpToDsl?: (dslPath: string, componentName: string) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  allowMultiple = false,
  items,
  renderComponent,
  dslPath,
  onJumpToDsl
}) => {
  const accordionId = useId();
  const initialOpenIndexes = useMemo(() => {
    const indexes: number[] = [];
    items.forEach((item, index) => {
      if (item.open) {
        indexes.push(index);
      }
    });
    return indexes;
  }, [items]);

  const [openIndexes, setOpenIndexes] = useState<number[]>(initialOpenIndexes);

  const toggleItem = (index: number): void => {
    setOpenIndexes(prev => {
      const isOpen = prev.includes(index);
      if (isOpen) {
        return prev.filter(itemIndex => itemIndex !== index);
      }
      if (allowMultiple) {
        return [...prev, index];
      }
      return [index];
    });
  };

  const isItemOpen = (index: number): boolean => openIndexes.includes(index);

  return (
    <div className="textui-accordion border border-gray-700 rounded-md divide-y divide-gray-700">
      {items.map((item, index) => {
        const isOpen = isItemOpen(index);
        const buttonId = `${accordionId}-button-${index}`;
        const panelId = `${accordionId}-panel-${index}`;

        return (
          <div key={`${item.title}-${index}`} className="textui-accordion-item">
            <h3>
              <button
                id={buttonId}
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-200 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  toggleItem(index);
                }}
              >
                <span>{item.title}</span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`px-4 pb-4 text-sm text-gray-300 ${isOpen ? 'block' : 'hidden'}`}
            >
              {Array.isArray(item.components) && item.components.length > 0 && renderComponent ? (
                <div className="space-y-3">
                  {item.components.map((component, componentIndex) =>
                    renderComponent(component, index * 1000 + componentIndex, {
                      dslPath: `${dslPath ?? ''}/Accordion/items/${index}/components/${componentIndex}`,
                      onJumpToDsl
                    })
                  )}
                </div>
              ) : (
                item.content ?? null
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
