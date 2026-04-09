import type { NavigationFlowDSL } from '../../domain/dsl-types';
import { createFlowTransitionKey, type FlowDiffEvent, type FlowDiffNormalizationResult } from '../../core/textui-core-diff';
import { normalizeFlowDiff } from '../../core/diff-normalization/flow-normalizer';
import { scoreFlowDiffEvent, type FlowDiffConfidenceBand, type FlowDiffVisualStatus } from './flow-confidence-scoring';

export interface FlowSemanticDiffFinding {
  event: FlowDiffEvent;
  visualStatus: FlowDiffVisualStatus;
  confidence: {
    score: number;
    band: FlowDiffConfidenceBand;
    reason: string;
  };
  target: {
    entity: 'flow' | 'screen' | 'transition';
    key: string;
  };
}

export interface FlowSemanticDiffResult {
  normalization: FlowDiffNormalizationResult;
  findings: FlowSemanticDiffFinding[];
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}

function targetKeyForEvent(event: FlowDiffEvent): string {
  if (event.entity === 'flow') {
    return event.field;
  }
  if (event.entity === 'screen') {
    return event.def.id;
  }
  return event.def.key;
}

function visualStatusForEvent(event: FlowDiffEvent): FlowDiffVisualStatus {
  switch (event.kind) {
    case 'add':
      return 'added';
    case 'remove':
      return 'removed';
    case 'update':
      return 'changed';
  }
}

export function buildFlowSemanticDiff(params: {
  previousDsl: NavigationFlowDSL;
  nextDsl: NavigationFlowDSL;
  previousSourcePath?: string;
  nextSourcePath?: string;
}): FlowSemanticDiffResult {
  const normalization = normalizeFlowDiff(params);
  const findings = normalization.events.map(event => ({
    event,
    visualStatus: visualStatusForEvent(event),
    confidence: scoreFlowDiffEvent(event),
    target: {
      entity: event.entity,
      key: targetKeyForEvent(event)
    }
  }));

  return {
    normalization,
    findings,
    summary: {
      added: findings.filter(finding => finding.visualStatus === 'added').length,
      removed: findings.filter(finding => finding.visualStatus === 'removed').length,
      changed: findings.filter(finding => finding.visualStatus === 'changed').length
    }
  };
}

export function createFlowDiagramDiffState(result: FlowSemanticDiffResult): {
  screenStates: Record<string, FlowDiffVisualStatus>;
  transitionStates: Record<string, FlowDiffVisualStatus>;
  flowChanged: boolean;
} {
  const screenStates: Record<string, FlowDiffVisualStatus> = {};
  const transitionStates: Record<string, FlowDiffVisualStatus> = {};
  let flowChanged = false;

  for (const finding of result.findings) {
    if (finding.target.entity === 'screen') {
      screenStates[finding.target.key] = finding.visualStatus;
    } else if (finding.target.entity === 'transition') {
      transitionStates[finding.target.key] = finding.visualStatus;
    } else {
      flowChanged = true;
    }
  }

  return { screenStates, transitionStates, flowChanged };
}

export function createFlowTransitionStateKey(
  transition: Pick<NavigationFlowDSL['flow']['transitions'][number], 'from' | 'to' | 'trigger'>
): string {
  return createFlowTransitionKey(transition);
}
