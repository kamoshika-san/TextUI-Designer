/**
 * ImpactBadge — 変更の影響範囲を表示するバッジコンポーネント
 * T-RE2-012 / T-RE2-013
 *
 * - ヘッダーに「影響：N」バッジを表示
 * - クリックで direct / indirect ノード一覧を展開・折りたたみ
 */

import React, { useState } from 'react';

export interface ImpactBadgeProps {
  /** 直接影響するノード ID 一覧 */
  direct: string[];
  /** 間接影響するノード ID 一覧 */
  indirect: string[];
  /** navigation エッジで影響するノード ID 一覧 */
  navigation?: string[];
}

export const ImpactBadge: React.FC<ImpactBadgeProps> = ({ direct, indirect, navigation = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalCount = direct.length + indirect.length + navigation.length;

  if (totalCount === 0) {
    return null;
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {/* バッジボタン */}
      <button
        onClick={e => { e.stopPropagation(); setIsOpen(o => !o); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          padding: '1px 7px',
          borderRadius: 10,
          border: '1px solid rgba(251,191,36,0.4)',
          background: 'rgba(251,191,36,0.12)',
          color: '#fbbf24',
          fontSize: '0.70rem',
          fontWeight: 600,
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
        title={`影響: direct ${direct.length} / indirect ${indirect.length}${navigation.length > 0 ? ` / nav ${navigation.length}` : ''}`}
        aria-expanded={isOpen}
      >
        ⚡ 影響：{totalCount}
        <span style={{ fontSize: '0.60rem', opacity: 0.8 }}>{isOpen ? '▴' : '▾'}</span>
      </button>

      {/* 展開パネル */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            marginTop: 4,
            padding: '8px 10px',
            background: '#1e293b',
            border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: 6,
            minWidth: 200,
            maxWidth: 320,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            fontSize: '0.72rem',
            color: '#cbd5e1',
          }}
          onClick={e => e.stopPropagation()}
        >
          {direct.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>
                Direct ({direct.length})
              </div>
              {direct.map(id => (
                <div key={id} style={{ paddingLeft: 8, opacity: 0.85, wordBreak: 'break-all' }}>
                  · {id}
                </div>
              ))}
            </div>
          )}
          {indirect.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 2 }}>
                Indirect ({indirect.length})
              </div>
              {indirect.map(id => (
                <div key={id} style={{ paddingLeft: 8, opacity: 0.75, wordBreak: 'break-all' }}>
                  · {id}
                </div>
              ))}
            </div>
          )}
          {navigation.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 2 }}>
                Navigation ({navigation.length})
              </div>
              {navigation.map(id => (
                <div key={id} style={{ paddingLeft: 8, opacity: 0.75, wordBreak: 'break-all' }}>
                  · {id}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
