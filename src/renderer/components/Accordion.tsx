import React, { useId, useMemo, useState } from 'react';
import type { AccordionComponent, ComponentDef } from '../../domain/dsl-types';

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
    <div className="textui-accordion">
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
                className={`textui-accordion-trigger ${isOpen ? 'is-open' : ''}`.trim()}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => {
                  toggleItem(index);
                }}
              >
                <span className="textui-accordion-title">{item.title}</span>
                <span className="textui-accordion-indicator" aria-hidden="true">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`textui-accordion-panel ${isOpen ? 'open' : 'hidden'}`}
            >
              {Array.isArray(item.components) && item.components.length > 0 && renderComponent ? (
                <div className="textui-accordion-body">
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
