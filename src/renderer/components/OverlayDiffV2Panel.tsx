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

function countScreenRecords(screen: Exclude<VisualDiffV2Result['payload']['screens'][number], { outOfScope: true }>): number {
  return (
    screen.diffs.length +
    screen.entities.reduce((entitySum, entity) => {
      const componentDiffs = entity.components.reduce((componentSum, component) => componentSum + component.diffs.length, 0);
      return entitySum + entity.diffs.length + componentDiffs;
    }, 0)
  );
}

// ---- CanonicalPredicate rendering ----------------------------------------

function formatPredicateValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatPredicateValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${formatPredicateValue(v)}`);
    return `{ ${entries.join(', ')} }`;
  }
  return String(value);
}

export function renderPredicateCompact(pred: unknown, depth = 0): string {
  if (!pred || typeof pred !== 'object') return String(pred);
  const p = pred as Record<string, unknown>;

  if (p['kind'] === 'unresolved') {
    const reason = p['reason'] ?? '?';
    const candidates = Array.isArray(p['candidates']) && p['candidates'].length > 0
      ? ` [${(p['candidates'] as unknown[]).join(', ')}]` : '';
    return `⚠ unresolved: ${reason}${candidates}`;
  }

  if (p['op'] === 'all_of' && Array.isArray(p['all_of'])) {
    if (depth >= 2) return 'all_of(…)';
    return `all_of(${(p['all_of'] as unknown[]).map(c => renderPredicateCompact(c, depth + 1)).join(', ')})`;
  }
  if (p['op'] === 'any_of' && Array.isArray(p['any_of'])) {
    if (depth >= 2) return 'any_of(…)';
    return `any_of(${(p['any_of'] as unknown[]).map(c => renderPredicateCompact(c, depth + 1)).join(', ')})`;
  }
  if (p['op'] === 'not' && p['not']) {
    return `not(${renderPredicateCompact(p['not'], depth + 1)})`;
  }

  const fact = String(p['fact'] ?? '?');
  const op = String(p['op'] ?? '?');
  if (op === 'exists') return `${fact} exists`;
  return `${fact} ${op} ${formatPredicateValue(p['value'])}`;
}

// ---- Evidence shape renderers --------------------------------------------

interface TransitionLeg {
  from: string;
  to: string;
  trigger: string;
  guard?: string;
}

function isStateMachineTransitionEvidence(item: unknown): item is { evidence_shape: 'state_machine.transition'; before: TransitionLeg; after: TransitionLeg } {
  return (
    typeof item === 'object' && item !== null &&
    (item as Record<string, unknown>)['evidence_shape'] === 'state_machine.transition'
  );
}

function TransitionEvidenceTable({ item }: { item: { before: TransitionLeg; after: TransitionLeg } }) {
  const { before, after } = item;
  const rows: Array<[string, string, string]> = [];
  if (before.from !== after.from) rows.push(['from', before.from, after.from]);
  if (before.to !== after.to) rows.push(['to', before.to, after.to]);
  if (before.trigger !== after.trigger) rows.push(['trigger', before.trigger, after.trigger]);
  const bg = (before.guard ?? '') !== (after.guard ?? '');
  if (bg) rows.push(['guard', before.guard ?? '—', after.guard ?? '—']);

  const displayRows = rows.length > 0 ? rows : (
    [['from', before.from, after.from] as [string, string, string],
     ['to', before.to, after.to] as [string, string, string],
     ['trigger', before.trigger, after.trigger] as [string, string, string]]
  );

  return (
    <table data-testid="transition-evidence-table" style={{ borderCollapse: 'collapse', fontSize: '0.74rem', width: '100%', marginTop: 4 }}>
      <thead>
        <tr>
          <th style={{ color: '#64748b', textAlign: 'left', fontWeight: 400, padding: '1px 10px 1px 0', minWidth: 52 }}></th>
          <th style={{ color: '#94a3b8', textAlign: 'left', fontWeight: 400, padding: '1px 10px 1px 0' }}>before</th>
          <th style={{ color: '#94a3b8', textAlign: 'left', fontWeight: 400, padding: '1px 0' }}>after</th>
        </tr>
      </thead>
      <tbody>
        {displayRows.map(([field, bVal, aVal]) => (
          <tr key={field}>
            <td style={{ color: '#64748b', paddingRight: 10, verticalAlign: 'top' }}>{field}</td>
            <td style={{ color: '#fca5a5', fontFamily: 'monospace', paddingRight: 10, verticalAlign: 'top' }}>{bVal}</td>
            <td style={{ color: '#86efac', fontFamily: 'monospace', verticalAlign: 'top' }}>{aVal}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FallbackEvidenceItem({ item }: { item: unknown }) {
  let text: string;
  try { text = JSON.stringify(item); } catch { text = String(item); }
  return <code style={{ color: '#94a3b8', fontSize: '0.74rem', wordBreak: 'break-all' }}>{text}</code>;
}

function EvidenceItem({ item }: { item: unknown }) {
  if (isStateMachineTransitionEvidence(item)) {
    return <TransitionEvidenceTable item={item} />;
  }
  return <FallbackEvidenceItem item={item} />;
}

// ---- Before/after predicate display --------------------------------------

function BeforeAfterPredicates({ beforePredicate, afterPredicate }: { beforePredicate?: unknown; afterPredicate?: unknown }) {
  if (!beforePredicate && !afterPredicate) return null;
  return (
    <div
      data-testid="before-after-predicates"
      style={{ marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
    >
      {beforePredicate ? (
        <div>
          <div style={{ color: '#64748b', fontSize: '0.70rem', marginBottom: 2 }}>before</div>
          <code
            data-testid="before-predicate"
            style={{ color: '#fca5a5', fontSize: '0.74rem', wordBreak: 'break-all', display: 'block' }}
          >
            {renderPredicateCompact(beforePredicate)}
          </code>
        </div>
      ) : <div />}
      {afterPredicate ? (
        <div>
          <div style={{ color: '#64748b', fontSize: '0.70rem', marginBottom: 2 }}>after</div>
          <code
            data-testid="after-predicate"
            style={{ color: '#86efac', fontSize: '0.74rem', wordBreak: 'break-all', display: 'block' }}
          >
            {renderPredicateCompact(afterPredicate)}
          </code>
        </div>
      ) : <div />}
    </div>
  );
}

// ---- Combined explanation section ----------------------------------------

function ExplanationDetail({
  evidence,
  beforePredicate,
  afterPredicate,
}: {
  evidence: unknown[];
  beforePredicate?: unknown;
  afterPredicate?: unknown;
}) {
  const hasEvidence = evidence.length > 0;
  // Suppress predicates when state_machine.transition evidence is present:
  // the evidence table already shows from/to/trigger/guard — predicates would be redundant.
  const suppressPredicates = evidence.some(isStateMachineTransitionEvidence);
  const hasPredicates = !suppressPredicates && Boolean(beforePredicate || afterPredicate);
  if (!hasEvidence && !hasPredicates) return null;

  return (
    <div style={{ marginTop: 6 }}>
      {evidence.map((item, i) => (
        <div key={i} style={{ marginBottom: hasPredicates ? 4 : 0 }}>
          <EvidenceItem item={item} />
        </div>
      ))}
      {!suppressPredicates && (
        <BeforeAfterPredicates beforePredicate={beforePredicate} afterPredicate={afterPredicate} />
      )}
    </div>
  );
}

// ---- DiffRecordList ------------------------------------------------------

type DiffRecordEntry = {
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
    beforePredicate?: unknown;
    afterPredicate?: unknown;
  };
};

function DiffRecordList({ records, emptyLabel }: { records: DiffRecordEntry[]; emptyLabel: string }) {
  if (records.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '0.76rem' }}>{emptyLabel}</div>;
  }

  return (
    <ul style={{ margin: 0, paddingLeft: '18px' }}>
      {records.map((record, index) => {
        const isLow = record.decision.confidenceBand === 'low';
        const isNeedsReview = record.decision.reviewStatus === 'needs_review';
        return (
          <li key={`${record.decision.targetId}:${record.decision.diffEvent}:${index}`} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{formatDiffEvent(record.decision.diffEvent)}</span>
              <code style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.12)', padding: '1px 6px', borderRadius: 999 }}>
                {record.decision.targetId}
              </code>
              <span style={{ color: isLow ? '#fbbf24' : '#64748b', fontSize: '0.74rem' }}>
                {formatConfidence(record.decision.confidence)}
                {isLow ? ' ⚠ low' : ''}
              </span>
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
            <ExplanationDetail
              evidence={record.explanation.evidence ?? []}
              beforePredicate={record.explanation.beforePredicate}
              afterPredicate={record.explanation.afterPredicate}
            />
          </li>
        );
      })}
    </ul>
  );
}

// ---- Panel ---------------------------------------------------------------

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
