/**
 * Semantic v2 evidence_shape TypeScript types
 * Source: docs/v2-evidence-shapes-registry-ja.md
 * Target boundary: design artifact only — do NOT import from src/
 */

// ---- state_machine.transition ----

interface StateMachineTransitionLeg {
  from: string;
  to: string;
  trigger: string;
  guard?: string;
}

export interface StateMachineTransitionEvidence {
  evidence_shape: 'state_machine.transition';
  before: StateMachineTransitionLeg;
  after: StateMachineTransitionLeg;
}

// ---- copy_locale.message_string ----

interface CopyLocaleMessageStringLeg {
  message_key: string;
  locale: string;
  text: string;
  plural_form?: string;
}

export interface CopyLocaleMessageStringEvidence {
  evidence_shape: 'copy_locale.message_string';
  before: CopyLocaleMessageStringLeg;
  after: CopyLocaleMessageStringLeg;
}

// ---- data_contract.field_requiredness ----

interface DataContractFieldRequirednessLeg {
  field_path: string;
  required: boolean;
  scope?: string;
}

export interface DataContractFieldRequirednessEvidence {
  evidence_shape: 'data_contract.field_requiredness';
  before: DataContractFieldRequirednessLeg;
  after: DataContractFieldRequirednessLeg;
}

/**
 * Discriminated union of all registered v2 evidence shapes.
 * Discriminant: evidence_shape
 */
export type EvidenceShape =
  | StateMachineTransitionEvidence
  | CopyLocaleMessageStringEvidence
  | DataContractFieldRequirednessEvidence;
