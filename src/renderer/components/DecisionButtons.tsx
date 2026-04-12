/**
 * DecisionButtons — 各 Diff 変更に対する Decision 操作 UI
 * T-RE1-004 / T-RE1-005 / T-RE1-006
 *
 * - accept / reject / defer / ignore の 4 ボタン
 * - reject / defer 時は rationale 入力が必須（スキップ不可）
 * - キーボードショートカット: a / r / d / i
 */

import React, { useState, useEffect, useRef } from 'react';
import type { DecisionKind } from '../../domain/review-engine/decision';
import { requiresRationale, validateDecision } from '../../domain/review-engine/decision';

export interface DecisionButtonsProps {
  changeId: string;
  author: string;
  currentDecision?: DecisionKind;
  onDecide: (changeId: string, kind: DecisionKind, rationale?: string) => void;
  /** キーボードショートカットをアクティブにするか（フォーカス中の行のみ true にする） */
  keyboardActive?: boolean;
}

const BUTTON_STYLES: Record<DecisionKind, React.CSSProperties> = {
  accept:  { background: '#16a34a', color: '#fff' },
  reject:  { background: '#dc2626', color: '#fff' },
  defer:   { background: '#d97706', color: '#fff' },
  ignore:  { background: '#6b7280', color: '#fff' },
};

const BUTTON_LABELS: Record<DecisionKind, string> = {
  accept: 'Accept (a)',
  reject: 'Reject (r)',
  defer:  'Defer (d)',
  ignore: 'Ignore (i)',
};

const SHORTCUT_MAP: Record<string, DecisionKind> = {
  a: 'accept',
  r: 'reject',
  d: 'defer',
  i: 'ignore',
};

export const DecisionButtons: React.FC<DecisionButtonsProps> = ({
  changeId,
  author,
  currentDecision,
  onDecide,
  keyboardActive = false,
}) => {
  const [pendingKind, setPendingKind] = useState<DecisionKind | null>(null);
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rationaleRef = useRef<HTMLTextAreaElement>(null);

  // rationale フォームが開いたらフォーカスを当てる
  useEffect(() => {
    if (pendingKind && requiresRationale(pendingKind)) {
      rationaleRef.current?.focus();
    }
  }, [pendingKind]);

  // キーボードショートカット
  useEffect(() => {
    if (!keyboardActive) { return; }
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') { return; }
      const kind = SHORTCUT_MAP[e.key.toLowerCase()];
      if (!kind) { return; }
      e.preventDefault();
      handleKindSelect(kind);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [keyboardActive, changeId]);

  const handleKindSelect = (kind: DecisionKind) => {
    if (!requiresRationale(kind)) {
      // rationale 不要 → 即コミット
      const err = validateDecision({ changeId, decision: kind, author, timestamp: Date.now() });
      if (err) { setError(err); return; }
      setError(null);
      setPendingKind(null);
      setRationale('');
      onDecide(changeId, kind);
    } else {
      // rationale 必須 → フォームを開く
      setPendingKind(kind);
      setRationale('');
      setError(null);
    }
  };

  const handleRationaleSubmit = () => {
    if (!pendingKind) { return; }
    const err = validateDecision({ changeId, decision: pendingKind, rationale, author, timestamp: Date.now() });
    if (err) { setError(err); return; }
    setError(null);
    onDecide(changeId, pendingKind, rationale);
    setPendingKind(null);
    setRationale('');
  };

  const handleRationaleCancel = () => {
    setPendingKind(null);
    setRationale('');
    setError(null);
  };

  const baseButtonStyle: React.CSSProperties = {
    padding: '3px 10px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    opacity: 0.85,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* ボタン行 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['accept', 'reject', 'defer', 'ignore'] as DecisionKind[]).map(kind => (
          <button
            key={kind}
            onClick={() => handleKindSelect(kind)}
            style={{
              ...baseButtonStyle,
              ...BUTTON_STYLES[kind],
              outline: currentDecision === kind ? '2px solid #fff' : 'none',
              outlineOffset: 1,
            }}
            aria-pressed={currentDecision === kind}
            title={BUTTON_LABELS[kind]}
          >
            {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </button>
        ))}
      </div>

      {/* rationale フォーム（reject / defer 時のみ表示） */}
      {pendingKind && requiresRationale(pendingKind) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          <label style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            Rationale <span style={{ color: '#f87171' }}>*</span> (required for {pendingKind})
          </label>
          <textarea
            ref={rationaleRef}
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            rows={2}
            style={{
              fontSize: '0.78rem',
              padding: '4px 6px',
              borderRadius: 4,
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#e2e8f0',
              resize: 'vertical',
            }}
            placeholder={`Why are you ${pendingKind}ing this change?`}
          />
          {error && (
            <span style={{ fontSize: '0.72rem', color: '#f87171' }}>{error}</span>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleRationaleSubmit}
              style={{ ...baseButtonStyle, ...BUTTON_STYLES[pendingKind] }}
            >
              Confirm {pendingKind}
            </button>
            <button
              onClick={handleRationaleCancel}
              style={{ ...baseButtonStyle, background: '#334155', color: '#cbd5e1' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
