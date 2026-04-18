/**
 * Semantic v2 DSL structure concept TypeScript types
 * Source: docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md
 * Target boundary: design artifact only — do NOT import from src/
 */

import type { CanonicalPredicate } from './canonical-predicate';
import type { V2DiffRecord } from './diff-record';

// ---- 5-axis enumerations ----

export type ActionDomain = 'persist' | 'workflow' | 'navigate' | 'mutate' | 'system';

export type ActionType =
  // persist
  | 'create' | 'update' | 'save_draft'
  // workflow
  | 'submit' | 'approve' | 'reject' | 'cancel'
  // navigate
  | 'open' | 'back' | 'next' | 'close'
  // mutate
  | 'add' | 'remove' | 'reorder'
  // system
  | 'search' | 'filter' | 'sort' | 'export' | 'import';

export type EntityState = 'new' | 'draft' | 'editing' | 'submitted' | 'approved' | 'rejected' | 'archived';

export type ViewState = 'loading' | 'empty' | 'ready' | 'error';

export type InteractionState = 'idle' | 'dirty' | 'validating' | 'saving';

export type Visibility = 'visible' | 'hidden';

export type EnabledState = 'enabled' | 'disabled';

export type Editability = 'editable' | 'readonly';

export type RoleActor = 'guest' | 'user' | 'operator' | 'approver' | 'admin';

// ---- 5-axis composite types ----

/** Action axis — operation meaning expressed as domain/type tree */
export interface ActionAxis {
  domain: ActionDomain;
  type: ActionType;
}

/** State axis — entity, view, and interaction states kept separate */
export interface StateAxis {
  entity_state: EntityState;
  view_state?: ViewState;
  interaction_state?: InteractionState;
}

/** Availability axis — visibility / enabled / editability separated */
export interface AvailabilityAxis {
  /** Key order is fixed: visibility → enabled → editability */
  visibility: Visibility;
  enabled: EnabledState;
  editability: Editability;
}

/** Role axis — coarse permission actors */
export interface RoleAxis {
  actors: RoleActor[];
}

/** Transition axis — stable-reference keyed state transition */
export interface TransitionAxis {
  id: string;
  trigger: ActionAxis;
  from: EntityState;
  to: EntityState;
}

// ---- DSL structural concepts ----

/** UI element inside a screen; Action / Availability predicates apply here */
export interface Component {
  id: string;
  type?: string;
  label?: string;
  action?: ActionAxis;
  availability?: AvailabilityAxis;
  guard?: CanonicalPredicate;
}

/** Business subject of a screen; 5-axis is evaluated against this entity */
export interface Entity {
  id: string;
  name: string;
  state?: EntityState;
}

/** Top-level comparison and normalization unit */
export interface Screen {
  screen: string;
  entity: Entity;
  components: Component[];
  transitions?: TransitionAxis[];
}

// ---- Semantic meaning bundle ----

/** The five semantic axes bundled for a given entity or component */
export interface SemanticMeaning {
  action?: ActionAxis;
  state?: StateAxis;
  availability?: AvailabilityAxis;
  role?: RoleAxis;
  transition?: TransitionAxis;
}

// ---- Diff comparison units ----

/** Comparison result at component granularity */
export interface V2ComponentDiff {
  component_id: string;
  diffs: V2DiffRecord[];
}

/** Comparison result at entity granularity */
export interface V2EntityDiff {
  entity_id: string;
  diffs: V2DiffRecord[];
  components: V2ComponentDiff[];
}

/** Comparison result at screen granularity (top-level unit) */
export interface V2ScreenDiff {
  screen_id: string;
  diffs: V2DiffRecord[];
  entities: V2EntityDiff[];
}
