import type { TextComponent, ButtonComponent } from '../domain/dsl-types';

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

/**
 * コンポーネント名をリテラル型 K として絞り込む（name / props の入口を揃える第2スライス）。
 * props の中身はこの段階では unknown のまま。種別ごとの narrow は {@link decodeTextDslComponent} 等へ。
 */
export function decodeDslComponentAs<const K extends string>(
  component: unknown,
  expectedName: K
): DslComponentDecodeResult<{ name: K; props: unknown }> {
  const decoded = decodeDslComponent(component);
  if (!decoded.value) {
    return { value: null, reason: decoded.reason };
  }
  if (decoded.value.name !== expectedName) {
    return { value: null, reason: 'invalid-name' };
  }
  return {
    value: { name: expectedName, props: decoded.value.props },
    reason: null
  };
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

const BUTTON_KINDS = new Set<string>(['primary', 'secondary', 'submit']);
const BUTTON_SIZES = new Set<string>(['sm', 'md', 'lg']);
const ICON_POSITIONS = new Set<string>(['left', 'right']);

function isOptionalString(v: unknown): boolean {
  return v === undefined || typeof v === 'string';
}

/** Button 種別の DSL 断片を {@link ButtonComponent} に narrow する（T-108 第2スライス） */
export function decodeButtonDslComponent(
  component: unknown
): DslComponentDecodeResult<DecodedDslComponent & { props: ButtonComponent }> {
  const decoded = decodeDslComponent(component);
  if (!decoded.value) {
    return { value: null, reason: decoded.reason };
  }
  if (decoded.value.name !== 'Button') {
    return { value: null, reason: 'invalid-name' };
  }
  if (!isRecord(decoded.value.props)) {
    return { value: null, reason: 'props-not-object' };
  }
  const p = decoded.value.props;
  if (!isOptionalString(p.label) || !isOptionalString(p.icon)) {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.kind !== undefined && !BUTTON_KINDS.has(String(p.kind))) {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.size !== undefined && !BUTTON_SIZES.has(String(p.size))) {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.iconPosition !== undefined && !ICON_POSITIONS.has(String(p.iconPosition))) {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.submit !== undefined && typeof p.submit !== 'boolean') {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.disabled !== undefined && typeof p.disabled !== 'boolean') {
    return { value: null, reason: 'props-not-object' };
  }
  if (p.token !== undefined && typeof p.token !== 'string') {
    return { value: null, reason: 'props-not-object' };
  }
  return {
    value: {
      name: 'Button',
      props: p as ButtonComponent
    },
    reason: null
  };
}

