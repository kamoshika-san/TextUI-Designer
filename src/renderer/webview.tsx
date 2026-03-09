import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from './components/ThemeToggle';
import { CustomThemeSelector } from './components/CustomThemeSelector';
import { renderRegisteredComponent } from './component-map';
import type { TextUIDSL, ComponentDef } from './types';
import { getVSCodeApi, type ElectronModule } from './vscode-api';
import { createComponentKeys, hashString, mergeDslWithPrevious } from './preview-diff';
import { createErrorGuidance, type ErrorInfo } from './error-guidance';
import {
  formatSchemaErrors,
  mapDetailedSchemaError,
  mapParseError,
  mapSchemaValidationError,
  mapSimpleError
} from './error-mappers';

// HTMLテンプレートで既に取得されているvscodeオブジェクトを使用
const vscodeApi = getVSCodeApi();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isElectronModule = (value: unknown): value is ElectronModule => {
  if (!isRecord(value)) {
    return false;
  }
  const remote = value.remote;
  return isRecord(remote) && typeof remote.getCurrentWindow === 'function';
};

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

function applyThemeVariables(css: unknown): void {
  console.log('[React] theme-variablesメッセージを受信:', css);
  const styleEl = document.getElementById('theme-vars');
  if (!styleEl) {
    console.error('[React] theme-vars要素が見つかりません');
    return;
  }
  console.log('[React] theme-vars要素が見つかりました。CSSを適用します');
  styleEl.textContent = typeof css === 'string' ? css : '';
  console.log('[React] CSS変数を適用しました');
}


const App: React.FC = () => {
  const [json, setJson] = useState<TextUIDSL | null>(null);
  const [error, setError] = useState<ErrorInfo | string | null>(null);

  const applyDslUpdate = (incomingDsl: TextUIDSL) => {
    const startedAt = performance.now();
    const incomingHash = hashString(JSON.stringify(incomingDsl));

    setJson(previousJson => {
      if (!previousJson) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] 初回描画を適用しました', {
            elapsedMs: Number(elapsed.toFixed(2)),
            changedCount: incomingDsl.page?.components?.length || 0,
            skipped: false
          });
        }
        return incomingDsl;
      }

      const previousHash = hashString(JSON.stringify(previousJson));
      if (previousHash === incomingHash) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] 変更がないため再描画をスキップしました', {
            elapsedMs: Number(elapsed.toFixed(2)),
            changedCount: 0,
            skipped: true
          });
        }
        return previousJson;
      }

      const mergedDsl = mergeDslWithPrevious(previousJson, incomingDsl);
      const mergedComponents = mergedDsl.page?.components || [];
      const previousComponents = previousJson.page?.components || [];
      const changedCount = mergedComponents.reduce((count, component, index) =>
        count + (component === previousComponents[index] ? 0 : 1), 0);

      if (isDevelopmentMode) {
        const elapsed = performance.now() - startedAt;
        console.debug('[React][diff-render] 差分描画を適用しました', {
          elapsedMs: Number(elapsed.toFixed(2)),
          changedCount,
          skipped: false
        });
      }

      return mergedDsl;
    });
  };

  useEffect(() => {
    // WebView準備完了メッセージを送信
    if (vscodeApi?.postMessage) {
      console.log('[React] WebView準備完了メッセージを送信');
      vscodeApi.postMessage({ type: 'webview-ready' });
    }

    const messageHandlers: Record<string, (payload: Record<string, unknown>) => void> = {
      json: payload => {
        console.log('[React] JSONデータを受信:', payload.json);
        applyDslUpdate(payload.json as TextUIDSL);
        setError(null);
      },
      update: payload => {
        console.log('[React] 更新データを受信:', payload.data);
        applyDslUpdate(payload.data as TextUIDSL);
        setError(null);
      },
      error: payload => {
        console.log('[React] エラーメッセージを受信:', payload.error);
        setError(mapSimpleError(payload));
      },
      'schema-error': payload => {
        console.log('[React] スキーマエラーメッセージを受信:', payload.errors);
        const schemaErrors = formatSchemaErrors(payload.errors);
        setError(mapSchemaValidationError(payload, schemaErrors));
      },
      'theme-change': payload => {
        console.log('[React] テーマ変更メッセージを受信:', payload.theme);
        // テーマ変更はThemeToggleコンポーネントで処理される
      },
      'theme-variables': payload => {
        applyThemeVariables(payload.css);
      },
      parseError: payload => {
        console.log('[React] 詳細パースエラーメッセージを受信:', payload.error);
        setError(mapParseError(payload));
      },
      schemaError: payload => {
        console.log('[React] 詳細スキーマエラーメッセージを受信:', payload.error);
        setError(mapDetailedSchemaError(payload));
      },
      clearError: () => {
        console.log('[React] エラー状態クリアメッセージを受信');
        setError(null);
      }
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!isRecord(message) || typeof message.type !== 'string') {
        return;
      }
      console.log('[React] メッセージを受信:', message);

      const handler = Object.prototype.hasOwnProperty.call(messageHandlers, message.type)
        ? messageHandlers[message.type]
        : undefined;
      if (typeof handler === 'function') {
        handler(message);
      } else {
        console.log('[React] 未対応のメッセージタイプ:', message.type);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleExport = () => {
    if (vscodeApi?.postMessage) {
      console.log('[React] エクスポートボタンがクリックされました');
      vscodeApi.postMessage({ type: 'export' });
    }
  };

  const handleJumpToDsl = (dslPath: string, componentName: string) => {
    const runtimeApi = getVSCodeApi();
    if (!runtimeApi?.postMessage) {
      return;
    }
    runtimeApi.postMessage({
      type: 'jump-to-dsl',
      dslPath,
      componentName
    });
  };

  // エラー表示コンポーネント
  const renderError = () => {
    if (!error) return null;

    const guidance = createErrorGuidance(error);

    // 文字列エラー（レガシー）
    if (typeof error === 'string') {
      return (
        <div style={{ padding: 24 }}>
          <div style={{ color: 'red', marginBottom: 8 }}>{guidance.title}: {error}</div>
          <ul>
            {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
          </ul>
          <div>
            {guidance.documentLinks.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
                {link.label}
              </a>
            ))}
          </div>
          {guidance.technicalDetails && (
            <details style={{ marginTop: 12 }}>
              <summary>技術情報を表示</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{guidance.technicalDetails}</pre>
            </details>
          )}
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

          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#374151', fontWeight: 'medium', marginBottom: 8 }}>🛠 次のアクション</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#374151' }}>
              {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#374151', fontWeight: 'medium', marginBottom: 8 }}>📚 関連ドキュメント</div>
            {guidance.documentLinks.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
                {link.label}
              </a>
            ))}
          </div>

          {guidance.technicalDetails && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>技術情報（詳細）</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#4b5563' }}>{guidance.technicalDetails}</pre>
            </details>
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

          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#374151', fontWeight: 'medium', marginBottom: 8 }}>🛠 次のアクション</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#374151' }}>
              {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ color: '#374151', fontWeight: 'medium', marginBottom: 8 }}>📚 関連ドキュメント</div>
            {guidance.documentLinks.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
                {link.label}
              </a>
            ))}
          </div>

          {guidance.technicalDetails && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>技術情報（詳細）</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#4b5563' }}>{guidance.technicalDetails}</pre>
            </details>
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
          <div style={{ color: '#dc2626', marginBottom: 8 }}>{error.message}</div>
          <div style={{ color: '#374151', fontWeight: 'medium', marginBottom: 6 }}>🛠 次のアクション</div>
          <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, color: '#374151' }}>
            {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
          </ul>
          <div>
            {guidance.documentLinks.map(link => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
                {link.label}
              </a>
            ))}
          </div>
          {guidance.technicalDetails && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', color: '#6b7280' }}>技術情報（詳細）</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#4b5563' }}>{guidance.technicalDetails}</pre>
            </details>
          )}
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
  const componentKeys = createComponentKeys(components);
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
      {components.map((comp, i) => renderRegisteredComponent(comp, componentKeys[i] || i, {
        dslPath: `/page/components/${i}`,
        onJumpToDsl: handleJumpToDsl
      }))}
    </div>
  );
};

// メッセージリスナーを設定
window.addEventListener('message', (event) => {
	const message = event.data;
	
	if (isRecord(message) && message.type === 'openDevTools') {
		// 開発者ツールを開く（Electron環境でのみ動作）
		const requireFn = window.require;
		if (requireFn) {
			try {
				const electronModule = requireFn('electron');
				if (isElectronModule(electronModule)) {
					const currentWindow = electronModule.remote.getCurrentWindow();
					currentWindow.webContents.openDevTools();
				}
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
