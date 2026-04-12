/**
 * ReviewSetPanel — ReviewSet の Progressive Disclosure UI
 * T-RE3-013 / T-RE3-014
 *
 * - 初期表示: priority 上位 10 件のみ
 * - 「すべて表示」ボタンで全件展開
 * - 「上位 10 件に戻す」ボタンで折りたたみ
 * - ReviewSet が空の場合は「レビュー対象なし」を表示
 */

import React, { useState } from 'react';
import type { ReviewSet } from '../../domain/review-engine/review-set-builder';

const DEFAULT_VISIBLE = 10;

export interface ReviewSetPanelProps {
  reviewSet: ReviewSet;
}

export const ReviewSetPanel: React.FC<ReviewSetPanelProps> = ({ reviewSet }) => {
  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll
    ? reviewSet.items
    : reviewSet.items.slice(0, DEFAULT_VISIBLE);

  const hasMore = reviewSet.items.length > DEFAULT_VISIBLE;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid rgba(148,163,184,0.15)',
        flexShrink: 0,
        maxHeight: 280,
        overflow: 'hidden',
      }}
    >
      {/* パネルヘッダー */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(148,163,184,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#dbeafe' }}>
          レビュー優先リスト
        </span>
        <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
          {reviewSet.items.length} / {reviewSet.totalClusters} クラスタ
        </span>
      </div>

      {/* アイテムリスト */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {reviewSet.items.length === 0 ? (
          <div
            style={{
              padding: '16px 12px',
              color: 'rgba(148,163,184,0.5)',
              fontSize: '0.75rem',
              textAlign: 'center',
            }}
          >
            レビュー対象なし
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {visibleItems.map(item => (
              <li
                key={item.cluster.clusterId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 12px',
                  borderBottom: '1px solid rgba(148,163,184,0.07)',
                  fontSize: '0.74rem',
                }}
              >
                {/* ランク */}
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    textAlign: 'right',
                    color: '#64748b',
                    fontSize: '0.68rem',
                  }}
                >
                  #{item.rank}
                </span>

                {/* スコアバー */}
                <div
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(148,163,184,0.15)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${item.priorityScore}%`,
                      background: item.priorityScore >= 70
                        ? '#f87171'
                        : item.priorityScore >= 40
                        ? '#fbbf24'
                        : '#60a5fa',
                      borderRadius: 2,
                    }}
                  />
                </div>

                {/* ラベル */}
                <span
                  style={{
                    flex: 1,
                    color: '#e2e8f0',
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                  }}
                >
                  {item.cluster.label}
                </span>

                {/* 変更数バッジ */}
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '0.68rem',
                    color: '#94a3b8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.cluster.changeIds.length}件
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 展開 / 折りたたみボタン */}
      {hasMore && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            flexShrink: 0,
            padding: '5px 12px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: 'none',
            borderTop: '1px solid rgba(148,163,184,0.12)',
            color: '#60a5fa',
            fontSize: '0.72rem',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {showAll
            ? `▴ 上位 ${DEFAULT_VISIBLE} 件に戻す`
            : `▾ すべて表示（残り ${reviewSet.items.length - DEFAULT_VISIBLE} 件）`}
        </button>
      )}
    </div>
  );
};
