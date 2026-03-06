/**
 * WebView コンポーネントマップ
 * コンポーネント名 → Reactレンダラーのマッピングを一元管理し、
 * webview.tsx のif-else連鎖を排除する
 */
import React from 'react';
import { Text } from './components/Text';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { Container } from './components/Container';
import { Form } from './components/Form';
import { Radio } from './components/Radio';
import { Select } from './components/Select';
import { Divider } from './components/Divider';
import { Alert } from './components/Alert';
import { Accordion } from './components/Accordion';
import type {
  ComponentDef,
  FormComponent,
  FormField,
  FormAction,
  TextComponent,
  InputComponent,
  ButtonComponent,
  CheckboxComponent,
  RadioComponent,
  SelectComponent,
  DividerComponent,
  AlertComponent,
  ContainerComponent,
  AccordionComponent
} from './types';
import { getComponentName } from '../registry/component-registry';
import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../registry/component-registry';
import {
  getWebViewComponentRenderer,
  registerWebViewComponent as registerRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';

const isComponentProps = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function extractProps(
  component: Record<string, unknown>,
  name: string | null
): Record<string, unknown> | undefined {
  if (!name) {
    return undefined;
  }
  const value = component[name];
  return isComponentProps(value) ? value : undefined;
}

// --- 組み込みコンポーネントの登録 ---
const builtInRenderers: Record<BuiltInComponentName, WebViewComponentRenderer> = {
  Text: (props, key) => <Text key={key} {...(props as unknown as TextComponent)} />,
  Input: (props, key) => <Input key={key} {...(props as unknown as InputComponent)} />,
  Button: (props, key) => <Button key={key} {...(props as unknown as ButtonComponent)} />,
  Checkbox: (props, key) => <Checkbox key={key} {...(props as unknown as CheckboxComponent)} />,
  Radio: (props, key) => <Radio key={key} {...(props as unknown as RadioComponent)} />,
  Select: (props, key) => <Select key={key} {...(props as unknown as SelectComponent)} />,
  Divider: (props, key) => <Divider key={key} {...(props as unknown as DividerComponent)} />,
  Alert: (props, key) => <Alert key={key} {...(props as unknown as AlertComponent)} />,
  Accordion: (props, key) => <Accordion key={key} {...(props as unknown as AccordionComponent)} />,
  Container: (props, key) => {
    const containerProps = props as unknown as ContainerComponent;
    const children = containerProps.components;
    return (
      <Container key={key} layout={containerProps.layout || 'vertical'}>
        {children ? children.map((child: ComponentDef, i: number) => renderRegisteredComponent(child, i)) : null}
      </Container>
    );
  },
  Form: (props, key) => {
    const form = props as FormComponent;
    return (
      <Form
        key={key}
        id={form.id || ''}
        fields={form.fields || []}
        actions={form.actions || []}
        onSubmit={data => {
          console.log('Form submit:', data);
        }}
      >
        {(form.fields || []).map((field: FormField, i: number) => renderFormField(field, i))}
        <div style={{ display: 'flex', gap: 8 }}>
          {(form.actions || []).map((action: FormAction, i: number) => {
            if (action.Button) {return <Button key={i} {...action.Button} />;}
            return null;
          })}
        </div>
      </Form>
    );
  }
};

for (const componentName of BUILT_IN_COMPONENTS) {
  registerRenderer(componentName, builtInRenderers[componentName]);
}

/**
 * FormFieldをレンダリング（Mapベースのディスパッチ）
 */
function renderFormField(field: FormField, index: number): React.ReactNode {
  const fieldRecord = field as unknown as Record<string, unknown>;
  const name = getComponentName(fieldRecord);
  const props = extractProps(fieldRecord, name);
  const renderer = name ? getWebViewComponentRenderer(name) : undefined;

  if (name && props && renderer) {
    return renderer(props, index);
  }
  return null;
}

/**
 * ComponentDefをレンダリング（Mapベースのディスパッチ）
 * webview.tsx から呼び出されるメイン関数
 */
export function renderRegisteredComponent(comp: ComponentDef, key: React.Key): React.ReactNode {
  const componentRecord = comp as unknown as Record<string, unknown>;
  const name = getComponentName(componentRecord);
  const props = extractProps(componentRecord, name);
  const renderer = name ? getWebViewComponentRenderer(name) : undefined;

  if (name && props && renderer) {
    return renderer(props, key);
  }

  return (
    <div key={key} style={{ color: 'orange' }}>
      未対応コンポーネント: {name}
    </div>
  );
}

/**
 * カスタムコンポーネントを登録するための公開API
 */
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void {
  registerRenderer(name, renderer);
}
