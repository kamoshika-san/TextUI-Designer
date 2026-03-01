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
import type { ComponentDef, FormComponent, FormField, FormAction } from './types';
import { getComponentName } from '../registry/component-registry';
import {
  getWebViewComponentRenderer,
  registerWebViewComponent as registerRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';

// --- 組み込みコンポーネントの登録 ---

registerRenderer('Text', (props, key) => <Text key={key} {...props} />);
registerRenderer('Input', (props, key) => <Input key={key} {...props} />);
registerRenderer('Button', (props, key) => <Button key={key} {...props} />);
registerRenderer('Checkbox', (props, key) => <Checkbox key={key} {...props} />);
registerRenderer('Radio', (props, key) => <Radio key={key} {...props} />);
registerRenderer('Select', (props, key) => <Select key={key} {...props} />);
registerRenderer('Divider', (props, key) => <Divider key={key} {...props} />);
registerRenderer('Alert', (props, key) => <Alert key={key} {...props} />);

registerRenderer('Container', (props, key) => {
  const children = props.components as ComponentDef[] | undefined;
  return (
    <Container key={key} layout={props.layout || 'vertical'}>
      {children ? children.map((child: ComponentDef, i: number) => renderRegisteredComponent(child, i)) : null}
    </Container>
  );
});

registerRenderer('Form', (props, key) => {
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
          if (action.Button) return <Button key={i} {...action.Button} />;
          return null;
        })}
      </div>
    </Form>
  );
});

/**
 * FormFieldをレンダリング（Mapベースのディスパッチ）
 */
function renderFormField(field: FormField, index: number): React.ReactNode {
  const name = getComponentName(field as Record<string, unknown>);
  const props = name ? (field as any)[name] : undefined;
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
export function renderRegisteredComponent(comp: ComponentDef, key: number): React.ReactNode {
  const name = getComponentName(comp as Record<string, unknown>);
  const props = name ? (comp as any)[name] : undefined;
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
