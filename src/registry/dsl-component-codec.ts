import type { TextComponent } from '../domain/dsl-types';

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

/** Text 種別の DSL 断片を {@link TextComponent} に narrow する（第1スライス） */
export function decodeTextDslComponent(component: unknown): DslComponentDecodeResult<DecodedDslComponent & { props: TextComponent }> {
  const decoded = decodeDslComponent(component);
  if (!decoded.value) {
    return { value: null, reason: decoded.reason };
  }
  if (decoded.value.name !== 'Text') {
    return { value: null, reason: 'invalid-name' };
  }
  if (!isRecord(decoded.value.props)) {
    return { value: null, reason: 'props-not-object' };
  }
  const rawProps = decoded.value.props;
  if (typeof (rawProps as { value?: unknown }).value !== 'string') {
    return { value: null, reason: 'props-not-object' };
  }
  return {
    value: {
      name: 'Text',
      props: rawProps as unknown as TextComponent
    },
    reason: null
  };
}

