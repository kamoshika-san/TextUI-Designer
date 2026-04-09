export interface ScreenRef {
  id: string;
  page: string;
  title?: string;
}

export interface TransitionDef {
  from: string;
  to: string;
  trigger: string;
  label?: string;
  condition?: string;
  params?: string[];
}

export interface NavigationFlowDef {
  id: string;
  title: string;
  entry: string;
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

function isScreenRef(value: unknown): value is ScreenRef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.page === 'string' &&
    isOptionalString(value.title)
  );
}

function isTransitionDef(value: unknown): value is TransitionDef {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.trigger === 'string' &&
    isOptionalString(value.label) &&
    isOptionalString(value.condition) &&
    (value.params === undefined || isStringArray(value.params))
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
    Array.isArray(flow.screens) &&
    flow.screens.every(isScreenRef) &&
    Array.isArray(flow.transitions) &&
    flow.transitions.every(isTransitionDef)
  );
}
