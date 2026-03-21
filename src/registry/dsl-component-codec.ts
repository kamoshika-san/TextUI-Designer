export interface DecodedDslComponent {
  name: string;
  props: unknown;
}

export interface DecodedDslComponentWithObjectProps {
  name: string;
  props: Record<string, unknown>;
}

export type DslComponentDecodeFailureReason =
  | 'not-object'
  | 'empty-object'
  | 'invalid-name'
  | 'props-not-object';

export interface DslComponentDecodeResult<T> {
  value: T | null;
  reason: DslComponentDecodeFailureReason | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function decodeDslComponent(component: unknown): DslComponentDecodeResult<DecodedDslComponent> {
  if (!isRecord(component)) {
    return { value: null, reason: 'not-object' };
  }

  const keys = Object.keys(component);
  if (keys.length === 0) {
    return { value: null, reason: 'empty-object' };
  }

  const name = keys[0];
  if (!name) {
    return { value: null, reason: 'invalid-name' };
  }

  return {
    value: {
      name,
      props: component[name]
    },
    reason: null
  };
}

export function decodeDslComponentObjectProps(
  component: unknown
): DslComponentDecodeResult<DecodedDslComponentWithObjectProps> {
  const decoded = decodeDslComponent(component);
  if (!decoded.value) {
    return { value: null, reason: decoded.reason };
  }

  if (!isRecord(decoded.value.props)) {
    return { value: null, reason: 'props-not-object' };
  }

  return {
    value: {
      name: decoded.value.name,
      props: decoded.value.props
    },
    reason: null
  };
}

