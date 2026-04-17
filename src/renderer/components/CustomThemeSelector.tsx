import React, { useState, useEffect, useCallback } from 'react';
import { getVSCodeApi } from '../vscode-api';

interface Theme {
  name: string;
  path: string;
  isActive: boolean;
  description?: string;
}

interface CustomThemeSelectorProps {
  className?: string;
}

export const CustomThemeSelector: React.FC<CustomThemeSelectorProps> = ({ className = '' }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const vscodeApi = getVSCodeApi();

  // コンポーネント初期化時にテーマ一覧を要求
  useEffect(() => {
    if (vscodeApi?.postMessage) {
      console.log('[CustomThemeSelector] テーマ一覧を要求');
      vscodeApi.postMessage({ type: 'get-themes' });
    }
  }, [vscodeApi]);

  // WebViewからのメッセージを監視
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'available-themes') {
        console.log('[CustomThemeSelector] テーマ一覧を受信:', message.themes);
        setThemes(message.themes || []);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // テーマ切り替え処理
  const handleThemeSwitch = (theme: Theme): void => {
    if (vscodeApi?.postMessage && !theme.isActive) {
      console.log('[CustomThemeSelector] テーマ切り替えを要求:', theme);
      setIsLoading(true);
      vscodeApi.postMessage({
        type: 'theme-switch',
        themePath: theme.path
      });
    }
    setIsOpen(false);
  };

  // アクティブなテーマを取得
  const activeTheme = themes.find(t => t.isActive) || themes[0];

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.custom-theme-selector')) setIsOpen(false);
  }, []);

  // 外部クリックでドロップダウンを閉じる
  useEffect((): void | (() => void) => {
    if (!isOpen) return;
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  if (themes.length === 0) {
    return null; // テーマがない場合は非表示
  }

  return (
    <div className={`custom-theme-selector ${className}`} style={{ position: 'relative' }}>
      {/* メインボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title={`現在のテーマ: ${activeTheme?.name || 'デフォルト'}`}
        style={{
          backgroundColor: 'rgba(75, 85, 99, 0.8)',
          color: '#d1d5db',
          border: '1px solid rgba(107, 114, 128, 0.5)',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '2.5rem',
          minWidth: '5rem',
          opacity: isLoading ? 0.7 : 1,
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
            e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
            e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
          }
        }}
      >
        <span style={{ marginRight: '0.25rem' }}>🎨</span>
        {isLoading ? (
          <span style={{ fontSize: '0.75rem' }}>⏳</span>
        ) : (
          <>
            <span style={{ 
              maxWidth: '4rem', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {activeTheme?.name || 'テーマ'}
            </span>
            <span style={{ marginLeft: '0.25rem', fontSize: '0.75rem' }}>
              {isOpen ? '▲' : '▼'}
            </span>
          </>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            border: '1px solid rgba(75, 85, 99, 0.7)',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            zIndex: 1001,
            minWidth: '12rem',
            maxWidth: '20rem',
            maxHeight: '20rem',
            overflowY: 'auto',
            backdropFilter: 'blur(10px)'
          }}
        >
          {themes.map((theme, index) => (
            <button
              key={`${theme.path}-${index}`}
              onClick={() => handleThemeSwitch(theme)}
              disabled={theme.isActive || isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: theme.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: theme.isActive ? '#60a5fa' : '#d1d5db',
                border: 'none',
                borderBottom: index < themes.length - 1 ? '1px solid rgba(75, 85, 99, 0.3)' : 'none',
                cursor: theme.isActive || isLoading ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.2s',
                borderRadius: index === 0 ? '0.5rem 0.5rem 0 0' : 
                            index === themes.length - 1 ? '0 0 0.5rem 0.5rem' : '0'
              }}
              onMouseEnter={(e) => {
                if (!theme.isActive && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!theme.isActive && !isLoading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ 
                    fontWeight: theme.isActive ? 'bold' : 'normal',
                    fontSize: '0.875rem',
                    marginBottom: theme.description ? '0.25rem' : '0'
                  }}>
                    {theme.name}
                  </div>
                  {theme.description && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      maxWidth: '10rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {theme.description}
                    </div>
                  )}
                </div>
                {theme.isActive && (
                  <span style={{ fontSize: '0.875rem', color: '#10b981' }}>✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 