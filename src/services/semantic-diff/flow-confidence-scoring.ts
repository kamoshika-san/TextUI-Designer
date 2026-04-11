import type { FlowDiffEvent } from '../../core/textui-core-diff';

export type FlowDiffVisualStatus = 'unchanged' | 'added' | 'removed' | 'changed';
export type FlowDiffConfidenceBand = 'high' | 'medium' | 'low';

export interface FlowDiffConfidenceScore {
  score: number;
  band: FlowDiffConfidenceBand;
  reason: string;
}

export function scoreFlowDiffEvent(event: FlowDiffEvent): FlowDiffConfidenceScore {
  switch (event.kind) {
    case 'add':
    case 'remove':
      return {
        score: 0.98,
        band: 'high',
        reason: `${event.entity} ${event.kind} is directly observable from normalized inventory`
      };
    case 'update':
      if (event.entity === 'screen') {
        return {
          score: event.field === 'terminal' ? 0.94 : 0.9,
          band: 'high',
          reason: `screen ${event.field} change is deterministic from normalized flow metadata`
        };
      }
      if (event.entity === 'transition') {
        return {
          score: event.field === 'guard' ? 0.9 : 0.94,
          band: 'high',
          reason: `transition ${event.field} change is deterministic from normalized flow metadata`
        };
      }
      return {
        score: event.field === 'entry' ? 0.93 : 0.88,
        band: 'high',
        reason: `flow ${event.field} change is deterministic from normalized flow metadata`
      };
  }
}
