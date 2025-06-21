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
import { ThemeToggle } from './components/ThemeToggle';
import type { TextUIDSL, ComponentDef, FormComponent, FormField, FormAction } from './types';

// HTMLテンプレートで既に取得されているvscodeオブジェクトを使用
const vscode = (window as any).vscode;

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
    // WebView準備完了メッセージを送信
    if (vscode && vscode.postMessage) {
      console.log('[React] WebView準備完了メッセージを送信');
      vscode.postMessage({ type: 'webview-ready' });
    }

    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('[React] メッセージを受信:', message);
      
      if (message.type === 'json') {
        console.log('[React] JSONデータを受信:', message.json);
        setJson(message.json);
        setError(null);
      } else if (message.type === 'update') {
        console.log('[React] 更新データを受信:', message.data);
        setJson(message.data);
        setError(null);
      } else if (message.type === 'error') {
        console.log('[React] エラーメッセージを受信:', message.error);
        setError(message.error);
      } else if (message.type === 'schema-error') {
        console.log('[React] スキーマエラーメッセージを受信:', message.errors);
        setError(
          'スキーマバリデーションエラー:\n' +
          (message.errors?.map((e: any) => `- ${e.instancePath} ${e.message}`).join('\n') || '')
        );
      } else if (message.type === 'theme-change') {
        console.log('[React] テーマ変更メッセージを受信:', message.theme);
        // テーマ変更はThemeToggleコンポーネントで処理される
      } else if (message.type === 'theme-variables') {
        console.log('[React] theme-variablesメッセージを受信:', message.css);
        const styleEl = document.getElementById('theme-vars');
        if (styleEl) {
          console.log('[React] theme-vars要素が見つかりました。CSSを適用します');
          styleEl.textContent = message.css;
          console.log('[React] CSS変数を適用しました');
        } else {
          console.error('[React] theme-vars要素が見つかりません');
        }
      } else {
        console.log('[React] 未対応のメッセージタイプ:', message.type);
      }
    });
  }, []);

  const handleExport = () => {
    if (vscode && vscode.postMessage) {
      console.log('[React] エクスポートボタンがクリックされました');
      vscode.postMessage({ type: 'export' });
    }
  };

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'red' }}>YAMLパースエラー: {error}</div>
      </div>
    );
  }
  if (!json) {
    return (
      <div style={{ padding: 24 }}>
        <div>Loading...</div>
      </div>
    );
  }

  const components: ComponentDef[] = json.page?.components || [];
  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {/* テーマ切り替えスイッチ */}
      <ThemeToggle />
      
      {/* エクスポートボタン */}
      <button 
        onClick={handleExport}
        className="export-button"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: 'rgba(75, 85, 99, 0.8)',
          color: '#d1d5db',
          border: '1px solid rgba(107, 114, 128, 0.5)',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          zIndex: 1000,
          height: '2.5rem', // 高さを固定
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '4.5rem' // 最小幅を設定
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
          e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
          e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
        }}
      >
        Export
      </button>
      
      {/* プレビューコンテンツ */}
      {components.map((comp, i) => renderComponent(comp, i))}
    </div>
  );
};

// メッセージリスナーを設定
window.addEventListener('message', (event) => {
	const message = event.data;
	
	if (message.type === 'openDevTools') {
		// 開発者ツールを開く（Electron環境でのみ動作）
		if (window.require) {
			try {
				const { remote } = window.require('electron');
				const currentWindow = remote.getCurrentWindow();
				currentWindow.webContents.openDevTools();
			} catch (e) {
				console.log('開発者ツールを開けませんでした:', e);
			}
		}
	}
});

// Reactアプリをレンダリング
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
} 