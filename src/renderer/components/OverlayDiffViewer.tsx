import React, { useEffect, useState } from 'react';
import { renderRegisteredComponent } from '../component-map';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';
import type {
  ComponentIndexPair,
  SemanticChangePrefix,
  SemanticSummaryLine
} from '../../core/textui-semantic-diff-summary';

function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

const COLOR: Record<string, string> = {
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
  '+': '追加',
  '~': '変更',
  '-': '削除',
  '?': '要確認',
};

interface ComponentGroup {
  groupKey: string;
  componentIndexA?: number;
  componentIndexB?: number;
  label: string;
  prefix: SemanticChangePrefix;
  lines: SemanticSummaryLine[];
}

const GROUP_ORDER: Record<string, number> = { '+': 0, '~': 1, '-': 2, '?': 3 };

function groupSummaryLines(lines: SemanticSummaryLine[], pairings: ComponentIndexPair[] = []): ComponentGroup[] {
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
      label: line.displayName ?? line.componentType ?? 'コンポーネント',
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

  const pageGroup: ComponentGroup = { groupKey: 'page', label: 'ページ', prefix: '~', lines: [] };
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
        label: line.displayName ?? line.componentType ?? 'コンポーネント',
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

function SummaryBadge({ count, color, symbol }: { count: number; color: string; symbol: string }) {
  if (count === 0) {
    return null;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', fontWeight: 700, color }}>
      {symbol}{count}
    </span>
  );
}

function AccordionItem({
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

function SemanticSummaryPane({
  lines,
  pairings,
  highlightedGroupKey,
  onGroupClick,
}: {
  lines: SemanticSummaryLine[];
  pairings: ComponentIndexPair[];
  highlightedGroupKey: string | null;
  onGroupClick: (groupKey: string) => void;
}) {
  const groups = groupSummaryLines(lines, pairings);
  const addCount = lines.filter(line => line.prefix === '+').length;
  const updateCount = lines.filter(line => line.prefix === '~').length;
  const removeCount = lines.filter(line => line.prefix === '-').length;
  const ambigCount = lines.filter(line => line.prefix === '?').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.80rem', color: '#dbeafe' }}>変更サマリー</span>
        <span style={{ display: 'flex', gap: 8 }}>
          <SummaryBadge count={addCount} color={COLOR.add} symbol="+" />
          <SummaryBadge count={updateCount} color={COLOR.update} symbol="~" />
          <SummaryBadge count={removeCount} color={COLOR.remove} symbol="-" />
          <SummaryBadge count={ambigCount} color={COLOR.ambiguous} symbol="?" />
        </span>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto', flex: 1 }}>
        {groups.map(group => (
          <AccordionItem
            key={group.groupKey}
            group={group}
            isHighlighted={highlightedGroupKey === group.groupKey}
            onToggleHighlight={() => onGroupClick(group.groupKey)}
          />
        ))}
      </ul>
    </div>
  );
}

function NoSummaryPane() {
  return (
    <div
      style={{
        width: 200,
        minWidth: 160,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.3)',
        borderLeft: '1px solid rgba(148,163,184,0.1)',
        color: 'rgba(148,163,184,0.5)',
        fontSize: '0.75rem',
        textAlign: 'center',
        padding: '0 16px',
      }}
    >
      変更サマリーを
      <br />
      生成できませんでした
    </div>
  );
}

interface OverlayDiffViewerProps {
  state: OverlayDiffState;
}

const STEPS = [0, 33, 67, 100] as const;

export const OverlayDiffViewer: React.FC<OverlayDiffViewerProps> = ({ state }) => {
  const [stepIndex, setStepIndex] = useState(1);
  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);
  const slider = STEPS[stepIndex];

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;
  const labelA = basename(state.fileNameA);
  const labelB = basename(state.fileNameB);
  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];
  const maxCount = Math.max(componentsA.length, componentsB.length);
  const summaryLines = state.semanticSummary?.lines ?? null;
  const summaryPairings = state.semanticSummary?.componentPairings ?? [];
  const groups = summaryLines ? groupSummaryLines(summaryLines, summaryPairings) : [];

  const highlightIndexA = new Map<number, string>();
  const highlightIndexB = new Map<number, string>();
  for (const group of groups) {
    if (group.componentIndexA !== undefined) {
      highlightIndexA.set(group.componentIndexA, group.groupKey);
    }
    if (group.componentIndexB !== undefined) {
      highlightIndexB.set(group.componentIndexB, group.groupKey);
    }
  }

  const sortedGroupKeys = groups.map(group => group.groupKey);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStepIndex(index => Math.max(0, index - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStepIndex(index => Math.min(3, index + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (sortedGroupKeys.length === 0) {
          return;
        }
        event.preventDefault();
        const currentIndex = sortedGroupKeys.indexOf(highlightedGroupKey ?? '');
        if (event.key === 'ArrowDown') {
          setHighlightedGroupKey(sortedGroupKeys[(currentIndex + 1) % sortedGroupKeys.length]);
        } else {
          setHighlightedGroupKey(sortedGroupKeys[(currentIndex - 1 + sortedGroupKeys.length) % sortedGroupKeys.length]);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightedGroupKey, sortedGroupKeys]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'rgba(15, 23, 42, 0.72)',
            color: '#dbeafe',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              opacity: opacityA < 0.15 ? 0.4 : 1,
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
            }}
            title={state.fileNameA}
          >
            Before: {labelA}
          </span>

          <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={stepIndex}
              onChange={event => setStepIndex(Number(event.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
              aria-label="透過度スライダー（Before と After の切替）"
            />
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
              {slider === 0 ? 'Before のみ' : slider === 100 ? 'After のみ' : `After ${slider}%`}
            </span>
          </div>

          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              opacity: opacityB < 0.15 ? 0.4 : 1,
              transition: 'opacity 0.2s',
              whiteSpace: 'nowrap',
            }}
            title={state.fileNameB}
          >
            After: {labelB}
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, position: 'relative' }}>
          <div style={{ position: 'relative', minHeight: maxCount > 0 ? maxCount * 60 : 200 }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: opacityA,
                transition: 'opacity 0.05s',
                pointerEvents: slider >= 100 ? 'none' : 'auto',
              }}
            >
              {componentsA.map((component, index) => {
                const isHighlighted =
                  highlightIndexA.get(index) === highlightedGroupKey && highlightedGroupKey !== null;
                return (
                  <div key={`overlay-a-${index}`} style={{ position: 'relative' }}>
                    {renderRegisteredComponent(component, `overlay-a-${index}`)}
                    {isHighlighted && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          border: '2px solid #60a5fa',
                          boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                          pointerEvents: 'none',
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: opacityB,
                transition: 'opacity 0.05s',
                pointerEvents: 'none',
              }}
            >
              {componentsB.map((component, index) => {
                const isHighlighted =
                  highlightIndexB.get(index) === highlightedGroupKey && highlightedGroupKey !== null;
                return (
                  <div key={`overlay-b-${index}`} style={{ position: 'relative' }}>
                    {renderRegisteredComponent(component, `overlay-b-${index}`)}
                    {isHighlighted && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          border: '2px solid #60a5fa',
                          boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                          pointerEvents: 'none',
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 280,
          minWidth: 240,
          maxWidth: 320,
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          borderLeft: '1px solid rgba(148,163,184,0.15)',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {summaryLines !== null && summaryLines.length > 0 ? (
          <SemanticSummaryPane
            lines={summaryLines}
            pairings={summaryPairings}
            highlightedGroupKey={highlightedGroupKey}
            onGroupClick={groupKey => setHighlightedGroupKey(current => (current === groupKey ? null : groupKey))}
          />
        ) : (
          <NoSummaryPane />
        )}
      </div>
    </div>
  );
};
