import React, { useEffect, useState } from 'react';
import type {
  ComponentIndexPair,
  SemanticChangePrefix,
  SemanticSummaryLine
} from '../../core/textui-semantic-diff-summary';

export const COLOR: Record<string, string> = {
  add: '#4ade80',
  update: '#60a5fa',
  remove: '#f87171',
  ambiguous: '#fbbf24',
};

const PREFIX_COLOR: Record<string, string> = {
  '+': COLOR.add,
  '~': COLOR.update,
  '-': COLOR.remove,
  '?': COLOR.ambiguous,
};

const PREFIX_LABEL: Record<string, string> = {
  '+': 'Add',
  '~': 'Change',
  '-': 'Remove',
  '?': 'Needs review',
};

export interface ComponentGroup {
  groupKey: string;
  componentIndexA?: number;
  componentIndexB?: number;
  label: string;
  prefix: SemanticChangePrefix;
  lines: SemanticSummaryLine[];
}

const GROUP_ORDER: Record<string, number> = { '+': 0, '~': 1, '-': 2, '?': 3 };

export function groupSummaryLines(lines: SemanticSummaryLine[], pairings: ComponentIndexPair[] = []): ComponentGroup[] {
  const groups: ComponentGroup[] = [];
  const groupByA = new Map<number, ComponentGroup>();
  const groupByB = new Map<number, ComponentGroup>();

  for (const line of lines) {
    if (!line.isComponentEvent) {
      continue;
    }
    const group: ComponentGroup = {
      groupKey: line.eventId,
      componentIndexA: line.componentIndexA,
      componentIndexB: line.componentIndexB,
      label: line.displayName ?? line.componentType ?? 'Component',
      prefix: line.prefix,
      lines: [line],
    };
    groups.push(group);
    if (line.componentIndexA !== undefined) {
      groupByA.set(line.componentIndexA, group);
    }
    if (line.componentIndexB !== undefined) {
      groupByB.set(line.componentIndexB, group);
    }
  }

  const pageGroup: ComponentGroup = { groupKey: 'page', label: 'Page', prefix: '~', lines: [] };
  let hasPageLines = false;

  for (const line of lines) {
    if (line.isComponentEvent) {
      continue;
    }
    let group = (line.componentIndexA !== undefined ? groupByA.get(line.componentIndexA) : undefined)
      ?? (line.componentIndexB !== undefined ? groupByB.get(line.componentIndexB) : undefined);

    if (!group && (line.componentIndexA !== undefined || line.componentIndexB !== undefined)) {
      const placeholderKey = `prop-a${line.componentIndexA ?? ''}-b${line.componentIndexB ?? ''}`;
      group = {
        groupKey: placeholderKey,
        componentIndexA: line.componentIndexA,
        componentIndexB: line.componentIndexB,
        label: line.displayName ?? line.componentType ?? 'Component',
        prefix: line.prefix,
        lines: [],
      };
      groups.push(group);
      if (line.componentIndexA !== undefined) {
        groupByA.set(line.componentIndexA, group);
      }
      if (line.componentIndexB !== undefined) {
        groupByB.set(line.componentIndexB, group);
      }
    }

    if (group) {
      group.lines.push(line);
    } else {
      pageGroup.lines.push(line);
      hasPageLines = true;
    }
  }

  if (hasPageLines) {
    groups.push(pageGroup);
  }

  if (pairings.length > 0) {
    const pairByB = new Map<number, number>();
    const pairByA = new Map<number, number>();
    for (const pairing of pairings) {
      if (pairing.indexA !== undefined && pairing.indexB !== undefined) {
        pairByA.set(pairing.indexA, pairing.indexB);
        pairByB.set(pairing.indexB, pairing.indexA);
      }
    }
    for (const group of groups) {
      if (group.componentIndexA === undefined && group.componentIndexB !== undefined) {
        const inferredA = pairByB.get(group.componentIndexB);
        if (inferredA !== undefined) {
          group.componentIndexA = inferredA;
        }
      }
      if (group.componentIndexB === undefined && group.componentIndexA !== undefined) {
        const inferredB = pairByA.get(group.componentIndexA);
        if (inferredB !== undefined) {
          group.componentIndexB = inferredB;
        }
      }
    }
  }

  return groups.sort((a, b) => {
    const ai = a.componentIndexA ?? a.componentIndexB ?? Infinity;
    const bi = b.componentIndexA ?? b.componentIndexB ?? Infinity;
    if (ai !== bi) {
      return ai - bi;
    }
    return (GROUP_ORDER[a.prefix] ?? 9) - (GROUP_ORDER[b.prefix] ?? 9);
  });
}

export function SummaryBadge({ count, color, symbol }: { count: number; color: string; symbol: string }) {
  if (count === 0) {
    return null;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', fontWeight: 700, color }}>
      {symbol}{count}
    </span>
  );
}

export function AccordionItem({
  group,
  isHighlighted,
  onToggleHighlight,
}: {
  group: ComponentGroup;
  isHighlighted: boolean;
  onToggleHighlight: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const childLines = group.lines.filter(line => !line.isComponentEvent);
  const hasPositionChange =
    group.componentIndexA !== undefined &&
    group.componentIndexB !== undefined &&
    group.componentIndexA !== group.componentIndexB;
  const hasChildren = childLines.length > 0 || hasPositionChange;

  return (
    <li style={{ borderBottom: '1px solid rgba(148,163,184,0.10)' }}>
      <div
        onClick={() => {
          onToggleHighlight();
          if (hasChildren) {
            setIsOpen(open => !open);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          background: isHighlighted ? 'rgba(96,165,250,0.12)' : undefined,
          borderLeft: isHighlighted ? '2px solid #60a5fa' : '2px solid transparent',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ width: 10, flexShrink: 0, color: '#94a3b8', fontSize: '0.65rem', textAlign: 'center' }}>
          {hasChildren ? (isOpen ? '▾' : '▸') : ''}
        </span>
        <span
          style={{
            color: PREFIX_COLOR[group.prefix] ?? '#e2e8f0',
            fontWeight: 700,
            flexShrink: 0,
            width: 10,
            textAlign: 'center',
            fontSize: '0.78rem',
          }}
          title={PREFIX_LABEL[group.prefix]}
        >
          {group.prefix}
        </span>
        <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#e2e8f0', flex: 1, wordBreak: 'break-word' }}>
          {group.label}
        </span>
      </div>

      {isOpen && hasChildren && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', background: 'rgba(0,0,0,0.18)' }}>
          {hasPositionChange && (
            <li
              key="__reorder__"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '4px 12px 4px 30px',
                borderBottom: '1px solid rgba(148,163,184,0.05)',
                fontFamily: 'var(--vscode-editor-font-family, monospace)',
                fontSize: '0.74rem',
                lineHeight: 1.4,
                color: '#94a3b8',
              }}
            >
              <span style={{ color: PREFIX_COLOR['~'], fontWeight: 700, flexShrink: 0, width: 10, textAlign: 'center' }}>~</span>
              <span>並び替え: {group.componentIndexA! + 1}番目 → {group.componentIndexB! + 1}番目</span>
            </li>
          )}
          {childLines.map(line => (
            <li
              key={line.eventId}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '4px 12px 4px 30px',
                borderBottom: '1px solid rgba(148,163,184,0.05)',
                fontFamily: 'var(--vscode-editor-font-family, monospace)',
                fontSize: '0.74rem',
                lineHeight: 1.4,
                color: '#94a3b8',
              }}
            >
              <span
                style={{
                  color: PREFIX_COLOR[line.prefix] ?? '#e2e8f0',
                  fontWeight: 700,
                  flexShrink: 0,
                  width: 10,
                  textAlign: 'center',
                }}
              >
                {line.prefix}
              </span>
              <span style={{ wordBreak: 'break-word', flex: 1 }}>{line.text}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
