/**
 * DecisionHistory — Decision 履歴一覧コンポーネント
 * E-RE1-S4
 *
 * - 時系列降順（新しい順）で表示
 * - changeId でフィルタリング（大文字小文字を区別しない）
 * - 空の場合は「決定履歴なし」を表示
 */

import React, { useState } from 'react';
import type { Decision } from '../../domain/review-engine/decision';

export interface DecisionHistoryProps {
  decisions: Decision[];
}

const DECISION_COLOR: Record<string, string> = {
  accept: '#4ade80',
  reject: '#f87171',
  defer:  '#fbbf24',
  ignore: '#9ca3af',
};

const DECISION_BG: Record<string, string> = {
  accept: 'rgba(22,163,74,0.20)',
  reject: 'rgba(220,38,38,0.20)',
  defer:  'rgba(217,119,6,0.20)',
  ignore: 'rgba(107,114,128,0.20)',
};

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) { return `${diffSec}秒前`; }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) { return `${diffMin}分前`; }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) { return `${diffHour}時間前`; }
  return new Date(timestamp).toLocaleDateString('ja-JP');
}

export const DecisionHistory: React.FC<DecisionHistoryProps> = ({ decisions }) => {
  const [filter, setFilter] = useState('');

  // 時系列降順にソート
  const sorted = [...decisions].sort((a, b) => b.timestamp - a.timestamp);

  // changeId フィルタリング（大文字小文字を区別しない）
  const filtered = filter.trim()
    ? sorted.filter(d => d.changeId.toLowerCase().includes(filter.toLowerCase()))
    : sorted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* フィルター入力 */}
      <div style={{ padding: '6px 12px', flexShrink: 0, borderBottom: '1px solid rgba(148,163,184,0.10)' }}>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="changeId でフィルタ..."
          style={{
            width: '100%',
            padding: '4px 8px',
            fontSize: '0.74rem',
            background: '#1e293b',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: 4,
            color: '#e2e8f0',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 履歴リスト */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0 ? (
          <li style={{ padding: '16px 12px', color: 'rgba(148,163,184,0.5)', fontSize: '0.75rem', textAlign: 'center' }}>
            {decisions.length === 0 ? '決定履歴なし' : 'フィルタ結果なし'}
          </li>
        ) : (
          filtered.map((d, i) => (
            <li
              key={`${d.changeId}-${d.timestamp}-${i}`}
              style={{
                borderBottom: '1px solid rgba(148,163,184,0.07)',
                padding: '6px 12px',
              }}
            >
              {/* 行ヘッダー: changeId + decision バッジ + 時刻 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: d.rationale ? 3 : 0 }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', flex: 1, wordBreak: 'break-all' }}>
                  {d.changeId}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 8,
                  background: DECISION_BG[d.decision] ?? 'rgba(107,114,128,0.20)',
                  color: DECISION_COLOR[d.decision] ?? '#9ca3af',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {d.decision}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#475569', flexShrink: 0 }}>
                  {formatRelativeTime(d.timestamp)}
                </span>
              </div>

              {/* rationale（あれば） */}
              {d.rationale && (
                <div style={{ fontSize: '0.70rem', color: '#64748b', paddingLeft: 4, fontStyle: 'italic' }}>
                  {d.rationale}
                </div>
              )}

              {/* author */}
              <div style={{ fontSize: '0.66rem', color: '#334155', paddingLeft: 4 }}>
                by {d.author}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
