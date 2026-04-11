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
    typeof value.kind === 'string' &&
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
    isOptionalString(value.loops) &&
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
    isOptionalString(value.kind) &&
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
    isOptionalString(value.kind) &&
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
    isOptionalString(flow.version) &&
    (flow.policy === undefined || isNavigationPolicyDef(flow.policy)) &&
    Array.isArray(flow.screens) &&
    flow.screens.every(isScreenRef) &&
    Array.isArray(flow.transitions) &&
    flow.transitions.every(isTransitionDef)
  );
}
