export type NavigationFlowVersion = '1' | '2';

export type NavigationScreenKind =
  | 'screen'
  | 'decision'
  | 'review'
  | 'terminal';

export type NavigationTerminalKind =
  | 'success'
  | 'failure'
  | 'cancel'
  | 'handoff';

export type NavigationTransitionKind =
  | 'forward'
  | 'branch'
  | 'backtrack'
  | 'retry'
  | 'loop'
  | 'escalation';

export type NavigationLoopPolicy = 'deny' | 'warn' | 'allow';

const NAVIGATION_FLOW_VERSIONS: readonly NavigationFlowVersion[] = ['1', '2'];
const NAVIGATION_SCREEN_KINDS: readonly NavigationScreenKind[] = ['screen', 'decision', 'review', 'terminal'];
const NAVIGATION_TERMINAL_KINDS: readonly NavigationTerminalKind[] = ['success', 'failure', 'cancel', 'handoff'];
const NAVIGATION_TRANSITION_KINDS: readonly NavigationTransitionKind[] = ['forward', 'branch', 'backtrack', 'retry', 'loop', 'escalation'];
const NAVIGATION_LOOP_POLICIES: readonly NavigationLoopPolicy[] = ['deny', 'warn', 'allow'];

export interface NavigationTerminalDef {
  kind: NavigationTerminalKind;
  label?: string;
  outcome?: string;
}

export interface NavigationGuardDef {
  expression?: string;
  params?: string[];
}

export interface NavigationPolicyDef {
  loops?: NavigationLoopPolicy;
  terminalScreensRequired?: boolean;
}

export interface ScreenRef {
  id: string;
  page: string;
  title?: string;
  kind?: NavigationScreenKind;
  tags?: string[];
  terminal?: NavigationTerminalDef;
}

export interface TransitionDef {
  id?: string;
  from: string;
  to: string;
  trigger: string;
  label?: string;
  condition?: string;
  params?: string[];
  kind?: NavigationTransitionKind;
  tags?: string[];
  guard?: NavigationGuardDef;
}

export interface NavigationFlowDef {
  id: string;
  title: string;
  entry: string;
  version?: NavigationFlowVersion;
  policy?: NavigationPolicyDef;
  screens: ScreenRef[];
  transitions: TransitionDef[];
}

export interface NavigationFlowDSL {
  flow: NavigationFlowDef;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function isOptionalOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T | undefined {
  return value === undefined || isOneOf(value, allowed);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isNavigationTerminalDef(value: unknown): value is NavigationTerminalDef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOneOf(value.kind, NAVIGATION_TERMINAL_KINDS) &&
    isOptionalString(value.label) &&
    isOptionalString(value.outcome)
  );
}

function isNavigationGuardDef(value: unknown): value is NavigationGuardDef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.expression) &&
    (value.params === undefined || isStringArray(value.params))
  );
}

function isNavigationPolicyDef(value: unknown): value is NavigationPolicyDef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalOneOf(value.loops, NAVIGATION_LOOP_POLICIES) &&
    isOptionalBoolean(value.terminalScreensRequired)
  );
}

function isScreenRef(value: unknown): value is ScreenRef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.page === 'string' &&
    isOptionalString(value.title) &&
    isOptionalOneOf(value.kind, NAVIGATION_SCREEN_KINDS) &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.terminal === undefined || isNavigationTerminalDef(value.terminal))
  );
}

function isTransitionDef(value: unknown): value is TransitionDef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalString(value.id) &&
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.trigger === 'string' &&
    isOptionalString(value.label) &&
    isOptionalString(value.condition) &&
    (value.params === undefined || isStringArray(value.params)) &&
    isOptionalOneOf(value.kind, NAVIGATION_TRANSITION_KINDS) &&
    (value.tags === undefined || isStringArray(value.tags)) &&
    (value.guard === undefined || isNavigationGuardDef(value.guard))
  );
}

export function isNavigationFlowDSL(val: unknown): val is NavigationFlowDSL {
  if (!isRecord(val) || !isRecord(val.flow)) {
    return false;
  }

  const flow = val.flow;
  return (
    typeof flow.id === 'string' &&
    typeof flow.title === 'string' &&
    typeof flow.entry === 'string' &&
    isOptionalOneOf(flow.version, NAVIGATION_FLOW_VERSIONS) &&
    (flow.policy === undefined || isNavigationPolicyDef(flow.policy)) &&
    Array.isArray(flow.screens) &&
    flow.screens.every(isScreenRef) &&
    Array.isArray(flow.transitions) &&
    flow.transitions.every(isTransitionDef)
  );
}
