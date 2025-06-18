import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from './types';

const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : undefined;

function renderComponent(comp: ComponentDef, key: number): React.ReactNode {
  if ('Text' in comp) {
    return <Text key={key} {...comp.Text} />;
  }
  if ('Input' in comp) {
    return <Input key={key} {...comp.Input} />;
  }
  if ('Button' in comp) {
    return <Button key={key} {...comp.Button} />;
  }
  if ('Checkbox' in comp) {
    return <Checkbox key={key} {...comp.Checkbox} />;
  }
  if ('Radio' in comp) {
    return <Radio key={key} {...comp.Radio} />;
  }
  if ('Select' in comp) {
    return <Select key={key} {...comp.Select} />;
  }
  if ('Divider' in comp) {
    return <Divider key={key} {...comp.Divider} />;
  }
  if ('Alert' in comp) {
    return <Alert key={key} {...comp.Alert} />;
  }
  if ('Container' in comp) {
    // Containerのchildrenを再帰的に描画（仮: childrenプロパティがcomponents配列である前提）
    const children = (comp as any).Container.components as ComponentDef[] | undefined;
    return (
      <Container key={key} layout={(comp as any).Container.layout || 'vertical'}>
        {children ? children.map((child, i) => renderComponent(child, i)) : null}
      </Container>
    );
  }
  if ('Form' in comp) {
    const form: FormComponent = comp.Form;
    // fields, actionsを再帰的に描画
    return (
      <Form
        key={key}
        id={form.id}
        fields={form.fields}
        actions={form.actions}
        onSubmit={data => {
          // ここで何かアクションを追加可能
          console.log('Form submit:', data);
        }}
      >
        {/* fields, actionsを再帰的に描画 */}
        {form.fields.map((field: FormField, i: number) => {
          if (field.Input) return <Input key={i} {...field.Input} />;
          if (field.Checkbox) return <Checkbox key={i} {...field.Checkbox} />;
          return null;
        })}
        <div style={{ display: 'flex', gap: 8 }}>
          {form.actions.map((action: FormAction, i: number) => {
            if (action.Button) return <Button key={i} {...action.Button} />;
            return null;
          })}
        </div>
      </Form>
    );
  }
  // 未対応コンポーネントは警告表示
  return (
    <div key={key} style={{ color: 'orange' }}>
      未対応コンポーネント: {Object.keys(comp)[0]}
    </div>
  );
}

const App: React.FC = () => {
  const [json, setJson] = useState<TextUIDSL | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'json') {
        setJson(message.json);
        setError(null);
      } else if (message.type === 'error') {
        setError(message.error);
        setJson(null);
      }
    });
  }, []);

  if (error) {
    return <div style={{ color: 'red' }}>YAMLパースエラー: {error}</div>;
  }
  if (!json) {
    return <div>Loading...</div>;
  }

  const components: ComponentDef[] = json.page?.components || [];
  return (
    <div style={{ padding: 24 }}>
      {components.map((comp, i) => renderComponent(comp, i))}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />); 