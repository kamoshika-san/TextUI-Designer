/**
 * PreviewNavBar — プレビュー画面遷移時のナビゲーションバー（E-NI-S5）
 *
 * - 1ステップ前のスクリーン名を「← {screenName}」形式で表示
 * - 「フローに戻る」ボタン: Extension に back-to-flow メッセージを送信
 * - history が空（初回表示）の場合は非表示
 */

import React from 'react';

export interface NavHistoryEntry {
  screenId: string;
  pageTitle?: string;
}

export interface PreviewNavBarProps {
  history: NavHistoryEntry[];
  onBack: () => void;
  onBackToFlow: () => void;
}

export const PreviewNavBar: React.FC<PreviewNavBarProps> = ({ history, onBack, onBackToFlow }) => {
  if (history.length === 0) {
    return null;
  }

  const prev = history[history.length - 1];
  const prevLabel = prev.pageTitle ?? prev.screenId;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--vscode-editor-background, rgba(30,30,30,0.95))',
        borderBottom: '1px solid rgba(148,163,184,0.15)',
        fontSize: '0.80rem',
        color: 'var(--vscode-foreground, #ccc)',
        flexShrink: 0,
      }}
    >
      {/* 前の画面へ戻るボタン */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          background: 'none',
          border: '1px solid rgba(148,163,184,0.3)',
          borderRadius: 4,
          color: 'var(--vscode-foreground, #ccc)',
          cursor: 'pointer',
          fontSize: '0.78rem',
        }}
        title={`前の画面: ${prevLabel}`}
      >
        ← {prevLabel}
      </button>

      <span style={{ flex: 1 }} />

      {/* フローに戻るボタン */}
      <button
        type="button"
        onClick={onBackToFlow}
        style={{
          padding: '2px 8px',
          background: 'none',
          border: '1px solid rgba(148,163,184,0.3)',
          borderRadius: 4,
          color: 'var(--vscode-foreground, #ccc)',
          cursor: 'pointer',
          fontSize: '0.78rem',
        }}
      >
        フローに戻る
      </button>
    </div>
  );
};
