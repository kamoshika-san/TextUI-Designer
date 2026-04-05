import React, { useState } from 'react';
import { renderRegisteredComponent } from '../component-map';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';
import type { SemanticSummaryLine } from '../../core/textui-semantic-diff-summary';

// Browser-compatible basename function
function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

// -- Semantic summary styles --------------------------------------------------

const PREFIX_COLOR: Record<string, string> = {
  '+': '#4ade80', // green
  '~': '#60a5fa', // blue
  '-': '#f87171', // red
  '?': '#fbbf24', // amber
};

const PREFIX_LABEL: Record<string, string> = {
  '+': '追加',
  '~': '変更',
  '-': '削除',
  '?': '要確認',
};

function SemanticSummarySection({ lines }: { lines: SemanticSummaryLine[] }) {
  const [collapsed, setCollapsed] = useState(false);

  // Sort: + first, then ~, then -, then ?
  const PREFIX_ORDER: Record<string, number> = { '+': 0, '~': 1, '-': 2, '?': 3 };
  const sorted = [...lines].sort(
    (a, b) => (PREFIX_ORDER[a.prefix] ?? 9) - (PREFIX_ORDER[b.prefix] ?? 9)
  );

  const counts = {
    add: lines.filter(l => l.prefix === '+').length,
    update: lines.filter(l => l.prefix === '~').length,
    remove: lines.filter(l => l.prefix === '-').length,
    ambiguous: lines.filter(l => l.prefix === '?').length,
  };

  return (
    <div
      style={{
        marginBottom: 12,
        borderRadius: 8,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: 'none',
          cursor: 'pointer',
          color: '#dbeafe',
          fontFamily: 'sans-serif',
        }}
        aria-expanded={!collapsed}
      >
        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>
          変更サマリー ({lines.length} 件)
        </span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.75rem' }}>
          {counts.add > 0 && (
            <span style={{ color: PREFIX_COLOR['+'] }}>+{counts.add}</span>
          )}
          {counts.update > 0 && (
            <span style={{ color: PREFIX_COLOR['~'] }}>~{counts.update}</span>
          )}
          {counts.remove > 0 && (
            <span style={{ color: PREFIX_COLOR['-'] }}>-{counts.remove}</span>
          )}
          {counts.ambiguous > 0 && (
            <span style={{ color: PREFIX_COLOR['?'] }}>?{counts.ambiguous}</span>
          )}
          <span style={{ opacity: 0.5, marginLeft: 4 }}>{collapsed ? '▶' : '▼'}</span>
        </span>
      </button>

      {/* Line list */}
      {!collapsed && (
        <ul
          style={{
            margin: 0,
            padding: '6px 0',
            listStyle: 'none',
            background: 'rgba(15, 23, 42, 0.4)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {sorted.map(line => (
            <li
              key={line.eventId}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '3px 12px',
                fontFamily: 'monospace',
                fontSize: '0.80rem',
                color: '#e2e8f0',
              }}
            >
              <span
                style={{
                  color: PREFIX_COLOR[line.prefix] ?? '#e2e8f0',
                  fontWeight: 700,
                  minWidth: 14,
                  flexShrink: 0,
                }}
                title={PREFIX_LABEL[line.prefix]}
              >
                {line.prefix}
              </span>
              <span style={{ wordBreak: 'break-word' }}>{line.text}</span>
            </li>
          ))}
        </ul>
      )}
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
 * 上部に「変更サマリー」セクション（D4 セマンティック差分要約）を表示し、
 * 続いて 2つの TextUI DSL プレビューを重ねて表示する。
 * スライダーで一方（DSL B）の透過度を操作することで
 * 「印刷した図案を透かして差分を確認する」UX を提供する。
 *
 * - スライダー 0%: DSL A のみ表示
 * - スライダー 50%: 両方 50%（差分がゴーストとして見える）
 * - スライダー 100%: DSL B のみ表示
 */
export const OverlayDiffViewer: React.FC<OverlayDiffViewerProps> = ({ state }) => {
  console.log('[OverlayDiffViewer] Rendering with state:', state);
  const [slider, setSlider] = useState(50);

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;

  const labelA = basename(state.fileNameA);
  const labelB = basename(state.fileNameB);

  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];

  // 2レイヤーの高さを確保するため、コンポーネント数が多い方に合わせる
  const maxCount = Math.max(componentsA.length, componentsB.length);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      {/* D4: 変更サマリー（存在する場合のみ） */}
      {state.semanticSummary && state.semanticSummary.lines.length > 0 && (
        <SemanticSummarySection lines={state.semanticSummary.lines} />
      )}

      {/* ヘッダー: ファイル名 + スライダー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(15, 23, 42, 0.72)',
          color: '#dbeafe',
          flexWrap: 'wrap'
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            opacity: opacityA < 0.15 ? 0.4 : 1,
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap'
          }}
          title={state.fileNameA}
        >
          Before: {labelA}
        </span>

        <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={e => setSlider(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
            aria-label="透過度スライダー（Before ↔ After）"
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
            whiteSpace: 'nowrap'
          }}
          title={state.fileNameB}
        >
          After: {labelB}
        </span>
      </div>

      {/* オーバーレイキャンバス */}
      <div
        style={{
          position: 'relative',
          minHeight: maxCount > 0 ? maxCount * 60 : 200
        }}
      >
        {/* Layer A: Before */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: opacityA,
            transition: 'opacity 0.05s',
            pointerEvents: slider >= 100 ? 'none' : 'auto'
          }}
        >
          {componentsA.map((comp, i) =>
            renderRegisteredComponent(comp, `overlay-a-${i}`)
          )}
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
            pointerEvents: 'none'
          }}
        >
          {componentsB.map((comp, i) =>
            renderRegisteredComponent(comp, `overlay-b-${i}`)
          )}
        </div>
      </div>
    </div>
  );
};
