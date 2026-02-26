import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from './components/ThemeToggle';
import { CustomThemeSelector } from './components/CustomThemeSelector';
import { renderRegisteredComponent } from './component-map';
import type { TextUIDSL, ComponentDef } from './types';

// HTMLテンプレートで既に取得されているvscodeオブジェクトを使用
const vscode = (window as any).vscode;

// エラー情報の型定義
interface ErrorInfo {
  type: 'simple' | 'parse' | 'schema';
  message?: string;
  details?: {
    message: string;
    lineNumber: number;
    columnNumber: number;
    errorContext: string;
    suggestions: string[];
    fileName: string;
    fullPath: string;
    allErrors?: Array<{
      path: string;
      message: string;
      allowedValues?: string[];
    }>;
  };
  fileName?: string;
  content?: string;
}

const App: React.FC = () => {
  const [json, setJson] = useState<TextUIDSL | null>(null);
  const [error, setError] = useState<ErrorInfo | string | null>(null);

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
        setError({
          type: 'simple',
          message: message.error
        });
      } else if (message.type === 'schema-error') {
        console.log('[React] スキーマエラーメッセージを受信:', message.errors);
        setError({
          type: 'simple',
          message: 'スキーマバリデーションエラー:\n' +
            (message.errors?.map((e: any) => `- ${e.instancePath} ${e.message}`).join('\n') || '')
        });
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
      } else if (message.type === 'parseError') {
        console.log('[React] 詳細パースエラーメッセージを受信:', message.error);
        setError({
          type: 'parse',
          details: message.error,
          fileName: message.fileName,
          content: message.content
        });
      } else if (message.type === 'schemaError') {
        console.log('[React] 詳細スキーマエラーメッセージを受信:', message.error);
        setError({
          type: 'schema',
          details: message.error,
          fileName: message.fileName,
          content: message.content
        });
      } else if (message.type === 'clearError') {
        console.log('[React] エラー状態クリアメッセージを受信');
        setError(null);
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

  // エラー表示コンポーネント
  const renderError = () => {
    if (!error) return null;

    // 文字列エラー（レガシー）
    if (typeof error === 'string') {
      return (
        <div style={{ padding: 24 }}>
          <div style={{ color: 'red' }}>YAMLパースエラー: {error}</div>
        </div>
      );
    }

    // 詳細パースエラー
    if (error.type === 'parse' && error.details) {
      const { details } = error;
      return (
        <div style={{ 
          padding: 24, 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: 8,
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          {/* エラーヘッダー */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ 
              color: '#dc2626', 
              margin: '0 0 8px 0',
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}>
              🚨 YAML構文エラー
            </h3>
            <div style={{ 
              color: '#374151',
              fontSize: '0.9rem',
              marginBottom: 8
            }}>
              📁 ファイル: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: 4 }}>{details.fileName}</code>
            </div>
            <div style={{ 
              color: '#374151',
              fontSize: '0.9rem'
            }}>
              📍 位置: 行 {details.lineNumber}, 列 {details.columnNumber}
            </div>
          </div>

          {/* エラーメッセージ */}
          <div style={{ 
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 12,
            marginBottom: 16
          }}>
            <div style={{ 
              color: '#dc2626',
              fontWeight: 'medium',
              marginBottom: 8
            }}>
              エラー内容:
            </div>
            <div style={{ color: '#374151' }}>
              {details.message}
            </div>
          </div>

          {/* エラー位置のコンテキスト */}
          {details.errorContext && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ 
                color: '#374151',
                fontWeight: 'medium',
                marginBottom: 8
              }}>
                📋 エラー箇所:
              </div>
              <pre style={{ 
                margin: 0,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                backgroundColor: '#f9fafb',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                border: '1px solid #e5e7eb'
              }}>
                {details.errorContext}
              </pre>
            </div>
          )}

          {/* 修正提案 */}
          {details.suggestions.length > 0 && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 12
            }}>
              <div style={{ 
                color: '#374151',
                fontWeight: 'medium',
                marginBottom: 8
              }}>
                💡 修正提案:
              </div>
              <ul style={{ 
                margin: 0,
                paddingLeft: 20,
                color: '#374151'
              }}>
                {details.suggestions.map((suggestion, index) => (
                  <li key={index} style={{ marginBottom: 4 }}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // 詳細スキーマエラー
    if (error.type === 'schema' && error.details) {
      const { details } = error;
      return (
        <div style={{ 
          padding: 24, 
          backgroundColor: '#fef7cd', 
          border: '1px solid #fde68a',
          borderRadius: 8,
          maxWidth: '100%',
          overflow: 'auto'
        }}>
          {/* エラーヘッダー */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ 
              color: '#d97706', 
              margin: '0 0 8px 0',
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}>
              ⚠️ スキーマバリデーションエラー
            </h3>
            <div style={{ 
              color: '#374151',
              fontSize: '0.9rem',
              marginBottom: 8
            }}>
              📁 ファイル: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: 4 }}>{details.fileName}</code>
            </div>
            <div style={{ 
              color: '#374151',
              fontSize: '0.9rem'
            }}>
              📍 位置: 行 {details.lineNumber}, 列 {details.columnNumber}
            </div>
          </div>

          {/* エラーメッセージ */}
          <div style={{ 
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: 12,
            marginBottom: 16
          }}>
            <div style={{ 
              color: '#d97706',
              fontWeight: 'medium',
              marginBottom: 8
            }}>
              エラー内容:
            </div>
            <div style={{ color: '#374151' }}>
              {details.message}
            </div>
          </div>

          {/* エラー位置のコンテキスト */}
          {details.errorContext && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 12,
              marginBottom: 16
            }}>
              <div style={{ 
                color: '#374151',
                fontWeight: 'medium',
                marginBottom: 8
              }}>
                📋 エラー箇所:
              </div>
              <pre style={{ 
                margin: 0,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                backgroundColor: '#f9fafb',
                padding: 12,
                borderRadius: 4,
                overflow: 'auto',
                border: '1px solid #e5e7eb'
              }}>
                {details.errorContext}
              </pre>
            </div>
          )}

          {/* 修正提案 */}
          {details.suggestions.length > 0 && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              padding: 12,
              marginBottom: details.allErrors && details.allErrors.length > 1 ? 16 : 0
            }}>
              <div style={{ 
                color: '#374151',
                fontWeight: 'medium',
                marginBottom: 8
              }}>
                💡 修正提案:
              </div>
              <ul style={{ 
                margin: 0,
                paddingLeft: 20,
                color: '#374151'
              }}>
                {details.suggestions.map((suggestion, index) => (
                  <li key={index} style={{ marginBottom: 4 }}>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 全エラー詳細（複数エラーがある場合） */}
          {details.allErrors && details.allErrors.length > 1 && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',  
              borderRadius: 6,
              padding: 12
            }}>
              <div style={{ 
                color: '#374151',
                fontWeight: 'medium',
                marginBottom: 8
              }}>
                📋 検出された全エラー:
              </div>
              {details.allErrors.map((err, index) => (
                <div key={index} style={{ 
                  marginBottom: 8,
                  paddingLeft: 12,
                  borderLeft: '3px solid #fde68a'
                }}>
                  <div style={{ fontWeight: 'medium', color: '#d97706' }}>
                    {err.path || 'ルート'}: {err.message}
                  </div>
                  {err.allowedValues && (
                    <div style={{ 
                      fontSize: '0.9rem',
                      color: '#6b7280',
                      marginTop: 4
                    }}>
                      許可される値: {err.allowedValues.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // シンプルエラー
    if (error.type === 'simple') {
      return (
        <div style={{ 
          padding: 24,
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8
        }}>
          <div style={{ color: '#dc2626' }}>
            {error.message}
          </div>
        </div>
      );
    }

    return null;
  };

  if (error) {
    return renderError();
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
      
      {/* カスタムテーマセレクター */}
      <CustomThemeSelector />
      
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
      {components.map((comp, i) => renderRegisteredComponent(comp, i))}
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