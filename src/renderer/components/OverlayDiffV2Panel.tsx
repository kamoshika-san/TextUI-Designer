import React, { useState } from 'react';
import type { VisualDiffV2Result } from '../../domain/diff/semantic-diff-v2-panel-model';

function formatCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatDiffEvent(event: string): string {
  return event.replace(/_/g, ' ');
}

function formatConfidence(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : String(value);
}

function stringifyEvidence(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function countScreenRecords(screen: Exclude<VisualDiffV2Result['payload']['screens'][number], { outOfScope: true }>): number {
  return (
    screen.diffs.length +
    screen.entities.reduce((entitySum, entity) => {
      const componentDiffs = entity.components.reduce((componentSum, component) => componentSum + component.diffs.length, 0);
      return entitySum + entity.diffs.length + componentDiffs;
    }, 0)
  );
}

function DiffRecordList({
  records,
  emptyLabel,
}: {
  records: Array<{
    decision: {
      diffEvent: string;
      targetId: string;
      confidence: number;
      confidenceBand?: 'high' | 'low';
      reviewStatus?: string;
      ambiguityReason?: string;
    };
    explanation: {
      evidence: unknown[];
    };
  }>;
  emptyLabel: string;
}) {
  if (records.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '0.76rem' }}>{emptyLabel}</div>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: '18px' }}>
      {records.map((record, index) => {
        const evidence = record.explanation.evidence ?? [];
        const isNeedsReview = record.decision.reviewStatus === 'needs_review';
        return (
          <li key={`${record.decision.targetId}:${record.decision.diffEvent}:${index}`} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatDiffEvent(record.decision.diffEvent)}</span>
              <code style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.12)', padding: '1px 6px', borderRadius: 999 }}>
                {record.decision.targetId}
              </code>
              <span style={{ color: '#cbd5e1' }}>confidence {formatConfidence(record.decision.confidence)}</span>
              {record.decision.confidenceBand ? (
                <span style={{ color: '#cbd5e1' }}>band {record.decision.confidenceBand}</span>
              ) : null}
              {/* review_status: read-only display — editing is out of scope for v2 MVP */}
              {record.decision.reviewStatus ? (
                <span
                  data-testid="review-status-badge"
                  title="Review status (read-only)"
                  style={{
                    color: isNeedsReview ? '#fbbf24' : '#86efac',
                    border: `1px solid ${isNeedsReview ? 'rgba(251,191,36,0.4)' : 'rgba(134,239,172,0.4)'}`,
                    borderRadius: 999,
                    padding: '1px 6px',
                    fontSize: '0.72rem',
                    textTransform: 'lowercase',
                  }}
                >
                  {record.decision.reviewStatus}
                </span>
              ) : null}
            </div>
            {record.decision.ambiguityReason ? (
              <div style={{ color: '#fbbf24', fontSize: '0.76rem', marginTop: 4 }}>
                ambiguity: {record.decision.ambiguityReason}
              </div>
            ) : null}
            <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: 4 }}>
              evidence: {evidence.length > 0 ? evidence.map(stringifyEvidence).join(', ') : 'none'}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OverlayDiffV2Panel({
  result,
  onSwitchToStructure,
}: {
  result: VisualDiffV2Result;
  onSwitchToStructure?: () => void;
}) {
  const { screens } = result.payload;
  const totalChanges = screens.reduce((sum, s) => {
    if ('outOfScope' in s) return sum;
    return sum + countScreenRecords(s);
  }, 0);
  const inScopeScreens = screens.filter(s => !('outOfScope' in s));
  const outOfScopeScreens = screens.length - inScopeScreens.length;

  const [collapsedScreens, setCollapsedScreens] = useState<Set<number>>(
    () => new Set(screens.map((s, i) => (!('outOfScope' in s) && countScreenRecords(s) === 0 ? i : -1)).filter(i => i >= 0))
  );

  function toggleScreen(i: number) {
    setCollapsedScreens(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

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
      <div style={{ padding: '12px 20px 0', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
        {onSwitchToStructure ? (
          <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
            <button
              onClick={onSwitchToStructure}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '2px solid transparent',
                padding: '6px 14px',
                color: '#94a3b8',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Structure
            </button>
            <button
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '2px solid #60a5fa',
                padding: '6px 14px',
                color: '#60a5fa',
                fontSize: '0.82rem',
                cursor: 'default',
                fontWeight: 600,
              }}
            >
              Semantic v2
            </button>
          </div>
        ) : (
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#60a5fa', paddingBottom: 8 }}>
            Semantic Diff v2
          </div>
        )}
        <div style={{ color: '#94a3b8', fontSize: '0.80rem', padding: '4px 0 10px' }}>
          {formatCountLabel(totalChanges, 'change', 'changes')} across {formatCountLabel(inScopeScreens.length, 'in-scope screen', 'in-scope screens')}
        </div>
        {outOfScopeScreens > 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.74rem', paddingBottom: 6 }}>
            {formatCountLabel(outOfScopeScreens, 'out-of-scope screen', 'out-of-scope screens')}
          </div>
        ) : null}
      </div>
      <div style={{ padding: '12px 16px 32px' }}>
        {screens.map((s, i) => {
          if ('outOfScope' in s) {
            return (
              <section
                key={i}
                style={{
                  marginBottom: 12,
                  padding: '12px 14px',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 12,
                  background: 'rgba(15,23,42,0.45)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{s.screenId}</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      border: '1px solid rgba(148,163,184,0.25)',
                      borderRadius: 999,
                      padding: '1px 6px',
                    }}
                  >
                    out of scope
                  </span>
                </div>
              </section>
            );
          }
          const screenChanges = countScreenRecords(s);
          const isCollapsed = collapsedScreens.has(i);
          return (
            <section
              key={i}
              style={{
                marginBottom: 12,
                padding: '12px 14px',
                border: '1px solid rgba(148,163,184,0.12)',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.45)',
              }}
            >
              <div
                role="button"
                onClick={() => toggleScreen(i)}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{s.screenId}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: 2 }}>
                    {formatCountLabel(screenChanges, 'record', 'records')}
                  </div>
                </div>
                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{isCollapsed ? '▶' : '▼'}</span>
              </div>

              {!isCollapsed && (
                <>
                  <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid rgba(96,165,250,0.22)' }}>
                    <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: 6 }}>Screen diffs</div>
                    <DiffRecordList records={s.diffs} emptyLabel="No screen-level diffs" />
                  </div>
                  <div style={{ marginTop: 14, paddingLeft: 12, borderLeft: '2px solid rgba(148,163,184,0.18)' }}>
                    <div style={{ color: '#cbd5e1', fontWeight: 600, marginBottom: 8 }}>
                      Entities ({s.entities.length})
                    </div>
                    {s.entities.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.76rem' }}>No entity-level changes</div>
                    ) : (
                      s.entities.map(entity => (
                        <section key={entity.entityId} style={{ marginBottom: 12 }}>
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                            Entity <code style={{ color: '#93c5fd' }}>{entity.entityId}</code>
                          </div>
                          <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid rgba(148,163,184,0.15)' }}>
                            <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>Entity diffs</div>
                            <DiffRecordList records={entity.diffs} emptyLabel="No entity-level diffs" />
                          </div>
                          <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid rgba(148,163,184,0.12)' }}>
                            <div style={{ color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>
                              Components ({entity.components.length})
                            </div>
                            {entity.components.length === 0 ? (
                              <div style={{ color: '#64748b', fontSize: '0.76rem' }}>No component-level changes</div>
                            ) : (
                              entity.components.map(component => (
                                <section key={component.componentId} style={{ marginBottom: 10 }}>
                                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
                                    Component <code style={{ color: '#93c5fd' }}>{component.componentId}</code>
                                  </div>
                                  <div style={{ marginTop: 6, paddingLeft: 12, borderLeft: '2px solid rgba(148,163,184,0.1)' }}>
                                    <DiffRecordList records={component.diffs} emptyLabel="No component-level diffs" />
                                  </div>
                                </section>
                              ))
                            )}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
