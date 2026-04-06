import React, { useState } from 'react';
import { renderRegisteredComponent } from '../component-map';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';
import type { SemanticSummaryLine } from '../../core/textui-semantic-diff-summary';

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

function SummaryLine({
  line,
  isSelected,
  onClick,
}: {
  line: SemanticSummaryLine;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <li
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 12px',
        borderBottom: '1px solid rgba(148,163,184,0.08)',
        fontFamily: 'var(--vscode-editor-font-family, monospace)',
        fontSize: '0.78rem',
        lineHeight: 1.4,
        color: '#cbd5e1',
        cursor: 'pointer',
        background: isSelected ? 'rgba(96,165,250,0.12)' : undefined,
        borderLeft: isSelected ? '2px solid #60a5fa' : '2px solid transparent',
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          color: PREFIX_COLOR[line.prefix] ?? '#e2e8f0',
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
          width: 12,
          textAlign: 'center',
        }}
        title={PREFIX_LABEL[line.prefix]}
      >
        {line.prefix}
      </span>
      <span style={{ wordBreak: 'break-word', flex: 1 }}>{line.text}</span>
    </li>
  );
}

function SemanticSummaryPane({
  lines,
  highlightedEventId,
  onLineClick,
}: {
  lines: SemanticSummaryLine[];
  highlightedEventId: string | null;
  onLineClick: (eventId: string) => void;
}) {
  // Sort: + first, then ~, then -, then ?
  const ORDER: Record<string, number> = { '+': 0, '~': 1, '-': 2, '?': 3 };
  const sorted = [...lines].sort((a, b) => (ORDER[a.prefix] ?? 9) - (ORDER[b.prefix] ?? 9));

  const addCount    = lines.filter(l => l.prefix === '+').length;
  const updateCount = lines.filter(l => l.prefix === '~').length;
  const removeCount = lines.filter(l => l.prefix === '-').length;
  const ambigCount  = lines.filter(l => l.prefix === '?').length;

  return (
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

      {/* Line list */}
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {sorted.map(line => (
          <SummaryLine
            key={line.eventId}
            line={line}
            isSelected={highlightedEventId === line.eventId}
            onClick={() => onLineClick(line.eventId)}
          />
        ))}
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
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;

  const labelA = basename(state.fileNameA);
  const labelB = basename(state.fileNameB);

  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];
  const maxCount = Math.max(componentsA.length, componentsB.length);

  const summaryLines = state.semanticSummary?.lines ?? null;

  // Build index → eventId maps for component-level highlights
  const highlightIndexA = new Map<number, string>();
  const highlightIndexB = new Map<number, string>();
  if (summaryLines) {
    for (const line of summaryLines) {
      if (line.componentIndexA !== undefined) { highlightIndexA.set(line.componentIndexA, line.eventId); }
      if (line.componentIndexB !== undefined) { highlightIndexB.set(line.componentIndexB, line.eventId); }
    }
  }

  const handleLineClick = (eventId: string) => {
    setHighlightedEventId(prev => (prev === eventId ? null : eventId));
  };

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
                const isHighlighted = highlightIndexA.get(i) === highlightedEventId && highlightedEventId !== null;
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
                const isHighlighted = highlightIndexB.get(i) === highlightedEventId && highlightedEventId !== null;
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

      {/* ── 右ペイン: 変更サマリー ── */}
      {summaryLines !== null && summaryLines.length > 0 ? (
        <SemanticSummaryPane
          lines={summaryLines}
          highlightedEventId={highlightedEventId}
          onLineClick={handleLineClick}
        />
      ) : (
        <NoSummaryPane />
      )}
    </div>
  );
};
