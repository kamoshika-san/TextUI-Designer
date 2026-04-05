import React, { useState } from 'react';
import * as path from 'path';
import { renderRegisteredComponent } from '../component-map';
import type { OverlayDiffState } from '../../domain/diff/overlay-diff-types';

interface OverlayDiffViewerProps {
  state: OverlayDiffState;
}

/**
 * Overlay Diff Viewer コンポーネント。
 *
 * 2つの TextUI DSL プレビューを重ねて表示し、
 * スライダーで一方（DSL B）の透過度を操作することで
 * 「印刷した図案を透かして差分を確認する」UX を提供する。
 *
 * - スライダー 0%: DSL A のみ表示
 * - スライダー 50%: 両方 50%（差分がゴーストとして見える）
 * - スライダー 100%: DSL B のみ表示
 */
export const OverlayDiffViewer: React.FC<OverlayDiffViewerProps> = ({ state }) => {
  const [slider, setSlider] = useState(50);

  const opacityA = 1 - slider / 100;
  const opacityB = slider / 100;

  const labelA = path.basename(state.fileNameA);
  const labelB = path.basename(state.fileNameB);

  const componentsA = state.dslA.page?.components ?? [];
  const componentsB = state.dslB.page?.components ?? [];

  // 2レイヤーの高さを確保するため、コンポーネント数が多い方に合わせる
  const maxCount = Math.max(componentsA.length, componentsB.length);

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
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
