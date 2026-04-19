import React from 'react';
import type { VisualDiffV2Result } from '../../domain/diff/semantic-diff-v2-panel-model';

export function OverlayDiffV2Panel({ result }: { result: VisualDiffV2Result }) {
  const { screens } = result.payload;
  const totalChanges = screens.reduce((sum, s) => {
    if ('outOfScope' in s) return sum;
    return sum + s.diffs.length + s.entities.reduce(
      (es, e) => es + e.components.reduce((cs, c) => cs + c.diffs.length, 0),
      0
    );
  }, 0);
  const inScopeScreens = screens.filter(s => !('outOfScope' in s));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15,23,42,0.97)',
        color: '#e2e8f0',
        fontFamily: 'var(--vscode-font-family, sans-serif)',
        fontSize: '0.85rem',
        overflowY: 'auto',
        zIndex: 100,
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa', marginBottom: 2 }}>
          Semantic Diff v2
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.80rem' }}>
          {totalChanges} change{totalChanges !== 1 ? 's' : ''} across {inScopeScreens.length} screen{inScopeScreens.length !== 1 ? 's' : ''}
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {screens.map((s, i) => {
          if ('outOfScope' in s) {
            return (
              <li key={i} style={{ padding: '8px 20px', color: '#475569', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                {s.screen_id} <span style={{ fontSize: '0.75rem' }}>(out of scope)</span>
              </li>
            );
          }
          const screenChanges = s.diffs.length + s.entities.reduce(
            (es, e) => es + e.components.reduce((cs, c) => cs + c.diffs.length, 0),
            0
          );
          return (
            <li key={i} style={{ padding: '8px 20px', borderBottom: '1px solid rgba(148,163,184,0.08)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{s.screen_id}</span>
              <span style={{ color: screenChanges > 0 ? '#60a5fa' : '#475569', fontWeight: 600 }}>
                {screenChanges}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
