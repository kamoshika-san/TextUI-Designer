import React, { useState, useEffect } from 'react';
import { renderRegisteredComponent } from '../component-map';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';
import type { SemanticSummaryLine, SemanticChangePrefix, ComponentIndexPair } from '../../core/textui-semantic-diff-summary';
import { DecisionButtons } from './DecisionButtons';
import { ImpactBadge } from './ImpactBadge';
import type { ImpactBadgeProps } from './ImpactBadge';
import type { DecisionKind } from '../../domain/review-engine/decision';
import { InMemoryDecisionStore } from '../../domain/review-engine/decision';

// Browser-compatible basename function
function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

// -- Design tokens ------------------------------------------------------------

const COLOR: Record<string, string> = {
  add:       '#4ade80',
  update:    '#60a5fa',
  remove:    '#f87171',
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

// -- Right pane: semantic summary --------------------------------------------

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
  // Pass 1: create one group per component-level event, keyed by eventId (unique)
  const groups: ComponentGroup[] = [];
  const groupByA = new Map<number, ComponentGroup>(); // normalized-A index → group
  const groupByB = new Map<number, ComponentGroup>(); // normalized-B index → group

  for (const line of lines) {
    if (!line.isComponentEvent) { continue; }
    const group: ComponentGroup = {
      groupKey: line.eventId,
      componentIndexA: line.componentIndexA,
      componentIndexB: line.componentIndexB,
      label: line.displayName ?? line.componentType ?? 'コンポーネント',
      prefix: line.prefix,
      lines: [line],
    };
    groups.push(group);
    if (line.componentIndexA !== undefined) { groupByA.set(line.componentIndexA, group); }
    if (line.componentIndexB !== undefined) { groupByB.set(line.componentIndexB, group); }
  }

  // Pass 2: attach property/page lines to their parent component group.
  // If no component-level event exists (suppressed by summary engine), create a
  // placeholder group so property lines are not incorrectly merged into ページ.
  const pageGroup: ComponentGroup = { groupKey: 'page', label: 'ページ', prefix: '~', lines: [] };
  let hasPageLines = false;

  for (const line of lines) {
    if (line.isComponentEvent) { continue; }
    // Match by A-index first (most specific), then B-index
    let group = (line.componentIndexA !== undefined ? groupByA.get(line.componentIndexA) : undefined)
             ?? (line.componentIndexB !== undefined ? groupByB.get(line.componentIndexB) : undefined);

    // No component-level group found, but line belongs to a component (has an index).
    // This happens when the component-level update event was suppressed in favour of
    // more-specific property lines. Create a placeholder group on the fly.
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
      if (line.componentIndexA !== undefined) { groupByA.set(line.componentIndexA, group); }
      if (line.componentIndexB !== undefined) { groupByB.set(line.componentIndexB, group); }
    }

    if (group) {
      group.lines.push(line);
    } else {
      pageGroup.lines.push(line);
      hasPageLines = true;
    }
  }

  if (hasPageLines) { groups.push(pageGroup); }

  // Backfill missing A/B indices on groups using component-level pairing info.
  // This covers cases where a property event only has a B-index because the
  // property was newly added (previousSourceRef is null), yet the component
  // itself was paired (e.g. DatePicker A=5 ↔ B=6, required added).
  if (pairings.length > 0) {
    const pairByB = new Map<number, number>();
    const pairByA = new Map<number, number>();
    for (const p of pairings) {
      if (p.indexB !== undefined && p.indexA !== undefined) { pairByB.set(p.indexB, p.indexA); }
      if (p.indexA !== undefined && p.indexB !== undefined) { pairByA.set(p.indexA, p.indexB); }
    }
    for (const g of groups) {
      if (g.componentIndexA === undefined && g.componentIndexB !== undefined) {
        const inferredA = pairByB.get(g.componentIndexB);
        if (inferredA !== undefined) { g.componentIndexA = inferredA; }
      }
      if (g.componentIndexB === undefined && g.componentIndexA !== undefined) {
        const inferredB = pairByA.get(g.componentIndexA);
        if (inferredB !== undefined) { g.componentIndexB = inferredB; }
      }
    }
  }

  // Sort by A-index (existing components), then B-only (added), page group last
  return groups.sort((a, b) => {
    const ai = a.componentIndexA ?? a.componentIndexB ?? Infinity;
    const bi = b.componentIndexA ?? b.componentIndexB ?? Infinity;
    if (ai !== bi) { return ai - bi; }
    return (GROUP_ORDER[a.prefix] ?? 9) - (GROUP_ORDER[b.prefix] ?? 9);
  });
}

function SummaryBadge({ count, color, symbol }: { count: number; color: string; symbol: string }) {
  if (count === 0) { return null; }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        fontSize: '0.72rem',
        fontWeight: 700,
        color,
      }}
    >
      {symbol}{count}
    </span>
  );
}

function AccordionItem({
  group,
  isHighlighted,
  onToggleHighlight,
  impact,
}: {
  group: ComponentGroup;
  isHighlighted: boolean;
  onToggleHighlight: () => void;
  impact?: ImpactBadgeProps;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const childLines = group.lines.filter(l => !l.isComponentEvent);
  const hasPositionChange =
    group.componentIndexA !== undefined &&
    group.componentIndexB !== undefined &&
    group.componentIndexA !== group.componentIndexB;
  const hasChildren = childLines.length > 0 || hasPositionChange;

  return (
    <li style={{ borderBottom: '1px solid rgba(148,163,184,0.10)' }}>
      {/* Accordion header */}
      <div
        onClick={() => { onToggleHighlight(); if (hasChildren) { setIsOpen(o => !o); } }}
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
        {impact && (
          <ImpactBadge
            direct={impact.direct}
            indirect={impact.indirect}
            navigation={impact.navigation}
          />
        )}
      </div>

      {/* Property child lines */}
      {isOpen && hasChildren && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', background: 'rgba(0,0,0,0.18)' }}>
          {hasPositionChange && (
            <li key="__reorder__" style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              padding: '4px 12px 4px 30px',
              borderBottom: '1px solid rgba(148,163,184,0.05)',
              fontFamily: 'var(--vscode-editor-font-family, monospace)',
              fontSize: '0.74rem', lineHeight: 1.4, color: '#94a3b8',
            }}>
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

  const addCount    = lines.filter(l => l.prefix === '+').length;
  const updateCount = lines.filter(l => l.prefix === '~').length;
  const removeCount = lines.filter(l => l.prefix === '-').length;
  const ambigCount  = lines.filter(l => l.prefix === '?').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flex: 1,
      }}
    >
      {/* Pane header */}
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
        <span style={{ fontWeight: 700, fontSize: '0.80rem', color: '#dbeafe' }}>
          変更サマリー
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          <SummaryBadge count={addCount}    color={COLOR.add}       symbol="+" />
          <SummaryBadge count={updateCount} color={COLOR.update}    symbol="~" />
          <SummaryBadge count={removeCount} color={COLOR.remove}    symbol="-" />
          <SummaryBadge count={ambigCount}  color={COLOR.ambiguous} symbol="?" />
        </span>
      </div>

      {/* Accordion list */}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {groups.map(group => (
          <AccordionItem
            key={group.groupKey}
            group={group}
            isHighlighted={highlightedGroupKey === group.groupKey}
            onToggleHighlight={() => onGroupClick(group.groupKey)}
            impact={undefined}
          />
        ))}
      </ul>
    </div>
  );
}

// -- Review pane (Decision UI + ReviewSetPanel) ------------------------------

function ReviewPane({ groups }: { groups: ComponentGroup[] }) {
  const [decisionStore] = useState(() => new InMemoryDecisionStore());
  const [, setDecisionVersion] = useState(0);
  const [focusedGroupKey, setFocusedGroupKey] = useState<string | null>(null);

  const handleDecide = (changeId: string, kind: DecisionKind, rationale?: string) => {
    decisionStore.set({
      changeId,
      decision: kind,
      rationale,
      author: 'reviewer',
      timestamp: Date.now(),
    });
    setDecisionVersion(v => v + 1);
  };

  const decidedCount = groups.filter(g => decisionStore.get(g.groupKey)).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderTop: '2px solid rgba(148,163,184,0.20)',
        background: 'rgba(15, 23, 42, 0.65)',
        maxHeight: '45%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(15, 23, 42, 0.7)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.80rem', color: '#dbeafe' }}>
          レビュー
        </span>
        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
          {decidedCount} / {groups.length} 決定済み
        </span>
      </div>

      {/* Decision list */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto', flex: 1 }}>
        {groups.length === 0 ? (
          <li style={{ padding: '16px 12px', color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem', textAlign: 'center' }}>
            変更なし
          </li>
        ) : (
          groups.map(group => {
            const decision = decisionStore.get(group.groupKey);
            const isFocused = focusedGroupKey === group.groupKey;
            return (
              <li
                key={group.groupKey}
                style={{
                  borderBottom: '1px solid rgba(148,163,184,0.07)',
                  padding: '6px 12px',
                  background: isFocused ? 'rgba(96,165,250,0.07)' : undefined,
                  cursor: 'pointer',
                }}
                onClick={() => setFocusedGroupKey(k => k === group.groupKey ? null : group.groupKey)}
              >
                {/* 行ヘッダー: prefix + label + 決定済みバッジ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: decision || isFocused ? 4 : 0 }}>
                  <span style={{ color: PREFIX_COLOR[group.prefix] ?? '#e2e8f0', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    {group.prefix}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#e2e8f0', flex: 1, wordBreak: 'break-word' }}>
                    {group.label}
                  </span>
                  {decision && (
                    <span style={{
                      fontSize: '0.68rem',
                      padding: '1px 6px',
                      borderRadius: 8,
                      background: decision.decision === 'accept' ? 'rgba(22,163,74,0.25)'
                        : decision.decision === 'reject'  ? 'rgba(220,38,38,0.25)'
                        : decision.decision === 'defer'   ? 'rgba(217,119,6,0.25)'
                        : 'rgba(107,114,128,0.25)',
                      color: decision.decision === 'accept' ? '#4ade80'
                        : decision.decision === 'reject'  ? '#f87171'
                        : decision.decision === 'defer'   ? '#fbbf24'
                        : '#9ca3af',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {decision.decision}
                    </span>
                  )}
                </div>

                {/* Decision ボタン（フォーカス中のみ表示） */}
                {isFocused && (
                  <div style={{ paddingLeft: 16 }}>
                    <DecisionButtons
                      changeId={group.groupKey}
                      author="reviewer"
                      currentDecision={decision?.decision}
                      onDecide={handleDecide}
                      keyboardActive={isFocused}
                    />
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

// -- Empty state for right pane (no summary available) -----------------------

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
      変更サマリーを<br />生成できませんでした
    </div>
  );
}

// -- Main component ----------------------------------------------------------

interface OverlayDiffViewerProps {
  state: OverlayDiffState;
}

/**
 * Overlay Diff Viewer コンポーネント。
 *
 * 左ペイン: 透過スライダーによるオーバーレイ比較
 * 右ペイン: D4 セマンティック変更サマリー（+/~/−/? の1行リスト）
 *
 * 右ペインはセマンティック要約が存在しない場合もプレースホルダーを表示する。
 */
const STEPS = [0, 33, 67, 100] as const;

export const OverlayDiffViewer: React.FC<OverlayDiffViewerProps> = ({ state }) => {
  const [stepIndex, setStepIndex] = useState(1);
  const slider = STEPS[stepIndex];
  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;

  const labelA = basename(state.fileNameA);
  const labelB = basename(state.fileNameB);

  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];
  const maxCount = Math.max(componentsA.length, componentsB.length);

  const summaryLines = state.semanticSummary?.lines ?? null;
  const summaryPairings = state.semanticSummary?.componentPairings ?? [];

  // Build groups and index → groupKey maps for canvas highlight
  const groups = summaryLines ? groupSummaryLines(summaryLines, summaryPairings) : [];
  const highlightIndexA = new Map<number, string>();
  const highlightIndexB = new Map<number, string>();
  for (const g of groups) {
    if (g.componentIndexA !== undefined) { highlightIndexA.set(g.componentIndexA, g.groupKey); }
    if (g.componentIndexB !== undefined) { highlightIndexB.set(g.componentIndexB, g.groupKey); }
  }

  const handleGroupClick = (groupKey: string) => {
    setHighlightedGroupKey(prev => (prev === groupKey ? null : groupKey));
  };

  const sortedGroupKeys = groups.map(g => g.groupKey);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') { return; }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStepIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setStepIndex(prev => Math.min(3, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (sortedGroupKeys.length === 0) { return; }
        e.preventDefault();
        const idx = sortedGroupKeys.indexOf(highlightedGroupKey ?? '');
        if (e.key === 'ArrowDown') {
          setHighlightedGroupKey(sortedGroupKeys[(idx + 1) % sortedGroupKeys.length]);
        } else {
          setHighlightedGroupKey(sortedGroupKeys[(idx - 1 + sortedGroupKeys.length) % sortedGroupKeys.length]);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sortedGroupKeys, highlightedGroupKey]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* ── 左ペイン: Overlay Diff ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header: ファイル名 + スライダー */}
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

          <div
            style={{
              flex: 1,
              minWidth: 120,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={stepIndex}
              onChange={e => setStepIndex(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
              aria-label="透過度スライダー（Before ↔ After）"
            />
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
              {slider === 0
                ? 'Before のみ'
                : slider === 100
                ? 'After のみ'
                : `After ${slider}%`}
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

        {/* Overlay canvas */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', minHeight: maxCount > 0 ? maxCount * 60 : 200 }}>
            {/* Layer A: Before */}
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
              {componentsA.map((comp, i) => {
                const isHighlighted = highlightIndexA.get(i) === highlightedGroupKey && highlightedGroupKey !== null;
                return (
                  <div key={`overlay-a-${i}`} style={{ position: 'relative' }}>
                    {renderRegisteredComponent(comp, `overlay-a-${i}`)}
                    {isHighlighted && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        border: '2px solid #60a5fa',
                        boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                        pointerEvents: 'none',
                        borderRadius: 2,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Layer B: After */}
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
              {componentsB.map((comp, i) => {
                const isHighlighted = highlightIndexB.get(i) === highlightedGroupKey && highlightedGroupKey !== null;
                return (
                  <div key={`overlay-b-${i}`} style={{ position: 'relative' }}>
                    {renderRegisteredComponent(comp, `overlay-b-${i}`)}
                    {isHighlighted && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        border: '2px solid #60a5fa',
                        boxShadow: '0 0 8px 2px rgba(96,165,250,0.5)',
                        pointerEvents: 'none',
                        borderRadius: 2,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── 右ペイン: 変更サマリー（上）+ レビュー（下） ── */}
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
            onGroupClick={handleGroupClick}
          />
        ) : (
          <NoSummaryPane />
        )}
        <ReviewPane groups={summaryLines ? groupSummaryLines(summaryLines, summaryPairings) : []} />
      </div>
    </div>
  );
};
