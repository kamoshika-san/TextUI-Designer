/**
 * `DiffCompareResultV2Payload`（runtime snake_case）→ パネル用 camelCase ツリー
 */

import type {
  DiffCompareResultV2Payload,
  V2ComponentDiff,
  V2DiffRecord,
  V2EntityDiff,
  V2ScreenDiff,
} from '../../core/diff/diff-v2-types';
import type {
  SemanticDiffV2ComponentView,
  SemanticDiffV2EntityView,
  SemanticDiffV2ExplanationView,
  SemanticDiffV2PanelPayload,
  SemanticDiffV2RecordView,
  SemanticDiffV2ScreenView,
  VisualDiffV2Result,
} from './semantic-diff-v2-panel-model';

function mapExplanation(ex: V2DiffRecord['explanation']): SemanticDiffV2ExplanationView {
  return {
    evidence: ex.evidence ?? [],
    beforePredicate: undefined,
    afterPredicate: undefined,
    canonicalPredicate: ex.canonical_predicate,
  };
}

function mapDecision(dec: V2DiffRecord['decision']): SemanticDiffV2RecordView['decision'] {
  return {
    confidenceBand: 'high',
    diffEvent: dec.diff_event,
    targetId: dec.target_id,
    confidence: dec.confidence,
    ambiguityReason: dec.ambiguity_reason,
    reviewStatus: dec.review_status,
  };
}

function mapRecord(r: V2DiffRecord): SemanticDiffV2RecordView {
  return {
    decision: mapDecision(r.decision),
    explanation: mapExplanation(r.explanation),
  };
}

function mapComponent(c: V2ComponentDiff): SemanticDiffV2ComponentView {
  return {
    componentId: c.component_id,
    diffs: c.diffs.map(mapRecord),
  };
}

function mapEntity(e: V2EntityDiff): SemanticDiffV2EntityView {
  return {
    entityId: e.entity_id,
    diffs: e.diffs.map(mapRecord),
    components: e.components.map(mapComponent),
  };
}

function mapScreen(s: V2ScreenDiff): SemanticDiffV2ScreenView {
  return {
    screenId: s.screen_id,
    diffs: s.diffs.map(mapRecord),
    entities: s.entities.map(mapEntity),
  };
}

function payloadHasChanges(payload: SemanticDiffV2PanelPayload): boolean {
  const recordsNonEmpty = (rs: SemanticDiffV2RecordView[]) => rs.length > 0;

  for (const screen of payload.screens) {
    if (recordsNonEmpty(screen.diffs)) {
      return true;
    }
    for (const ent of screen.entities) {
      if (recordsNonEmpty(ent.diffs)) {
        return true;
      }
      for (const comp of ent.components) {
        if (recordsNonEmpty(comp.diffs)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Runtime `DiffCompareResultV2Payload` を WebView パネル用 `VisualDiffV2Result` に変換する。
 */
export function toVisualDiffV2FromPayload(v2: DiffCompareResultV2Payload): VisualDiffV2Result {
  const payload: SemanticDiffV2PanelPayload = {
    screens: v2.screens.map(mapScreen),
  };
  return {
    payload,
    hasChanges: payloadHasChanges(payload),
  };
}
